import { Router } from 'express';
import { listNotificationsController } from '../controllers/notification.controller';
import { basicAuth } from '../middleware/basic-auth.middleware';

const router = Router();

router.get('/', basicAuth, listNotificationsController);

export default router;
