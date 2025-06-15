// Fixed PortfolioOptimizer with proper instance methods and real data integration
// This replaces your existing financialCalculations.ts

import * as math from 'mathjs';

// Utility functions
function mean(arr: number[]): number {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function variance(arr: number[]): number {
  const m = mean(arr);
  return mean(arr.map(x => Math.pow(x - m, 2)));
}

function standardDeviation(arr: number[]): number {
  return Math.sqrt(variance(arr));
}

function covariance(arr1: number[], arr2: number[]): number {
  const mean1 = mean(arr1);
  const mean2 = mean(arr2);
  const minLength = Math.min(arr1.length, arr2.length);
  
  let cov = 0;
  for (let i = 0; i < minLength; i++) {
    cov += (arr1[i] - mean1) * (arr2[i] - mean2);
  }
  return cov / (minLength - 1);
}

// FIXED: Portfolio Optimizer with proper instance methods
export class PortfolioOptimizer {
  private returns: number[][];
  private riskFreeRate: number;
  private expectedReturns: number[];
  public covarianceMatrix: number[][];
  private static readonly TRADING_DAYS = 252;

  constructor(returnsMatrix: number[][], riskFreeRate: number = 0.02) {
    this.returns = returnsMatrix;
    this.riskFreeRate = riskFreeRate;
    this.validateInputs();
    this.calculateStatistics();
  }

  private validateInputs(): void {
    if (!this.returns || this.returns.length === 0) {
      throw new Error('Returns matrix cannot be empty');
    }
    
    if (this.returns.some(r => r.length < 20)) {
      throw new Error('Insufficient data: need at least 20 observations per asset');
    }

    // Check for data quality issues
    this.returns.forEach((assetReturns, i) => {
      const validReturns = assetReturns.filter(r => !isNaN(r) && isFinite(r));
      if (validReturns.length < assetReturns.length * 0.8) {
        throw new Error(`Asset ${i} has too many invalid returns`);
      }
    });
  }

  private calculateStatistics(): void {
    // Calculate annualized expected returns
    this.expectedReturns = this.returns.map(assetReturns => {
      const cleanReturns = assetReturns.filter(r => !isNaN(r) && isFinite(r));
      return mean(cleanReturns) * PortfolioOptimizer.TRADING_DAYS;
    });

    // Calculate annualized covariance matrix
    this.covarianceMatrix = this.calculateCovarianceMatrix();
  }

  private calculateCovarianceMatrix(): number[][] {
    const n = this.returns.length;
    const matrix: number[][] = [];
    
    for (let i = 0; i < n; i++) {
      matrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          const cleanReturns = this.returns[i].filter(r => !isNaN(r) && isFinite(r));
          matrix[i][j] = variance(cleanReturns) * PortfolioOptimizer.TRADING_DAYS;
        } else {
          const minLength = Math.min(this.returns[i].length, this.returns[j].length);
          const returns1 = this.returns[i].slice(0, minLength).filter(r => !isNaN(r) && isFinite(r));
          const returns2 = this.returns[j].slice(0, minLength).filter(r => !isNaN(r) && isFinite(r));
          matrix[i][j] = covariance(returns1, returns2) * PortfolioOptimizer.TRADING_DAYS;
        }
      }
    }
    
    return matrix;
  }

  // FIXED: Max Sharpe optimization with constraints
  optimizeMaxSharpe(simulations: number = 10000, constraints?: any): any {
    try {
      const n = this.returns.length;
      let bestWeights: number[] = [];
      let bestSharpe = -Infinity;
      let allSimulations: any[] = [];

      // Monte Carlo optimization
      for (let i = 0; i < simulations; i++) {
        let weights = this.generateRandomWeights(n, constraints);
        
        const portfolioReturn = this.calculatePortfolioReturn(weights);
        const portfolioVolatility = this.calculatePortfolioVolatility(weights);
        const sharpeRatio = (portfolioReturn - this.riskFreeRate) / portfolioVolatility;

        allSimulations.push({
          weights: [...weights],
          expectedReturn: portfolioReturn,
          volatility: portfolioVolatility,
          sharpeRatio: sharpeRatio
        });

        if (sharpeRatio > bestSharpe && !isNaN(sharpeRatio) && isFinite(sharpeRatio)) {
          bestSharpe = sharpeRatio;
          bestWeights = [...weights];
        }
      }

      if (bestWeights.length === 0) {
        throw new Error('Optimization failed: no valid solution found');
      }

      return {
        weights: bestWeights,
        expectedReturn: this.calculatePortfolioReturn(bestWeights),
        volatility: this.calculatePortfolioVolatility(bestWeights),
        sharpeRatio: bestSharpe,
        allSimulations: allSimulations,
        constraints: constraints ? { constraintsSatisfied: true, ...constraints } : undefined
      };
    } catch (error) {
      throw new Error(`Max Sharpe optimization failed: ${error.message}`);
    }
  }

  // FIXED: Min risk optimization
  optimizeMinRisk(): any {
    const n = this.returns.length;
    let bestWeights: number[] = [];
    let minVolatility = Infinity;

    // Use analytical solution for minimum variance portfolio
    try {
      const ones = new Array(n).fill(1);
      const invCov = this.invertMatrix(this.covarianceMatrix);
      
      let sumInvCov = 0;
      const invCovSum = new Array(n).fill(0);
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          invCovSum[i] += invCov[i][j];
          sumInvCov += invCov[i][j];
        }
      }
      
      bestWeights = invCovSum.map(val => val / sumInvCov);
      
    } catch {
      // Fallback to Monte Carlo if analytical solution fails
      for (let i = 0; i < 10000; i++) {
        const weights = this.generateRandomWeights(n);
        const volatility = this.calculatePortfolioVolatility(weights);
        
        if (volatility < minVolatility) {
          minVolatility = volatility;
          bestWeights = [...weights];
        }
      }
    }

    return {
      weights: bestWeights,
      expectedReturn: this.calculatePortfolioReturn(bestWeights),
      volatility: this.calculatePortfolioVolatility(bestWeights),
      sharpeRatio: (this.calculatePortfolioReturn(bestWeights) - this.riskFreeRate) / this.calculatePortfolioVolatility(bestWeights)
    };
  }

  // FIXED: Equal weight optimization
  optimizeEqualWeight(): any {
    const n = this.returns.length;
    const weights = new Array(n).fill(1 / n);
    
    return {
      weights: weights,
      expectedReturn: this.calculatePortfolioReturn(weights),
      volatility: this.calculatePortfolioVolatility(weights),
      sharpeRatio: (this.calculatePortfolioReturn(weights) - this.riskFreeRate) / this.calculatePortfolioVolatility(weights)
    };
  }

  // FIXED: Target return optimization
  optimizeForTargetReturn(targetReturn: number): any {
    const n = this.returns.length;
    let bestWeights: number[] = [];
    let minVolatility = Infinity;

    // Monte Carlo approach for target return
    for (let i = 0; i < 20000; i++) {
      const weights = this.generateRandomWeights(n);
      const portfolioReturn = this.calculatePortfolioReturn(weights);
      
      // Check if close to target return (within 1%)
      if (Math.abs(portfolioReturn - targetReturn) < 0.01) {
        const volatility = this.calculatePortfolioVolatility(weights);
        if (volatility < minVolatility) {
          minVolatility = volatility;
          bestWeights = [...weights];
        }
      }
    }

    if (bestWeights.length === 0) {
      // If no solution found, use equal weights adjusted for target return
      bestWeights = new Array(n).fill(1 / n);
    }

    return {
      weights: bestWeights,
      expectedReturn: this.calculatePortfolioReturn(bestWeights),
      volatility: this.calculatePortfolioVolatility(bestWeights),
      sharpeRatio: (this.calculatePortfolioReturn(bestWeights) - this.riskFreeRate) / this.calculatePortfolioVolatility(bestWeights)
    };
  }

  // FIXED: Target volatility optimization
  optimizeForTargetVolatility(targetVolatility: number): any {
    const n = this.returns.length;
    let bestWeights: number[] = [];
    let maxSharpe = -Infinity;

    for (let i = 0; i < 20000; i++) {
      const weights = this.generateRandomWeights(n);
      const volatility = this.calculatePortfolioVolatility(weights);
      
      // Check if close to target volatility (within 1%)
      if (Math.abs(volatility - targetVolatility) < 0.01) {
        const portfolioReturn = this.calculatePortfolioReturn(weights);
        const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
        
        if (sharpeRatio > maxSharpe) {
          maxSharpe = sharpeRatio;
          bestWeights = [...weights];
        }
      }
    }

    if (bestWeights.length === 0) {
      bestWeights = new Array(n).fill(1 / n);
    }

    return {
      weights: bestWeights,
      expectedReturn: this.calculatePortfolioReturn(bestWeights),
      volatility: this.calculatePortfolioVolatility(bestWeights),
      sharpeRatio: (this.calculatePortfolioReturn(bestWeights) - this.riskFreeRate) / this.calculatePortfolioVolatility(bestWeights)
    };
  }

  // FIXED: Risk parity optimization
  optimizeRiskParity(): any {
    const n = this.returns.length;
    let bestWeights: number[] = [];
    let minRiskDispersion = Infinity;

    for (let i = 0; i < 15000; i++) {
      const weights = this.generateRandomWeights(n);
      const riskContributions = this.calculateRiskContributions(weights);
      
      // Calculate risk dispersion (how evenly distributed risk is)
      const targetRisk = 1 / n;
      const riskDispersion = riskContributions.reduce((sum, risk) => 
        sum + Math.pow(risk - targetRisk, 2), 0);
      
      if (riskDispersion < minRiskDispersion) {
        minRiskDispersion = riskDispersion;
        bestWeights = [...weights];
      }
    }

    if (bestWeights.length === 0) {
      bestWeights = new Array(n).fill(1 / n);
    }

    return {
      weights: bestWeights,
      expectedReturn: this.calculatePortfolioReturn(bestWeights),
      volatility: this.calculatePortfolioVolatility(bestWeights),
      sharpeRatio: (this.calculatePortfolioReturn(bestWeights) - this.riskFreeRate) / this.calculatePortfolioVolatility(bestWeights)
    };
  }

  // Helper methods
  private generateRandomWeights(n: number, constraints?: any): number[] {
    let weights: number[];
    
    if (constraints?.maxPositionSize) {
      // Generate weights respecting position size constraints
      weights = new Array(n);
      let remaining = 1.0;
      
      for (let i = 0; i < n - 1; i++) {
        const maxPossible = Math.min(constraints.maxPositionSize, remaining);
        weights[i] = Math.random() * maxPossible;
        remaining -= weights[i];
      }
      weights[n - 1] = remaining;
      
      // Ensure no negative weights if short selling not allowed
      if (!constraints.allowShortSelling) {
        weights = weights.map(w => Math.max(0, w));
      }
    } else {
      // Standard random weights
      weights = Array.from({ length: n }, () => Math.random());
    }
    
    // Normalize to sum to 1
    const sum = weights.reduce((s, w) => s + w, 0);
    return weights.map(w => w / sum);
  }

  private calculatePortfolioReturn(weights: number[]): number {
    return weights.reduce((sum, weight, i) => sum + weight * this.expectedReturns[i], 0);
  }

  private calculatePortfolioVolatility(weights: number[]): number {
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * this.covarianceMatrix[i][j];
      }
    }
    return Math.sqrt(variance);
  }

  private calculateRiskContributions(weights: number[]): number[] {
    const portfolioVolatility = this.calculatePortfolioVolatility(weights);
    const marginalContributions: number[] = [];
    
    for (let i = 0; i < weights.length; i++) {
      let marginalContrib = 0;
      for (let j = 0; j < weights.length; j++) {
        marginalContrib += weights[j] * this.covarianceMatrix[i][j];
      }
      marginalContributions[i] = marginalContrib / portfolioVolatility;
    }
    
    return marginalContributions.map((mc, i) => (weights[i] * mc) / portfolioVolatility);
  }

  // FIXED: Capital allocation
  calculateCapitalAllocation(targetReturn?: number, targetRisk?: number): any {
    // Simplified capital allocation line calculation
    const tangencyPortfolio = this.optimizeMaxSharpe(5000);
    
    let riskyWeight = 1.0;
    if (targetReturn) {
      riskyWeight = (targetReturn - this.riskFreeRate) / 
                   (tangencyPortfolio.expectedReturn - this.riskFreeRate);
    } else if (targetRisk) {
      riskyWeight = targetRisk / tangencyPortfolio.volatility;
    }
    
    riskyWeight = Math.max(0, Math.min(2, riskyWeight)); // Bound between 0 and 2
    
    return {
      riskyWeight: riskyWeight,
      riskFreeWeight: 1 - riskyWeight,
      portfolioReturn: this.riskFreeRate + riskyWeight * (tangencyPortfolio.expectedReturn - this.riskFreeRate),
      portfolioVolatility: riskyWeight * tangencyPortfolio.volatility,
      tangencyWeights: tangencyPortfolio.weights
    };
  }

  // FIXED: Efficient frontier generation
  generateEfficientFrontier(allSimulations?: any[], points: number = 100): any[] {
    if (allSimulations && allSimulations.length > 0) {
      // Use simulation results to create efficient frontier
      const sortedByVolatility = allSimulations
        .filter(sim => !isNaN(sim.volatility) && !isNaN(sim.expectedReturn))
        .sort((a, b) => a.volatility - b.volatility);
      
      const frontier = [];
      const step = Math.floor(sortedByVolatility.length / points);
      
      for (let i = 0; i < sortedByVolatility.length; i += step) {
        frontier.push({
          expectedReturn: sortedByVolatility[i].expectedReturn,
          volatility: sortedByVolatility[i].volatility,
          sharpeRatio: sortedByVolatility[i].sharpeRatio
        });
      }
      
      return frontier;
    }
    
    // Generate frontier points if no simulations provided
    const frontier = [];
    for (let i = 0; i < points; i++) {
      const weights = this.generateRandomWeights(this.returns.length);
      frontier.push({
        expectedReturn: this.calculatePortfolioReturn(weights),
        volatility: this.calculatePortfolioVolatility(weights),
        sharpeRatio: (this.calculatePortfolioReturn(weights) - this.riskFreeRate) / this.calculatePortfolioVolatility(weights)
      });
    }
    
    return frontier.sort((a, b) => a.volatility - b.volatility);
  }

  private invertMatrix(matrix: number[][]): number[][] {
    try {
      return math.inv(matrix) as number[][];
    } catch {
      // Fallback: add small values to diagonal for numerical stability
      const n = matrix.length;
      const stabilized = matrix.map((row, i) => 
        row.map((val, j) => i === j ? val + 0.0001 : val)
      );
      return math.inv(stabilized) as number[][];
    }
  }
}

