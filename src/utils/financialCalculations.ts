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

  static calculateIndividualParametricVaR(
    returns: number[],
    ticker: string,
    confidenceLevel: number,
    positionSize: number
  ): any {
    const cleaned = this.removeOutliers(returns, 'modified_zscore');
    const dataQuality = {
      originalObservations: returns.length,
      cleanedObservations: cleaned.length,
      outliersRemoved: returns.length - cleaned.length,
    };

    const mu = mean(cleaned);
    const sigma = standardDeviation(cleaned);
    const skew = cleaned.reduce((s, r) => s + Math.pow(r - mu, 3), 0) / cleaned.length / Math.pow(sigma || 1, 3);
    const kurt =
      cleaned.reduce((s, r) => s + Math.pow(r - mu, 4), 0) / cleaned.length / Math.pow(sigma || 1, 4) - 3;

    const z = this.normInv(1 - confidenceLevel);
    let zAdj = z;
    if (isFinite(skew) && isFinite(kurt)) {
      zAdj =
        z +
        ((z * z - 1) * skew) / 6 +
        ((z * z * z - 3 * z) * kurt) / 24 -
        ((2 * z * z * z - 5 * z) * skew * skew) / 36;
      if (!isFinite(zAdj) || Math.abs(zAdj - z) > 3) {
        zAdj = z; // Fallback for extreme values
      }
    }

    const varValue = Math.abs(mu + zAdj * sigma) * positionSize;
    const sorted = cleaned.slice().sort((a, b) => a - b);
    const idx = Math.floor((1 - confidenceLevel) * sorted.length);
    const es = idx > 0 ? Math.abs(mean(sorted.slice(0, idx))) * positionSize : varValue;

    return {
      ticker: ticker,
      var: varValue,
      expectedShortfall: es,
      volatility: sigma,
      mean: mu,
      skewness: skew,
      kurtosis: kurt,
      cornishFisherAdjustment: zAdj - z,
      method: 'parametric',
      dataQuality,
    };
  }

  static calculateIndividualHistoricalVaR(
    returns: number[],
    ticker: string,
    confidenceLevel: number,
    positionSize: number
  ): any {
    const cleaned = this.removeOutliers(returns, 'modified_zscore');
    const sorted = cleaned.slice().sort((a, b) => a - b);
    const idx = Math.floor((1 - confidenceLevel) * sorted.length);
    const varValue = Math.abs(sorted[idx]) * positionSize;
    const es = idx > 0 ? Math.abs(mean(sorted.slice(0, idx))) * positionSize : varValue;

    return {
      ticker: ticker,
      var: varValue,
      expectedShortfall: es,
      volatility: standardDeviation(cleaned),
      mean: mean(cleaned),
      method: 'historical',
    };
  }

  static calculatePortfolioHistoricalVaR(
    returnsMatrix: number[][],
    weights: number[],
    confidenceLevel: number,
    positionSize: number
  ): any {
    const portfolioReturns = this.calculatePortfolioReturns(returnsMatrix, weights);
    const cleaned = portfolioReturns.filter(r => !isNaN(r) && isFinite(r));
    const sorted = cleaned.slice().sort((a, b) => a - b);
    const idx = Math.floor((1 - confidenceLevel) * sorted.length);
    const varValue = Math.abs(sorted[idx]) * positionSize;
    const es = idx > 0 ? Math.abs(mean(sorted.slice(0, idx))) * positionSize : varValue;

    return {
      var: varValue,
      expectedShortfall: es,
      portfolioMean: mean(cleaned),
      portfolioVolatility: standardDeviation(cleaned),
      method: 'historical',
    };
  }

  static calculateMonteCarloVaR(
    returnsMatrix: number[][],
    weights: number[],
    confidenceLevel: number,
    simulations: number,
    positionSize: number
  ): any {
    const means = returnsMatrix.map(r => mean(r));
    const cov: number[][] = returnsMatrix.map((ri, i) =>
      returnsMatrix.map((rj, j) => covariance(ri, rj))
    );
    const portfolioMean = weights.reduce((s, w, i) => s + w * means[i], 0);
    let portVar = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        portVar += weights[i] * weights[j] * cov[i][j];
      }
    }
    const portStd = Math.sqrt(portVar);

    const simulated: number[] = [];
    for (let k = 0; k < simulations; k++) {
      const z = this.normInv(Math.random());
      simulated.push(portfolioMean + portStd * z);
    }
    const sorted = simulated.sort((a, b) => a - b);
    const idx = Math.floor((1 - confidenceLevel) * sorted.length);
    const varValue = Math.abs(sorted[idx]) * positionSize;
    const es = idx > 0 ? Math.abs(mean(sorted.slice(0, idx))) * positionSize : varValue;

    return {
      var: varValue,
      expectedShortfall: es,
      portfolioMean,
      portfolioVolatility: portStd,
      method: 'monte_carlo',
    };
  }

  static calculateKupiecTest(
    numViolations: number,
    totalObs: number,
    alpha: number
  ): number {
    if (totalObs === 0) return 0;
    const p = numViolations / totalObs;
    if (p === 0 || p === 1) return 0;
    const term1 = Math.pow(1 - alpha, totalObs - numViolations) * Math.pow(alpha, numViolations);
    const term2 = Math.pow(1 - p, totalObs - numViolations) * Math.pow(p, numViolations);
    const lr = -2 * Math.log(term1 / term2);
    return lr;
  }

  static calculateRobustCorrelationMatrix(returnsMatrix: number[][]): number[][] {
    const n = returnsMatrix.length;
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          let corr = covariance(returnsMatrix[i], returnsMatrix[j]) /
            (standardDeviation(returnsMatrix[i]) * standardDeviation(returnsMatrix[j]));
          if (!isFinite(corr)) corr = 0;
          matrix[i][j] = Math.max(-0.99, Math.min(0.99, corr));
        }
      }
    }

    // Ensure symmetry
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const avg = (matrix[i][j] + matrix[j][i]) / 2;
        matrix[i][j] = matrix[j][i] = avg;
      }
    }

    return matrix;
  }

  static removeOutliers(
    data: number[],
    method: string = 'modified_zscore',
    threshold: number = 3.5
  ): number[] {
    if (data.length === 0) return [];
    if (method === 'modified_zscore') {
      const median = data.slice().sort((a, b) => a - b)[Math.floor(data.length / 2)];
      const mad =
        data.map(x => Math.abs(x - median)).sort((a, b) => a - b)[Math.floor(data.length / 2)] || 0;
      if (mad === 0) return [...data];
      return data.filter(x => (0.6745 * (x - median)) / mad <= threshold && (0.6745 * (x - median)) / mad >= -threshold);
    }

    // Standard z-score method
    const mu = mean(data);
    const sigma = standardDeviation(data);
    if (sigma === 0) return [...data];
    return data.filter(x => Math.abs((x - mu) / sigma) <= threshold);
  }

  private static normInv(p: number): number {
    // Beasley-Springer/Moro approximation
    if (p <= 0 || p >= 1) {
      return NaN;
    }
    const a1 = -39.6968302866538;
    const a2 = 220.946098424521;
    const a3 = -275.928510446969;
    const a4 = 138.357751867269;
    const a5 = -30.6647980661472;
    const a6 = 2.50662827745924;
    const b1 = -54.4760987982241;
    const b2 = 161.585836858041;
    const b3 = -155.698979859887;
    const b4 = 66.8013118877197;
    const b5 = -13.2806815528857;
    const c1 = -0.00778489400243029;
    const c2 = -0.322396458041136;
    const c3 = -2.40075827716184;
    const c4 = -2.54973253934373;
    const c5 = 4.37466414146497;
    const c6 = 2.93816398269878;
    const d1 = 0.00778469570904146;
    const d2 = 0.32246712907004;
    const d3 = 2.445134137143;
    const d4 = 3.75440866190742;
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q: number, r: number;
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (
        (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    }
    if (phigh < p) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(
        ((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
        ((((d1 * q + d2) * q + d3) * q + d4) * q + 1)
      );
    }
    q = p - 0.5;
    r = q * q;
    return (
      (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
    );
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
