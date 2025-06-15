// src/utils/financialCalculations.ts
// Bibliothèque complète de calculs financiers pour l'analyse de portefeuille et de risque

import { ErrorType, financialErrorHandler } from './errorManagement';

// ===== INTERFACES =====
export interface StockData {
  symbol: string;
  prices: number[];
  dates: string[];
  returns?: number[];
}

export interface PortfolioData {
  stocks: StockData[];
  weights: number[];
}

export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  efficientFrontier?: Array<{ risk: number; return: number; sharpe: number }>;
}

export interface VaRResult {
  var95: number;
  var99: number;
  expectedShortfall: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  distribution: number[];
}

export interface CAPMResult {
  beta: number;
  alpha: number;
  expectedReturn: number;
  rSquared: number;
  systematicRisk: number;
  unsystematicRisk: number;
}

// ===== FONCTIONS UTILITAIRES =====

/**
 * Calcule les rendements à partir des prix
 */
export function calculateReturns(prices: number[]): number[] {
  if (prices.length < 2) {
    throw financialErrorHandler.handleDataValidationError('prices', 'Minimum 2 price points required');
  }

  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] <= 0) {
      throw financialErrorHandler.handleDataValidationError('price', `Invalid price: ${prices[i - 1]}`);
    }
    returns.push(prices[i] / prices[i - 1] - 1);
  }
  return returns;
}

/**
 * Calcule la moyenne
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Calcule l'écart-type
 */
export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  
  const avg = mean(values);
  const squaredDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squaredDiffs));
}

/**
 * Calcule la covariance entre deux séries
 */
export function covariance(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {
    throw financialErrorHandler.handleDataValidationError('arrays', 'Arrays must have same non-zero length');
  }

  const meanX = mean(x);
  const meanY = mean(y);
  
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    sum += (x[i] - meanX) * (y[i] - meanY);
  }
  
  return sum / (x.length - 1);
}

/**
 * Calcule la corrélation entre deux séries
 */
export function correlation(x: number[], y: number[]): number {
  const cov = covariance(x, y);
  const stdX = standardDeviation(x);
  const stdY = standardDeviation(y);
  
  if (stdX === 0 || stdY === 0) return 0;
  return cov / (stdX * stdY);
}

/**
 * Génère des nombres aléatoires selon une distribution normale
 */
