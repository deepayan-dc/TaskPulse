import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey_for_development_only',
  dbUrl: process.env.DATABASE_URL,
  gupshupApiKey: process.env.GUPSHUP_API_KEY,
  gupshupSourceNumber: process.env.GUPSHUP_SOURCE_NUMBER,
  gupshupSrcName: process.env.GUPSHUP_SRC_NAME || 'TaskPulseNotif',
  gupshupTemplateId: process.env.GUPSHUP_TEMPLATE_ID || 'common_misc_1',
  // Default country code prepended to 10-digit local numbers (India = 91).
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '91',
};
