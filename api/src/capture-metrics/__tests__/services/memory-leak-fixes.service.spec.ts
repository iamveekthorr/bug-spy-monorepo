import { Test, TestingModule } from '@nestjs/testing';
import { BrowserPoolService } from '../../services/browser-pool.service';
import { CaptureOrchestratorService } from '../../services/capture-orchestrator.service';
import { TimeoutService } from '../../services/timeout.service';

describe('Memory Leak Fixes', () => {
  let browserPoolService: BrowserPoolService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: BrowserPoolService,
          useValue: new BrowserPoolService(5, 60000, 30000),
        },
        {
          provide: TimeoutService,
          useValue: {
            getTimeout: jest.fn().mockReturnValue(30000),
            executeWithTimeout: jest.fn(),
            recordPerformance: jest.fn(),
          },
        },
      ],
    }).compile();

    browserPoolService = module.get<BrowserPoolService>(BrowserPoolService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('BrowserPoolService Memory Management', () => {
    it('should properly cleanup event handlers on browser close', async () => {
      // Get initial state
      const initialHandlers = (browserPoolService as any).browserEventHandlers
        .size;

      // Create and close browser multiple times
      for (let i = 0; i < 3; i++) {
        const page = await browserPoolService.requirePage();
        await browserPoolService.releasePage(page);
      }

      await browserPoolService.close();

      // Verify event handlers are cleaned up
      const finalHandlers = (browserPoolService as any).browserEventHandlers
        .size;
      expect(finalHandlers).toBeLessThanOrEqual(initialHandlers);
    }, 30000);

    it('should clear all timeouts on module destroy', async () => {
      const timeoutClearSpy = jest.spyOn(global, 'clearTimeout');
      const intervalClearSpy = jest.spyOn(global, 'clearInterval');

      // Trigger some operations that create timeouts
      const page = await browserPoolService.requirePage();
      await browserPoolService.releasePage(page);

      // Destroy the module
      await browserPoolService.onModuleDestroy();

      // Verify cleanup methods were called
      expect(timeoutClearSpy).toHaveBeenCalled();
      expect(intervalClearSpy).toHaveBeenCalled();

      timeoutClearSpy.mockRestore();
      intervalClearSpy.mockRestore();
    }, 30000);

    it('should not leak memory when pages are repeatedly acquired and released', async () => {
      // Track memory usage pattern
      const iterations = 10;
      const memoryUsage: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const page = await browserPoolService.requirePage();
        await browserPoolService.releasePage(page);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        memoryUsage.push(process.memoryUsage().heapUsed);
      }

      // Memory usage should stabilize (not continuously grow)
      const firstHalf = memoryUsage.slice(0, Math.floor(iterations / 2));
      const secondHalf = memoryUsage.slice(Math.floor(iterations / 2));

      const firstAvg =
        firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

      // Memory should not grow by more than 50%
      const growthRatio = secondAvg / firstAvg;
      expect(growthRatio).toBeLessThan(1.5);
    }, 60000);

    it('should properly handle concurrent page requests without resource leaks', async () => {
      const concurrentRequests = 5;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          (async () => {
            const page = await browserPoolService.requirePage();
            // Simulate some work
            await new Promise((resolve) => setTimeout(resolve, 100));
            await browserPoolService.releasePage(page);
          })(),
        );
      }

      await Promise.all(promises);

      // Verify no pages are stuck in limbo
      expect((browserPoolService as any).requiredPages.length).toBe(0);
      expect(
        (browserPoolService as any).releasedPages.length,
      ).toBeLessThanOrEqual((browserPoolService as any).maxSize);
    }, 30000);
  });

  describe('Timeout Management', () => {
    it('should track and cleanup active timeouts', () => {
      const service = new (class extends CaptureOrchestratorService {
        public testTimeoutTracking() {
          const timeoutId = setTimeout(() => {}, 1000);
          (this as any).activeTimeouts.add(timeoutId);
          return timeoutId;
        }

        public getActiveTimeouts() {
          return (this as any).activeTimeouts;
        }

        public clearActiveTimeouts() {
          (this as any).activeTimeouts.forEach((timeoutId: NodeJS.Timeout) => {
            clearTimeout(timeoutId);
          });
          (this as any).activeTimeouts.clear();
        }
      } as any)(null, null, null, null, null, null, null, null, null);

      const timeoutId = service.testTimeoutTracking();
      expect(service.getActiveTimeouts().size).toBe(1);
      expect(service.getActiveTimeouts().has(timeoutId)).toBe(true);

      service.clearActiveTimeouts();
      expect(service.getActiveTimeouts().size).toBe(0);
    });
  });
});
