import { Response, NextFunction } from 'express';
import { getNotifications } from '../services/notification.service';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';

export const listNotificationsController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    // Always scope to the authenticated user — never trust a client-supplied id.
    const notifications = await getNotifications(req.user.id);

    res.status(200).json({ data: notifications });
  } catch (error) {
    next(error);
  }
};
