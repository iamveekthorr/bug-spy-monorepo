import { Global, Module } from '@nestjs/common';
import { BrowserPoolService } from '../services/browser-pool.service';
import { TimeoutService } from '../services/timeout.service';

/**
 * Browser Management Module (Global)
 *
 * Handles browser lifecycle and timeout management:
 * - Browser pool for resource management
 * - Intelligent timeout strategies
 *
 * NOTE: This module is global to ensure a single instance of BrowserPoolService
 * is shared across all modules, preventing duplicate cleanup on shutdown.
 */
@Global()
@Module({
  providers: [
    TimeoutService,
    {
      provide: BrowserPoolService,
      useFactory: (timeoutService: TimeoutService) => {
        return new BrowserPoolService(
          5, // maxSize - up to 5 concurrent pages
          0, // idleTimeoutMs - disabled for now
          60000, // idleCheckIntervalMs
          timeoutService,
        );
      },
      inject: [TimeoutService],
    },
  ],
  exports: [BrowserPoolService, TimeoutService],
})
export class BrowserManagementModule {}
