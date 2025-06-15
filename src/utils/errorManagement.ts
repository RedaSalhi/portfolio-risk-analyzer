// src/utils/errorManagement.ts
// Gestionnaire d'erreurs robuste avec syntaxe JSX parfaitement corrigée

import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Types et enums
export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  CALCULATION = 'CALCULATION',
  DATA_VALIDATION = 'DATA_VALIDATION',
  PERMISSION = 'PERMISSION',
  STORAGE = 'STORAGE',
  RENDER = 'RENDER',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  userMessage: string;
  severity: ErrorSeverity;
  timestamp: Date;
  context?: Record<string, any>;
  recoverable: boolean;
  retryAction?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
}

// Gestionnaire principal d'erreurs
export class ErrorManager {
  private static instance: ErrorManager;
  private errors: AppError[] = [];
  private maxErrors: number = 50;

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  createError(
    type: ErrorType,
    message: string,
    userMessage: string,
    severity: ErrorSeverity,
    context?: Record<string, any>,
    recoverable: boolean = false,
    retryAction?: () => void
  ): AppError {
    const error: AppError = {
      id: this.generateErrorId(),
      type,
      message,
      userMessage,
      severity,
      timestamp: new Date(),
      context,
      recoverable,
      retryAction,
    };

    this.addError(error);
    this.logError(error);

    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(error);
    }

    return error;
  }

  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addError(error: AppError): void {
    this.errors.unshift(error);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
  }

  private logError(error: AppError): void {
    const logLevel = this.getLogLevel(error.severity);
    console[logLevel]('🚨 Error:', {
      id: error.id,
      type: error.type,
      message: error.message,
      severity: error.severity,
      timestamp: error.timestamp.toISOString(),
      context: error.context,
    });
  }

  private getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'warn';
    }
  }

  private handleCriticalError(error: AppError): void {
    Alert.alert(
      'Critical Error',
      'A critical error has occurred. Please restart the application.',
      [
        {
          text: 'OK',
          onPress: () => {
            if (error.retryAction) {
              error.retryAction();
            }
          },
        },
      ]
    );
  }

  getErrors(): AppError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  info(message: string, context?: string, data?: Record<string, any>): void {
    console.log(`ℹ️ ${context || 'INFO'}: ${message}`, data || '');
  }
}

// Error Boundary Component avec syntaxe JSX PARFAITEMENT corrigée
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

      return React.createElement(
        Animated.View,
        {
          style: [
            styles.errorContainer,
            { opacity: this.fadeAnim }
          ]
        },
        React.createElement(
          LinearGradient,
          {
            colors: ['#ff6b6b', '#ee5a24'],
            style: styles.errorGradient
          },
          React.createElement(
            View,
            { style: styles.errorContent },
            React.createElement(Ionicons, {
              name: 'warning',
              size: 64,
              color: '#ffffff'
            }),
            React.createElement(
              Text,
              { style: styles.errorTitle },
              'Oops! Quelque chose s\'est mal passé'
            ),
            React.createElement(
              Text,
              { style: styles.errorMessage },
              this.state.error.userMessage
            ),
            React.createElement(
              TouchableOpacity,
              {
                style: styles.retryButton,
                onPress: this.handleRetry,
                activeOpacity: 0.8
              },
              React.createElement(
                LinearGradient,
                {
                  colors: ['#ffffff', '#f8f9fa'],
                  style: styles.retryButtonGradient
                },
                React.createElement(Ionicons, {
                  name: 'refresh',
                  size: 20,
                  color: '#ee5a24'
                }),
                React.createElement(
                  Text,
                  { style: styles.retryButtonText },
                  'Réessayer'
                )
              )
            ),
            React.createElement(
              Text,
              { style: styles.errorDetails },
              `ID Erreur: ${this.state.error.id.slice(-8)}`
            )
          )
        )
      );
    }

    return this.props.children;
  }
}

