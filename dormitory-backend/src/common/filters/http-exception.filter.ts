import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.translateMessage(exception, status);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private translateMessage(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      let rawMessage: unknown = response;

      if (typeof response === 'object' && response !== null) {
        const maybeMessage = (response as { message?: unknown }).message;
        if (maybeMessage !== undefined) {
          rawMessage = maybeMessage;
        }
      }

      if (Array.isArray(rawMessage)) {
        return 'Dữ liệu không hợp lệ.';
      }

      if (typeof rawMessage === 'string') {
        const normalized = rawMessage.toLowerCase();
        if (normalized.includes('invalid credentials')) {
          return 'Email hoặc mật khẩu không đúng.';
        }
        if (
          normalized.includes('unauthorized') ||
          normalized.includes('not authenticated')
        ) {
          return 'Bạn chưa đăng nhập.';
        }
        if (
          normalized.includes('forbidden') ||
          normalized.includes('permission') ||
          normalized.includes('access denied') ||
          normalized.includes('only')
        ) {
          return 'Bạn không có quyền thực hiện chức năng này.';
        }
        if (
          normalized.includes('not found') ||
          normalized.includes('could not find')
        ) {
          return 'Không tìm thấy dữ liệu.';
        }
        if (
          normalized.includes('already exists') ||
          normalized.includes('already in use') ||
          normalized.includes('already has')
        ) {
          return 'Dữ liệu đã tồn tại.';
        }
        if (
          normalized.includes('validation') ||
          normalized.includes('must be') ||
          normalized.includes('must not') ||
          normalized.includes('required') ||
          normalized.includes('invalid') ||
          normalized.includes('email') ||
          normalized.includes('password') ||
          normalized.includes('cannot be empty')
        ) {
          return 'Dữ liệu không hợp lệ.';
        }
        if (
          normalized.includes('cannot update') ||
          normalized.includes('already done')
        ) {
          return 'Yêu cầu đã được xử lý xong, không thể cập nhật.';
        }
        if (
          normalized.includes('inactive') ||
          normalized.includes('disabled')
        ) {
          return 'Tài khoản của bạn hiện không hoạt động.';
        }
        if (
          normalized.includes('internal server') ||
          normalized.includes('server error') ||
          normalized.includes('unknown error')
        ) {
          return 'Đã xảy ra lỗi hệ thống.';
        }

        return rawMessage;
      }
    }

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Dữ liệu không hợp lệ.';
      case HttpStatus.UNAUTHORIZED:
        return 'Bạn chưa đăng nhập.';
      case HttpStatus.FORBIDDEN:
        return 'Bạn không có quyền thực hiện chức năng này.';
      case HttpStatus.NOT_FOUND:
        return 'Không tìm thấy dữ liệu.';
      case HttpStatus.CONFLICT:
        return 'Dữ liệu đã tồn tại.';
      case HttpStatus.INTERNAL_SERVER_ERROR:
      default:
        return 'Đã xảy ra lỗi hệ thống.';
    }
  }
}
