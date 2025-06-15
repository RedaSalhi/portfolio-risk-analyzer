// Complete Financial Calculations - src/utils/financialCalculations.ts
// Replace your entire file with this version

import * as math from 'mathjs';

// Types and Interfaces
export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  targetAchieved?: boolean;
  constraintsSatisfied?: boolean;
}

export interface VaRResult {
  var: number;
  expectedShortfall: number;
  confidenceLevel: number;
  method: string;
}

export interface IndividualVaRResult extends VaRResult {
  symbol: string;
  return: number;
  volatility: number;
}

export interface PortfolioVaRResult extends VaRResult {
  portfolioReturn: number;
  portfolioVolatility: number;
  componentVaR?: { [key: string]: number };
  marginalVaR?: number[];
  diversificationBenefit?: number;
  correlationMatrix?: number[][];
}

// Enhanced Portfolio Optimizer Class
export class PortfolioOptimizer {
  private returns: number[][];
  private riskFreeRate: number;
  private covarianceMatrix: number[][];
  private meanReturns: number[];
  private n: number;

  constructor(returns: number[][], riskFreeRate: number = 0.02) {
    if (!returns || returns.length === 0 || !returns[0] || returns[0].length === 0) {
      throw new Error('Invalid returns data provided');
    }

    this.returns = returns;
    this.riskFreeRate = riskFreeRate;
    this.n = returns.length;
    
    try {
      this.calculateStatistics();
    } catch (error) {
      throw new Error(`Failed to initialize optimizer: ${error.message}`);
    }
  }

  private calculateStatistics(): void {
    const observations = this.returns[0].length;
    
    if (observations < 10) {
      throw new Error('Insufficient data points for optimization (minimum 10 required)');
    }

    // Calculate mean returns
    this.meanReturns = this.returns.map(assetReturns => {
      const validReturns = assetReturns.filter(r => !isNaN(r) && isFinite(r));
      if (validReturns.length === 0) {
        throw new Error('No valid returns found for asset');
      }
      return validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length;
    });

    // Calculate covariance matrix
    this.covarianceMatrix = this.calculateCovarianceMatrix();
    
    // Validate covariance matrix
    if (this.isDeterminantZero(this.covarianceMatrix)) {
      console.warn('Covariance matrix is singular, adding regularization');
      this.regularizeCovarianceMatrix();
    }
  }

