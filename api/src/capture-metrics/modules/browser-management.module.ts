import { Module } from '@nestjs/common';
import { BrowserPoolService } from '../services/browser-pool.service';
import { TimeoutService } from '../services/timeout.service';

/**
 * Browser Management Module
 *
 * Handles browser lifecycle and timeout management:
 * - Browser pool for resource management
 * - Intelligent timeout strategies
 */
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
