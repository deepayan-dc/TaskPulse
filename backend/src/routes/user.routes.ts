import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { basicAuth } from '../middleware/basic-auth.middleware';

const router = Router();

router.get('/', basicAuth, async (req, res, next) => {
  try {
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });
    res.status(200).json({ data: employees });
  } catch (error) {
    next(error);
  }
});

export default router;
