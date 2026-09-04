import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface SafeErrorResponse {
  statusCode: number;
  message: string;
  requestId: string;
}

@Catch()
export class SafeHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestHeader = response.getHeader('x-request-id');
    const requestId =
      typeof requestHeader === 'string' ? requestHeader : String(request.id ?? 'unavailable');
    const message = this.getSafeMessage(exception, statusCode);
    const body: SafeErrorResponse = { statusCode, message, requestId };

    response.status(statusCode).json(body);
  }

  private getSafeMessage(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }

      if (typeof response === 'object' && response !== null && 'message' in response) {
        const message = response.message;
        if (typeof message === 'string') {
          return message;
        }
      }

      return exception.message;
    }

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Internal server error';
    }

    return 'Request failed';
  }
}
