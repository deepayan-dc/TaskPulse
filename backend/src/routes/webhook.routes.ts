import { Router } from 'express';
import { gupshupWebhookController } from '../controllers/webhook.controller';

const router = Router();

// GET is a reachability/verification probe — many providers (and browsers) hit
// the URL with GET before accepting it. Return 200 so the URL validates.
router.get('/gupshup', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'TaskPulse Gupshup webhook is reachable. Inbound messages are delivered via POST.',
  });
});

router.post('/gupshup', gupshupWebhookController);

export default router;