export function normalRandom(mean: number = 0, std: number = 1): number {
  const u = Math.random();
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ===== CALCULATEUR VAR =====

export class VaRCalculator {
  private static readonly TRADING_DAYS_PER_YEAR = 252;
  private static readonly CONFIDENCE_LEVELS = [0.95, 0.99];

  /**
   * Calcule le VaR paramétrique
   */
  static calculateParametricVaR(
    returns: number[],
    confidenceLevel: number = 0.95,
    position: number = 1000000
  ): VaRResult {
    try {
      if (returns.length === 0) {
        throw new Error('No returns data provided');
      }

      const sortedReturns = [...returns].sort((a, b) => a - b);
      const avgReturn = mean(returns);
      const volatility = standardDeviation(returns);
      
      // VaR paramétrique (distribution normale)
      const zScore95 = -1.645; // 5e percentile
      const zScore99 = -2.326; // 1er percentile
      
      const var95 = -(avgReturn + zScore95 * volatility);
      const var99 = -(avgReturn + zScore99 * volatility);
      
      // Expected Shortfall (Conditional VaR)
      const threshold95 = avgReturn + zScore95 * volatility;
      const threshold99 = avgReturn + zScore99 * volatility;
      
      const tailReturns95 = returns.filter(r => r <= threshold95);
      const tailReturns99 = returns.filter(r => r <= threshold99);
      
      const expectedShortfall95 = tailReturns95.length > 0 ? -mean(tailReturns95) : var95;
      const expectedShortfall99 = tailReturns99.length > 0 ? -mean(tailReturns99) : var99;
      
      // Métriques additionnelles
      const sharpeRatio = avgReturn / volatility;
      const maxDrawdown = this.calculateMaxDrawdown(returns);
      const distribution = this.generateDistribution(avgReturn, volatility);

      return {
        var95: var95,
        var99: var99,
        expectedShortfall: (expectedShortfall95 + expectedShortfall99) / 2,
        volatility: volatility * Math.sqrt(this.TRADING_DAYS_PER_YEAR),
        sharpeRatio: sharpeRatio * Math.sqrt(this.TRADING_DAYS_PER_YEAR),
        maxDrawdown,
        distribution,
      };
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'parametricVaR',
        dataLength: returns.length,
        confidenceLevel,
        position 
      });
    }
  }

  /**
   * Calcule le VaR historique
   */
  static calculateHistoricalVaR(
    returns: number[],
    confidenceLevel: number = 0.95
  ): VaRResult {
    try {
      if (returns.length === 0) {
        throw new Error('No returns data provided');
      }

      const sortedReturns = [...returns].sort((a, b) => a - b);
      const index95 = Math.floor(sortedReturns.length * 0.05);
      const index99 = Math.floor(sortedReturns.length * 0.01);
      
      const var95 = -sortedReturns[index95];
      const var99 = -sortedReturns[index99];
      
      // Expected Shortfall
      const tailReturns95 = sortedReturns.slice(0, index95 + 1);
      const tailReturns99 = sortedReturns.slice(0, index99 + 1);
      
      const expectedShortfall95 = tailReturns95.length > 0 ? -mean(tailReturns95) : var95;
      const expectedShortfall99 = tailReturns99.length > 0 ? -mean(tailReturns99) : var99;
      
      const avgReturn = mean(returns);
      const volatility = standardDeviation(returns);
      const sharpeRatio = avgReturn / volatility;
      const maxDrawdown = this.calculateMaxDrawdown(returns);
      const distribution = this.generateHistoricalDistribution(returns);

      return {
        var95,
        var99,
        expectedShortfall: (expectedShortfall95 + expectedShortfall99) / 2,
        volatility: volatility * Math.sqrt(this.TRADING_DAYS_PER_YEAR),
        sharpeRatio: sharpeRatio * Math.sqrt(this.TRADING_DAYS_PER_YEAR),
        maxDrawdown,
        distribution,
      };
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'historicalVaR',
        dataLength: returns.length,
        confidenceLevel 
      });
    }
  }

  /**
   * Calcule le VaR Monte Carlo
   */
  static calculateMonteCarloVaR(
    returns: number[],
    confidenceLevel: number = 0.95,
    simulations: number = 10000
  ): VaRResult {
    try {
      const avgReturn = mean(returns);
      const volatility = standardDeviation(returns);
      
      // Simulation Monte Carlo
      const simulatedReturns: number[] = [];
      for (let i = 0; i < simulations; i++) {
        simulatedReturns.push(normalRandom(avgReturn, volatility));
      }
      
      const sortedSimulated = simulatedReturns.sort((a, b) => a - b);
      const index95 = Math.floor(simulations * 0.05);
      const index99 = Math.floor(simulations * 0.01);
      
      const var95 = -sortedSimulated[index95];
      const var99 = -sortedSimulated[index99];
      
      // Expected Shortfall
      const tailReturns95 = sortedSimulated.slice(0, index95 + 1);
      const tailReturns99 = sortedSimulated.slice(0, index99 + 1);
      
      const expectedShortfall95 = -mean(tailReturns95);
      const expectedShortfall99 = -mean(tailReturns99);
      
      const sharpeRatio = avgReturn / volatility;
      const maxDrawdown = this.calculateMaxDrawdown(returns);
      const distribution = this.generateDistribution(avgReturn, volatility, 100);

      return {
        var95,
        var99,
        expectedShortfall: (expectedShortfall95 + expectedShortfall99) / 2,
        volatility: volatility * Math.sqrt(this.TRADING_DAYS_PER_YEAR),
        sharpeRatio: sharpeRatio * Math.sqrt(this.TRADING_DAYS_PER_YEAR),
        maxDrawdown,
        distribution,
      };
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'monteCarloVaR',
        dataLength: returns.length,
        confidenceLevel,
        simulations 
      });
    }
  }

  /**
   * Calcule le Maximum Drawdown
   */
  private static calculateMaxDrawdown(returns: number[]): number {
    let peak = 0;
    let maxDrawdown = 0;
    let cumulativeReturn = 0;

    for (const returnValue of returns) {
      cumulativeReturn = (1 + cumulativeReturn) * (1 + returnValue) - 1;
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = (peak - cumulativeReturn) / (1 + peak);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  /**
   * Génère une distribution pour visualisation
   */
  private static generateDistribution(
    mean: number, 
    std: number, 
    points: number = 100
  ): number[] {
    const distribution: number[] = [];
    const start = mean - 4 * std;
    const end = mean + 4 * std;
    const step = (end - start) / points;

    for (let i = 0; i < points; i++) {
      const x = start + i * step;
      const y = Math.exp(-0.5 * Math.pow((x - mean) / std, 2)) / (std * Math.sqrt(2 * Math.PI));
      distribution.push(y);
    }

    return distribution;
  }

  /**
   * Génère une distribution historique
   */
  private static generateHistoricalDistribution(returns: number[]): number[] {
    const bins = 50;
    const sorted = [...returns].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const binSize = (max - min) / bins;
    
    const histogram = new Array(bins).fill(0);
    
    for (const returnValue of returns) {
      const binIndex = Math.min(Math.floor((returnValue - min) / binSize), bins - 1);
      histogram[binIndex]++;
    }
    
    return histogram.map(count => count / returns.length);
  }
}

// ===== OPTIMISATEUR DE PORTEFEUILLE =====

export class PortfolioOptimizer {
  private static readonly RISK_FREE_RATE = 0.02; // 2% annuel
  private static readonly TRADING_DAYS = 252;

  /**
   * Optimisation du ratio de Sharpe (portefeuille tangent)
   */
  static optimizeMaxSharpe(portfolioData: PortfolioData): OptimizationResult {
    try {
      const { stocks, weights: initialWeights } = portfolioData;
      
      if (stocks.length === 0) {
        throw new Error('No stocks provided');
      }

      // Calcul des rendements et de la matrice de covariance
      const returns = stocks.map(stock => {
        if (!stock.returns) {
          stock.returns = calculateReturns(stock.prices);
        }
        return stock.returns;
      });

      const expectedReturns = returns.map(r => mean(r) * this.TRADING_DAYS);
      const covarianceMatrix = this.calculateCovarianceMatrix(returns);
      
      // Optimisation simplifiée (méthode des moindres carrés)
      const optimalWeights = this.solveOptimization(expectedReturns, covarianceMatrix, 'maxSharpe');
      
      const portfolioReturn = this.calculatePortfolioReturn(optimalWeights, expectedReturns);
      const portfolioVolatility = this.calculatePortfolioVolatility(optimalWeights, covarianceMatrix);
      const sharpeRatio = (portfolioReturn - this.RISK_FREE_RATE) / portfolioVolatility;
      
      // Génération de la frontière efficiente
      const efficientFrontier = this.generateEfficientFrontier(expectedReturns, covarianceMatrix);

      return {
        weights: optimalWeights,
        expectedReturn: portfolioReturn,
        volatility: portfolioVolatility,
        sharpeRatio,
        efficientFrontier,
      };
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'optimizeMaxSharpe',
        stockCount: portfolioData.stocks.length 
      });
    }
  }

  /**
   * Optimisation pour un rendement cible
   */
  static optimizeTargetReturn(
    portfolioData: PortfolioData, 
    targetReturn: number
  ): OptimizationResult {
    try {
      const { stocks } = portfolioData;
      
      const returns = stocks.map(stock => {
        if (!stock.returns) {
          stock.returns = calculateReturns(stock.prices);
        }
        return stock.returns;
      });

      const expectedReturns = returns.map(r => mean(r) * this.TRADING_DAYS);
      const covarianceMatrix = this.calculateCovarianceMatrix(returns);
      
      const optimalWeights = this.solveOptimizationWithConstraint(
        expectedReturns, 
        covarianceMatrix, 
        targetReturn
      );
      
      const portfolioReturn = this.calculatePortfolioReturn(optimalWeights, expectedReturns);
      const portfolioVolatility = this.calculatePortfolioVolatility(optimalWeights, covarianceMatrix);
      const sharpeRatio = (portfolioReturn - this.RISK_FREE_RATE) / portfolioVolatility;

      return {
        weights: optimalWeights,
        expectedReturn: portfolioReturn,
        volatility: portfolioVolatility,
        sharpeRatio,
      };
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'optimizeTargetReturn',
        targetReturn,
        stockCount: portfolioData.stocks.length 
      });
    }
  }

  /**
   * Calcule la matrice de covariance
   */
  private static calculateCovarianceMatrix(returns: number[][]): number[][] {
    const n = returns.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = Math.pow(standardDeviation(returns[i]), 2) * this.TRADING_DAYS;
        } else {
          matrix[i][j] = covariance(returns[i], returns[j]) * this.TRADING_DAYS;
        }
      }
    }
    
    return matrix;
  }

  /**
   * Résout l'optimisation (algorithme simplifié)
   */
  private static solveOptimization(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    method: 'maxSharpe' | 'minVariance'
  ): number[] {
    const n = expectedReturns.length;
    
    if (method === 'maxSharpe') {
      // Méthode simplifiée pour le ratio de Sharpe max
      const excessReturns = expectedReturns.map(r => r - this.RISK_FREE_RATE);
      const weights = this.solveLinearSystem(covarianceMatrix, excessReturns);
      return this.normalizeWeights(weights);
    } else {
      // Poids équipondérés comme approximation
      return new Array(n).fill(1 / n);
    }
  }

  /**
   * Résout l'optimisation avec contrainte de rendement
   */
  private static solveOptimizationWithConstraint(
    expectedReturns: number[],
    covarianceMatrix: number[][],
    targetReturn: number
  ): number[] {
    // Méthode de Lagrange simplifiée
    const n = expectedReturns.length;
    
    // Solution approximative utilisant la méthode des moindres carrés
    const weights: number[] = [];
    let totalWeight = 0;
    
    for (let i = 0; i < n; i++) {
      const weight = expectedReturns[i] / covarianceMatrix[i][i];
      weights.push(weight);
      totalWeight += weight;
    }
    
    // Normalisation pour respecter la contrainte de budget
    return weights.map(w => w / totalWeight);
  }

  /**
   * Résout un système linéaire simplifié
   */
  private static solveLinearSystem(matrix: number[][], vector: number[]): number[] {
    const n = matrix.length;
    const solution = new Array(n).fill(0);
    
    // Méthode de substitution simplifiée
    for (let i = 0; i < n; i++) {
      solution[i] = vector[i] / matrix[i][i];
    }
    
    return solution;
  }

  /**
   * Normalise les poids pour qu'ils somment à 1
   */
  private static normalizeWeights(weights: number[]): number[] {
    const total = weights.reduce((sum, w) => sum + Math.abs(w), 0);
    if (total === 0) return weights.map(() => 1 / weights.length);
    return weights.map(w => Math.abs(w) / total);
  }

  /**
   * Calcule le rendement du portefeuille
   */
  private static calculatePortfolioReturn(weights: number[], expectedReturns: number[]): number {
    return weights.reduce((sum, weight, i) => sum + weight * expectedReturns[i], 0);
  }

  /**
   * Calcule la volatilité du portefeuille
   */
  private static calculatePortfolioVolatility(weights: number[], covarianceMatrix: number[][]): number {
    let variance = 0;
    
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }
    
    return Math.sqrt(variance);
  }

  /**
   * Génère la frontière efficiente
   */
  private static generateEfficientFrontier(
    expectedReturns: number[],
    covarianceMatrix: number[][]
  ): Array<{ risk: number; return: number; sharpe: number }> {
    const frontier: Array<{ risk: number; return: number; sharpe: number }> = [];
    const minReturn = Math.min(...expectedReturns);
    const maxReturn = Math.max(...expectedReturns);
    const steps = 50;
    
    for (let i = 0; i <= steps; i++) {
      const targetReturn = minReturn + (maxReturn - minReturn) * (i / steps);
      
      try {
        const weights = this.solveOptimizationWithConstraint(
          expectedReturns,
          covarianceMatrix,
          targetReturn
        );
        
        const portfolioReturn = this.calculatePortfolioReturn(weights, expectedReturns);
        const portfolioRisk = this.calculatePortfolioVolatility(weights, covarianceMatrix);
        const sharpeRatio = (portfolioReturn - this.RISK_FREE_RATE) / portfolioRisk;
        
        frontier.push({
          risk: portfolioRisk,
          return: portfolioReturn,
          sharpe: sharpeRatio,
        });
      } catch {
        // Ignorer les points non calculables
        continue;
      }
    }
    
    return frontier;
  }
}

