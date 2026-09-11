import React, { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, disconnectSocket } from '../api/socket';
import { WebSocketContext } from './WebSocketContext';

export default function WebSocketProvider({ children }) {
  const [connected, setConnected] = useState(() => getSocket().connected);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      console.log('[WS] Connected');
      setConnected(true);
    };

    const onDisconnect = (reason) => {
      console.log('[WS] Disconnected:', reason);
      setConnected(false);
    };

    const onReconnectAttempt = (attempt) => {
      console.log('[WS] Reconnection attempt:', attempt);
    };

    const onReconnect = () => {
      console.log('[WS] Reconnected');
      setConnected(true);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('reconnect', onReconnect);

    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('reconnect', onReconnect);
      disconnectSocket();
      setConnected(false);
    };
  }, []);

  const subscribe = useCallback((eventName, callback) => {
    const socket = socketRef.current || getSocket();
    if (socket) {
      socket.on(eventName, callback);
    }
    return () => {
      if (socket) {
        socket.off(eventName, callback);
      }
    };
  }, []);

  const emit = useCallback((eventName, data) => {
    const socket = socketRef.current || getSocket();
    if (socket && socket.connected) {
      socket.emit(eventName, data);
    }
  }, []);

  const value = {
    connected,
    subscribe,
    emit,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
