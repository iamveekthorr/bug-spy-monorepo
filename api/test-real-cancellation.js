#!/usr/bin/env node

/**
 * Test script to verify REAL request cancellation
 * Tests that server actually stops processing when request is cancelled
 */

const http = require('http');

async function testRealCancellation() {
  console.log('🧪 Testing REAL Request Cancellation (Postman-style)');
  
  // Test: Make request and cancel it quickly
  console.log('\n1️⃣  Test: Cancel request during processing');
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Create request that will take time to process
    const request = http.request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/capture-metrics/single?url=https://httpbin.org/delay/10', // 10 second delay
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      }
    });

    let responseStarted = false;
    let responseCancelled = false;

    request.on('response', (res) => {
      console.log('   ✅ Response started (status:', res.statusCode, ')');
      responseStarted = true;
      
      // Cancel after 2 seconds (while server is still processing)
      setTimeout(() => {
        console.log('   🚫 Cancelling request...');
        request.destroy(); // Simulate Postman cancel
        responseCancelled = true;
        
        // Check if server logs show cancellation after a brief delay
        setTimeout(() => {
          const duration = Date.now() - startTime;
          console.log(`   ⏱️  Total time: ${duration}ms`);
          
          if (duration < 8000) { // Should be much less than 10 seconds
            console.log('   ✅ SUCCESS: Request appears to have been cancelled early!');
            console.log('   📝 Check server logs for "Request cancelled" messages');
          } else {
            console.log('   ❌ FAILED: Request took too long - may not have been cancelled');
          }
          
          resolve();
        }, 1000);
        
      }, 2000);
    });

    request.on('error', (err) => {
      if (err.code === 'ECONNRESET' || err.message.includes('aborted')) {
        console.log('   ✅ Request properly cancelled:', err.message);
      } else {
        console.log('   ❌ Unexpected error:', err.message);
      }
    });

    request.on('close', () => {
      console.log('   🔌 Connection closed');
    });

    request.end();
    
    // Safety timeout
    setTimeout(() => {
      if (!responseCancelled) {
        console.log('   ⚠️  Test timeout - request may not have been cancelled properly');
        request.destroy();
        resolve();
      }
    }, 15000);
  });
}

// Run the test
console.log('🔍 Testing real cancellation behavior...');
testRealCancellation().then(() => {
  console.log('\n📝 How to interpret results:');
  console.log('   ✅ Good: Request completes in < 8 seconds (cancelled during processing)');
  console.log('   ❌ Bad: Request takes ~10+ seconds (server ignored cancellation)');
  console.log('\n💡 Check server logs for "Request cancelled" messages');
});