// ===== ANALYSEUR CAPM =====

export class CAPMAnalyzer {
  /**
   * Calcule l'analyse CAPM pour un actif
   */
  static analyzeCAPM(
    assetReturns: number[],
    marketReturns: number[],
    riskFreeRate: number = 0.02
  ): CAPMResult {
    try {
      if (assetReturns.length !== marketReturns.length || assetReturns.length === 0) {
        throw new Error('Asset and market returns must have same non-zero length');
      }

      // Calcul des rendements excédentaires
      const assetExcessReturns = assetReturns.map(r => r - riskFreeRate / 252);
      const marketExcessReturns = marketReturns.map(r => r - riskFreeRate / 252);
      
      // Régression linéaire: Ra - Rf = alpha + beta * (Rm - Rf)
      const { slope: beta, intercept: alpha, rSquared } = this.linearRegression(
        marketExcessReturns,
        assetExcessReturns
      );
      
      const expectedReturn = riskFreeRate + beta * (mean(marketReturns) * 252 - riskFreeRate);
      
      // Décomposition du risque
      const totalVariance = Math.pow(standardDeviation(assetReturns), 2);
      const systematicVariance = Math.pow(beta, 2) * Math.pow(standardDeviation(marketReturns), 2);
      const unsystematicVariance = totalVariance - systematicVariance;

      return {
        beta,
        alpha: alpha * 252, // Annualisé
        expectedReturn,
        rSquared,
        systematicRisk: Math.sqrt(systematicVariance) * Math.sqrt(252),
        unsystematicRisk: Math.sqrt(Math.max(0, unsystematicVariance)) * Math.sqrt(252),
      };
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'analyzeCAPM',
        assetReturnsLength: assetReturns.length,
        marketReturnsLength: marketReturns.length 
      });
    }
  }

  /**
   * Régression linéaire simple
   */
  private static linearRegression(x: number[], y: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
  } {
    const n = x.length;
    const meanX = mean(x);
    const meanY = mean(y);
    
    let numerator = 0;
    let denominator = 0;
    let ssTotal = 0;
    let ssResidual = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - meanX) * (y[i] - meanY);
      denominator += Math.pow(x[i] - meanX, 2);
      ssTotal += Math.pow(y[i] - meanY, 2);
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calcul du R²
    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * x[i];
      ssResidual += Math.pow(y[i] - predicted, 2);
    }
    
    const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);

    return { slope, intercept, rSquared };
  }
}