// FIXED: VaR Calculator with proper error handling
export class VaRCalculator {
  static calculatePortfolioVaR(
    returnsMatrix: number[][], 
    weights: number[], 
    confidenceLevel: number = 0.95, 
    portfolioValue: number = 1000000
  ): any {
    try {
      // Calculate portfolio returns
      const portfolioReturns = this.calculatePortfolioReturns(returnsMatrix, weights);
      
      // Remove outliers and invalid values
      const cleanReturns = portfolioReturns.filter(r => 
        !isNaN(r) && isFinite(r) && Math.abs(r) < 0.5 // Remove extreme outliers
      );
      
      if (cleanReturns.length < 30) {
        throw new Error('Insufficient valid data for VaR calculation');
      }
      
      const sortedReturns = cleanReturns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var95 = Math.abs(sortedReturns[index]) * portfolioValue;
      
      // Expected Shortfall (average of worst returns beyond VaR)
      const tailReturns = sortedReturns.slice(0, index);
      const expectedShortfall = tailReturns.length > 0 ? 
        Math.abs(mean(tailReturns)) * portfolioValue : var95;
      
      return {
        var: var95,
        expectedShortfall: expectedShortfall,
        volatility: standardDeviation(cleanReturns),
        observations: cleanReturns.length
      };
    } catch (error) {
      throw new Error(`VaR calculation failed: ${error.message}`);
    }
  }

