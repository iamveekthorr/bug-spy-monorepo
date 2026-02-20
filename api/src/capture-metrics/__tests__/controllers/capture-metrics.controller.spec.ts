import { Test, TestingModule } from '@nestjs/testing';
import { CaptureMetricsController } from '../../capture-metrics.controller';
import { BrowserPoolService } from '../../services/browser-pool.service';
import { CaptureOrchestratorService } from '../../services/capture-orchestrator.service';
import { JwtAuthGuard } from '~/auth/guards/jwt.guard';
import { Observable } from 'rxjs';
import {
  SaveTestRequest,
  AuthenticatedUser,
} from '../../interfaces/cache.interface';

describe('CaptureMetricsController', () => {
  let controller: CaptureMetricsController;
  let captureOrchestratorService: jest.Mocked<CaptureOrchestratorService>;
  let _browserPoolService: jest.Mocked<BrowserPoolService>;

  beforeEach(async () => {
    const mockCaptureOrchestratorService = {
      startCapture: jest.fn(),
      startBatchCapture: jest.fn(),
      saveTestResultFromTemp: jest.fn(),
    };

    const mockBrowserPoolService = {
      close: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CaptureMetricsController],
      providers: [
        {
          provide: CaptureOrchestratorService,
          useValue: mockCaptureOrchestratorService,
        },
        {
          provide: BrowserPoolService,
          useValue: mockBrowserPoolService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<CaptureMetricsController>(CaptureMetricsController);
    captureOrchestratorService = module.get(CaptureOrchestratorService);
    _browserPoolService = module.get(BrowserPoolService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('captureMetrics', () => {
    it('should call captureOrchestrator.startCapture without user', () => {
      const query = {
        url: 'https://example.com',
        deviceType: 'desktop' as const,
        testType: 'performance' as const,
      };

      const mockObservable = new Observable();
      captureOrchestratorService.startCapture.mockReturnValue(
        mockObservable as any,
      );

      const mockRequest = {} as any;
      const result = controller.captureMetrics(query, mockRequest);

      expect(captureOrchestratorService.startCapture).toHaveBeenCalledWith(
        query,
        undefined,
      );
      expect(result).toBe(mockObservable);
    });
  });

  describe('saveTest', () => {
    it('should save test result for authenticated user using testId', async () => {
      const testId = 'test-123';
      const body: SaveTestRequest = { testId };
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
      };
      const savedTestId = 'saved-test-id-456';

      captureOrchestratorService.saveTestResultFromTemp.mockResolvedValue(
        savedTestId,
      );

      const result = await controller.saveTest(body, user);

      expect(
        captureOrchestratorService.saveTestResultFromTemp,
      ).toHaveBeenCalledWith(user.id, testId);
      expect(result).toEqual({
        message: 'Test result saved successfully',
        savedTestId,
      });
    });

    it('should throw error if saveTestResultFromTemp fails', async () => {
      const testId = 'test-123';
      const body: SaveTestRequest = { testId };
      const user: AuthenticatedUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      captureOrchestratorService.saveTestResultFromTemp.mockRejectedValue(
        new Error('Test result not found'),
      );

      await expect(controller.saveTest(body, user)).rejects.toThrow(
        'Test result not found',
      );
    });
  });

  describe('captureBatchMetrics', () => {
    it('should call captureOrchestrator.startBatchCapture', () => {
      const query = {
        urls: 'https://example.com,https://google.com',
        labels: 'Example,Google',
        testType: 'performance' as const,
        deviceType: 'desktop' as const,
        sequential: 'true',
        includeScreenshots: 'true',
        batchName: 'test-batch',
        batchId: 'batch-123',
      };

      const mockObservable = new Observable();
      captureOrchestratorService.startBatchCapture.mockReturnValue(
        mockObservable as any,
      );

      const mockRequest = {} as any;
      const result = controller.captureBatchMetrics(query, mockRequest);

      expect(captureOrchestratorService.startBatchCapture).toHaveBeenCalledWith(
        {
          urls: [
            { url: 'https://example.com', label: 'Example' },
            { url: 'https://google.com', label: 'Google' },
          ],
          testType: 'performance',
          deviceType: 'desktop',
          sequential: true,
          includeScreenshots: true,
          batchName: 'test-batch',
          batchId: 'batch-123',
        },
        undefined,
      );
      expect(result).toBe(mockObservable);
    });

    it('should throw error if less than 2 URLs provided', () => {
      const query = {
        urls: 'https://example.com',
        testType: 'performance' as const,
        deviceType: 'desktop' as const,
        sequential: 'false',
        includeScreenshots: 'true',
      };

      const mockRequest = {} as any;
      expect(() => controller.captureBatchMetrics(query, mockRequest)).toThrow(
        'At least 2 URLs are required for batch testing',
      );
    });

    it('should throw error if no URLs provided', () => {
      const query = {
        urls: undefined as any,
        testType: 'performance' as const,
        deviceType: 'desktop' as const,
        sequential: 'false',
        includeScreenshots: 'true',
      };

      const mockRequest = {} as any;
      expect(() => controller.captureBatchMetrics(query, mockRequest)).toThrow(
        'URLs parameter is required',
      );
    });
  });
});
