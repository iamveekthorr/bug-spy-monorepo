# Memory Management Guide

This document outlines the memory management strategies implemented in the Bug-Spy application to prevent memory leaks and ensure long-term stability.

## Overview

Memory leaks in Node.js applications, especially those dealing with browser automation, can lead to:
- Increased memory usage over time
- Performance degradation
- Server crashes in production
- Resource exhaustion

## Identified Memory Leak Sources

### 1. Browser Pool Service
**Issue**: Interval timers for idle timeout checking could accumulate if service instances are created/destroyed frequently.

**Solution**: 
- Implemented `OnDestroy` lifecycle hook
- Proper cleanup in `close()` method
- Tracking and clearing of interval timers

### 2. Capture Orchestrator Service
**Issue**: Multiple timeout handlers and observables could leak if not properly managed.

**Solutions**:
- **Timeout Tracking**: All `setTimeout` calls are tracked in `activeTimeouts` Set
- **Observable Management**: Active observables tracked in `activeObservables` Set
- **Lifecycle Cleanup**: `OnDestroy` hook clears all active resources

### 3. Route Handlers
**Issue**: Page route handlers added for resource blocking weren't cleaned up on page reuse.

**Solution**:
- Route handlers are stored as variables
- `page.unroute()` called in finally blocks
- Proper cleanup before page release to pool

## Implementation Details

### BrowserPoolService
```typescript
@Injectable()
export class BrowserPoolService implements OnDestroy {
  private idleCheckTimer: NodeJS.Timeout | null = null;
  
  async onDestroy(): Promise<void> {
    await this.close();
  }
  
  async close(): Promise<void> {
    // Clean up interval timers
    if (this.idleCheckTimer) {
      clearInterval(this.idleCheckTimer);
      this.idleCheckTimer = null;
    }
    // ... other cleanup
  }
}
```

### CaptureOrchestratorService
```typescript
@Injectable()
export class CaptureOrchestratorService implements OnDestroy {
  private activeTimeouts = new Set<NodeJS.Timeout>();
  private activeObservables = new Set<any>();
  
  async onDestroy(): Promise<void> {
    // Clear all timeouts
    for (const timeoutId of this.activeTimeouts) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();
    
    // Complete all observables
    for (const subscriber of this.activeObservables) {
      if (subscriber?.complete) {
        subscriber.complete();
      }
    }
    this.activeObservables.clear();
  }
}
```

## Best Practices for Future Development

### 1. Always Use Lifecycle Hooks
- Implement `OnDestroy` for all services that manage resources
- Clean up timers, intervals, subscriptions, and event listeners

### 2. Track Resource Usage
- Use Sets or Arrays to track active resources
- Clean up tracked resources in lifecycle hooks

### 3. Use Finally Blocks
- Always clean up resources in `finally` blocks
- Handle both success and error cases

### 4. Test for Memory Leaks
- Write specific tests for memory leak scenarios
- Use tools like Node.js built-in `--inspect` flag
- Monitor memory usage in production

### 5. Route Handler Management
```typescript
// ✅ Good - Track and clean up route handlers
let routeHandler: any = null;
if (condition) {
  routeHandler = (route, request) => { /* handler logic */ };
  await page.route('**/*', routeHandler);
}

// Later in finally block:
if (page && routeHandler && !page.isClosed()) {
  await page.unroute('**/*', routeHandler);
}

// ❌ Bad - Route handler not cleaned up
await page.route('**/*', (route, request) => {
  // Handler logic - this creates a leak
});
```

### 6. Observable Management
```typescript
// ✅ Good - Track observables for cleanup
const observable = new Observable(subscriber => {
  this.activeObservables.add(subscriber);
  
  // Observable logic here
  
  return () => {
    // Cleanup on unsubscribe
    this.activeObservables.delete(subscriber);
  };
});

// ❌ Bad - Observables not tracked
const observable = new Observable(subscriber => {
  // No cleanup tracking
});
```

## Monitoring and Debugging

### Production Monitoring
- Use application performance monitoring (APM) tools
- Set up memory usage alerts
- Monitor heap size growth over time

### Development Testing
- Run memory leak tests regularly
- Use `process.memoryUsage()` for basic monitoring
- Profile with Chrome DevTools for Node.js

### Debug Commands
```bash
# Monitor memory usage
node --inspect --max-old-space-size=4096 dist/main.js

# Generate heap snapshots
kill -USR2 <node_process_id>
```

## Maintenance Checklist

When adding new features:
- [ ] Does the feature use timers/intervals? Add cleanup.
- [ ] Does the feature create observables? Track them.
- [ ] Does the feature add event listeners? Remove them.
- [ ] Does the feature use browser pages? Clean up handlers.
- [ ] Are there any async operations that might hang? Add timeouts.
- [ ] Is there a corresponding test for memory cleanup?

## Related Files
- `src/capture-metrics/services/browser-pool.service.ts`
- `src/capture-metrics/services/capture-orchestrator.service.ts`
- `src/capture-metrics/__tests__/services/memory-leak.service.spec.ts`