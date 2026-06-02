'use client';

type MessageHandler = (data: unknown) => void;

interface WebSocketConfig {
  /** WebSocket URL */
  url: string;
  /** Initial reconnect delay in ms */
  initialReconnectDelay?: number;
  /** Maximum reconnect delay in ms */
  maxReconnectDelay?: number;
  /** Auth token for connection */
  getToken?: () => string | null;
  /** Called when connection is established */
  onConnect?: () => void;
  /** Called when connection is lost */
  onDisconnect?: () => void;
  /** Called when reconnection succeeds */
  onReconnect?: () => void;
}

interface QueuedRequest {
  channel: string;
  action: string;
  payload: unknown;
  timestamp: number;
}

/**
 * Reconnecting WebSocket wrapper with:
 * - Exponential backoff (5s start, 60s max)
 * - Channel subscription management
 * - Disconnect/reconnect handlers
 * - Background sync queue for failed requests
 */
export class SwapSmartWebSocket {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed = false;
  private syncQueue: QueuedRequest[] = [];
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private currentCountdown = 0;

  // Callbacks for external state management
  public onCountdownUpdate?: (seconds: number) => void;
  public onOfflineChange?: (isOffline: boolean) => void;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      initialReconnectDelay: config.initialReconnectDelay ?? 5000,
      maxReconnectDelay: config.maxReconnectDelay ?? 60000,
      getToken: config.getToken ?? (() => null),
      onConnect: config.onConnect ?? (() => {}),
      onDisconnect: config.onDisconnect ?? (() => {}),
      onReconnect: config.onReconnect ?? (() => {}),
    };
  }

  /** Connect to the WebSocket server */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.isIntentionallyClosed = false;
    const token = this.config.getToken();
    const url = token ? `${this.config.url}?token=${token}` : this.config.url;

    try {
      this.ws = new WebSocket(url);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /** Disconnect from the WebSocket server */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimer();
    this.clearCountdown();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /** Subscribe to a channel */
  subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(handler);

    // Send subscribe message to server
    this.sendMessage({
      action: 'subscribe',
      channel,
    });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, handler);
    };
  }

  /** Unsubscribe from a channel */
  unsubscribe(channel: string, handler: MessageHandler): void {
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(channel);
        this.sendMessage({
          action: 'unsubscribe',
          channel,
        });
      }
    }
  }

  /** Send a message, queuing if offline */
  sendMessage(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      // Queue for background sync
      this.syncQueue.push({
        channel: (data.channel as string) || '',
        action: (data.action as string) || '',
        payload: data,
        timestamp: Date.now(),
      });
    }
  }

  /** Get the current connection state */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Get queued requests count */
  get queuedCount(): number {
    return this.syncQueue.length;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
      this.clearCountdown();
      this.onOfflineChange?.(false);

      if (this.reconnectAttempts > 0) {
        this.config.onReconnect();
        this.resubscribeAll();
        this.flushSyncQueue();
      }

      this.config.onConnect();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const channel = message.channel as string;

        if (channel && this.subscriptions.has(channel)) {
          const handlers = this.subscriptions.get(channel)!;
          handlers.forEach((handler) => handler(message.data));
        }
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event.code, event.reason);
      this.ws = null;

      if (!this.isIntentionallyClosed) {
        this.config.onDisconnect();
        this.onOfflineChange?.(true);
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) return;

    this.clearReconnectTimer();
    this.reconnectAttempts++;

    // Exponential backoff: 5s, 10s, 20s, 40s, 60s (max)
    const delay = Math.min(
      this.config.initialReconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay
    );

    console.log(`[WebSocket] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts})`);

    // Start countdown
    this.startCountdown(Math.ceil(delay / 1000));

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startCountdown(seconds: number): void {
    this.clearCountdown();
    this.currentCountdown = seconds;
    this.onCountdownUpdate?.(this.currentCountdown);

    this.countdownInterval = setInterval(() => {
      this.currentCountdown--;
      this.onCountdownUpdate?.(Math.max(0, this.currentCountdown));

      if (this.currentCountdown <= 0) {
        this.clearCountdown();
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.currentCountdown = 0;
    this.onCountdownUpdate?.(0);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((_, channel) => {
      this.sendMessage({
        action: 'subscribe',
        channel,
      });
    });
  }

  private flushSyncQueue(): void {
    const queue = [...this.syncQueue];
    this.syncQueue = [];

    // Only replay requests from the last 5 minutes
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const validRequests = queue.filter((req) => req.timestamp > fiveMinutesAgo);

    for (const request of validRequests) {
      this.sendMessage(request.payload as Record<string, unknown>);
    }

    if (queue.length > validRequests.length) {
      console.log(
        `[WebSocket] Dropped ${queue.length - validRequests.length} stale queued requests`
      );
    }
  }
}

// Predefined channel helpers
export const channels = {
  stationAvailability: (stationId: string) => `station/${stationId}/availability`,
  reservationStatus: (reservationId: string) => `reservation/${reservationId}/status`,
  fleetTelemetry: (fleetId: string) => `fleet/${fleetId}/telemetry`,
  userNotifications: (userId: string) => `user/${userId}/notifications`,
} as const;

// Singleton instance (created lazily)
let wsInstance: SwapSmartWebSocket | null = null;

export function getWebSocket(config?: WebSocketConfig): SwapSmartWebSocket {
  if (!wsInstance && config) {
    wsInstance = new SwapSmartWebSocket(config);
  }
  if (!wsInstance) {
    throw new Error('WebSocket not initialized. Call getWebSocket with config first.');
  }
  return wsInstance;
}

export function resetWebSocket(): void {
  if (wsInstance) {
    wsInstance.disconnect();
    wsInstance = null;
  }
}