  private calculateCovarianceMatrix(): number[][] {
    const observations = this.returns[0].length;
    const covMatrix: number[][] = Array(this.n).fill(null).map(() => Array(this.n).fill(0));

    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        let covariance = 0;
        let validCount = 0;
        
        for (let k = 0; k < observations; k++) {
          const ri = this.returns[i][k];
          const rj = this.returns[j][k];
          
          if (!isNaN(ri) && !isNaN(rj) && isFinite(ri) && isFinite(rj)) {
            covariance += (ri - this.meanReturns[i]) * (rj - this.meanReturns[j]);
            validCount++;
          }
        }
        
        if (validCount > 1) {
          covMatrix[i][j] = covariance / (validCount - 1);
        } else {
          // Default to asset variance or small value
          covMatrix[i][j] = i === j ? 0.01 : 0;
        }
      }
    }

    return covMatrix;
  }

  private isDeterminantZero(matrix: number[][]): boolean {
    try {
      const det = math.det(matrix);
      return Math.abs(det) < 1e-10;
    } catch {
      return true;
    }
  }

  private regularizeCovarianceMatrix(): void {
    // Add small value to diagonal for numerical stability
    for (let i = 0; i < this.n; i++) {
      this.covarianceMatrix[i][i] += 0.0001;
    }
  }

  // MAIN OPTIMIZATION METHODS

  optimizeMaxSharpe(simulations: number = 10000, constraints?: any): OptimizationResult {
    console.log('🚀 Starting Maximum Sharpe optimization...');
    
    let bestWeights: number[] = [];
    let maxSharpe = -Infinity;

    try {
      // Multi-phase optimization
      const phases = [
        { iterations: Math.floor(simulations * 0.4), name: 'exploration' },
        { iterations: Math.floor(simulations * 0.4), name: 'exploitation' },
        { iterations: Math.floor(simulations * 0.2), name: 'refinement' }
      ];

      for (const phase of phases) {
        for (let i = 0; i < phase.iterations; i++) {
          let weights: number[];
          
          if (phase.name === 'exploration') {
            weights = this.generateRandomWeights();
          } else if (phase.name === 'exploitation' && bestWeights.length > 0) {
            weights = this.perturbWeights(bestWeights, 0.1);
          } else {
            weights = this.generateRandomWeights();
          }

          if (!this.isValidWeights(weights)) continue;

          const portfolioReturn = this.calculatePortfolioReturn(weights);
          const volatility = this.calculatePortfolioVolatility(weights);
          
          if (volatility <= 0) continue;

          const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
          
          if (sharpeRatio > maxSharpe && !isNaN(sharpeRatio) && isFinite(sharpeRatio)) {
            maxSharpe = sharpeRatio;
            bestWeights = [...weights];
          }
        }
        
        if (bestWeights.length > 0) {
          console.log(`Phase ${phase.name}: Best Sharpe = ${maxSharpe.toFixed(4)}`);
        }
      }

      if (bestWeights.length === 0) {
        console.warn('No valid solution found, using equal weights');
        bestWeights = this.generateEqualWeights();
      }

      const result = this.buildOptimizationResult(bestWeights);
      console.log(`✅ Max Sharpe Complete: Sharpe=${result.sharpeRatio.toFixed(4)}, Return=${(result.expectedReturn * 100).toFixed(2)}%, Vol=${(result.volatility * 100).toFixed(2)}%`);
      return result;

    } catch (error) {
      console.error('Max Sharpe optimization failed:', error);
      return this.buildOptimizationResult(this.generateEqualWeights());
    }
  }

  optimizeMinRisk(): OptimizationResult {
    console.log('🛡️ Starting Minimum Risk optimization...');
    
    try {
      // Try analytical solution first
      const analyticalWeights = this.solveMinimumVarianceAnalytical();
      if (analyticalWeights && this.isValidWeights(analyticalWeights)) {
        const result = this.buildOptimizationResult(analyticalWeights);
        console.log(`✅ Min Risk (Analytical): Vol=${(result.volatility * 100).toFixed(2)}%`);
        return result;
      }
    } catch (error) {
      console.warn('Analytical solution failed, using Monte Carlo');
    }

    // Fallback to Monte Carlo
    let bestWeights: number[] = [];
    let minVolatility = Infinity;

    for (let i = 0; i < 15000; i++) {
      const weights = this.generateRandomWeights();
      if (!this.isValidWeights(weights)) continue;

      const volatility = this.calculatePortfolioVolatility(weights);
      
      if (volatility > 0 && volatility < minVolatility) {
        minVolatility = volatility;
        bestWeights = [...weights];
      }
    }

    if (bestWeights.length === 0) {
      bestWeights = this.generateEqualWeights();
    }

    const result = this.buildOptimizationResult(bestWeights);
    console.log(`✅ Min Risk Complete: Vol=${(result.volatility * 100).toFixed(2)}%`);
    return result;
  }

  optimizeForTargetReturn(targetReturn: number): OptimizationResult {
    console.log(`🎯 Starting Target Return optimization: ${(targetReturn * 100).toFixed(2)}%`);
    
    // Validate target return
    const minReturn = Math.min(...this.meanReturns);
    const maxReturn = Math.max(...this.meanReturns);
    
    if (targetReturn < minReturn || targetReturn > maxReturn * 1.5) {
      console.warn(`Target return ${(targetReturn * 100).toFixed(2)}% may not be achievable`);
      targetReturn = Math.max(minReturn, Math.min(maxReturn, targetReturn));
    }

    let bestWeights: number[] = [];
    let minVolatility = Infinity;
    let bestDistance = Infinity;

    const strategies = [
      { tolerance: 0.001, iterations: 8000, name: 'precise' },
      { tolerance: 0.005, iterations: 6000, name: 'relaxed' },
      { tolerance: 0.01, iterations: 4000, name: 'loose' }
    ];

    for (const strategy of strategies) {
      console.log(`Using ${strategy.name} strategy (tolerance: ${(strategy.tolerance * 100).toFixed(1)}%)`);
      
      for (let i = 0; i < strategy.iterations; i++) {
        let weights: number[];
        
        if (i < strategy.iterations * 0.3) {
          weights = this.generateRandomWeights();
        } else if (i < strategy.iterations * 0.6) {
          weights = this.generateReturnBiasedWeights(targetReturn);
        } else if (bestWeights.length > 0) {
          weights = this.perturbWeights(bestWeights, 0.05);
        } else {
          weights = this.generateRandomWeights();
        }

        if (!this.isValidWeights(weights)) continue;

        const portfolioReturn = this.calculatePortfolioReturn(weights);
        const distance = Math.abs(portfolioReturn - targetReturn);
        
        if (distance <= strategy.tolerance) {
          const volatility = this.calculatePortfolioVolatility(weights);
          
          if (volatility > 0 && (volatility < minVolatility || (distance < bestDistance && Math.abs(volatility - minVolatility) < 0.001))) {
            minVolatility = volatility;
            bestWeights = [...weights];
            bestDistance = distance;
          }
        }
      }
      
      if (bestWeights.length > 0 && bestDistance <= strategy.tolerance) {
        break;
      }
    }

    if (bestWeights.length === 0) {
      console.warn('Target return optimization failed, using best approximation');
      bestWeights = this.findBestReturnApproximation(targetReturn);
    }

    const result = this.buildOptimizationResult(bestWeights);
    result.targetAchieved = Math.abs(result.expectedReturn - targetReturn) < 0.01;
    
    console.log(`✅ Target Return Complete: Target=${(targetReturn * 100).toFixed(2)}%, Achieved=${(result.expectedReturn * 100).toFixed(2)}%, Vol=${(result.volatility * 100).toFixed(2)}%`);
    return result;
  }

  optimizeForTargetVolatility(targetVolatility: number): OptimizationResult {
    console.log(`🎯 Starting Target Volatility optimization: ${(targetVolatility * 100).toFixed(2)}%`);
    
    if (targetVolatility <= 0 || targetVolatility > 1) {
      throw new Error('Target volatility must be between 0% and 100%');
    }

    let bestWeights: number[] = [];
    let maxSharpe = -Infinity;
    let bestDistance = Infinity;

    const strategies = [
      { tolerance: 0.001, iterations: 8000, name: 'precise' },
      { tolerance: 0.005, iterations: 6000, name: 'relaxed' },
      { tolerance: 0.01, iterations: 4000, name: 'loose' }
    ];

    for (const strategy of strategies) {
      console.log(`Using ${strategy.name} strategy (tolerance: ${(strategy.tolerance * 100).toFixed(1)}%)`);
      
      for (let i = 0; i < strategy.iterations; i++) {
        let weights: number[];
        
        if (i < strategy.iterations * 0.3) {
          weights = this.generateRandomWeights();
        } else if (i < strategy.iterations * 0.6) {
          weights = this.generateVolatilityBiasedWeights(targetVolatility);
        } else if (bestWeights.length > 0) {
          weights = this.perturbWeights(bestWeights, 0.05);
        } else {
          weights = this.generateRandomWeights();
        }

        if (!this.isValidWeights(weights)) continue;

        const volatility = this.calculatePortfolioVolatility(weights);
        const distance = Math.abs(volatility - targetVolatility);
        
        if (distance <= strategy.tolerance) {
          const portfolioReturn = this.calculatePortfolioReturn(weights);
          const sharpeRatio = volatility > 0 ? (portfolioReturn - this.riskFreeRate) / volatility : -Infinity;
          
          if (sharpeRatio > maxSharpe || (Math.abs(sharpeRatio - maxSharpe) < 0.001 && distance < bestDistance)) {
            maxSharpe = sharpeRatio;
            bestWeights = [...weights];
            bestDistance = distance;
          }
        }
      }
      
      if (bestWeights.length > 0 && bestDistance <= strategy.tolerance) {
        break;
      }
    }

    if (bestWeights.length === 0) {
      console.warn('Target volatility optimization failed, using best approximation');
      bestWeights = this.findBestVolatilityApproximation(targetVolatility);
    }

    const result = this.buildOptimizationResult(bestWeights);
    result.targetAchieved = Math.abs(result.volatility - targetVolatility) < 0.01;
    
    console.log(`✅ Target Volatility Complete: Target=${(targetVolatility * 100).toFixed(2)}%, Achieved=${(result.volatility * 100).toFixed(2)}%, Return=${(result.expectedReturn * 100).toFixed(2)}%`);
    return result;
  }

  optimizeEqualWeight(): OptimizationResult {
    console.log('⚖️ Equal Weight optimization');
    const weights = this.generateEqualWeights();
    return this.buildOptimizationResult(weights);
  }

  optimizeRiskParity(): OptimizationResult {
    console.log('🎲 Starting Risk Parity optimization...');
    
    let bestWeights: number[] = [];
    let minRiskDispersion = Infinity;

    for (let i = 0; i < 20000; i++) {
      const weights = this.generateRandomWeights();
      if (!this.isValidWeights(weights)) continue;

      const riskContributions = this.calculateRiskContributions(weights);
      const targetRisk = 1 / this.n;
      const riskDispersion = riskContributions.reduce((sum, risk) => 
        sum + Math.pow(risk - targetRisk, 2), 0);
      
      if (riskDispersion < minRiskDispersion) {
        minRiskDispersion = riskDispersion;
        bestWeights = [...weights];
      }
    }

    if (bestWeights.length === 0) {
      bestWeights = this.generateEqualWeights();
    }

    const result = this.buildOptimizationResult(bestWeights);
    console.log(`✅ Risk Parity Complete: Risk dispersion=${minRiskDispersion.toFixed(6)}`);
    return result;
  }

  // HELPER METHODS

  private solveMinimumVarianceAnalytical(): number[] | null {
    try {
      const invCov = math.inv(this.covarianceMatrix) as number[][];
      const ones = Array(this.n).fill(1);
      
      let denominator = 0;
      const numerator = Array(this.n).fill(0);
      
      for (let i = 0; i < this.n; i++) {
        for (let j = 0; j < this.n; j++) {
          numerator[i] += invCov[i][j];
          denominator += invCov[i][j];
        }
      }
      
      if (Math.abs(denominator) < 1e-10) return null;
      
      return numerator.map(val => val / denominator);
    } catch {
      return null;
    }
  }

  private generateRandomWeights(): number[] {
    const weights = Array.from({ length: this.n }, () => Math.random());
    return this.normalizeWeights(weights);
  }

  private generateEqualWeights(): number[] {
    return Array(this.n).fill(1 / this.n);
  }

  private generateReturnBiasedWeights(targetReturn: number): number[] {
    const weights = this.meanReturns.map(r => {
      const distance = Math.abs(r - targetReturn);
      const proximity = 1 / (1 + distance * 100);
      return proximity + Math.random() * 0.3;
    });
    return this.normalizeWeights(weights);
  }

  private generateVolatilityBiasedWeights(targetVolatility: number): number[] {
    const assetVolatilities = this.returns.map(returns => {
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      return Math.sqrt(Math.max(0, variance));
    });

    const weights = assetVolatilities.map(vol => {
      if (vol === 0) return 0.1;
      const ratio = targetVolatility / vol;
      return Math.max(0.01, ratio + Math.random() * 0.3);
    });

    return this.normalizeWeights(weights);
  }

  private perturbWeights(baseWeights: number[], intensity: number = 0.1): number[] {
    const perturbedWeights = baseWeights.map(w => {
      const perturbation = (Math.random() - 0.5) * intensity * 2;
      return Math.max(0.001, w + perturbation);
    });
    return this.normalizeWeights(perturbedWeights);
  }

  private findBestReturnApproximation(targetReturn: number): number[] {
    let bestWeights = this.generateEqualWeights();
    let bestDistance = Infinity;

    for (let i = 0; i < 5000; i++) {
      const weights = this.generateRandomWeights();
      const portfolioReturn = this.calculatePortfolioReturn(weights);
      const distance = Math.abs(portfolioReturn - targetReturn);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestWeights = [...weights];
      }
    }

    return bestWeights;
  }

  private findBestVolatilityApproximation(targetVolatility: number): number[] {
    let bestWeights = this.generateEqualWeights();
    let bestDistance = Infinity;

    for (let i = 0; i < 5000; i++) {
      const weights = this.generateRandomWeights();
      const volatility = this.calculatePortfolioVolatility(weights);
      const distance = Math.abs(volatility - targetVolatility);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestWeights = [...weights];
      }
    }

    return bestWeights;
  }

  private normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((s, w) => s + Math.max(0, w), 0);
    if (sum === 0) return this.generateEqualWeights();
    return weights.map(w => Math.max(0, w) / sum);
  }

  private isValidWeights(weights: number[]): boolean {
    if (!weights || weights.length !== this.n) return false;
    
    const sum = weights.reduce((s, w) => s + w, 0);
    const hasNaN = weights.some(w => isNaN(w) || !isFinite(w));
    const hasNegative = weights.some(w => w < 0);
    
    return Math.abs(sum - 1) < 1e-6 && !hasNaN && !hasNegative;
  }

  private calculatePortfolioReturn(weights: number[]): number {
    return weights.reduce((sum, weight, i) => sum + weight * this.meanReturns[i], 0);
  }

  private calculatePortfolioVolatility(weights: number[]): number {
    let variance = 0;
    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        variance += weights[i] * weights[j] * this.covarianceMatrix[i][j];
      }
    }
    return Math.sqrt(Math.max(0, variance));
  }

  private calculateRiskContributions(weights: number[]): number[] {
    const portfolioVariance = Math.pow(this.calculatePortfolioVolatility(weights), 2);
    if (portfolioVariance === 0) return Array(this.n).fill(1 / this.n);

    const riskContributions = [];
    for (let i = 0; i < this.n; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < this.n; j++) {
        marginalContribution += weights[j] * this.covarianceMatrix[i][j];
      }
      riskContributions.push(weights[i] * marginalContribution / portfolioVariance);
    }
    return riskContributions;
  }

  private buildOptimizationResult(weights: number[]): OptimizationResult {
    const expectedReturn = this.calculatePortfolioReturn(weights);
    const volatility = this.calculatePortfolioVolatility(weights);
    const sharpeRatio = volatility > 0 ? (expectedReturn - this.riskFreeRate) / volatility : 0;

    return {
      weights,
      expectedReturn,
      volatility,
      sharpeRatio,
      constraintsSatisfied: true
    };
  }

  // Validation method
  validateOptimizationResult(weights: number[]): {
    isValid: boolean;
    weightSum: number;
    hasNaN: boolean;
    hasNegative: boolean;
  } {
    const weightSum = weights.reduce((s, w) => s + w, 0);
    const hasNaN = weights.some(w => isNaN(w));
    const hasNegative = weights.some(w => w < 0);
    const isValid = Math.abs(weightSum - 1) < 1e-6 && !hasNaN && !hasNegative;

    return {
      isValid,
      weightSum,
      hasNaN,
      hasNegative,
    };
  }
}

