import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey_for_development_only',
  dbUrl: process.env.DATABASE_URL,
  gupshupApiKey: process.env.GUPSHUP_API_KEY,
  gupshupSourceNumber: process.env.GUPSHUP_SOURCE_NUMBER,
  TaskPulseNotif: process.env.GUPSHUP_SRC_NAME || 'TaskPulseNotif',
};
