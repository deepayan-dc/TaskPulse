import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey_for_development_only',
  dbUrl: process.env.DATABASE_URL,
  msg91ApiKey: process.env.MSG91_API_KEY,
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID,
};