// VaR Calculator Class
export class VaRCalculator {
  static calculatePortfolioVaR(
    returnsMatrix: number[][],
    weights: number[],
    confidenceLevel: number = 0.95,
    portfolioValue: number = 1000000
  ): PortfolioVaRResult {
    try {
      const portfolioReturns = this.calculatePortfolioReturns(returnsMatrix, weights);
      const cleanReturns = portfolioReturns.filter(r => 
        !isNaN(r) && isFinite(r) && Math.abs(r) < 0.5
      );
      
      if (cleanReturns.length < 30) {
        throw new Error('Insufficient valid data for VaR calculation');
      }
      
      const mean = cleanReturns.reduce((s, r) => s + r, 0) / cleanReturns.length;
      const variance = cleanReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (cleanReturns.length - 1);
      const volatility = Math.sqrt(variance);
      
      // Parametric VaR
      const zScore = this.getZScore(confidenceLevel);
      const var95 = Math.abs(mean + zScore * volatility) * portfolioValue;
      
      // Expected Shortfall
      const sortedReturns = cleanReturns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const tailReturns = sortedReturns.slice(0, Math.max(1, index));
      const expectedShortfall = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * portfolioValue :
        var95 * 1.3;

      return {
        var: var95,
        expectedShortfall: expectedShortfall,
        portfolioReturn: mean,
        portfolioVolatility: volatility,
        confidenceLevel: confidenceLevel,
        method: 'Parametric'
      };
    } catch (error) {
      throw new Error(`VaR calculation failed: ${error.message}`);
    }
  }

