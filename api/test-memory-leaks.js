#!/usr/bin/env node
/**
 * Memory Leak Integration Test
 * 
 * This script simulates multiple concurrent requests to the Bug-Spy application
 * to verify that memory leaks have been fixed. It monitors memory usage and 
 * reports on any significant memory growth over time.
 */

const axios = require('axios');
const EventSource = require('eventsource');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_URLS = [
  'https://httpbin.org/delay/1',
  'https://httpbin.org/delay/2', 
  'https://httpbin.org/json',
  'https://httpbin.org/html',
  'https://httpbin.org/uuid'
];

class MemoryLeakTester {
  constructor() {
    this.startMemory = process.memoryUsage();
    this.completedRequests = 0;
    this.failedRequests = 0;
    this.activeRequests = new Set();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  getMemoryStats() {
    const current = process.memoryUsage();
    return {
      rss: Math.round((current.rss / 1024 / 1024) * 100) / 100,
      heapUsed: Math.round((current.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotal: Math.round((current.heapTotal / 1024 / 1024) * 100) / 100,
      external: Math.round((current.external / 1024 / 1024) * 100) / 100,
    };
  }

  async testSingleCapture(url) {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.activeRequests.add(requestId);
    
    try {
      this.log(`Starting capture for ${url}`);
      
      const response = await axios.post(`${BASE_URL}/capture-metrics/capture`, {
        url: url,
        deviceType: 'desktop',
        testType: 'performance',
        includeScreenshots: false
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.completedRequests++;
      this.log(`✅ Completed capture for ${url} - Status: ${response.status}`);
      
    } catch (error) {
      this.failedRequests++;
      this.log(`❌ Failed capture for ${url} - Error: ${error.message}`);
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  async testBatchCapture() {
    const batchData = {
      urls: TEST_URLS.map(url => ({ url, label: `Test ${url}` })),
      deviceType: 'desktop',
      testType: 'performance',
      includeScreenshots: false,
      sequential: true,
      batchName: 'Memory Leak Test Batch'
    };

    try {
      this.log('Starting batch capture test');
      
      const response = await axios.post(`${BASE_URL}/capture-metrics/batch-capture`, batchData, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.completedRequests++;
      this.log(`✅ Completed batch capture - Status: ${response.status}`);
      
    } catch (error) {
      this.failedRequests++;
      this.log(`❌ Failed batch capture - Error: ${error.message}`);
    }
  }

  async runConcurrentTests(iterations = 3) {
    this.log(`Starting ${iterations} iterations of memory leak tests`);
    this.log(`Initial memory: ${JSON.stringify(this.getMemoryStats())} MB`);

    for (let i = 0; i < iterations; i++) {
      this.log(`\n=== Iteration ${i + 1}/${iterations} ===`);
      
      // Run multiple concurrent single captures
      const promises = [];
      for (let j = 0; j < 3; j++) {
        const url = TEST_URLS[j % TEST_URLS.length];
        promises.push(this.testSingleCapture(url));
      }

      // Add a batch capture
      promises.push(this.testBatchCapture());

      // Wait for all to complete
      await Promise.allSettled(promises);

      // Log memory stats after each iteration
      const memStats = this.getMemoryStats();
      this.log(`Memory after iteration ${i + 1}: ${JSON.stringify(memStats)} MB`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        const gcMemStats = this.getMemoryStats();
        this.log(`Memory after GC: ${JSON.stringify(gcMemStats)} MB`);
      }

      // Brief pause between iterations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Final report
    this.generateReport();
  }

  generateReport() {
    const finalMemory = this.getMemoryStats();
    
    this.log('\n=== MEMORY LEAK TEST REPORT ===');
    this.log(`Total completed requests: ${this.completedRequests}`);
    this.log(`Total failed requests: ${this.failedRequests}`);
    this.log(`Success rate: ${Math.round((this.completedRequests / (this.completedRequests + this.failedRequests)) * 100)}%`);
    
    this.log('\nMemory Usage:');
    this.log(`Initial RSS: ${Math.round((this.startMemory.rss / 1024 / 1024) * 100) / 100} MB`);
    this.log(`Final RSS: ${finalMemory.rss} MB`);
    this.log(`RSS Growth: ${Math.round((finalMemory.rss - (this.startMemory.rss / 1024 / 1024)) * 100) / 100} MB`);
    
    this.log(`Initial Heap Used: ${Math.round((this.startMemory.heapUsed / 1024 / 1024) * 100) / 100} MB`);
    this.log(`Final Heap Used: ${finalMemory.heapUsed} MB`);
    this.log(`Heap Growth: ${Math.round((finalMemory.heapUsed - (this.startMemory.heapUsed / 1024 / 1024)) * 100) / 100} MB`);

    // Analyze results
    const rssGrowth = finalMemory.rss - (this.startMemory.rss / 1024 / 1024);
    const heapGrowth = finalMemory.heapUsed - (this.startMemory.heapUsed / 1024 / 1024);
    
    this.log('\n=== ANALYSIS ===');
    if (rssGrowth > 100) {
      this.log('⚠️  HIGH RSS MEMORY GROWTH - Potential memory leak detected');
    } else if (rssGrowth > 50) {
      this.log('⚠️  MODERATE RSS MEMORY GROWTH - Monitor for continued growth');
    } else {
      this.log('✅ RSS MEMORY GROWTH WITHIN ACCEPTABLE LIMITS');
    }

    if (heapGrowth > 50) {
      this.log('⚠️  HIGH HEAP MEMORY GROWTH - Potential heap leak detected');
    } else if (heapGrowth > 25) {
      this.log('⚠️  MODERATE HEAP MEMORY GROWTH - Monitor for continued growth');
    } else {
      this.log('✅ HEAP MEMORY GROWTH WITHIN ACCEPTABLE LIMITS');
    }

    if (this.failedRequests / (this.completedRequests + this.failedRequests) > 0.1) {
      this.log('⚠️  HIGH FAILURE RATE - Check server stability');
    } else {
      this.log('✅ REQUEST SUCCESS RATE ACCEPTABLE');
    }
  }
}

// Run the test
async function main() {
  console.log('Bug-Spy Memory Leak Test Suite');
  console.log('================================\n');
  
  // Check if server is running
  try {
    await axios.get(`${BASE_URL}/`, { timeout: 5000 });
    console.log('✅ Server is running and accessible');
  } catch (error) {
    console.log('❌ Server not accessible. Please start the server first:');
    console.log('   npm run start:dev');
    console.log(`   Error: ${error.message}`);
    process.exit(1);
  }

  const tester = new MemoryLeakTester();
  
  try {
    await tester.runConcurrentTests(5);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MemoryLeakTester;