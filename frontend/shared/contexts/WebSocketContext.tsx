/**
 * WebSocket Context Bridge
 * 
 * This file re-exports the WebSocketProvider from the services directory
 * to maintain compatibility with existing imports.
 */

export { 
  WebSocketProvider, 
  useWebSocket, 
  useWebSocketConnectionState, 
  useWebSocketMetrics 
} from '../services/websocket.context';