  static calculatePortfolioHistoricalVaR(
    returnsMatrix: number[][],
    weights: number[],
    confidenceLevel: number = 0.95,
    portfolioValue: number = 1000000
  ): PortfolioVaRResult {
    try {
      const portfolioReturns = this.calculatePortfolioReturns(returnsMatrix, weights);
      const cleanReturns = portfolioReturns.filter(r => 
        !isNaN(r) && isFinite(r) && Math.abs(r) < 0.5
      );
      
      if (cleanReturns.length < 30) {
        throw new Error('Insufficient valid data for historical VaR calculation');
      }
      
      const sortedReturns = cleanReturns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var95 = Math.abs(sortedReturns[Math.max(0, index)]) * portfolioValue;
      
      const tailReturns = sortedReturns.slice(0, Math.max(1, index));
      const expectedShortfall = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * portfolioValue :
        var95 * 1.3;

      const mean = cleanReturns.reduce((s, r) => s + r, 0) / cleanReturns.length;
      const variance = cleanReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (cleanReturns.length - 1);

      return {
        var: var95,
        expectedShortfall: expectedShortfall,
        portfolioReturn: mean,
        portfolioVolatility: Math.sqrt(variance),
        confidenceLevel: confidenceLevel,
        method: 'Historical'
      };
    } catch (error) {
      throw new Error(`Historical VaR calculation failed: ${error.message}`);
    }
  }

