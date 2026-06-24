import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import { normalizePhone } from '../utils/validators';
import { sendOnboardingWelcome, sendRemovalNotice } from './whatsapp.service';

export type OnboardRow = { name?: string; email?: string; phone?: string; designation?: string };

const HEADER_ALIASES: Record<keyof OnboardRow, string[]> = {
  name: ['name', 'full name', 'fullname', 'employee name', 'employee'],
  email: ['email', 'e-mail', 'email address', 'mail'],
  phone: [
    'phone',
    'whatsapp',
    'whatsapp number',
    'whatsapp no',
    'whatsappnumber',
    'number',
    'mobile',
    'mobile number',
    'phone number',
    'contact',
  ],
  designation: ['designation', 'title', 'job title', 'position', 'role'],
};

/**
 * Minimal but correct CSV parser: handles quoted fields, escaped quotes ("")
 * commas inside quotes, and CRLF/LF line endings. Returns rows keyed by the
 * lowercased header names.
 */
const parseCsvRecords = (text: string): Record<string, string>[] => {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  // Canonicalize headers so separators don't matter: "Phone_Number",
  // "Phone-Number", and "Phone Number" all become "phone number".
  const canonicalize = (h: string) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const headers = rows[0].map(canonicalize);
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = (r[idx] ?? '').trim();
      });
      return obj;
    });
};

export const parseEmployeeCsv = (csv: string): OnboardRow[] => {
  const records = parseCsvRecords(csv);
  const pick = (rec: Record<string, string>, keys: string[]): string | undefined => {
    for (const k of keys) {
      if (rec[k] !== undefined && rec[k] !== '') return rec[k];
    }
    return undefined;
  };
  return records.map((rec) => ({
    name: pick(rec, HEADER_ALIASES.name),
    email: pick(rec, HEADER_ALIASES.email),
    phone: pick(rec, HEADER_ALIASES.phone),
    designation: pick(rec, HEADER_ALIASES.designation),
  }));
};

const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const generateTempPassword = (): string => {
  const bytes = crypto.randomBytes(10);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  return out;
};

export type OnboardResult = {
  organizationId: string;
  organizationName: string;
  created: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    designation: string;
    tempPassword: string;
  }>;
  skipped: Array<{ row: number; email?: string; reason: string }>;
  errors: Array<{ row: number; email?: string; reason: string }>;
  summary: { total: number; created: number; skipped: number; errors: number };
};

/**
 * Bulk-onboard employees from CSV (or a parsed array) under a manager and their
 * organization. Creates the org automatically if the manager doesn't have one.
 * Idempotent-friendly: existing or duplicate emails/phones are skipped, not
 * overwritten.
 */
