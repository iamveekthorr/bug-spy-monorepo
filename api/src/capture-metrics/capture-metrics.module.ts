import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Sub-modules
import { BrowserManagementModule } from './modules/browser-management.module';
import { MetricsCollectionModule } from './modules/metrics-collection.module';
import { UtilityModule } from './modules/utility.module';

// Core orchestrator and specialized services
import { CaptureOrchestratorService } from './services/capture-orchestrator.service';
import { SingleCaptureService } from './services/single-capture.service';
import { BatchCaptureService } from './services/batch-capture.service';
import { CaptureMetricsController } from './capture-metrics.controller';

// Schemas
import { TestResult, TestResultSchema } from './schemas/test-result.schema';

/**
 * Capture Metrics Module
 *
 * Main module for web metrics capture functionality.
 * Organized into sub-modules for better maintainability:
 * - BrowserManagementModule: Browser pool and timeout management
 * - MetricsCollectionModule: All metrics capture services
 * - UtilityModule: Helper services and utilities
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TestResult.name, schema: TestResultSchema },
    ]),
    // Import organized sub-modules
    BrowserManagementModule,
    MetricsCollectionModule,
    UtilityModule,
  ],
  providers: [
    // Orchestrator facade and specialized services
    CaptureOrchestratorService,
    SingleCaptureService,
    BatchCaptureService,
  ],
  controllers: [CaptureMetricsController],
  // No exports needed - BrowserManagementModule is @Global()
})
export class CaptureMetricsModule {}
