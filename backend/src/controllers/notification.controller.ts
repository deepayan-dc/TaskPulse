import { NextFunction, Request, Response } from 'express';
import { getNotifications } from '../services/notification.service';

export const listNotificationsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : undefined;
    const notifications = await getNotifications(userId);

    res.status(200).json({ data: notifications });
  } catch (error) {
    next(error);
  }
};
