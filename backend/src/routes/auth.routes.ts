import { Router } from 'express';
import { login, register, resetPasswordController } from '../controllers/auth.controller';
import { basicAuth } from '../middleware/basic-auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/reset-password', basicAuth, resetPasswordController);

export default router;
