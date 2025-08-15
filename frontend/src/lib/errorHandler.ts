import { toast } from 'sonner';

// Error types
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  IRYS_ERROR = 'IRYS_ERROR',
  IRYS_PD_ERROR = 'IRYS_PD_ERROR', // Programmable Data error
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  PIXEL_PLACEMENT_ERROR = 'PIXEL_PLACEMENT_ERROR',
  WALLET_ERROR = 'WALLET_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  recoverable: boolean;
  retryable: boolean;
  retryCount?: number;
  maxRetries?: number;
  fallbackAction?: () => Promise<void> | void;
  context?: Record<string, any>;
}

// Error creation helpers
export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryDelays = [1000, 2000, 4000, 8000]; // exponential backoff

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  createPixelPlacementError(
    originalError: Error,
    context: { x: number; y: number; color: string; transactionId?: string }
  ): AppError {
    return {
      type: ErrorType.PIXEL_PLACEMENT_ERROR,
      message: 'An error occurred during pixel placement',
      originalError,
      recoverable: true,
      retryable: true,
      maxRetries: 3,
      context,
      fallbackAction: async () => {
        // rollback optimistic update
        this.rollbackOptimisticUpdate(context);
        toast.error(`Pixel (${context.x}, ${context.y}) placement failed - please retry`);
      }
    };
  }

  createIrysError(originalError: Error, operation: string): AppError {
    const isConnectionError = originalError.message.includes('connection') || 
                             originalError.message.includes('network') ||
                             originalError.message.includes('timeout');
    
    const isAuthError = originalError.message.includes('authentication') || 
                       originalError.message.includes('unauthorized') ||
                       originalError.message.includes('permission');

    return {
      type: ErrorType.IRYS_ERROR,
      message: `Irys ${operation} error`,
      originalError,
      recoverable: !isAuthError,
      retryable: isConnectionError,
      maxRetries: isConnectionError ? 3 : 1,
      context: { operation, isConnectionError, isAuthError },
      fallbackAction: async () => {
         if (isAuthError) {
          toast.error('Irys authentication failed - check wallet connection');
        } else if (isConnectionError) {
          toast.error('Irys network issue - please try again later');
        } else {
          toast.error(`Irys ${operation} failed - please retry`);
        }
      }
    };
  }

  createIrysPDError(originalError: Error, operation: string, context?: Record<string, any>): AppError {
    const isAccessListError = originalError.message.includes('Access List') || 
                             originalError.message.includes('access list');
    
    const isDataError = originalError.message.includes('data') || 
                       originalError.message.includes('payload') ||
                       originalError.message.includes('size');

    return {
      type: ErrorType.IRYS_PD_ERROR,
      message: `Irys Programmable Data ${operation} error`,
      originalError,
      recoverable: true,
      retryable: !isDataError, // data errors are not retryable
      maxRetries: isAccessListError ? 2 : 1,
      context: { operation, isAccessListError, isDataError, ...context },
      fallbackAction: async () => {
         if (isAccessListError) {
          toast.error('Access List creation failed - falling back to standard flow');
        } else if (isDataError) {
          toast.error('Programmable Data processing failed - falling back to standard flow');
        } else {
          toast.error(`Programmable Data ${operation} failed - falling back to standard flow`);
        }
      }
    };
  }

  createBlockchainError(originalError: Error, operation: string): AppError {
    const isUserRejection = originalError.message.includes('User denied') || 
                           originalError.message.includes('rejected') ||
                           originalError.message.includes('cancelled');

    const isGasError = originalError.message.includes('gas') || 
                      originalError.message.includes('insufficient') ||
                      originalError.message.includes('fee');

    return {
      type: ErrorType.BLOCKCHAIN_ERROR,
      message: isUserRejection ? 'User rejected the transaction' : 'Blockchain transaction error',
      originalError,
      recoverable: !isUserRejection,
      retryable: !isUserRejection && !isGasError,
      maxRetries: isGasError ? 1 : 2,
      context: { operation, userRejection: isUserRejection, isGasError },
      fallbackAction: async () => {
         if (isUserRejection) {
          toast.info('Transaction was cancelled');
        } else if (isGasError) {
          toast.error('Insufficient gas - check wallet balance');
        } else {
          toast.error('Blockchain connection issue - check wallet');
        }
      }
    };
  }

  createWalletError(originalError: Error): AppError {
    return {
      type: ErrorType.WALLET_ERROR,
      message: 'Wallet connection error',
      originalError,
      recoverable: true,
      retryable: false,
      maxRetries: 0,
      fallbackAction: async () => {
        toast.error('Check your wallet connection and retry');
      }
    };
  }

  createNetworkError(originalError: Error): AppError {
    return {
      type: ErrorType.NETWORK_ERROR,
      message: 'Network connection error',
      originalError,
      recoverable: true,
      retryable: true,
      maxRetries: 3,
      fallbackAction: async () => {
        toast.error('Check your network connection and retry');
      }
    };
  }

  // Unified error handler
  async handleError(error: AppError): Promise<boolean> {
    console.error(`[${error.type}] ${error.message}`, {
      originalError: error.originalError,
      context: error.context
    });

    // Retry if possible
    if (error.retryable && error.retryCount !== undefined && error.maxRetries !== undefined) {
      if (error.retryCount < error.maxRetries) {
        const delay = this.retryDelays[error.retryCount] || 8000;
        
        toast.info(`Retrying... (${error.retryCount + 1}/${error.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return true; // 재시도 신호
      }
    }

    // Run fallback action
    if (error.fallbackAction) {
      try {
        await error.fallbackAction();
      } catch (fallbackError) {
        console.error('Fallback action failed:', fallbackError);
        toast.error('An error occurred during recovery');
      }
    }

    return false; // not retryable
  }

  // Create AppError from unknown
  createAppError(error: unknown, operation: string, context?: Record<string, any>): AppError {
    const originalError = error instanceof Error ? error : new Error(String(error));
    
    // 에러 메시지 기반 타입 추론
    if (originalError.message.includes('network') || originalError.message.includes('fetch')) {
      return this.createNetworkError(originalError);
    }
    
    if (originalError.message.includes('wallet') || originalError.message.includes('ethereum')) {
      return this.createWalletError(originalError);
    }
    
    if (originalError.message.includes('irys')) {
      return this.createIrysError(originalError, operation);
    }
    
    if (originalError.message.includes('transaction') || originalError.message.includes('gas')) {
      return this.createBlockchainError(originalError, operation);
    }

    // Default error
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'Unknown error occurred',
      originalError,
      recoverable: false,
      retryable: false,
      context: { operation, ...context },
       fallbackAction: () => { toast.error('Unexpected error. Please refresh the page.'); }
    };
  }

  // rollback optimistic update
  private rollbackOptimisticUpdate(context: { x: number; y: number; color: string }) {
    // 전역 상태에서 낙관적 픽셀 제거
    const rollbackEvent = new CustomEvent('rollback-pixel', {
      detail: { x: context.x, y: context.y }
    });
    window.dispatchEvent(rollbackEvent);
  }

  // 재시도 함수
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    context?: Record<string, any>
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          const appError = this.createAppError(error, operationName, { 
            ...context, 
            attempt: attempt + 1,
            maxRetries 
          });
          
          // 재시도 가능한지 확인
          if (appError.retryable) {
            const delay = this.retryDelays[attempt] || 8000;
            console.log(`Retrying ${operationName} in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // 최종 실패
        const finalError = this.createAppError(lastError, operationName, context);
        await this.handleError(finalError);
        throw lastError;
      }
    }
    
    throw lastError;
  }
}

// 편의 함수들
export const errorHandler = ErrorHandler.getInstance();

export const handlePixelPlacementError = (
  error: Error,
  context: { x: number; y: number; color: string; transactionId?: string }
) => {
  const appError = errorHandler.createPixelPlacementError(error, context);
  return errorHandler.handleError(appError);
};

export const handleIrysError = (error: Error, operation: string) => {
  const appError = errorHandler.createIrysError(error, operation);
  return errorHandler.handleError(appError);
};

export const handleBlockchainError = (error: Error, operation: string) => {
  const appError = errorHandler.createBlockchainError(error, operation);
  return errorHandler.handleError(appError);
};

export const withRetry = errorHandler.withRetry.bind(errorHandler);
