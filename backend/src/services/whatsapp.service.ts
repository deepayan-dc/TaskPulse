import https from 'https';
import { config } from '../config';

const MSG91_WHATSAPP_API_URL =
  'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

type Msg91WhatsAppPayload = {
  integrated_number: string;
  content_type: string;
  payload: {
    type: string;
    template: {
      name: string;
      language: {
        code: string;
        policy: string;
      };
      to_and_components: Array<{
        to: string[];
        components: {
          body_1: {
            type: string;
            value: string;
          };
          body_2: {
            type: string;
            value: string;
          };
        };
      }>;
    };
  };
};

const buildPayload = (to: string, taskTitle: string, dueDate: string): Msg91WhatsAppPayload => ({
  integrated_number: 'sandbox',
  content_type: 'template',
  payload: {
    type: 'template',
    template: {
      name: config.msg91TemplateId || '',
      language: {
        code: 'en',
        policy: 'deterministic',
      },
      to_and_components: [
        {
          to: [to],
          components: {
            body_1: {
              type: 'text',
              value: taskTitle,
            },
            body_2: {
              type: 'text',
              value: dueDate,
            },
          },
        },
      ],
    },
  },
});

const postMsg91Request = async (payload: Msg91WhatsAppPayload): Promise<void> => {
  const requestBody = JSON.stringify(payload);

  await new Promise<void>((resolve, reject) => {
    const request = https.request(
      MSG91_WHATSAPP_API_URL,
      {
        method: 'POST',
        headers: {
          authkey: config.msg91ApiKey || '',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
        },
      },
      (response) => {
        let responseBody = '';

        response.on('data', (chunk) => {
          responseBody += chunk.toString();
        });

        response.on('end', () => {
          const statusCode = response.statusCode || 500;

          if (statusCode >= 200 && statusCode < 300) {
            resolve();
            return;
          }

          reject(
            new Error(`MSG91 request failed with status ${statusCode}. Response: ${responseBody}`)
          );
        });
      }
    );

    request.on('error', (error) => {
      reject(error);
    });

    request.write(requestBody);
    request.end();
  });
};

export const sendWhatsAppMessage = async (
  to: string,
  taskTitle: string,
  dueDate: string
): Promise<boolean> => {
  if (!config.msg91ApiKey || !config.msg91TemplateId) {
    console.error('MSG91 WhatsApp is not configured. Check MSG91_API_KEY and MSG91_TEMPLATE_ID.');
    return false;
  }

  try {
    const payload = buildPayload(to, taskTitle, dueDate);
    await postMsg91Request(payload);
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message via MSG91:', error);
    return false;
  }
};
