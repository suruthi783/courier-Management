import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { query, execute } from '../config/database.js';
import { JwtPayload, Shipment } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'courier_super_secret_jwt_key';

// ── Per-client state ──────────────────────────────────────────
interface WsClient {
  ws: WebSocket;
  userId: string;
  role: string;
  branchId?: string;
  subscribedTopics: Set<string>;
  isAlive: boolean;
}

// ── Outbound event shape (mirrors frontend WSEvent) ───────────
interface WsEvent<T = unknown> {
  type: 'location.update' | 'status.update' | 'notification' | 'heartbeat' | 'auth' | 'error';
  topic: string;
  payload: T;
  timestamp: string;
}

function send<T>(ws: WebSocket, event: WsEvent<T>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(event));
  }
}

// ── Main bootstrap ────────────────────────────────────────────
export function createWsServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WsClient>();

  // ── Heartbeat ping every 30 s ────────────────────────────
  const pingInterval = setInterval(() => {
    wss.clients.forEach(ws => {
      const client = [...clients.values()].find(c => c.ws === ws);
      if (!client) return;

      if (!client.isAlive) {
        clients.delete(client.userId);
        return ws.terminate();
      }

      client.isAlive = false;
      ws.ping();

      send(ws, {
        type: 'heartbeat',
        topic: 'system',
        payload: { status: 'ok', ts: Date.now() },
        timestamp: new Date().toISOString(),
      });
    });
  }, 30_000);

  wss.on('close', () => clearInterval(pingInterval));

  // ── Live-location broadcast every 5 s ───────────────────
  const locationInterval = setInterval(() => {
    if (clients.size === 0) return;
    try {
      const activeShipments = query<Shipment>(
        `SELECT s.id, s.tracking_id, s.current_lat, s.current_lng,
                s.assigned_partner_id, s.branch_id,
                u.name AS assigned_partner_name
         FROM shipments s
         LEFT JOIN users u ON s.assigned_partner_id = u.id
         WHERE s.status = 'OUT_FOR_DELIVERY'
           AND s.current_lat IS NOT NULL`
      );

      for (const shipment of activeShipments) {
        const topic = `shipment.${shipment.tracking_id}.location`;
        const event: WsEvent = {
          type: 'location.update',
          topic,
          payload: {
            partnerId:   shipment.assigned_partner_id,
            partnerName: (shipment as any).assigned_partner_name,
            shipmentId:  shipment.id,
            trackingId:  shipment.tracking_id,
            lat:         Number(shipment.current_lat),
            lng:         Number(shipment.current_lng),
            timestamp:   new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };

        // Broadcast to subscribed clients
        for (const client of clients.values()) {
          if (client.subscribedTopics.has(topic) || client.subscribedTopics.has('location.*')) {
            send(client.ws, event);
          }
        }
      }
    } catch (err) {
      console.error('[WS] Location broadcast error:', err);
    }
  }, 5_000);

  wss.on('close', () => clearInterval(locationInterval));

  // ── New connection ───────────────────────────────────────
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('[WS] New connection from', req.socket.remoteAddress);

    // Extract token from query string: ws://host/ws?token=<jwt>
    const url   = new URL(req.url ?? '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      send(ws, {
        type: 'error',
        topic: 'system',
        payload: { message: 'No token provided' },
        timestamp: new Date().toISOString(),
      });
      ws.close(1008, 'No token');
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      send(ws, {
        type: 'error',
        topic: 'system',
        payload: { message: 'Invalid token' },
        timestamp: new Date().toISOString(),
      });
      ws.close(1008, 'Invalid token');
      return;
    }

    const client: WsClient = {
      ws,
      userId:           decoded.userId,
      role:             decoded.role,
      branchId:         decoded.branchId,
      subscribedTopics: new Set(),
      isAlive:          true,
    };

    clients.set(decoded.userId, client);

    // Auto-subscribe user to their own notification topic
    client.subscribedTopics.add(`user.${decoded.userId}.notifications`);

    send(ws, {
      type: 'auth',
      topic: 'system',
      payload: { status: 'authenticated', userId: decoded.userId, role: decoded.role },
      timestamp: new Date().toISOString(),
    });

    console.log(`[WS] Authenticated: ${decoded.userId} (${decoded.role})`);

    // ── Pong handler ─────────────────────────────────────
    ws.on('pong', () => { client.isAlive = true; });

    // ── Message handler ──────────────────────────────────
    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as {
          action: 'subscribe' | 'unsubscribe' | 'location.update';
          topic?: string;
          payload?: { lat: number; lng: number; shipmentId: string };
        };

        if (msg.action === 'subscribe' && msg.topic) {
          client.subscribedTopics.add(msg.topic);
          send(ws, {
            type: 'auth',
            topic: msg.topic,
            payload: { status: 'subscribed', topic: msg.topic },
            timestamp: new Date().toISOString(),
          });
        }

        if (msg.action === 'unsubscribe' && msg.topic) {
          client.subscribedTopics.delete(msg.topic);
        }

        // Delivery partner pushes their location
        if (msg.action === 'location.update' && msg.payload && client.role === 'DELIVERY_PARTNER') {
          const { lat, lng, shipmentId } = msg.payload;

          try {
            // Persist to DB (synchronous SQLite)
            execute(
              'UPDATE shipments SET current_lat = ?, current_lng = ? WHERE id = ? AND assigned_partner_id = ?',
              [lat, lng, shipmentId, client.userId]
            );

            // Broadcast to subscribers
            const rows = query<{ tracking_id: string }>(
              'SELECT tracking_id FROM shipments WHERE id = ?',
              [shipmentId]
            );
            const trackingId = rows[0]?.tracking_id;
            if (trackingId) {
              const topic = `shipment.${trackingId}.location`;
              const locEvent: WsEvent = {
                type: 'location.update',
                topic,
                payload: { partnerId: client.userId, shipmentId, trackingId, lat, lng, timestamp: new Date().toISOString() },
                timestamp: new Date().toISOString(),
              };
              for (const c of clients.values()) {
                if (c.subscribedTopics.has(topic) || c.subscribedTopics.has('location.*')) {
                  send(c.ws, locEvent);
                }
              }
            }
          } catch (err) {
            console.error('[WS] location.update error:', err);
          }
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    });

    // ── Close handler ────────────────────────────────────
    ws.on('close', () => {
      clients.delete(decoded.userId);
      console.log(`[WS] Disconnected: ${decoded.userId}`);
    });

    ws.on('error', err => {
      console.error(`[WS] Error for ${decoded.userId}:`, err.message);
    });
  });

  // ── Public broadcast helper (called by REST controllers) ─
  (wss as any).broadcast = function broadcastToUser<T>(
    userId: string,
    event: WsEvent<T>
  ): void {
    const client = clients.get(userId);
    if (client) send(client.ws, event);
  };

  (wss as any).broadcastToTopic = function broadcastToTopic<T>(
    topic: string,
    event: WsEvent<T>
  ): void {
    for (const client of clients.values()) {
      if (client.subscribedTopics.has(topic)) {
        send(client.ws, event);
      }
    }
  };

  console.log('[WS] WebSocket server initialised on /ws');
  return wss;
}
