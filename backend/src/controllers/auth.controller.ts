import { Request, Response, NextFunction } from 'express';
import { loginUser } from '../services/auth.service';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const data = await loginUser(email, password);

    res.status(200).json({
      message: 'Login successful',
      data,
    });
  } catch (error: any) {
    if (error.message === 'Invalid credentials') {
      res.status(401).json({ message: error.message });
    } else {
      next(error);
    }
  }
};