// ===== CALCULATEUR D'ATTRIBUTION DU RISQUE =====

export class RiskAttributionCalculator {
  /**
   * Calcule l'attribution du risque par composant
   */
  static calculateRiskAttribution(
    weights: number[],
    covarianceMatrix: number[][]
  ): { [key: string]: number } {
    try {
      const n = weights.length;
      const attribution: { [key: string]: number } = {};
      
      // Calcul de la volatilité totale du portefeuille
      const portfolioVariance = this.calculatePortfolioVariance(weights, covarianceMatrix);
      const portfolioVolatility = Math.sqrt(portfolioVariance);
      
      // Attribution marginale du risque
      for (let i = 0; i < n; i++) {
        let marginalContribution = 0;
        
        for (let j = 0; j < n; j++) {
          marginalContribution += weights[j] * covarianceMatrix[i][j];
        }
        
        const componentContribution = (weights[i] * marginalContribution) / portfolioVariance;
        attribution[`Asset_${i + 1}`] = componentContribution;
      }
      
      return attribution;
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'calculateRiskAttribution',
        weightsLength: weights.length 
      });
    }
  }

  /**
   * Calcule la variance du portefeuille
   */
  private static calculatePortfolioVariance(weights: number[], covarianceMatrix: number[][]): number {
    let variance = 0;
    
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }
    
    return variance;
  }
}

