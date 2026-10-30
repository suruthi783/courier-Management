import { WSEvent, LocationUpdate, StatusUpdate, Notification } from '@/types';

type EventHandler = (event: WSEvent<any>) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:5000/ws';

class SocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 3000;
  private token: string | null = null;

  connect(token: string): Promise<void> {
    this.token = token;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${WS_URL}?token=${token}`);

        this.ws.onopen = () => {
          console.log('[WS] Connected');
          resolve();
        };

        this.ws.onmessage = (ev) => {
          try {
            const event: WSEvent = JSON.parse(ev.data);
            this._dispatch(event);
          } catch {/* ignore malformed frames */}
        };

        this.ws.onclose = () => {
          console.log('[WS] Disconnected — reconnecting in 3s');
          this._scheduleReconnect();
        };

        this.ws.onerror = (err) => {
          console.error('[WS] Error', err);
          reject(err);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.token = null;
  }

  subscribe(topic: string, handler: EventHandler): () => void {
    if (!this.handlers.has(topic)) this.handlers.set(topic, new Set());
    this.handlers.get(topic)!.add(handler);

    // Tell server we want this topic
    this._send({ action: 'subscribe', topic });

    return () => {
      this.handlers.get(topic)?.delete(handler);
      this._send({ action: 'unsubscribe', topic });
    };
  }

  /** Delivery partner pushes their GPS location */
  sendLocation(shipmentId: string, lat: number, lng: number): void {
    this._send({ action: 'location.update', payload: { shipmentId, lat, lng } });
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.ws) return 'disconnected';
    if (this.ws.readyState === WebSocket.CONNECTING) return 'connecting';
    if (this.ws.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }

  private _send(data: object): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(data));
    }
  }

  private _dispatch(event: WSEvent): void {
    const topicHandlers = this.handlers.get(event.topic);
    topicHandlers?.forEach(h => h(event));
  }

  private _scheduleReconnect(): void {
    if (!this.token) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('[WS] Reconnecting…');
      this.connect(this.token!).catch(() => this._scheduleReconnect());
    }, this.reconnectDelay);
  }
}

export const socketService = new SocketService();
