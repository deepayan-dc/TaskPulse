import { prisma } from '../lib/prisma';
import { config } from '../config';
import { recordWhatsAppUsage } from './usage.service';

// Template (HSM) messages use the dedicated /template/msg endpoint; free-form
// session replies use /msg. The session endpoint only works within WhatsApp's
// 24h customer-service window (i.e. after the user has messaged us).
const GUPSHUP_TEMPLATE_API_URL = 'https://api.gupshup.io/wa/api/v1/template/msg';
const GUPSHUP_SESSION_API_URL = 'https://api.gupshup.io/wa/api/v1/msg';

type DeliveryLogCreateArgs = {
  data: {
    phone: string;
    message: string;
    status: 'sent' | 'failed';
  };
};

type DeliveryLogDelegate = {
  create(args: DeliveryLogCreateArgs): Promise<unknown>;
};

const deliveryLogDelegate = (prisma as typeof prisma & { deliveryLog?: DeliveryLogDelegate })
  .deliveryLog;

const saveDeliveryLog = async (phone: string, message: string, status: 'sent' | 'failed') => {
  if (!deliveryLogDelegate) {
    console.error('Prisma DeliveryLog delegate is unavailable. Run prisma generate.');
    return;
  }

  await deliveryLogDelegate.create({
    data: {
      phone,
      message,
      status,
    },
  });
};

const gupshupConfigured = (): boolean => {
  if (!config.gupshupApiKey || !config.gupshupSourceNumber) {
    console.error(
      'Gupshup WhatsApp is not configured. Check GUPSHUP_API_KEY and GUPSHUP_SOURCE_NUMBER.'
    );
    return false;
  }
  return true;
};

/**
 * Low-level Gupshup template sender. `params` fill the template placeholders
 * ({{1}}, {{2}}, ...) in order. Renders the approved template.
 */
