'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getWebSocket, channels, SwapSmartWebSocket } from '@/lib/websocket';
import { useAuthStore } from '@/stores/auth.store';
import { useOfflineStore } from '@/stores/offline.store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://ws.swapsmart.ng';

/**
 * Hook wrapping the WebSocket client for real-time updates.
 * Manages connection lifecycle, subscriptions, and offline state.
 */
export function useWebSocket() {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const setOffline = useOfflineStore((s) => s.setOffline);
  const setCountdown = useOfflineStore((s) => s.setReconnectCountdown);
  const wsRef = useRef<SwapSmartWebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const ws = getWebSocket({
      url: WS_URL,
      getToken: () => token,
      onConnect: () => setOffline(false),
      onDisconnect: () => setOffline(true),
      onReconnect: () => setOffline(false),
    });

    ws.onCountdownUpdate = (seconds) => setCountdown(seconds);
    ws.onOfflineChange = (offline) => setOffline(offline);
    ws.connect();
    wsRef.current = ws;

    return () => {
      ws.disconnect();
    };
  }, [token, setOffline, setCountdown]);

  const subscribe = useCallback(
    (channel: string, handler: (data: unknown) => void) => {
      if (!wsRef.current) return () => {};
      return wsRef.current.subscribe(channel, handler);
    },
    []
  );

  return { subscribe, channels };
}
