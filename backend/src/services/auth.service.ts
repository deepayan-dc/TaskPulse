import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';

export const loginUser = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const organization = user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { id: true, name: true, logoUrl: true },
      })
    : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    mustResetPassword: user.mustResetPassword,
    organization,
  };
};

export const resetPassword = async (userId: string, newPassword: string) => {
  if (!newPassword || newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword, mustResetPassword: false },
  });

  return { ok: true };
};

/**
 * Self-registration always creates a NEW organization and makes the registrant
 * its ADMIN. Members are not self-registered — they are onboarded by an admin.
 */
export const registerUser = async (userData: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  organizationName: string;
  designation?: string;
}) => {
  const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const org = await prisma.organization.create({
    data: { name: userData.organizationName.trim() },
  });

  const newUser = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      role: 'ADMIN',
      designation: userData.designation?.trim() || 'Manager',
      name: userData.name,
      phone: userData.phone,
      organizationId: org.id,
    },
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    designation: newUser.designation,
    phone: newUser.phone,
    organization: { id: org.id, name: org.name, logoUrl: org.logoUrl },
  };
};
