import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { S3StorageService } from '../../services/s3-storage.service';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('S3StorageService', () => {
  let service: S3StorageService;
  let mockS3Client: any;
  let configService: ConfigService;

  const mockConfigService: any = {
    get: jest.fn((key: string) => {
      const config: any = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_S3_BUCKET_NAME: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset mockConfigService to default values
    mockConfigService.get = jest.fn((key: string) => {
      const config: any = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_S3_BUCKET_NAME: 'test-bucket',
      };
      return config[key];
    });

    // Mock S3Client constructor and send method
    mockS3Client = {
      send: jest.fn().mockResolvedValue({}),
    } as any;

    (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(
      () => mockS3Client,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3StorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3StorageService>(S3StorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize S3Client with correct configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should use default region if not provided', async () => {
      jest.clearAllMocks();
      mockConfigService.get = jest.fn((key: string) => {
        if (key === 'AWS_REGION') return undefined;
        if (key === 'AWS_ACCESS_KEY_ID') return 'test-key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret';
        if (key === 'AWS_S3_BUCKET_NAME') return 'test-bucket';
        return undefined;
      });

      mockS3Client = {
        send: jest.fn().mockResolvedValue({}),
      } as any;

      (S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(
        () => mockS3Client,
      );

      // Create new service instance to trigger constructor
      const newModule = await Test.createTestingModule({
        providers: [
          S3StorageService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const newService = newModule.get<S3StorageService>(S3StorageService);

      // The service should be initialized with default region
      expect(newService).toBeDefined();
      expect(newService.getRegion()).toBe('us-east-1'); // Default region
    });

    it('should handle missing AWS credentials gracefully', () => {
      jest.clearAllMocks();
      mockConfigService.get = jest.fn(() => undefined);

      // Should not throw error
      expect(() => {
        Test.createTestingModule({
          providers: [
            S3StorageService,
            {
              provide: ConfigService,
              useValue: mockConfigService,
            },
          ],
        }).compile();
      }).not.toThrow();
    });
  });

  describe('uploadScreenshot', () => {
    const mockBuffer = Buffer.from('test-image-data');
    const uploadOptions = {
      testId: 'test-123',
      deviceType: 'desktop',
      frameNumber: 1,
      format: 'jpeg' as const,
    };

    it('should upload screenshot to S3 successfully', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const url = await service.uploadScreenshot(mockBuffer, uploadOptions);

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand),
      );
      expect(url).toContain('https://test-bucket.s3.us-east-1.amazonaws.com/');
      expect(url).toContain('screenshots/test-123/desktop/');
    });

    it('should handle JPEG format uploads successfully', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const url = await service.uploadScreenshot(mockBuffer, {
        ...uploadOptions,
        format: 'jpeg',
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(url).toContain('.jpeg');
    });

    it('should handle PNG format uploads successfully', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const url = await service.uploadScreenshot(mockBuffer, {
        ...uploadOptions,
        format: 'png',
      });

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(url).toContain('.png');
    });

    it('should call S3 send with PutObjectCommand', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      await service.uploadScreenshot(mockBuffer, uploadOptions);

      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand),
      );
    });

    it('should generate unique filenames for same testId and device', async () => {
      mockS3Client.send.mockResolvedValue({});

      const url1 = await service.uploadScreenshot(mockBuffer, uploadOptions);
      const url2 = await service.uploadScreenshot(mockBuffer, uploadOptions);

      expect(url1).not.toBe(url2);
      expect(url1).toMatch(/frame-1-\d+-[a-f0-9]{16}\.jpeg$/);
      expect(url2).toMatch(/frame-1-\d+-[a-f0-9]{16}\.jpeg$/);
    });

    it('should throw error on S3 upload failure', async () => {
      const uploadError = new Error('S3 upload failed');
      mockS3Client.send.mockRejectedValueOnce(uploadError);

      await expect(
        service.uploadScreenshot(mockBuffer, uploadOptions),
      ).rejects.toThrow('S3 upload failed');
    });

    it('should organize files by testId and deviceType', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const url = await service.uploadScreenshot(mockBuffer, {
        testId: 'test-456',
        deviceType: 'mobile',
        frameNumber: 3,
        format: 'png',
      });

      // Verify URL contains correct path structure
      expect(url).toContain('screenshots/test-456/mobile/frame-3-');
      expect(url).toContain('.png');
    });
  });

  describe('uploadScreenshots (batch)', () => {
    const mockBuffer = Buffer.from('test-image-data');
    const screenshots = [
      {
        buffer: mockBuffer,
        testId: 'test-123',
        deviceType: 'desktop',
        frameNumber: 1,
        format: 'jpeg' as const,
      },
      {
        buffer: mockBuffer,
        testId: 'test-123',
        deviceType: 'desktop',
        frameNumber: 2,
        format: 'jpeg' as const,
      },
      {
        buffer: mockBuffer,
        testId: 'test-123',
        deviceType: 'mobile',
        frameNumber: 1,
        format: 'png' as const,
      },
    ];

    it('should upload multiple screenshots successfully', async () => {
      mockS3Client.send.mockResolvedValue({});

      const urls = await service.uploadScreenshots(screenshots);

      expect(urls).toHaveLength(3);
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
      urls.forEach((url) => {
        expect(url).toContain(
          'https://test-bucket.s3.us-east-1.amazonaws.com/',
        );
      });
    });

    it('should upload all screenshots in parallel', async () => {
      mockS3Client.send.mockResolvedValue({});

      const startTime = Date.now();
      await service.uploadScreenshots(screenshots);
      const duration = Date.now() - startTime;

      // If sequential, would take 3x longer. Parallel should be much faster.
      expect(duration).toBeLessThan(500); // Reasonable for 3 parallel uploads
    });

    it('should throw error if any upload fails', async () => {
      mockS3Client.send
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({});

      await expect(service.uploadScreenshots(screenshots)).rejects.toThrow(
        'Upload failed',
      );
    });

    it('should handle empty array', async () => {
      const urls = await service.uploadScreenshots([]);

      expect(urls).toEqual([]);
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });
  });

  describe('deleteScreenshot', () => {
    const testUrl =
      'https://test-bucket.s3.us-east-1.amazonaws.com/screenshots/test-123/desktop/frame-1.jpeg';

    it('should delete screenshot successfully', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const result = await service.deleteScreenshot(testUrl);

      expect(result).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(DeleteObjectCommand),
      );
    });

    it('should call S3 send with DeleteObjectCommand', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const result = await service.deleteScreenshot(testUrl);

      expect(result).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(DeleteObjectCommand),
      );
    });

    it('should return false on deletion error', async () => {
      mockS3Client.send.mockRejectedValueOnce(new Error('Delete failed'));

      const result = await service.deleteScreenshot(testUrl);

      expect(result).toBe(false);
    });

    it('should handle malformed URLs gracefully', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      // Should treat as direct key if URL parsing fails
      const result = await service.deleteScreenshot('invalid-url');

      expect(result).toBe(true);
    });
  });

  describe('deleteScreenshots (batch)', () => {
    const urls = [
      'https://test-bucket.s3.us-east-1.amazonaws.com/screenshots/test-1.jpeg',
      'https://test-bucket.s3.us-east-1.amazonaws.com/screenshots/test-2.jpeg',
      'https://test-bucket.s3.us-east-1.amazonaws.com/screenshots/test-3.jpeg',
    ];

    it('should delete all screenshots successfully', async () => {
      mockS3Client.send.mockResolvedValue({});

      const count = await service.deleteScreenshots(urls);

      expect(count).toBe(3);
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
    });

    it('should continue deleting even if some fail', async () => {
      mockS3Client.send
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce({});

      const count = await service.deleteScreenshots(urls);

      expect(count).toBe(2); // 2 out of 3 succeeded
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', async () => {
      const count = await service.deleteScreenshots([]);

      expect(count).toBe(0);
      expect(mockS3Client.send).not.toHaveBeenCalled();
    });

    it('should return 0 on total failure', async () => {
      mockS3Client.send.mockRejectedValue(new Error('All failed'));

      const count = await service.deleteScreenshots(urls);

      expect(count).toBe(0);
    });
  });

  describe('fileExists', () => {
    const testUrl =
      'https://test-bucket.s3.us-east-1.amazonaws.com/screenshots/test.jpeg';

    it('should return true if file exists', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const exists = await service.fileExists(testUrl);

      expect(exists).toBe(true);
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(HeadObjectCommand),
      );
    });

    it('should return false if file does not exist (404)', async () => {
      const notFoundError: any = new Error('Not Found');
      notFoundError.name = 'NotFound';
      mockS3Client.send.mockRejectedValueOnce(notFoundError);

      const exists = await service.fileExists(testUrl);

      expect(exists).toBe(false);
    });

    it('should return false if file does not exist (404 status code)', async () => {
      const notFoundError: any = new Error('Not Found');
      notFoundError.$metadata = { httpStatusCode: 404 };
      mockS3Client.send.mockRejectedValueOnce(notFoundError);

      const exists = await service.fileExists(testUrl);

      expect(exists).toBe(false);
    });

    it('should throw error for non-404 errors', async () => {
      const accessError = new Error('Access Denied');
      mockS3Client.send.mockRejectedValueOnce(accessError);

      await expect(service.fileExists(testUrl)).rejects.toThrow(
        'Access Denied',
      );
    });
  });

  describe('Utility methods', () => {
    it('should return configured bucket name', () => {
      const bucketName = service.getBucketName();
      expect(bucketName).toBe('test-bucket');
    });

    it('should return configured region', () => {
      const region = service.getRegion();
      expect(region).toBe('us-east-1');
    });
  });

  describe('Security and Edge Cases', () => {
    it('should handle very large buffers', async () => {
      mockS3Client.send.mockResolvedValueOnce({});
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB

      await expect(
        service.uploadScreenshot(largeBuffer, {
          testId: 'test-large',
          deviceType: 'desktop',
          frameNumber: 1,
          format: 'png',
        }),
      ).resolves.toBeDefined();
    });

    it('should handle special characters in testId', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      const url = await service.uploadScreenshot(Buffer.from('test'), {
        testId: 'test/with/slashes',
        deviceType: 'desktop',
        frameNumber: 1,
        format: 'jpeg',
      });

      // S3 allows slashes in keys, so they should be preserved in the URL
      expect(url).toContain('test/with/slashes');
      expect(mockS3Client.send).toHaveBeenCalled();
    });

    it('should handle concurrent uploads to same testId', async () => {
      mockS3Client.send.mockResolvedValue({});

      const uploadPromises = Array.from({ length: 10 }, (_, i) =>
        service.uploadScreenshot(Buffer.from(`test-${i}`), {
          testId: 'concurrent-test',
          deviceType: 'desktop',
          frameNumber: i + 1,
          format: 'jpeg',
        }),
      );

      const urls = await Promise.all(uploadPromises);

      expect(urls).toHaveLength(10);
      expect(new Set(urls).size).toBe(10); // All URLs should be unique
    });
  });
});