// ===== CALCULATEUR DE CORRÉLATION =====

export class CorrelationCalculator {
  /**
   * Calcule la matrice de corrélation
   */
  static calculateCorrelationMatrix(returns: number[][]): number[][] {
    try {
      const n = returns.length;
      const matrix: number[][] = [];
      
      for (let i = 0; i < n; i++) {
        matrix[i] = [];
        for (let j = 0; j < n; j++) {
          if (i === j) {
            matrix[i][j] = 1.0;
          } else {
            matrix[i][j] = correlation(returns[i], returns[j]);
          }
        }
      }
      
      return matrix;
    } catch (error) {
      throw financialErrorHandler.handleCalculationError(error, { 
        method: 'calculateCorrelationMatrix',
        seriesCount: returns.length 
      });
    }
  }

  /**
   * Identifie les corrélations élevées
   */
  static findHighCorrelations(
    correlationMatrix: number[][],
    threshold: number = 0.7
  ): Array<{ i: number; j: number; correlation: number }> {
    const highCorrelations: Array<{ i: number; j: number; correlation: number }> = [];
    
    for (let i = 0; i < correlationMatrix.length; i++) {
      for (let j = i + 1; j < correlationMatrix[i].length; j++) {
        if (Math.abs(correlationMatrix[i][j]) >= threshold) {
          highCorrelations.push({
            i,
            j,
            correlation: correlationMatrix[i][j],
          });
        }
      }
    }
    
    return highCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
}

// ===== EXPORTS =====
export {
  calculateReturns,
  mean,
  standardDeviation,
  covariance,
  correlation,
  normalRandom,
};
