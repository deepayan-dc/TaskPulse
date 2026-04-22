import { Router, Response } from 'express';
import { login } from '../controllers/auth.controller';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);

// Example protected route
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  res.status(200).json({ user: req.user });
});

export default router;
