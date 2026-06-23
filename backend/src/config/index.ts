import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'supersecretjwtkey_for_development_only',
  dbUrl: process.env.DATABASE_URL,
  gupshupApiKey: process.env.GUPSHUP_API_KEY,
  gupshupSourceNumber: process.env.GUPSHUP_SOURCE_NUMBER,
  gupshupSrcName: process.env.GUPSHUP_SRC_NAME || 'TaskPulseNotif',
  gupshupTemplateId: process.env.GUPSHUP_TEMPLATE_ID || '3a09588b-f293-4134-9b72-b0f0519000a6',
  // Default country code prepended to 10-digit local numbers (India = 91).
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '91',
  // Anthropic / Claude — used to classify inbound WhatsApp messages (e.g. greetings).
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  // Base URL of the TaskPulse web app, used to build task deep-links in messages.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // For now, all greeting auto-replies go to this WhatsApp number (see PRD note).
  whatsappTestRecipient: process.env.WHATSAPP_TEST_RECIPIENT || '7838372541',
};