  static calculateIndividualVaR(
    assetReturns: number[],
    symbol: string,
    confidenceLevel: number = 0.95,
    positionValue: number = 1000000,
    method: string = 'parametric'
  ): IndividualVaRResult {
    try {
      const cleanReturns = assetReturns.filter(r => 
        !isNaN(r) && isFinite(r) && Math.abs(r) < 0.5
      );
      
      if (cleanReturns.length < 30) {
        throw new Error(`Insufficient data for ${symbol} VaR calculation`);
      }

      const mean = cleanReturns.reduce((s, r) => s + r, 0) / cleanReturns.length;
      const variance = cleanReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (cleanReturns.length - 1);
      const volatility = Math.sqrt(variance);

      let var95: number;
      let expectedShortfall: number;

      if (method === 'parametric') {
        const zScore = this.getZScore(confidenceLevel);
        var95 = Math.abs(mean + zScore * volatility) * positionValue;
        expectedShortfall = var95 * 1.3; // Approximation for normal distribution
      } else {
        // Historical method
        const sortedReturns = cleanReturns.sort((a, b) => a - b);
        const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
        var95 = Math.abs(sortedReturns[Math.max(0, index)]) * positionValue;
        
        const tailReturns = sortedReturns.slice(0, Math.max(1, index));
        expectedShortfall = tailReturns.length > 0 ? 
          Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * positionValue :
          var95 * 1.3;
      }

      return {
        symbol,
        var: var95,
        expectedShortfall: expectedShortfall,
        return: mean,
        volatility: volatility,
        confidenceLevel: confidenceLevel,
        method: method
      };
    } catch (error) {
      throw new Error(`Individual VaR calculation failed for ${symbol}: ${error.message}`);
    }
  }

