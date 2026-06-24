import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { basicAuth, BasicAuthRequest } from '../middleware/basic-auth.middleware';
import {
  onboardEmployeesController,
  updateOrganizationController,
  listTeamController,
  deleteEmployeeController,
  setMemberRoleController,
} from '../controllers/user.controller';

const router = Router();

// Bulk-onboard employees from a CSV under the authenticated manager + org.
router.post('/onboard', basicAuth, onboardEmployeesController);

// Update organization branding (name / logo). Manager-only.
router.patch('/organization', basicAuth, updateOrganizationController);

// The authenticated manager's organization team.
router.get('/team', basicAuth, listTeamController);

// Promote/demote a team member between ADMIN and MEMBER. Admin-only.
router.patch('/:id/role', basicAuth, setMemberRoleController);

// Fire/remove a team member (admin of the same organization only).
router.delete('/:id', basicAuth, deleteEmployeeController);

// Member picker for task assignment — scoped to the admin's own team.
router.get('/', basicAuth, async (req: BasicAuthRequest, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const employees =
      req.user.role === 'ADMIN'
        ? await prisma.user.findMany({
            where: { managerId: req.user.id },
            select: { id: true, name: true, email: true, role: true, designation: true },
            orderBy: { name: 'asc' },
          })
        : [];
    res.status(200).json({ data: employees });
  } catch (error) {
    next(error);
  }
});

export default router;