export const onboardEmployees = async (
  managerId: string,
  input: string | OnboardRow[],
  organizationName?: string
): Promise<OnboardResult> => {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager) throw new AppError('Admin not found', 404);
  if (manager.role !== 'ADMIN') throw new AppError('Only admins can onboard members', 403);

  // Ensure the manager has an organization (tenant).
  let organizationId = manager.organizationId ?? null;
  if (!organizationId) {
    const org = await prisma.organization.create({
      data: { name: (organizationName || '').trim() || `${manager.name}'s Organization` },
    });
    organizationId = org.id;
    await prisma.user.update({ where: { id: manager.id }, data: { organizationId } });
  }
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });

  const rows = typeof input === 'string' ? parseEmployeeCsv(input) : input;

  const created: OnboardResult['created'] = [];
  const skipped: OnboardResult['skipped'] = [];
  const errors: OnboardResult['errors'] = [];
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +1 for header, +1 for 1-based numbering
    try {
      const name = (r.name || '').trim();
      const email = (r.email || '').trim().toLowerCase();
      const designation = (r.designation || '').trim() || 'Employee';
      if (!name) {
        errors.push({ row: rowNum, email: email || undefined, reason: 'Missing name' });
        continue;
      }
      if (!email) {
        errors.push({ row: rowNum, reason: 'Missing email' });
        continue;
      }
      let phone: string | undefined;
      try {
        phone = normalizePhone(r.phone);
      } catch {
        errors.push({ row: rowNum, email, reason: 'Invalid phone number' });
        continue;
      }
      if (!phone) {
        errors.push({ row: rowNum, email, reason: 'Missing WhatsApp number' });
        continue;
      }

      if (seenEmails.has(email)) {
        skipped.push({ row: rowNum, email, reason: 'Duplicate email in file' });
        continue;
      }
      if (seenPhones.has(phone)) {
        skipped.push({ row: rowNum, email, reason: 'Duplicate WhatsApp number in file' });
        continue;
      }

      const existing = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] },
        select: { email: true, phone: true },
      });
      if (existing) {
        skipped.push({
          row: rowNum,
          email,
          reason: existing.email === email ? 'Email already registered' : 'WhatsApp number already registered',
        });
        continue;
      }

      const tempPassword = generateTempPassword();
      const hashed = await bcrypt.hash(tempPassword, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          password: hashed,
          role: 'MEMBER',
          designation,
          organizationId,
          managerId: manager.id,
          mustResetPassword: true,
        },
      });
      seenEmails.add(email);
      seenPhones.add(phone);
      created.push({ id: user.id, name, email, phone, designation, tempPassword });

      // Welcome the new employee on WhatsApp with their login credentials.
      // Fire-and-forget — a delivery failure must not fail the onboarding.
      void sendOnboardingWelcome({
        phone,
        name,
        orgName: organization?.name ?? 'your organization',
        managerName: manager.name,
        email,
        password: tempPassword,
        organizationId,
      }).catch((err) => console.error(`Failed to send onboarding welcome to ${phone}:`, err));
    } catch (error) {
      errors.push({
        row: rowNum,
        email: r.email,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    organizationId,
    organizationName: organization?.name ?? '',
    created,
    skipped,
    errors,
    summary: {
      total: rows.length,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
    },
  };
};

/**
 * List the manager's direct reports (employees they onboarded / manage).
 */
export const listTeam = async (managerId: string) => {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || manager.role !== 'ADMIN') {
    throw new AppError('Only admins can view their team', 403);
  }

  return prisma.user.findMany({
    where: { managerId },
    select: { id: true, name: true, email: true, phone: true, role: true, designation: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
};

/**
 * Fire/remove an employee. Only the employee's own manager (direct report) may
 * do this. The employee's assigned/created tasks are reassigned to the manager
 * (no work is lost); the employee's own comments, time logs, notifications and
 * chat history are deleted; then the user is removed (freeing their email/phone).
 */
export const deleteEmployee = async (managerId: string, employeeId: string) => {
  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || manager.role !== 'ADMIN') {
    throw new AppError('Only admins can remove members', 403);
  }

  const employee = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!employee) throw new AppError('Member not found', 404);
  if (employee.id === manager.id) throw new AppError('You cannot remove yourself', 400);
  if (employee.managerId !== manager.id) {
    throw new AppError('You can only remove your own team members', 403);
  }

  // Capture the org name before we delete the user (for the removal message).
  const org = employee.organizationId
    ? await prisma.organization.findUnique({ where: { id: employee.organizationId } })
    : null;
  const orgName = org?.name ?? "the manager's organization";

  await prisma.$transaction([
    // Keep the work: reassign the employee's tasks to the firing manager.
    prisma.task.updateMany({ where: { assignedToId: employeeId }, data: { assignedToId: managerId } }),
    prisma.task.updateMany({ where: { createdById: employeeId }, data: { createdById: managerId } }),
    // Remove records that reference the employee directly.
    prisma.comment.deleteMany({ where: { userId: employeeId } }),
    prisma.timeLog.deleteMany({ where: { userId: employeeId } }),
    prisma.notification.deleteMany({ where: { userId: employeeId } }),
    prisma.user.updateMany({ where: { managerId: employeeId }, data: { managerId: null } }),
    prisma.user.delete({ where: { id: employeeId } }),
  ]);

  // Conversation history is keyed by phone (not a FK) — clean it up separately.
  if (employee.phone) {
    await prisma.conversationMessage.deleteMany({ where: { phone: employee.phone } });

    // Notify the removed employee on WhatsApp. Fire-and-forget — a delivery
    // failure must not fail the removal.
    void sendRemovalNotice({
      phone: employee.phone,
      name: employee.name,
      orgName,
      organizationId: employee.organizationId,
    }).catch((err) => console.error(`Failed to send removal notice to ${employee.phone}:`, err));
  }

  return { id: employee.id, name: employee.name, email: employee.email };
};

/**
 * Promote/demote a direct report between ADMIN and MEMBER permission roles.
 * Only an admin may do this, and only for their own team members.
 */
export const setMemberRole = async (
  managerId: string,
  targetId: string,
  role: 'ADMIN' | 'MEMBER'
) => {
  if (role !== 'ADMIN' && role !== 'MEMBER') throw new AppError('Role must be ADMIN or MEMBER', 400);

  const manager = await prisma.user.findUnique({ where: { id: managerId } });
  if (!manager || manager.role !== 'ADMIN') {
    throw new AppError('Only admins can change roles', 403);
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new AppError('Member not found', 404);
  if (target.id === manager.id) throw new AppError('You cannot change your own role', 400);
  if (target.managerId !== manager.id) {
    throw new AppError('You can only change roles for your own team members', 403);
  }

  return prisma.user.update({
    where: { id: targetId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, designation: true },
  });
};
