import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/database.js';
import { createWsServer } from './websocket/wsServer.js';

dotenv.config();

const PORT = Number(process.env.PORT ?? 5000);

async function bootstrap(): Promise<void> {
  // 1. Connect to MySQL
  await connectDB();

  // 2. Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // 3. Attach WebSocket server
  createWsServer(httpServer);

  // 4. Start listening
  httpServer.listen(PORT, () => {
    console.log(`\n🚀  Courier API running on http://localhost:${PORT}`);
    console.log(`🔌  WebSocket server on  ws://localhost:${PORT}/ws`);
    console.log(`🩺  Health check        http://localhost:${PORT}/health\n`);
  });

  // ── Graceful shutdown ─────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully…`);
    httpServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

bootstrap().catch(err => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});
