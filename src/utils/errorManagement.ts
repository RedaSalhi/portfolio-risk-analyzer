// src/utils/errorManagement.ts - ADVANCED ERROR MANAGEMENT SYSTEM
// Beautiful error handling with user-friendly messages and comprehensive logging

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Error Types
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API', 
  CALCULATION = 'CALCULATION',
  DATA_VALIDATION = 'DATA_VALIDATION',
  PERMISSION = 'PERMISSION',
  STORAGE = 'STORAGE',
  RENDER = 'RENDER',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Error Interface
export interface AppError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  timestamp: Date;
  stack?: string;
  context?: Record<string, any>;
  retry?: boolean;
  retryAction?: () => void;
}

// Logger Interface
export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  category?: string;
  data?: Record<string, any>;
}

// Error Manager Class
export class ErrorManager {
  private static instance: ErrorManager;
  private errors: AppError[] = [];
  private logs: LogEntry[] = [];
  private maxErrors = 50;
  private maxLogs = 200;
  private errorHandlers: Map<ErrorType, (error: AppError) => void> = new Map();

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  // Error Creation and Management
  public createError(
    type: ErrorType,
    message: string,
    userMessage: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>,
    retry?: boolean,
    retryAction?: () => void
  ): AppError {
    const error: AppError = {
      id: this.generateId(),
      type,
      severity,
      message,
      userMessage,
      timestamp: new Date(),
      context,
      retry,
      retryAction,
    };

    this.addError(error);
    this.log('error', `${type}: ${message}`, type, context);
    
    return error;
  }

