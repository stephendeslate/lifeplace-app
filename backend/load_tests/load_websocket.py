"""
WebSocket Stress Testing for Availability Updates

Tests the real-time availability WebSocket used during booking flow.

Based on verified code review of:
- Backend: core/domains/messaging/routing.py, consumers.py
- Frontend: frontend/client-portal/src/hooks/useAvailabilityWebSocket.ts

WebSocket endpoints:
- ws://host/ws/availability/ - Public availability updates

Message types:
- type: 'date_blocked' - Date taken by another booking
- type: 'date_released' - Date released/cancelled
- type: 'ping' - Heartbeat (30s interval)
- type: 'pong' - Response

The availability WebSocket is critical because:
1. Stays open during entire booking flow
2. Broadcasts to all connected clients on date changes
3. Prevents double-booking race conditions
"""

import json
import time
import logging
import threading
from typing import Optional, Dict, Any, List
from datetime import datetime
import websocket

from config import config

logger = logging.getLogger(__name__)


class WebSocketStressTest:
    """
    Stress test for WebSocket connections.

    Tests:
    1. Connection establishment under load
    2. Message handling with many concurrent connections
    3. Connection stability over time (soak test)
    4. Reconnection handling
    """

    def __init__(self, base_ws_url: str = None):
        self.base_url = base_ws_url or config.ws_base_url
        self.connections: List[websocket.WebSocket] = []
        self.stats = {
            "connections_attempted": 0,
            "connections_successful": 0,
            "connections_failed": 0,
            "messages_received": 0,
            "messages_sent": 0,
            "reconnections": 0,
            "errors": [],
        }
        self._lock = threading.Lock()

    def connect_availability_ws(self) -> Optional[websocket.WebSocket]:
        """
        Establish a WebSocket connection to availability endpoint.

        Endpoint: ws://host/ws/availability/
        Based on: core/domains/messaging/routing.py
        """
        ws_url = f"{self.base_url}/ws/availability/"

        with self._lock:
            self.stats["connections_attempted"] += 1

        try:
            ws = websocket.create_connection(
                ws_url,
                timeout=10,
                header={
                    "Origin": self.base_url.replace("wss://", "https://").replace("ws://", "http://")
                }
            )

            with self._lock:
                self.stats["connections_successful"] += 1
                self.connections.append(ws)

            return ws

        except Exception as e:
            with self._lock:
                self.stats["connections_failed"] += 1
                self.stats["errors"].append(str(e))

            logger.error(f"WebSocket connection failed: {e}")
            return None

    def send_ping(self, ws: websocket.WebSocket) -> bool:
        """
        Send a ping message and wait for pong.

        Based on: frontend/client-portal/src/hooks/useAvailabilityWebSocket.ts
        Heartbeat interval is 30 seconds.
        """
        try:
            ping_message = json.dumps({"type": "ping"})
            ws.send(ping_message)

            with self._lock:
                self.stats["messages_sent"] += 1

            # Wait for pong response
            response = ws.recv()

            with self._lock:
                self.stats["messages_received"] += 1

            data = json.loads(response)
            return data.get("type") == "pong"

        except Exception as e:
            logger.error(f"Ping failed: {e}")
            return False

    def simulate_connection_lifecycle(self, duration_seconds: int = 60) -> Dict[str, Any]:
        """
        Simulate a realistic WebSocket connection lifecycle.

        A typical booking flow user:
        1. Connects when entering datetime step
        2. Stays connected for 5-15 minutes
        3. Receives availability updates
        4. Disconnects on completion or abandonment
        """
        start_time = time.time()
        ws = self.connect_availability_ws()

        if not ws:
            return {"success": False, "error": "Connection failed"}

        messages_received = 0
        pings_sent = 0

        try:
            ws.settimeout(5)  # 5 second timeout for recv

            while time.time() - start_time < duration_seconds:
                # Send ping every 30 seconds
                if time.time() % 30 < 1:
                    if self.send_ping(ws):
                        pings_sent += 1
                    time.sleep(1)

                # Try to receive messages (non-blocking with timeout)
                try:
                    message = ws.recv()
                    messages_received += 1

                    with self._lock:
                        self.stats["messages_received"] += 1

                    data = json.loads(message)
                    logger.debug(f"Received message type: {data.get('type')}")

                except websocket.WebSocketTimeoutException:
                    # No message available, continue
                    pass

                time.sleep(0.1)  # Small delay to prevent tight loop

        except Exception as e:
            logger.error(f"Connection error during lifecycle: {e}")

        finally:
            try:
                ws.close()
                with self._lock:
                    if ws in self.connections:
                        self.connections.remove(ws)
            except:
                pass

        return {
            "success": True,
            "duration": time.time() - start_time,
            "messages_received": messages_received,
            "pings_sent": pings_sent,
        }

    def concurrent_connections_test(self, num_connections: int = 50) -> Dict[str, Any]:
        """
        Test establishing many concurrent WebSocket connections.

        This simulates the scenario where many users are in the
        booking flow datetime step simultaneously.

        Target: Based on config, test with 50-100 concurrent connections
        """
        logger.info(f"Starting concurrent connections test with {num_connections} connections")

        threads = []
        results = []

        def connect_and_hold(connection_id: int):
            """Connect and hold connection for a period."""
            ws = self.connect_availability_ws()
            if ws:
                # Hold connection for 30 seconds
                time.sleep(30)

                # Send a ping
                self.send_ping(ws)

                try:
                    ws.close()
                    with self._lock:
                        if ws in self.connections:
                            self.connections.remove(ws)
                except:
                    pass

                results.append({"id": connection_id, "success": True})
            else:
                results.append({"id": connection_id, "success": False})

        # Start all connections
        for i in range(num_connections):
            t = threading.Thread(target=connect_and_hold, args=(i,))
            threads.append(t)
            t.start()

            # Stagger connections slightly to avoid thundering herd
            time.sleep(0.1)

        # Wait for all threads to complete
        for t in threads:
            t.join(timeout=60)

        successful = sum(1 for r in results if r["success"])

        return {
            "total_attempted": num_connections,
            "successful": successful,
            "failed": num_connections - successful,
            "success_rate": successful / num_connections * 100,
            "stats": self.stats.copy(),
        }

    def reconnection_test(self, num_cycles: int = 10) -> Dict[str, Any]:
        """
        Test connection/disconnection cycles.

        Simulates users entering and leaving the datetime step,
        or network interruptions causing reconnections.
        """
        logger.info(f"Starting reconnection test with {num_cycles} cycles")

        results = []

        for i in range(num_cycles):
            # Connect
            ws = self.connect_availability_ws()

            if ws:
                # Hold for a bit
                time.sleep(2)

                # Send ping
                ping_success = self.send_ping(ws)

                # Disconnect
                try:
                    ws.close()
                    with self._lock:
                        if ws in self.connections:
                            self.connections.remove(ws)
                except:
                    pass

                results.append({
                    "cycle": i,
                    "connect_success": True,
                    "ping_success": ping_success,
                })
            else:
                results.append({
                    "cycle": i,
                    "connect_success": False,
                    "ping_success": False,
                })

            # Wait before next cycle
            time.sleep(1)

        successful = sum(1 for r in results if r["connect_success"])

        return {
            "total_cycles": num_cycles,
            "successful_connections": successful,
            "failed_connections": num_cycles - successful,
            "success_rate": successful / num_cycles * 100,
            "results": results,
        }

    def message_broadcast_test(self, num_listeners: int = 20) -> Dict[str, Any]:
        """
        Test message broadcasting to multiple connected clients.

        This simulates the scenario where a date is blocked/released
        and all connected clients need to receive the update.

        NOTE: This requires backend to actually send broadcast messages.
        In production, this happens when dates are blocked during booking.
        """
        logger.info(f"Starting broadcast test with {num_listeners} listeners")

        # Connect all listeners
        listeners = []
        for i in range(num_listeners):
            ws = self.connect_availability_ws()
            if ws:
                listeners.append(ws)
            time.sleep(0.05)  # Slight delay

        logger.info(f"Connected {len(listeners)} listeners")

        # Wait for any broadcast messages (in reality, would need to trigger
        # a date blocking action on the backend)
        messages_received = []

        for ws in listeners:
            try:
                ws.settimeout(5)
                message = ws.recv()
                messages_received.append(message)
            except websocket.WebSocketTimeoutException:
                pass
            except Exception as e:
                logger.error(f"Error receiving: {e}")

        # Cleanup
        for ws in listeners:
            try:
                ws.close()
            except:
                pass

        with self._lock:
            self.connections = [c for c in self.connections if c not in listeners]

        return {
            "listeners_connected": len(listeners),
            "messages_received": len(messages_received),
            "stats": self.stats.copy(),
        }

    def cleanup(self):
        """Close all open connections."""
        for ws in self.connections[:]:
            try:
                ws.close()
            except:
                pass
        self.connections = []

    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics."""
        with self._lock:
            return {
                **self.stats,
                "active_connections": len(self.connections),
            }


def run_websocket_stress_test():
    """
    Run a complete WebSocket stress test suite.

    This can be run standalone or integrated with Locust.
    """
    logger.info("=" * 60)
    logger.info("WebSocket Stress Test Starting")
    logger.info("=" * 60)

    tester = WebSocketStressTest()

    try:
        # Test 1: Single connection lifecycle
        logger.info("\n--- Test 1: Single Connection Lifecycle ---")
        lifecycle_result = tester.simulate_connection_lifecycle(duration_seconds=30)
        logger.info(f"Result: {lifecycle_result}")

        # Test 2: Concurrent connections
        logger.info("\n--- Test 2: Concurrent Connections (50) ---")
        concurrent_result = tester.concurrent_connections_test(num_connections=50)
        logger.info(f"Success rate: {concurrent_result['success_rate']:.1f}%")

        # Test 3: Reconnection cycles
        logger.info("\n--- Test 3: Reconnection Cycles ---")
        reconnect_result = tester.reconnection_test(num_cycles=10)
        logger.info(f"Success rate: {reconnect_result['success_rate']:.1f}%")

        # Final stats
        logger.info("\n--- Final Statistics ---")
        final_stats = tester.get_stats()
        for key, value in final_stats.items():
            logger.info(f"  {key}: {value}")

    finally:
        tester.cleanup()

    logger.info("\n" + "=" * 60)
    logger.info("WebSocket Stress Test Complete")
    logger.info("=" * 60)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_websocket_stress_test()