export const sendWhatsAppTemplate = async (
  to: string,
  templateId: string,
  params: string[],
  organizationId?: string | null
): Promise<boolean> => {
  if (!gupshupConfigured()) return false;

  const template = JSON.stringify({ id: templateId, params });

  const payload = new URLSearchParams({
    source: config.gupshupSourceNumber as string,
    destination: to,
    'src.name': config.gupshupSrcName,
    template,
  });

  try {
    const response = await fetch(GUPSHUP_TEMPLATE_API_URL, {
      method: 'POST',
      headers: {
        apikey: config.gupshupApiKey as string,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Gupshup template request failed with status ${response.status}. Response: ${responseText}`
      );
    }

    console.log(`Gupshup template accepted for ${to}: ${responseText}`);
    await saveDeliveryLog(to, template, 'sent');
    await recordWhatsAppUsage(organizationId);
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp template via Gupshup:', error);
    try {
      await saveDeliveryLog(to, template, 'failed');
    } catch (logError) {
      console.error('Failed to save WhatsApp delivery log:', logError);
    }
    return false;
  }
};

/**
 * Send a free-form text (session) WhatsApp message. Only deliverable within the
 * 24h window after the recipient last messaged the business number — which is
 * always true when replying to an inbound message.
 */
export const sendWhatsAppText = async (
  to: string,
  text: string,
  organizationId?: string | null
): Promise<boolean> => {
  if (!gupshupConfigured()) return false;

  const message = JSON.stringify({ type: 'text', text });

  const payload = new URLSearchParams({
    channel: 'whatsapp',
    source: config.gupshupSourceNumber as string,
    destination: to,
    message,
    'src.name': config.gupshupSrcName,
  });

  try {
    const response = await fetch(GUPSHUP_SESSION_API_URL, {
      method: 'POST',
      headers: {
        apikey: config.gupshupApiKey as string,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Gupshup session request failed with status ${response.status}. Response: ${responseText}`
      );
    }

    await saveDeliveryLog(to, text, 'sent');
    await recordWhatsAppUsage(organizationId);
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp text via Gupshup:', error);
    try {
      await saveDeliveryLog(to, text, 'failed');
    } catch (logError) {
      console.error('Failed to save WhatsApp delivery log:', logError);
    }
    return false;
  }
};

/**
 * Build the 4 parameters for the "Task assigned" template:
 *   {{1}} assignee's name (looked up from their phone, else fallback)
 *   {{2}} the task's numeric id
 *   {{3}} the task's due date (YYYY-MM-DD, or "Not set")
 *   {{4}} a deep-link to the task in the TaskPulse app
 */
const buildTaskAssignedParams = async (opts: {
  recipientPhone: string;
  fallbackName?: string;
  taskId: number;
}): Promise<string[]> => {
  // {{1}} — trace the recipient's phone number back to their name.
  const user = await prisma.user.findFirst({ where: { phone: opts.recipientPhone } });
  const name = user?.name || opts.fallbackName || 'there';

  // {{3}} — the task's due date, read straight from the DB.
  const task = await prisma.task.findUnique({
    where: { id: opts.taskId },
    select: { dueDate: true },
  });
  const dueDate = task?.dueDate ? task.dueDate.toISOString().split('T')[0] : 'Not set';

  // {{4}} — deep-link to the task. FRONTEND_URL must be publicly reachable for
  // the link to open on the assignee's phone.
  const taskLink = `${config.frontendUrl}/tasks/${opts.taskId}`;

  return [name, String(opts.taskId), dueDate, taskLink];
};

/**
 * Notify an assignee on WhatsApp that a task has been assigned to them, using the
 * approved "Task assigned" template (GUPSHUP_TEMPLATE_ID).
 */
export const sendTaskPulseNotification = async (opts: {
  recipientPhone: string;
  fallbackName?: string;
  taskId: number;
  organizationId?: string | null;
}): Promise<boolean> => {
  const params = await buildTaskAssignedParams(opts);
  return sendWhatsAppTemplate(
    opts.recipientPhone,
    config.gupshupTemplateId,
    params,
    opts.organizationId
  );
};

/**
 * Notify an assignee on WhatsApp that an existing task was changed, using the
 * "Update for task" template (GUPSHUP_TASK_UPDATE_TEMPLATE_ID). Params:
 *   {{1}} assignee name, {{2}} change type ("status"/"comment"),
 *   {{3}} task name, {{4}} the comment text (for comments) or new status.
 */
export const sendTaskUpdateNotification = async (opts: {
  recipientPhone: string;
  assigneeName: string;
  changeType: string;
  taskName: string;
  detail: string;
  organizationId?: string | null;
}): Promise<boolean> => {
  return sendWhatsAppTemplate(
    opts.recipientPhone,
    config.gupshupTaskUpdateTemplateId,
    [opts.assigneeName, opts.changeType, opts.taskName, opts.detail],
    opts.organizationId
  );
};

/**
 * Welcome a newly onboarded employee on WhatsApp with their login credentials.
 * Uses a dedicated approved template if GUPSHUP_ONBOARDING_TEMPLATE_ID is set
 * (deliverable to new/cold numbers); otherwise falls back to a free-form session
 * text (only delivered within the recipient's 24h session window).
 */
export const sendOnboardingWelcome = async (opts: {
  phone: string;
  name: string;
  orgName: string;
  managerName: string;
  email: string;
  password: string;
  organizationId?: string | null;
}): Promise<boolean> => {
  if (config.gupshupOnboardingTemplateId) {
    // Param order must match your approved onboarding template's placeholders.
    return sendWhatsAppTemplate(
      opts.phone,
      config.gupshupOnboardingTemplateId,
      [opts.name, opts.orgName, opts.managerName, opts.email, opts.password],
      opts.organizationId
    );
  }

  const text =
    `Congratulations ${opts.name}! 🎉 You have been onboarded to ${opts.orgName} ` +
    `by ${opts.managerName}.\n\n` +
    `Your TaskPulse login credentials:\n` +
    `Email: ${opts.email}\n` +
    `Password: ${opts.password}\n\n` +
    `You'll be asked to set a new password on first login.`;
  return sendWhatsAppText(opts.phone, text, opts.organizationId);
};

/**
 * Notify an employee on WhatsApp that they have been removed from their org.
 * Uses a dedicated approved template if GUPSHUP_REMOVAL_TEMPLATE_ID is set,
 * otherwise a free-form session text (subject to the 24h session window).
 */
export const sendRemovalNotice = async (opts: {
  phone: string;
  name: string;
  orgName: string;
  organizationId?: string | null;
}): Promise<boolean> => {
  if (config.gupshupRemovalTemplateId) {
    // Param order must match your approved removal template's placeholders.
    return sendWhatsAppTemplate(
      opts.phone,
      config.gupshupRemovalTemplateId,
      [opts.name, opts.orgName],
      opts.organizationId
    );
  }

  const text =
    `Hi ${opts.name}, you have been removed from ${opts.orgName}. ` +
    `Your services are no longer needed. Thank you.`;
  return sendWhatsAppText(opts.phone, text, opts.organizationId);
};
