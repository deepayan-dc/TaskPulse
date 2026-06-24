import { Response, NextFunction } from 'express';
import { onboardEmployees, listTeam, deleteEmployee, setMemberRole } from '../services/onboarding.service';
import { resolveManagerOrg } from '../services/billing.service';
import { prisma } from '../lib/prisma';
import { BasicAuthRequest } from '../middleware/basic-auth.middleware';

export const onboardEmployeesController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const csv = typeof req.body?.csv === 'string' ? req.body.csv : undefined;
    const employees = Array.isArray(req.body?.employees) ? req.body.employees : undefined;
    const organizationName =
      typeof req.body?.organizationName === 'string' ? req.body.organizationName : undefined;

    if (!csv && !employees) {
      return res.status(400).json({ message: 'Provide a CSV (csv) or an employees array' });
    }

    const result = await onboardEmployees(req.user.id, csv ?? employees!, organizationName);
    res.status(200).json({ message: 'Onboarding complete', data: result });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/organization — update org branding (name / logo). Manager-only.
export const updateOrganizationController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const organizationId = await resolveManagerOrg(req.user.id);

    const data: { name?: string; logoUrl?: string | null } = {};
    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      data.name = req.body.name.trim();
    }
    if (typeof req.body?.logoUrl === 'string') {
      const logo = req.body.logoUrl;
      if (logo.length > 1_500_000) {
        return res.status(400).json({ message: 'Logo is too large (max ~1MB). Use a smaller image.' });
      }
      data.logoUrl = logo.trim() || null;
    }

    const org = await prisma.organization.update({
      where: { id: organizationId },
      data,
      select: { id: true, name: true, logoUrl: true },
    });
    res.status(200).json({ data: org });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/users/:id/role — promote/demote a team member (ADMIN | MEMBER).
export const setMemberRoleController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const role = String(req.body?.role || '').toUpperCase();
    const updated = await setMemberRole(req.user.id, req.params.id, role as 'ADMIN' | 'MEMBER');
    res.status(200).json({ message: 'Role updated', data: updated });
  } catch (error) {
    next(error);
  }
};

export const listTeamController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const team = await listTeam(req.user.id);
    res.status(200).json({ data: team });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployeeController = async (
  req: BasicAuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    const removed = await deleteEmployee(req.user.id, req.params.id);
    res.status(200).json({ message: 'Employee removed', data: removed });
  } catch (error) {
    next(error);
  }
};
