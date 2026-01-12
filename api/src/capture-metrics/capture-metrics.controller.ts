import {
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Query,
  Sse,
  Logger,
  UseGuards,
  Post,
  Body,
  Req,
  Get,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import {
  CreateCaptureData,
  CreateBatchCaptureData,
  BatchCaptureQuery,
} from '~/dto/create-capture-data';
import { AppError } from '~/common/app-error.common';
import { CaptureOrchestratorService } from './services/capture-orchestrator.service';
import { CurrentUser } from '~/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '~/auth/guards/jwt.guard';
import {
  SaveTestRequest,
  SaveTestResponse,
  AuthenticatedUser,
} from './interfaces/cache.interface';

@Controller('capture-metrics')
export class CaptureMetricsController {
  private readonly logger = new Logger(CaptureMetricsController.name);

  constructor(
    private readonly captureOrchestrator: CaptureOrchestratorService,
  ) {}

  @Sse('batch')
  @Header('Content-Type', 'text/event-stream')
  @Header('Connection', 'keep-alive')
  @Header('Cache-Control', 'no-cache')
  @HttpCode(HttpStatus.OK)
  captureBatchMetrics(
    @Query() query: BatchCaptureQuery,
    @Req() request: any,
  ): Observable<MessageEvent> {
    // Parse URLs from query parameters
    // Expected format: ?urls=https://example.com,https://google.com&labels=Example,Google&testType=performance&sequential=true
    const {
      urls,
      labels,
      testType = 'performance',
      deviceType = 'desktop',
      sequential = 'false',
      includeScreenshots = 'true',
      batchName,
      batchId,
    } = query;

    if (!urls) {
      throw new AppError('URLs parameter is required', HttpStatus.BAD_REQUEST);
    }

    // Parse comma-separated URLs and labels
    const urlArray = urls.split(',').map((url: string) => url.trim());
    const labelArray = labels
      ? labels.split(',').map((label: string) => label.trim())
      : [];

    // Validate minimum URLs
    if (urlArray.length < 2) {
      throw new AppError(
        'At least 2 URLs are required for batch testing',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Build the batch data object
    const batchData: CreateBatchCaptureData = {
      urls: urlArray.map((url: string, index: number) => ({
        url,
        label: labelArray[index] || `URL ${index + 1}`,
      })),
      testType,
      deviceType: deviceType as 'desktop' | 'mobile' | 'tablet',
      sequential: sequential === 'true',
      includeScreenshots: includeScreenshots === 'true',
      batchName,
      batchId,
    };

    this.logger.log(
      `Received GET batch capture request for ${batchData.urls.length} URLs`,
    );
    return this.captureOrchestrator.startBatchCapture(
      batchData,
      request.abortSignal,
    ) as Observable<MessageEvent>;
  }

  @Sse('single')
  @Header('Content-Type', 'text/event-stream')
  @Header('Connection', 'keep-alive')
  @Header('Cache-Control', 'no-cache')
  captureMetrics(
    @Query() query: CreateCaptureData,
    @Req() request: any,
  ): Observable<MessageEvent> {
    this.logger.log(`Received capture request: ${JSON.stringify(query)}`);
    return this.captureOrchestrator.startCapture(
      query,
      request.abortSignal,
    ) as Observable<MessageEvent>;
  }

  @Post('save')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async saveTest(
    @Body() body: SaveTestRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SaveTestResponse> {
    this.logger.log(
      `Saving test result for user: ${user.email}, testId: ${body.testId}`,
    );

    const savedTestId = await this.captureOrchestrator.saveTestResultFromTemp(
      user.id,
      body.testId,
    );

    return {
      message: 'Test result saved successfully',
      savedTestId,
    };
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'capture-metrics',
    };
  }
}