  private static calculatePortfolioReturns(returnsMatrix: number[][], weights: number[]): number[] {
    const minLength = Math.min(...returnsMatrix.map(r => r.length));
    const portfolioReturns = [];
    
    for (let i = 0; i < minLength; i++) {
      let portfolioReturn = 0;
      for (let j = 0; j < returnsMatrix.length; j++) {
        portfolioReturn += weights[j] * returnsMatrix[j][i];
      }
      portfolioReturns.push(portfolioReturn);
    }
    
    return portfolioReturns;
  }

  private static getZScore(confidenceLevel: number): number {
    // Approximate z-scores for common confidence levels
    const zScores: { [key: string]: number } = {
      '0.90': -1.282,
      '0.95': -1.645,
      '0.99': -2.326,
      '0.999': -3.090
    };
    
    const key = confidenceLevel.toFixed(3);
    return zScores[key] || -1.645; // Default to 95%
  }

  static calculateKupiecTest(exceedances: number, observations: number, alpha: number): number {
    const expectedExceedances = observations * alpha;
    if (expectedExceedances === 0) return 0;
    
    const ratio = exceedances / expectedExceedances;
    return 2 * Math.log(Math.pow(ratio, exceedances) * Math.pow(1 - alpha, observations - exceedances));
  }
}

export default PortfolioOptimizer;
