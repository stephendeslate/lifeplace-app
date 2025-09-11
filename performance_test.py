#!/usr/bin/env python3
"""
Basic performance test for messaging system.
Tests response times and basic load handling.
"""
import asyncio
import aiohttp
import time
import statistics
import sys

async def test_endpoint_response_time(session, url, num_requests=50):
    """Test response time for an endpoint."""
    response_times = []
    
    for i in range(num_requests):
        start_time = time.time()
        try:
            async with session.get(url) as response:
                await response.text()  # Read response
                end_time = time.time()
                response_times.append((end_time - start_time) * 1000)  # Convert to ms
        except Exception as e:
            print(f"Request {i+1} failed: {e}")
    
    return response_times

async def test_concurrent_requests(session, url, concurrent_requests=20):
    """Test concurrent request handling."""
    start_time = time.time()
    
    tasks = []
    for _ in range(concurrent_requests):
        task = asyncio.create_task(session.get(url))
        tasks.append(task)
    
    try:
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()
        
        successful = sum(1 for r in responses if not isinstance(r, Exception))
        failed = len(responses) - successful
        
        return {
            'total_time': (end_time - start_time) * 1000,  # ms
            'successful': successful,
            'failed': failed,
            'requests_per_second': concurrent_requests / (end_time - start_time)
        }
    except Exception as e:
        return {'error': str(e)}

async def main():
    """Run performance tests."""
    print("Performance Test for Messaging System")
    print("=" * 50)
    
    base_url = "http://127.0.0.1:8000"
    endpoints = [
        "/api/messaging/threads/",
        "/api/messaging/messages/",
        "/api/messaging/attachments/",
    ]
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Response time analysis
        print("Testing Response Times")
        print("-" * 30)
        
        for endpoint in endpoints:
            url = f"{base_url}{endpoint}"
            print(f"Testing {endpoint}...")
            
            response_times = await test_endpoint_response_time(session, url, 20)
            
            if response_times:
                avg_time = statistics.mean(response_times)
                min_time = min(response_times)
                max_time = max(response_times)
                median_time = statistics.median(response_times)
                
                print(f"  Average: {avg_time:.2f}ms")
                print(f"  Median:  {median_time:.2f}ms")
                print(f"  Min:     {min_time:.2f}ms")
                print(f"  Max:     {max_time:.2f}ms")
                
                # Performance assessment
                if avg_time < 100:
                    print(f"  ✓ Excellent performance")
                elif avg_time < 300:
                    print(f"  ✓ Good performance")
                elif avg_time < 1000:
                    print(f"  ! Acceptable performance")
                else:
                    print(f"  ✗ Poor performance")
            else:
                print(f"  ✗ No successful requests")
            print()
        
        # Test 2: Concurrent request handling
        print("Testing Concurrent Request Handling")
        print("-" * 30)
        
        test_url = f"{base_url}/api/messaging/threads/"
        
        for concurrent in [5, 10, 20]:
            print(f"Testing {concurrent} concurrent requests...")
            result = await test_concurrent_requests(session, test_url, concurrent)
            
            if 'error' not in result:
                print(f"  Total time: {result['total_time']:.2f}ms")
                print(f"  Successful: {result['successful']}/{concurrent}")
                print(f"  Failed: {result['failed']}")
                print(f"  Requests/sec: {result['requests_per_second']:.2f}")
                
                if result['successful'] == concurrent:
                    print(f"  ✓ All requests successful")
                else:
                    print(f"  ! Some requests failed")
            else:
                print(f"  ✗ Test failed: {result['error']}")
            print()
        
        # Test 3: Frontend accessibility
        print("Testing Frontend Accessibility")
        print("-" * 30)
        
        frontend_urls = [
            "http://localhost:5173/",  # Admin CRM
            "http://localhost:5174/",  # Client Portal
        ]
        
        for url in frontend_urls:
            try:
                start_time = time.time()
                async with session.get(url) as response:
                    content = await response.text()
                    end_time = time.time()
                    
                    response_time = (end_time - start_time) * 1000
                    print(f"{url}:")
                    print(f"  Status: {response.status}")
                    print(f"  Response time: {response_time:.2f}ms")
                    print(f"  Content length: {len(content)} bytes")
                    
                    if response.status == 200:
                        print(f"  ✓ Accessible")
                    else:
                        print(f"  ! Status {response.status}")
            except Exception as e:
                print(f"{url}:")
                print(f"  ✗ Failed: {e}")
            print()
    
    print("Performance test completed!")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nPerformance test interrupted by user")
        sys.exit(1)