import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, takeUntil, tap, finalize } from 'rxjs/operators';
import { AppError } from '~/common/app-error.common';

@Injectable()
export class AbortInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AbortInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Create a manual AbortController for better cancellation detection
    const controller = new AbortController();
    request.abortSignal = controller.signal;

    // Track request lifecycle state
    const requestState = {
      isProcessing: false,
      isCompleting: false,
      isCompleted: false,
      hasStartedResponse: false,
    };

    // Note: We no longer use fromEvent here - the createCancellationObservable handles all event detection

    // Create a sophisticated cancellation detector
    const createCancellationObservable = () => {
      return new Observable<void>((subscriber) => {
        let isSubscribed = true;

        // Handler for explicit abort signals
        const handleAbort = () => {
          if (!isSubscribed) return;

          // Only treat as cancellation if we haven't started completing
          if (!requestState.isCompleting && !requestState.isCompleted) {
            this.logger.log('Request cancelled via AbortSignal');
            controller.abort();
            subscriber.next();
          }
        };

        // Handler for connection aborted (real cancellations)
        const handleConnectionAborted = () => {
          if (!isSubscribed) return;

          // Only treat as cancellation if we haven't started completing
          if (!requestState.isCompleting && !requestState.isCompleted) {
            this.logger.log('Request cancelled - client disconnected');
            controller.abort();
            subscriber.next();
          }
        };

        // Handler for premature close (before response starts)
        const handlePrematureClose = () => {
          if (!isSubscribed) return;

          // Only consider it cancellation if:
          // 1. We haven't started sending the response AND
          // 2. We haven't begun the completion process
          if (!requestState.hasStartedResponse && !requestState.isCompleting) {
            this.logger.log(
              'Request cancelled - client disconnected before response',
            );
            controller.abort();
            subscriber.next();
          }
        };

        // Listen for real abort signals
        if (request.signal) {
          request.signal.addEventListener('abort', handleAbort);
        }
        request.on('aborted', handleConnectionAborted);

        // Listen for premature close (only before response starts)
        request.on('close', handlePrematureClose);

        // Cleanup function
        return () => {
          isSubscribed = false;
          if (request.signal) {
            request.signal.removeEventListener('abort', handleAbort);
          }
          request.removeListener('aborted', handleConnectionAborted);
          request.removeListener('close', handlePrematureClose);
        };
      });
    };

    const cancellation$ = createCancellationObservable();

    // Monitor response lifecycle
    const originalWrite = response.write;
    const originalEnd = response.end;

    response.write = function (...args: any[]) {
      requestState.hasStartedResponse = true;
      return originalWrite.apply(this, args);
    };

    response.end = function (...args: any[]) {
      requestState.isCompleting = true;
      const result = originalEnd.apply(this, args);
      requestState.isCompleted = true;
      return result;
    };

    return next.handle().pipe(
      tap(() => {
        requestState.isProcessing = true;
      }),
      takeUntil(cancellation$),
      finalize(() => {
        // Ensure state is marked as completing when observable finalizes
        requestState.isCompleting = true;
      }),
      catchError((err) => {
        if (request.signal?.aborted || controller.signal.aborted) {
          return throwError(
            () => new AppError('Request cancelled', HttpStatus.BAD_REQUEST),
          );
        }
        return throwError(() => err);
      }),
    );
  }
}