// Gestionnaire d'erreurs financières spécialisé
export class FinancialErrorHandler {
  private errorManager = ErrorManager.getInstance();

  public handleCalculationError(error: any, context: Record<string, any>): AppError {
    return this.errorManager.createError(
      ErrorType.CALCULATION,
      `Erreur de calcul: ${error.message}`,
      'Impossible de calculer les métriques financières. Veuillez vérifier vos données.',
      ErrorSeverity.MEDIUM,
      context,
      true,
      () => this.retryCalculation(context)
    );
  }

  public handleDataValidationError(field: string, value: any): AppError {
    return this.errorManager.createError(
      ErrorType.DATA_VALIDATION,
      `Valeur invalide pour ${field}: ${value}`,
      `Veuillez vérifier votre ${field} et réessayer.`,
      ErrorSeverity.LOW,
      { field, value },
      false
    );
  }

  public handleNetworkError(url: string, error: any): AppError {
    return this.errorManager.createError(
      ErrorType.NETWORK,
      `Échec de la requête réseau: ${url}`,
      'Impossible de récupérer les données du marché. Vérifiez votre connexion.',
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
      `Erreur API ${statusCode}: ${message}`,
      'Service de données temporairement indisponible. Utilisation des données en cache.',
      severity,
      { api, statusCode },
      statusCode < 500,
      () => this.retryApiCall(api)
    );
  }

  private retryCalculation(context: Record<string, any>): void {
    this.errorManager.info('Retry calculation', 'CALCULATION_RETRY', context);
  }

  private retryNetworkRequest(url: string): void {
    this.errorManager.info(`Retry network request: ${url}`, 'NETWORK_RETRY');
  }

  private retryApiCall(api: string): void {
    this.errorManager.info(`Retry API call: ${api}`, 'API_RETRY');
  }
}

// Messages d'erreur conviviaux
export const ErrorMessages = {
  [ErrorType.NETWORK]: {
    title: 'Problème de connexion',
    message: 'Impossible de se connecter aux services de données financières.',
    icon: 'wifi-outline',
    color: '#f39c12',
  },
  [ErrorType.API]: {
    title: 'Service indisponible',
    message: 'Service de données financières temporairement indisponible.',
    icon: 'server-outline',
    color: '#e67e22',
  },
  [ErrorType.CALCULATION]: {
    title: 'Erreur de calcul',
    message: 'Impossible de traiter les calculs financiers.',
    icon: 'calculator-outline',
    color: '#e74c3c',
  },
  [ErrorType.DATA_VALIDATION]: {
    title: 'Données invalides',
    message: 'Veuillez vérifier vos données et réessayer.',
    icon: 'alert-circle-outline',
    color: '#f39c12',
  },
  [ErrorType.PERMISSION]: {
    title: 'Permission requise',
    message: 'Cette fonction nécessite des permissions supplémentaires.',
    icon: 'lock-closed-outline',
    color: '#9b59b6',
  },
  [ErrorType.STORAGE]: {
    title: 'Problème de stockage',
    message: 'Impossible de sauvegarder ou récupérer les données.',
    icon: 'save-outline',
    color: '#3498db',
  },
  [ErrorType.RENDER]: {
    title: 'Erreur d\'affichage',
    message: 'Impossible d\'afficher ce contenu.',
    icon: 'eye-off-outline',
    color: '#95a5a6',
  },
  [ErrorType.UNKNOWN]: {
    title: 'Erreur inattendue',
    message: 'Une erreur inattendue s\'est produite.',
    icon: 'help-circle-outline',
    color: '#7f8c8d',
  },
};

// Export des instances singletons
export const errorManager = ErrorManager.getInstance();
export const financialErrorHandler = new FinancialErrorHandler();

// Fonctions utilitaires
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
        (error as Error).message,
        'Une erreur s\'est produite lors du traitement de votre demande.',
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
        (error as Error).message,
        'Une erreur s\'est produite lors du traitement de votre demande.',
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
