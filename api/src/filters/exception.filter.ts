import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';

import { Environment } from '../env.validate';
import { ValidationException } from './validation-exception.filter';

import { AppError } from '~/common/app-error.common';
import { ErrorMessage } from '~/enums/error-messages.enum';

@Catch()
export class GlobalExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionsFilter.name);

  catch(err: any, host: ArgumentsHost): Response<JSON> {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    let status = err.status || HttpStatus.INTERNAL_SERVER_ERROR;

    let message: { [key: string]: any } | string =
      ErrorMessage.CUSTOM_SERVER_ERROR;

    let data: { [x: string]: any } | undefined | string = undefined;

    const errCode = err.code || false;

    // Handle AppError instances (custom application errors)
    if (err instanceof AppError) {
      status = err.status;
      message = err.message;
    }
    // Handle JWT-related errors
    else if (err instanceof TokenExpiredError) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Token has expired';
    }
    else if (err instanceof JsonWebTokenError) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Invalid token';
    }
    // Handle validation errors
    else if (err instanceof ValidationException) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      if (err.errors instanceof Array) {
        data = err.errors.map((validationErr: ValidationError) => ({
          property: validationErr.property,
          constraints: Object.values(validationErr.constraints ?? {}),
        }));
      } else {
        data = err.getResponse();
      }
    }
    // Handle SMTP errors
    else if (errCode && errCode?.startsWith('SMTP')) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = ErrorMessage.FAILED_TO_SEND_EMAIL;
    }
    // Handle MongoDB duplicate key errors
    else if (errCode === 11000) {
      status = HttpStatus.CONFLICT;
      message = 'Resource already exists';
    }
    // Handle MongoDB validation errors
    else if (err.name === 'ValidationError') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      data = Object.values(err.errors).map((error: any) => ({
        field: error.path,
        message: error.message,
      }));
    }
    // Handle general string messages
    else if (typeof err.message === 'string') {
      message = err.message;
    }

    // Log error for debugging (only in development or for server errors)
    if (process.env.NODE_ENV === Environment.DEVELOPMENT || status >= 500) {
      this.logger.error(`Error ${status}: ${message}`, err.stack);
    }

    // Include additional debug data in development
    if (process.env.NODE_ENV === Environment.DEVELOPMENT && !data) {
      data = {
        message: err.message,
        stack: err.stack,
      };
    }

    return res.status(status).json({
      status,
      message,
      data,
    });
  }
}
