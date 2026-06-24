import { anthropic } from '../lib/anthropic';
import { prisma } from '../lib/prisma';
import { normalizePhone } from '../utils/validators';
import { sendTaskPulseNotification, sendWhatsAppText } from './whatsapp.service';
import { runAgent, ChatTurn } from './agent.service';
import { recordAiUsage } from './usage.service';

const HISTORY_LIMIT = 20;

const GREETING_FALLBACK =
  /^\s*(hi+|he+y+|he?llo+|hii+|helo+|yo|hiya|namaste|greetings|good\s*(morning|afternoon|evening|day))\b/i;

/**
 * Decide whether an inbound message is a greeting. Uses Claude as the primary
 * classifier, falling back to a keyword match when the API key is missing or
 * the call fails.
 */
export const isGreeting = async (
  text: string,
  organizationId?: string | null
): Promise<boolean> => {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;

  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 16,
        system:
          'You classify a single inbound WhatsApp message from a user. ' +
          'Reply with exactly one word and nothing else: ' +
          'GREETING if the message is purely a greeting or salutation (such as "hi", ' +
          '"hello", "hey", "good morning") with no other request, otherwise OTHER.',
        messages: [{ role: 'user', content: trimmed }],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = ((response as any).usage ?? {}) as Record<string, number>;
      void recordAiUsage(
        organizationId,
        (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
        u.output_tokens ?? 0
      );
      const block = response.content.find((b) => b.type === 'text');
      const label = block && block.type === 'text' ? block.text.trim().toUpperCase() : '';
      if (label.startsWith('GREETING')) return true;
      if (label.startsWith('OTHER')) return false;
    } catch (error) {
      console.error('Claude classification failed, falling back to keyword match:', error);
    }
  }

  return GREETING_FALLBACK.test(trimmed);
};

type InboundTextMessage = { text: string; from?: string; senderName?: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Extract inbound text messages from a Gupshup webhook body. Supports the
 * current WhatsApp Cloud API / Gupshup "partner" format and the legacy format.
 * Status/receipt events carry no `messages` array and are ignored.
 */
const extractTextMessages = (body: any): InboundTextMessage[] => {
  const out: InboundTextMessage[] = [];
  if (!body || typeof body !== 'object') return out;

  if (Array.isArray(body.entry)) {
    for (const entry of body.entry) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;
        if (!value || !Array.isArray(value.messages)) continue;
        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        for (const msg of value.messages) {
          if (msg?.type !== 'text' || !msg?.text?.body) continue;
          const contact = contacts.find((c: any) => c?.wa_id === msg.from);
          out.push({
            text: String(msg.text.body),
            from: msg.from,
            senderName: contact?.profile?.name,
          });
        }
      }
    }
    return out;
  }

  if (body.type === 'message' && body.payload?.type === 'text' && body.payload?.payload?.text) {
    out.push({
      text: String(body.payload.payload.text),
      from: body.payload.source,
      senderName: body.payload.sender?.name,
    });
  }
  return out;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

const loadHistory = async (phone: string): Promise<ChatTurn[]> => {
  const rows = await prisma.conversationMessage.findMany({
    where: { phone },
    orderBy: { createdAt: 'desc' },
    take: HISTORY_LIMIT,
  });
  return rows
    .reverse()
    .map((r) => ({ role: r.role === 'assistant' ? 'assistant' : 'user', content: r.content }));
};

const persistTurn = async (phone: string, userText: string, assistantText: string) => {
  await prisma.conversationMessage.create({ data: { phone, role: 'user', content: userText } });
  await prisma.conversationMessage.create({
    data: { phone, role: 'assistant', content: assistantText },
  });
};

const handleInboundMessage = async (msg: InboundTextMessage): Promise<void> => {
  const from = normalizePhone(msg.from);
  if (!from) {
    console.warn('Inbound message with no usable sender number; skipping.');
    return;
  }

  // Identity: every chat user must be registered (so we can scope their data).
  const user = await prisma.user.findFirst({ where: { phone: from } });
  if (!user) {
    console.log(`Inbound from unregistered number ${from}; asking them to register.`);
    await sendWhatsAppText(
      from,
      "Hi! This number isn't linked to a TaskPulse account yet. Please register in the TaskPulse app using this WhatsApp number, then message me again."
    );
    return;
  }

  // Greeting → branded welcome template (replied to the sender).
  if (await isGreeting(msg.text, user.organizationId)) {
    console.log(`Greeting from ${user.name} (${from}); sending welcome template.`);
    await sendTaskPulseNotification({
      recipientPhone: from,
      fallbackName: user.name,
      organizationId: user.organizationId,
    });
    return;
  }

  // Everything else → conversational agent.
  console.log(`Agent handling message from ${user.name} (${from}): "${msg.text}"`);
  const history = await loadHistory(from);
  const reply = await runAgent(
    { id: user.id, name: user.name, role: user.role, organizationId: user.organizationId },
    history,
    msg.text
  );
  await sendWhatsAppText(from, reply, user.organizationId);
  await persistTurn(from, msg.text, reply);
};

// Serialize processing per sender so rapid multi-turn messages (e.g. an action
// followed by "yes") don't run in parallel and race on conversation history.
const queues = new Map<string, Promise<unknown>>();
const runSerialized = (key: string, task: () => Promise<void>): Promise<void> => {
  const prev = queues.get(key) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(() => task());
  queues.set(
    key,
    next.finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    })
  );
  return next;
};

/**
 * Handle an inbound Gupshup webhook payload. Never throws — inbound webhooks
 * must always be acknowledged.
 */
export const processInboundGupshupMessage = async (body: unknown): Promise<void> => {
  try {
    const messages = extractTextMessages(body);
    for (const msg of messages) {
      const key = normalizePhone(msg.from) || msg.from || 'unknown';
      await runSerialized(key, () => handleInboundMessage(msg));
    }
  } catch (error) {
    console.error('Failed to process inbound Gupshup message:', error);
  }
};
