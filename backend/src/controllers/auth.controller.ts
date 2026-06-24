import { Request, Response, NextFunction } from 'express';
import { loginUser, registerUser, resetPassword } from '../services/auth.service';
import { normalizePhone, requireString } from '../utils/validators';
import { AppError } from '../utils/app-error';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';

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

// Self-registration creates a new organization with the registrant as its ADMIN.
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = requireString(req.body?.email, 'email');
    const password = requireString(req.body?.password, 'password');
    const name = requireString(req.body?.name, 'name');
    const organizationName = requireString(req.body?.organizationName, 'organizationName');

    // Name and phone are required: the WhatsApp flow traces a user's name from
    // their phone number, so every user must have both stored in the DB.
    const phone = normalizePhone(req.body?.phone);
    if (!phone) {
      throw new AppError('phone is required', 400);
    }
    const designation =
      typeof req.body?.designation === 'string' ? req.body.designation : undefined;

    const data = await registerUser({ email, password, name, phone, organizationName, designation });

    res.status(201).json({
      message: 'Registration successful',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const newPassword = requireString(req.body?.newPassword, 'newPassword');
    const result = await resetPassword(req.user.id, newPassword);
    res.status(200).json({ message: 'Password updated', data: result });
  } catch (error) {
    next(error);
  }
};
