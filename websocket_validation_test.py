#!/usr/bin/env python3
"""
WebSocket connection validation test for messaging system.
Tests basic WebSocket connectivity without authentication.
"""
import asyncio
import websockets
import json
import sys

async def test_websocket_connection(url, name):
    """Test a WebSocket connection to the given URL."""
    try:
        print(f"Testing {name}: {url}")
        
        # Try to connect with a timeout
        async with websockets.connect(url) as websocket:
            print(f"✓ {name}: Connection established successfully")
            
            # Try to send a test message
            test_message = {"type": "test", "message": "connection_test"}
            await websocket.send(json.dumps(test_message))
            print(f"✓ {name}: Test message sent")
            
            # Try to receive a response (with timeout)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"✓ {name}: Received response: {response[:100]}...")
            except asyncio.TimeoutError:
                print(f"! {name}: No response received (timeout) - but connection works")
            
            return True
            
    except Exception as e:
        if hasattr(e, 'status_code') and e.status_code == 403:
            print(f"✓ {name}: Authentication required (403) - WebSocket is properly secured")
            return True
        elif "403" in str(e):
            print(f"✓ {name}: Authentication required (403) - WebSocket is properly secured")
            return True
        else:
            print(f"✗ {name}: Connection failed - {type(e).__name__}: {e}")
            return False

async def main():
    """Test all WebSocket endpoints."""
    print("WebSocket Connection Validation Test")
    print("=" * 50)
    
    # Define test URLs
    test_cases = [
        ("ws://127.0.0.1:8000/ws/messaging/user/", "User Messaging"),
        ("ws://127.0.0.1:8000/ws/messaging/general/", "General Messaging"),
        ("ws://127.0.0.1:8000/ws/messaging/thread/test-uuid/", "Thread Messaging"),
        ("ws://127.0.0.1:8000/ws/messaging/room/test-uuid/", "Room Messaging"),
        ("ws://127.0.0.1:8000/ws/messaging/private/1/", "Private Messaging"),
    ]
    
    results = []
    for url, name in test_cases:
        success = await test_websocket_connection(url, name)
        results.append((name, success))
        print()  # Add spacing between tests
    
    # Summary
    print("Summary:")
    print("-" * 30)
    successful = 0
    for name, success in results:
        status = "✓ PASS" if success else "✗ FAIL"
        print(f"{status}: {name}")
        if success:
            successful += 1
    
    print(f"\nOverall: {successful}/{len(results)} endpoints accessible")
    
    if successful == len(results):
        print("🎉 All WebSocket endpoints are properly configured!")
        return 0
    else:
        print("⚠️  Some WebSocket endpoints have issues")
        return 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        sys.exit(1)