import { prisma } from '../lib/prisma';
import { config } from '../config';

const GUPSHUP_API_URL = 'https://api.gupshup.io/wa/api/v1/msg';
const GUPSHUP_TEMPLATE_ID = 'common_misc_1';

type DeliveryLogCreateArgs = {
  data: {
    phone: string;
    message: string;
    status: 'sent' | 'failed';
  };
};

type DeliveryLogDelegate = {
  create(args: DeliveryLogCreateArgs): Promise<unknown>;
};

const deliveryLogDelegate = (prisma as typeof prisma & { deliveryLog?: DeliveryLogDelegate })
  .deliveryLog;

const saveDeliveryLog = async (phone: string, message: string, status: 'sent' | 'failed') => {
  if (!deliveryLogDelegate) {
    console.error('Prisma DeliveryLog delegate is unavailable. Run prisma generate.');
    return;
  }

  await deliveryLogDelegate.create({
    data: {
      phone,
      message,
      status,
    },
  });
};

export const sendWhatsAppMessage = async (to: string, params: [string, string]): Promise<boolean> => {
  if (!config.gupshupApiKey || !config.gupshupSourceNumber) {
    console.error(
      'Gupshup WhatsApp is not configured. Check GUPSHUP_API_KEY and GUPSHUP_SOURCE_NUMBER.'
    );
    return false;
  }

  const messagePayload = {
    type: 'template',
    template: {
      id: GUPSHUP_TEMPLATE_ID,
      params,
    },
  };

  const message = JSON.stringify(messagePayload);

  const payload = new URLSearchParams({
    channel: 'whatsapp',
    source: config.gupshupSourceNumber,
    destination: to,
    message,
    'src.name': process.env.GUPSHUP_SRC_NAME || 'TaskPulseNotif',
  });

  try {
    const response = await fetch(GUPSHUP_API_URL, {
      method: 'POST',
      headers: {
        apikey: config.gupshupApiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Gupshup request failed with status ${response.status}. Response: ${responseText}`
      );
    }

    await saveDeliveryLog(to, message, 'sent');
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message via Gupshup:', error);
    try {
      await saveDeliveryLog(to, message, 'failed');
    } catch (logError) {
      console.error('Failed to save WhatsApp delivery log:', logError);
    }
    return false;
  }
};
