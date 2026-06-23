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

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

export const registerUser = async (userData: {
  email: string;
  password: string;
  role: string;
  name: string;
  phone?: string;
}) => {
  const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const newUser = await prisma.user.create({
    data: {
      email: userData.email,
      password: hashedPassword,
      role: userData.role,
      name: userData.name,
      phone: userData.phone,
    },
  });

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
    phone: newUser.phone,
  };
};
