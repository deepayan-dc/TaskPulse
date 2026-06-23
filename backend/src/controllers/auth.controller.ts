import { Request, Response, NextFunction } from 'express';
import { loginUser, registerUser } from '../services/auth.service';
import { normalizePhone, requireString } from '../utils/validators';
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

    // Name and phone are required: the WhatsApp flow traces a user's name from
    // their phone number, so every user must have both stored in the DB.
    const name = requireString(req.body?.name, 'name');
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      throw new AppError('phone is required', 400);
    }

    const data = await registerUser({ email, password, role, name, phone });

    res.status(201).json({
      message: 'Registration successful',
      data,
    });
  } catch (error) {
    next(error);
  }
};