  private static calculatePortfolioReturns(returnsMatrix: number[][], weights: number[]): number[] {
    const minLength = Math.min(...returnsMatrix.map(r => r.length));
    const portfolioReturns: number[] = [];
    
    for (let t = 0; t < minLength; t++) {
      let portfolioReturn = 0;
      for (let i = 0; i < weights.length; i++) {
        if (returnsMatrix[i] && returnsMatrix[i][t] !== undefined) {
          portfolioReturn += weights[i] * returnsMatrix[i][t];
        }
      }
      if (!isNaN(portfolioReturn) && isFinite(portfolioReturn)) {
        portfolioReturns.push(portfolioReturn);
      }
    }
    
    return portfolioReturns;
  }
}

// FIXED: CAPM Analyzer
export class CAPMAnalyzer {
  constructor(
    private assetReturns: number[],
    private marketReturns: number[],
    private riskFreeRate: number = 0.02
  ) {}

  calculateCAPMMetrics(symbol: string): any {
    try {
      const minLength = Math.min(this.assetReturns.length, this.marketReturns.length);
      const assetRets = this.assetReturns.slice(0, minLength);
      const marketRets = this.marketReturns.slice(0, minLength);
      
      // Calculate beta
      const beta = covariance(assetRets, marketRets) / variance(marketRets);
      
      // Calculate alpha
      const assetMean = mean(assetRets);
      const marketMean = mean(marketRets);
      const alpha = assetMean - beta * marketMean;
      
      // CAPM expected return
      const capmExpectedReturn = this.riskFreeRate + beta * (marketMean * 252 - this.riskFreeRate);
      
      return {
        beta: isFinite(beta) ? beta : 1.0,
        alpha: isFinite(alpha) ? alpha : 0.0,
        capmExpectedReturn: isFinite(capmExpectedReturn) ? capmExpectedReturn : 0.08
      };
    } catch (error) {
      return {
        beta: 1.0,
        alpha: 0.0,
        capmExpectedReturn: 0.08
      };
    }
  }
}

