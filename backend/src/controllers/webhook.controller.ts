import { Request, Response } from 'express';
import { processInboundGupshupMessage } from '../services/chat.service';

export const gupshupWebhookController = async (req: Request, res: Response) => {
  console.log('Gupshup webhook POST received:', JSON.stringify(req.body));

  // Acknowledge immediately so Gupshup doesn't retry, then process the message
  // (LLM classification + reply) without blocking the response.
  res.status(200).json({ message: 'Webhook received' });

  void processInboundGupshupMessage(req.body);
};
