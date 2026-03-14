export enum ErrorType {
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  message: string;
  type: ErrorType;
  originalError?: any;
  code?: string;
}

export class ErrorHandler {
  static handle(error: any, type: ErrorType = ErrorType.UNKNOWN): AppError {
    console.error(`[${type}] Error:`, error);

    let message = 'Ha ocurrido un error inesperado.';
    let code = error?.code;

    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }

    // Traducir errores comunes de Supabase
    if (code === '23505') {
      message = 'Este registro ya existe.';
      type = ErrorType.VALIDATION;
    }

    return { message, type, originalError: error, code };
  }

  static isAuthError(error: any): boolean {
    return error?.message?.includes('Refresh Token Not Found') || 
           error?.message?.includes('invalid_refresh_token') ||
           error?.status === 401;
  }
}
