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
  // "Update for task" template, sent to the assignee when an existing task is
  // changed (status update / comment) via the WhatsApp agent.
  // Params: {{1}} assignee name, {{2}} change type, {{3}} task id, {{4}} status.
  gupshupTaskUpdateTemplateId:
    process.env.GUPSHUP_TASK_UPDATE_TEMPLATE_ID || 'a1c29eeb-fd2e-4ad9-81a5-93bc47bb4992',
  // Optional approved template for the onboarding welcome message. If set, the
  // welcome is sent as a template (deliverable to cold/new numbers); otherwise a
  // free-form session text is used (only delivered within the 24h session window).
  gupshupOnboardingTemplateId: process.env.GUPSHUP_ONBOARDING_TEMPLATE_ID || '',
  // Optional approved template for the removal/offboarding message (same 24h
  // session-window caveat as onboarding when no template is set).
  gupshupRemovalTemplateId: process.env.GUPSHUP_REMOVAL_TEMPLATE_ID || '',
  // Default country code prepended to 10-digit local numbers (India = 91).
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '91',
  // Anthropic / Claude — used to classify inbound WhatsApp messages (e.g. greetings).
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  // Base URL of the TaskPulse web app, used to build task deep-links in messages.
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  // For now, all greeting auto-replies go to this WhatsApp number (see PRD note).
  whatsappTestRecipient: process.env.WHATSAPP_TEST_RECIPIENT || '7838372541',

  // Billing / metering. All money is in paise (₹1 = 100 paise).
  billing: {
    whatsappPaisePerMessage: Number(process.env.WHATSAPP_PRICE_PAISE || 50), // 50 paise / message
    // AI is metered by tokens at a ₹/million-token rate (set your selling price).
    aiInputPaisePerMTok: Number(process.env.AI_INPUT_PAISE_PER_MTOK || 50000), // ₹500 / 1M input tokens
    aiOutputPaisePerMTok: Number(process.env.AI_OUTPUT_PAISE_PER_MTOK || 250000), // ₹2500 / 1M output tokens
    gstPercent: Number(process.env.GST_PERCENT || 18),
    lowBalancePaise: Number(process.env.LOW_BALANCE_PAISE || 50000), // warn under ₹500
    company: {
      name: process.env.COMPANY_NAME || 'QverLabs',
      gstin: process.env.COMPANY_GSTIN || '',
      address: process.env.COMPANY_ADDRESS || '',
      state: process.env.COMPANY_STATE || '',
      invoicePrefix: process.env.INVOICE_PREFIX || 'TP',
      // Provider logo on invoices (the official QverLabs logo). Override via
      // COMPANY_LOGO_URL with a URL or data URI.
      logoUrl: process.env.COMPANY_LOGO_URL || 'https://qverlabs.com/assets/navbar-logo.png',
    },
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
};
