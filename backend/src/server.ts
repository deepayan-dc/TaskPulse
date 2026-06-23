import http from 'http';
import app from './app';
import { initSocket } from './socket';
import { ensureSchema } from './lib/ensure-schema';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

const start = async () => {
  try {
    await ensureSchema();
  } catch (error) {
    console.error('ensureSchema failed:', error);
  }

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

start();
