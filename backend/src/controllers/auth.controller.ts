import { Request, Response, NextFunction } from 'express';
import { loginUser } from '../services/auth.service';
import { requireString } from '../utils/validators';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = requireString(req.body?.email, 'email');
    const password = requireString(req.body?.password, 'password');

    const data = await loginUser(email, password);

    res.status(200).json({
      message: 'Login successful',
      data,
    });
  } catch (error) {
    next(error);
  }
};
