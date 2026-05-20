import { Request, Response, NextFunction } from 'express';
import { loginUser, registerUser } from '../services/auth.service';
import { requireString } from '../utils/validators';
import { AppError } from '../utils/app-error';

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

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = requireString(req.body?.email, 'email');
    const password = requireString(req.body?.password, 'password');
    const role = requireString(req.body?.role, 'role');

    if (role !== 'MANAGER' && role !== 'EMPLOYEE') {
      throw new AppError('Role must be either MANAGER or EMPLOYEE', 400);
    }

    const name = req.body?.name ? requireString(req.body.name, 'name') : email.split('@')[0];

    const data = await registerUser({ email, password, role, name });

    res.status(201).json({
      message: 'Registration successful',
      data,
    });
  } catch (error) {
    next(error);
  }
};