  public addError(error: AppError): void {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Execute custom handler if registered
    const handler = this.errorHandlers.get(error.type);
    if (handler) {
      handler(error);
    }

    // Critical errors need immediate attention
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(error);
    }
  }

  public clearErrors(): void {
    this.errors = [];
  }

  public getErrors(): AppError[] {
    return this.errors;
  }

  public getErrorsByType(type: ErrorType): AppError[] {
    return this.errors.filter(error => error.type === type);
  }

  public getErrorsBySeverity(severity: ErrorSeverity): AppError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  // Error Handling Registration
  public registerErrorHandler(type: ErrorType, handler: (error: AppError) => void): void {
    this.errorHandlers.set(type, handler);
  }

  // Logging System
  public log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    category?: string,
    data?: Record<string, any>
  ): void {
    const logEntry: LogEntry = {
      id: this.generateId(),
      level,
      message,
      timestamp: new Date(),
      category,
      data,
    };

    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console output with formatting
    this.outputToConsole(logEntry);
  }

  public debug(message: string, category?: string, data?: Record<string, any>): void {
    this.log('debug', message, category, data);
  }

  public info(message: string, category?: string, data?: Record<string, any>): void {
    this.log('info', message, category, data);
  }

  public warn(message: string, category?: string, data?: Record<string, any>): void {
    this.log('warn', message, category, data);
  }

  public error(message: string, category?: string, data?: Record<string, any>): void {
    this.log('error', message, category, data);
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public getLogsByLevel(level: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  public getLogsByCategory(category: string): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  public clearLogs(): void {
    this.logs = [];
  }

  // Error Recovery
  public retryError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error && error.retry && error.retryAction) {
      try {
        error.retryAction();
        this.info(`Retrying error: ${error.id}`, 'ERROR_RECOVERY');
        return true;
      } catch (retryError) {
        this.error(`Retry failed for error: ${error.id}`, 'ERROR_RECOVERY', { retryError });
        return false;
      }
    }
    return false;
  }

  // Private Methods
  private setupGlobalErrorHandlers(): void {
    // React Native global error handler
    if (global.ErrorUtils) {
      const originalGlobalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.createError(
          ErrorType.UNKNOWN,
          error.message || 'Unknown error',
          'An unexpected error occurred. Please try again.',
          isFatal ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
          { stack: error.stack, isFatal }
        );
        originalGlobalHandler(error, isFatal);
      });
    }

    // Unhandled promise rejections
    const originalHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      this.createError(
        ErrorType.UNKNOWN,
        `Unhandled promise rejection: ${event.reason}`,
        'A background operation failed. Some features may not work correctly.',
        ErrorSeverity.MEDIUM,
        { reason: event.reason }
      );
      if (originalHandler) originalHandler(event);
    };
  }

  private handleCriticalError(error: AppError): void {
    this.error(`CRITICAL ERROR: ${error.message}`, 'CRITICAL', error.context);
    // In a production app, you might want to send this to a crash reporting service
    console.error('CRITICAL ERROR:', error);
  }

  private outputToConsole(logEntry: LogEntry): void {
    const timestamp = logEntry.timestamp.toLocaleTimeString();
    const category = logEntry.category ? `[${logEntry.category}]` : '';
    const formattedMessage = `${timestamp} ${category} ${logEntry.message}`;

    switch (logEntry.level) {
      case 'debug':
        console.log(`🔍 ${formattedMessage}`, logEntry.data || '');
        break;
      case 'info':
        console.info(`ℹ️ ${formattedMessage}`, logEntry.data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${formattedMessage}`, logEntry.data || '');
        break;
      case 'error':
        console.error(`❌ ${formattedMessage}`, logEntry.data || '');
        break;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Export Methods
  public exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public getSystemInfo(): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      totalErrors: this.errors.length,
      totalLogs: this.logs.length,
      errorsByType: this.getErrorCountsByType(),
      errorsBySeverity: this.getErrorCountsBySeverity(),
      recentErrors: this.errors.slice(0, 5),
      recentLogs: this.logs.slice(0, 10),
    };
  }

  private getErrorCountsByType(): Record<string, number> {
    const counts: Record<string, number> = {};
    Object.values(ErrorType).forEach(type => {
      counts[type] = this.getErrorsByType(type).length;
    });
    return counts;
  }

  private getErrorCountsBySeverity(): Record<string, number> {
    const counts: Record<string, number> = {};
    Object.values(ErrorSeverity).forEach(severity => {
      counts[severity] = this.getErrorsBySeverity(severity).length;
    });
    return counts;
  }
}

// React Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
  onError?: (error: AppError) => void;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorManager = ErrorManager.getInstance();
  private fadeAnim = new Animated.Value(0);

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const appError = this.errorManager.createError(
      ErrorType.RENDER,
      error.message,
      'Something went wrong while displaying this screen.',
      ErrorSeverity.HIGH,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      true,
      () => this.handleRetry()
    );

    this.setState({ error: appError });

    if (this.props.onError) {
      this.props.onError(appError);
    }

    // Animate error display
    Animated.timing(this.fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
    this.fadeAnim.setValue(0);
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      return (
        <Animated.View style={[styles.errorContainer, { opacity: this.fadeAnim }]}>
          <LinearGradient
            colors={['#ff6b6b', '#ee5a24']}
            style={styles.errorGradient}
          >
            <View style={styles.errorContent}>
              <Ionicons name="warning" size={64} color="#ffffff" />
              <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
              <Text style={styles.errorMessage}>{this.state.error.userMessage}</Text>
              
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.retryButtonGradient}
                >
                  <Ionicons name="refresh" size={20} color="#ee5a24" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.errorDetails}>
                Error ID: {this.state.error.id.slice(-8)}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      );
    }

    return this.props.children;
  }
}

// Specific Error Handlers
export class FinancialErrorHandler {
  private errorManager = ErrorManager.getInstance();

  public handleCalculationError(error: any, context: Record<string, any>): AppError {
    return this.errorManager.createError(
      ErrorType.CALCULATION,
      `Calculation failed: ${error.message}`,
      'Unable to calculate financial metrics. Please check your input data.',
      ErrorSeverity.MEDIUM,
      context,
      true,
      () => this.retryCalculation(context)
    );
  }

  public handleDataValidationError(field: string, value: any): AppError {
    return this.errorManager.createError(
      ErrorType.DATA_VALIDATION,
      `Invalid ${field}: ${value}`,
      `Please check your ${field} and try again.`,
      ErrorSeverity.LOW,
      { field, value },
      false
    );
  }

  public handleNetworkError(url: string, error: any): AppError {
    return this.errorManager.createError(
      ErrorType.NETWORK,
      `Network request failed: ${url}`,
      'Unable to fetch market data. Please check your internet connection.',
      ErrorSeverity.MEDIUM,
      { url, error: error.message },
      true,
      () => this.retryNetworkRequest(url)
    );
  }

  public handleApiError(api: string, statusCode: number, message: string): AppError {
    const severity = statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    return this.errorManager.createError(
      ErrorType.API,
      `API Error ${statusCode}: ${message}`,
      'Data service is currently unavailable. Using cached data.',
      severity,
      { api, statusCode },
      statusCode < 500,
      () => this.retryApiCall(api)
    );
  }

  private retryCalculation(context: Record<string, any>): void {
    this.errorManager.info('Retrying financial calculation', 'CALCULATION_RETRY', context);
    // Implement retry logic here
  }

  private retryNetworkRequest(url: string): void {
    this.errorManager.info(`Retrying network request: ${url}`, 'NETWORK_RETRY');
    // Implement retry logic here
  }

  private retryApiCall(api: string): void {
    this.errorManager.info(`Retrying API call: ${api}`, 'API_RETRY');
    // Implement retry logic here
  }
}

// User-Friendly Error Messages
export const ErrorMessages = {
  [ErrorType.NETWORK]: {
    title: 'Connection Issue',
    message: 'Unable to connect to financial data services. Please check your internet connection.',
    icon: 'wifi-outline',
    color: '#f39c12',
  },
  [ErrorType.API]: {
    title: 'Data Service Issue',
    message: 'Financial data service is temporarily unavailable. Using cached data.',
    icon: 'server-outline',
    color: '#e67e22',
  },
  [ErrorType.CALCULATION]: {
    title: 'Calculation Error',
    message: 'Unable to process financial calculations. Please verify your input data.',
    icon: 'calculator-outline',
    color: '#e74c3c',
  },
  [ErrorType.DATA_VALIDATION]: {
    title: 'Input Error',
    message: 'Please check your input data and try again.',
    icon: 'alert-circle-outline',
    color: '#f39c12',
  },
  [ErrorType.PERMISSION]: {
    title: 'Permission Required',
    message: 'This feature requires additional permissions to function properly.',
    icon: 'lock-closed-outline',
    color: '#9b59b6',
  },
  [ErrorType.STORAGE]: {
    title: 'Storage Issue',
    message: 'Unable to save or retrieve data. Please try again.',
    icon: 'save-outline',
    color: '#3498db',
  },
  [ErrorType.RENDER]: {
    title: 'Display Error',
    message: 'Unable to display this content. Please refresh the app.',
    icon: 'eye-off-outline',
    color: '#95a5a6',
  },
  [ErrorType.UNKNOWN]: {
    title: 'Unexpected Error',
    message: 'An unexpected error occurred. Please try again.',
    icon: 'help-circle-outline',
    color: '#7f8c8d',
  },
};

// Export singleton instance
export const errorManager = ErrorManager.getInstance();
export const financialErrorHandler = new FinancialErrorHandler();

// Utility functions
export const withErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  errorType: ErrorType = ErrorType.UNKNOWN,
  context?: Record<string, any>
): T => {
  return ((...args: any[]) => {
    try {
      return fn(...args);
    } catch (error) {
      errorManager.createError(
        errorType,
        error.message,
        'An error occurred while processing your request.',
        ErrorSeverity.MEDIUM,
        { ...context, args }
      );
      throw error;
    }
  }) as T;
};

export const withAsyncErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorType: ErrorType = ErrorType.UNKNOWN,
  context?: Record<string, any>
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorManager.createError(
        errorType,
        error.message,
        'An error occurred while processing your request.',
        ErrorSeverity.MEDIUM,
        { ...context, args }
      );
      throw error;
    }
  }) as T;
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorContent: {
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 16,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ee5a24',
  },
  errorDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'monospace',
  },
});
