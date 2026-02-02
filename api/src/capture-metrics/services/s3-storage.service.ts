import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';

/**
 * S3 Storage Service
 *
 * Handles all interactions with AWS S3 for storing screenshots.
 * Provides secure, scalable storage with:
 * - Automatic file naming with UUID
 * - Content-type detection
 * - Secure access control
 * - URL generation for MongoDB storage
 *
 * Configuration required:
 * - AWS_REGION
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_S3_BUCKET_NAME
 */
@Injectable()
export class S3StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    if (!accessKeyId || !secretAccessKey || !bucketName) {
      this.logger.warn(
        'AWS S3 credentials not configured. S3 uploads will fail. Please set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME.',
      );
    }

    this.region = region;
    this.bucketName = bucketName || 'bug-spy-screenshots';

    this.s3Client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    this.logger.log(`S3StorageService initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Upload a screenshot buffer to S3
   *
   * @param buffer - Screenshot image buffer
   * @param options - Upload options (testId, deviceType, format)
   * @returns S3 URL of the uploaded file
   */
  async uploadScreenshot(
    buffer: Buffer,
    options: {
      testId: string;
      deviceType: string;
      frameNumber: number;
      format: 'jpeg' | 'png';
    },
  ): Promise<string> {
    try {
      const { testId, deviceType, frameNumber, format } = options;

      // Generate unique filename
      const filename = this.generateFilename(testId, deviceType, frameNumber, format);

      // Determine content type
      const contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          testId,
          deviceType,
          frameNumber: frameNumber.toString(),
          uploadedAt: new Date().toISOString(),
        },
        // ACL: 'private', // Keep files private by default
      });

      await this.s3Client.send(command);

      const url = this.getPublicUrl(filename);

      this.logger.log(`Screenshot uploaded successfully: ${filename}`);

      return url;
    } catch (error) {
      this.logger.error('Failed to upload screenshot to S3:', error);
      throw error;
    }
  }

  /**
   * Upload multiple screenshots in batch
   *
   * @param screenshots - Array of screenshot buffers with metadata
   * @returns Array of S3 URLs
   */
  async uploadScreenshots(
    screenshots: Array<{
      buffer: Buffer;
      testId: string;
      deviceType: string;
      frameNumber: number;
      format: 'jpeg' | 'png';
    }>,
  ): Promise<string[]> {
    try {
      const uploadPromises = screenshots.map((screenshot) =>
        this.uploadScreenshot(screenshot.buffer, {
          testId: screenshot.testId,
          deviceType: screenshot.deviceType,
          frameNumber: screenshot.frameNumber,
          format: screenshot.format,
        }),
      );

      const urls = await Promise.all(uploadPromises);

      this.logger.log(`Batch uploaded ${urls.length} screenshots to S3`);

      return urls;
    } catch (error) {
      this.logger.error('Failed to batch upload screenshots to S3:', error);
      throw error;
    }
  }

  /**
   * Delete a screenshot from S3
   *
   * @param url - S3 URL of the file to delete
   * @returns True if deletion was successful
   */
  async deleteScreenshot(url: string): Promise<boolean> {
    try {
      const key = this.extractKeyFromUrl(url);

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      this.logger.log(`Screenshot deleted successfully: ${key}`);

      return true;
    } catch (error) {
      this.logger.error('Failed to delete screenshot from S3:', error);
      return false;
    }
  }

  /**
   * Delete multiple screenshots in batch
   *
   * @param urls - Array of S3 URLs to delete
   * @returns Number of successfully deleted files
   */
  async deleteScreenshots(urls: string[]): Promise<number> {
    try {
      const deletePromises = urls.map((url) => this.deleteScreenshot(url));
      const results = await Promise.allSettled(deletePromises);

      const successCount = results.filter(
        (result) => result.status === 'fulfilled' && result.value === true,
      ).length;

      this.logger.log(
        `Batch deleted ${successCount}/${urls.length} screenshots from S3`,
      );

      return successCount;
    } catch (error) {
      this.logger.error('Failed to batch delete screenshots from S3:', error);
      return 0;
    }
  }

  /**
   * Check if a file exists in S3
   *
   * @param url - S3 URL to check
   * @returns True if file exists
   */
  async fileExists(url: string): Promise<boolean> {
    try {
      const key = this.extractKeyFromUrl(url);

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);

      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }

      this.logger.error('Error checking file existence in S3:', error);
      throw error;
    }
  }

  /**
   * Generate a unique filename for S3 storage
   *
   * Format: screenshots/{testId}/{deviceType}/frame-{number}-{uuid}.{format}
   */
  private generateFilename(
    testId: string,
    deviceType: string,
    frameNumber: number,
    format: 'jpeg' | 'png',
  ): string {
    const uuid = crypto.randomBytes(8).toString('hex');
    const timestamp = Date.now();

    return `screenshots/${testId}/${deviceType}/frame-${frameNumber}-${timestamp}-${uuid}.${format}`;
  }

  /**
   * Get public URL for an S3 object
   *
   * @param key - S3 object key
   * @returns Full S3 URL
   */
  private getPublicUrl(key: string): string {
    // For S3, the URL format is:
    // https://{bucket}.s3.{region}.amazonaws.com/{key}
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Extract S3 key from a full S3 URL
   *
   * @param url - Full S3 URL
   * @returns S3 object key
   */
  private extractKeyFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove leading slash from pathname
      return urlObj.pathname.substring(1);
    } catch (error) {
      // If URL parsing fails, assume it's already a key
      return url;
    }
  }

  /**
   * Get the configured bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Get the configured AWS region
   */
  getRegion(): string {
    return this.region;
  }
}
