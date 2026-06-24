import { Router } from 'express';
import { basicAuth } from '../middleware/basic-auth.middleware';
import {
  usageController,
  walletController,
  createTopupOrderController,
  verifyTopupController,
  setGstinController,
  listInvoicesController,
  invoiceHtmlController,
  getInvoiceController,
  razorpayWebhookController,
} from '../controllers/billing.controller';

const router = Router();

// Razorpay → us. No basic auth; verified by webhook signature.
router.post('/webhook/razorpay', razorpayWebhookController);

// All other billing endpoints are manager-only; resolveManagerOrg enforces the role.
router.get('/usage', basicAuth, usageController);
router.get('/wallet', basicAuth, walletController);
router.post('/wallet/topup', basicAuth, createTopupOrderController);
router.post('/wallet/verify', basicAuth, verifyTopupController);
router.patch('/organization', basicAuth, setGstinController);
router.get('/invoices', basicAuth, listInvoicesController);
router.get('/invoices/:id/html', basicAuth, invoiceHtmlController);
router.get('/invoices/:id', basicAuth, getInvoiceController);

export default router;
