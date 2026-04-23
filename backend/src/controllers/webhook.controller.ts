import { Request, Response } from 'express';

export const gupshupWebhookController = async (req: Request, res: Response) => {
  try {
    console.log('Received Gupshup webhook payload:', req.body);
    res.status(200).json({ message: 'Webhook received' });
  } catch (error) {
    console.error('Failed to process Gupshup webhook:', error);
    res.status(200).json({ message: 'Webhook accepted' });
  }
};
