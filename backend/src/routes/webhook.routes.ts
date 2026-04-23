import { Router } from 'express';
import { gupshupWebhookController } from '../controllers/webhook.controller';

const router = Router();

router.post('/gupshup', gupshupWebhookController);

export default router;
