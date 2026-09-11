import { useContext } from 'react';
import { WebSocketContext } from '../context/WebSocketContext';

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return ctx;
}

export default useWebSocket;