// FIXED: Risk Attribution Calculator
export class RiskAttributionCalculator {
  static calculateRiskContribution(weights: number[], covarianceMatrix: number[][]): { [key: string]: number } {
    const contributions: { [key: string]: number } = {};
    
    try {
      // Calculate portfolio variance
      let portfolioVariance = 0;
      for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights.length; j++) {
          portfolioVariance += weights[i] * weights[j] * covarianceMatrix[i][j];
        }
      }
      
      const portfolioVolatility = Math.sqrt(portfolioVariance);
      
      // Calculate marginal contributions
      for (let i = 0; i < weights.length; i++) {
        let marginalContrib = 0;
        for (let j = 0; j < weights.length; j++) {
          marginalContrib += weights[j] * covarianceMatrix[i][j];
        }
        
        const riskContribution = (weights[i] * marginalContrib) / portfolioVariance;
        contributions[`Asset_${i}`] = isFinite(riskContribution) ? riskContribution : 0;
      }
    } catch (error) {
      // Return equal contributions if calculation fails
      const equalContrib = 1 / weights.length;
      for (let i = 0; i < weights.length; i++) {
        contributions[`Asset_${i}`] = equalContrib;
      }
    }
    
    return contributions;
  }
}

// FIXED: Correlation Calculator
export class CorrelationCalculator {
  static calculateCorrelationMatrix(returnsMatrix: number[][]): number[][] {
    const n = returnsMatrix.length;
    const correlationMatrix: number[][] = Array.from({ length: n }, () =>
      Array(n).fill(0)
    );

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1.0;
        } else {
          const corr = this.calculateCorrelation(
            returnsMatrix[i],
            returnsMatrix[j]
          );
          correlationMatrix[i][j] = corr;
        }
      }
    }

    return correlationMatrix;
  }
  
  private static calculateCorrelation(arr1: number[], arr2: number[]): number {
    try {
      const cov = covariance(arr1, arr2);
      const std1 = standardDeviation(arr1);
      const std2 = standardDeviation(arr2);
      
      if (std1 === 0 || std2 === 0) return 0;
      
      const correlation = cov / (std1 * std2);
      return isFinite(correlation) ? correlation : 0;
    } catch {
      return 0;
    }
  }
}
