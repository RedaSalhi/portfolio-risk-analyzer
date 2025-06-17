// FIXED Financial Calculations - src/utils/financialCalculations.ts
// Fixed target optimization + Enhanced VaR calculations + English translation

import * as math from 'mathjs';

// Types and Interfaces
export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  targetAchieved?: boolean;
  constraintsSatisfied?: boolean;
  efficientFrontier?: Array<{ expectedReturn: number; volatility: number; sharpeRatio: number }>;
  allSimulations?: Array<{ expectedReturn: number; volatility: number; sharpeRatio: number }>;
  riskFreeWeight?: number;
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
  skewness?: number;
  kurtosis?: number;
  cornishFisherAdjustment?: number;
  dataQuality?: {
    originalObservations: number;
    cleanedObservations: number;
    outliersRemoved: number;
  };
}

export interface PortfolioVaRResult extends VaRResult {
  portfolioReturn: number;
  portfolioVolatility: number;
  componentVaR?: { [key: string]: number };
  marginalVaR?: number[];
  diversificationBenefit?: number;
  correlationMatrix?: number[][];
}

// FIXED: Enhanced Portfolio Optimizer Class
export class PortfolioOptimizer {
  private returns: number[][];
  private riskFreeRate: number;
  public covarianceMatrix!: number[][];
  private meanReturns!: number[];
  private n: number;
  private assetVolatilities!: number[];
  private includeRiskFree: boolean;

  constructor(returns: number[][], riskFreeRate: number = 0.02, includeRiskFree: boolean = false) {
    if (!returns || returns.length === 0 || !returns[0] || returns[0].length === 0) {
      throw new Error('Invalid returns data provided');
    }

    this.returns = returns;
    this.riskFreeRate = riskFreeRate;
    this.includeRiskFree = includeRiskFree;
    this.n = returns.length;
    
    this.calculateStatistics();
  }

  // FIXED: Add missing getter methods
  getMeanReturns(): number[] {
    return [...this.meanReturns];
  }

  getAssetVolatilities(): number[] {
    return [...this.assetVolatilities];
  }

  getCovarianceMatrix(): number[][] {
    return this.covarianceMatrix.map(row => [...row]);
  }

  private calculateStatistics(): void {
    const observations = this.returns[0].length;
    
    if (observations < 10) {
      throw new Error('Insufficient data points for optimization (minimum 10 required)');
    }

    // Calculate mean returns (annualized)
    this.meanReturns = this.returns.map(assetReturns => {
      const validReturns = assetReturns.filter(r => !isNaN(r) && isFinite(r));
      if (validReturns.length === 0) {
        throw new Error('No valid returns found for asset');
      }
      const meanDaily = validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length;
      return meanDaily * 252; // Annualize (252 trading days)
    });

    // Calculate asset volatilities (annualized)
    this.assetVolatilities = this.returns.map((assetReturns, i) => {
      const validReturns = assetReturns.filter(r => !isNaN(r) && isFinite(r));
      const mean = validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length;
      const variance = validReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (validReturns.length - 1);
      return Math.sqrt(variance * 252); // Annualize
    });

    // Calculate covariance matrix (annualized)
    this.covarianceMatrix = this.calculateCovarianceMatrix();
    
    // Validate covariance matrix
    if (this.isDeterminantZero(this.covarianceMatrix)) {
      console.warn('Covariance matrix is singular, adding regularization');
      this.regularizeCovarianceMatrix();
    }

    console.log('📊 Portfolio Statistics:');
    console.log('Mean Returns (annualized):', this.meanReturns.map(r => `${(r * 100).toFixed(2)}%`));
    console.log('Volatilities (annualized):', this.assetVolatilities.map(v => `${(v * 100).toFixed(2)}%`));
  }

  private calculateCovarianceMatrix(): number[][] {
    const observations = this.returns[0].length;
    const covMatrix: number[][] = Array(this.n).fill(null).map(() => Array(this.n).fill(0));

    // Calculate daily means
    const dailyMeans = this.returns.map(assetReturns => {
      const validReturns = assetReturns.filter(r => !isNaN(r) && isFinite(r));
      return validReturns.reduce((sum, r) => sum + r, 0) / validReturns.length;
    });

    for (let i = 0; i < this.n; i++) {
      for (let j = 0; j < this.n; j++) {
        let covariance = 0;
        let validCount = 0;
        
        for (let k = 0; k < observations; k++) {
          const ri = this.returns[i][k];
          const rj = this.returns[j][k];
          
          if (!isNaN(ri) && !isNaN(rj) && isFinite(ri) && isFinite(rj)) {
            covariance += (ri - dailyMeans[i]) * (rj - dailyMeans[j]);
            validCount++;
          }
        }
        
        if (validCount > 1) {
          covMatrix[i][j] = (covariance / (validCount - 1)) * 252; // Annualize
        } else {
          covMatrix[i][j] = i === j ? Math.pow(this.assetVolatilities[i], 2) : 0;
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
    for (let i = 0; i < this.n; i++) {
      this.covarianceMatrix[i][i] += 0.0001;
    }
  }

  // MAIN OPTIMIZATION METHODS

  optimizeMaxSharpe(simulations: number = 50000, constraints?: any): OptimizationResult {
    console.log('🚀 Starting Maximum Sharpe optimization...');
    let allSimulations: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> = [];
    // First try deterministic quadratic programming
    try {
      const qpResult = this.optimizeMaxSharpeQP();
      if (qpResult && qpResult.sharpeRatio > 0) {
        // Always generate 10,000 random portfolios for visualization
        for (let i = 0; i < 10000; i++) {
          const weights = this.generateRandomWeights();
          if (!this.isValidWeights(weights)) continue;
          const portfolioReturn = this.calculatePortfolioReturn(weights);
          const volatility = this.calculatePortfolioVolatility(weights);
          if (volatility <= 0) continue;
          const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
          allSimulations.push({ expectedReturn: portfolioReturn, volatility, sharpeRatio });
        }
        // Attach simulations to the result
        return { ...qpResult, allSimulations };
      }
    } catch (error) {
      console.warn('QP optimization failed, falling back to Monte Carlo:', error);
    }

    // Fallback to Monte Carlo if QP fails
    let bestWeights: number[] = [];
    let maxSharpe = -Infinity;

    try {
      // Generate initial population with deterministic weights
      const initialWeights = this.generateEqualWeights();
      const initialResult = {
        expectedReturn: this.calculatePortfolioReturn(initialWeights),
        volatility: this.calculatePortfolioVolatility(initialWeights),
        sharpeRatio: (this.calculatePortfolioReturn(initialWeights) - this.riskFreeRate) / this.calculatePortfolioVolatility(initialWeights)
      };
      allSimulations.push(initialResult);
      
      if (initialResult.sharpeRatio > maxSharpe) {
        maxSharpe = initialResult.sharpeRatio;
        bestWeights = [...initialWeights];
      }

      // Run Monte Carlo simulations
      for (let i = 0; i < simulations; i++) {
        const weights = this.generateRandomWeights();
        if (!this.isValidWeights(weights)) continue;

        const portfolioReturn = this.calculatePortfolioReturn(weights);
        const volatility = this.calculatePortfolioVolatility(weights);
        
        if (volatility <= 0) continue;

        const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
        
        // Store simulation result
        allSimulations.push({
          expectedReturn: portfolioReturn,
          volatility: volatility,
          sharpeRatio: sharpeRatio
        });
        
        if (sharpeRatio > maxSharpe && !isNaN(sharpeRatio) && isFinite(sharpeRatio)) {
          maxSharpe = sharpeRatio;
          bestWeights = [...weights];
        }
      }

      if (bestWeights.length === 0) {
        console.warn('No valid solution found, using equal weights');
        bestWeights = this.generateEqualWeights();
      }

      const result = this.buildOptimizationResult(bestWeights, allSimulations);
      console.log(`✅ Max Sharpe Complete: Sharpe=${result.sharpeRatio.toFixed(4)}, Return=${(result.expectedReturn * 100).toFixed(2)}%, Vol=${(result.volatility * 100).toFixed(2)}%`);
      return result;

    } catch (error) {
      console.error('Max Sharpe optimization failed:', error);
      return this.buildOptimizationResult(this.generateEqualWeights());
    }
  }

  optimizeMinRisk(): OptimizationResult {
    console.log('🛡️ Starting Minimum Risk optimization...');
    
    // First try deterministic quadratic programming
    try {
      const qpResult = this.optimizeMinRiskQP();
      if (qpResult) {
        console.log(`✅ Min Risk (QP): Vol=${(qpResult.volatility * 100).toFixed(2)}%`);
        return qpResult;
      }
    } catch (error) {
      console.warn('QP optimization failed, falling back to Monte Carlo:', error);
    }

    // Fallback to Monte Carlo if QP fails
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

  // FIXED: Completely rewritten target return optimization
  optimizeForTargetReturn(targetReturn: number): OptimizationResult {
    console.log(`🎯 Starting Target Return optimization: ${(targetReturn * 100).toFixed(2)}%`);
    // Find tangency (max Sharpe) portfolio
    const tangency = this.optimizeMaxSharpe(5000);
    const tangencyReturn = tangency.expectedReturn;
    const tangencyVol = tangency.volatility;
    // Calculate risky and risk-free weights
    const riskyWeight = (targetReturn - this.riskFreeRate) / (tangencyReturn - this.riskFreeRate);
    const riskFreeWeight = 1 - riskyWeight;
    // Clamp weights between 0 and 1
    const clampedRiskyWeight = Math.max(0, Math.min(1, riskyWeight));
    const clampedRiskFreeWeight = 1 - clampedRiskyWeight;
    // Portfolio metrics
    const expectedReturn = clampedRiskyWeight * tangencyReturn + clampedRiskFreeWeight * this.riskFreeRate;
    const volatility = clampedRiskyWeight * tangencyVol;
    const sharpeRatio = (expectedReturn - this.riskFreeRate) / (volatility > 0 ? volatility : 1e-8);
    // Compose weights: risky asset weights scaled by riskyWeight, plus risk-free asset
    const riskyWeights = tangency.weights.map(w => w * clampedRiskyWeight);
    const weights = this.includeRiskFree
      ? [...riskyWeights, clampedRiskFreeWeight]
      : riskyWeights;

    const result: OptimizationResult = {
      weights,
      expectedReturn,
      volatility,
      sharpeRatio,
      constraintsSatisfied: true,
    };

    if (this.includeRiskFree) {
      result.riskFreeWeight = clampedRiskFreeWeight;
    }

    return result;
  }

  // FIXED: Completely rewritten target volatility optimization
  optimizeForTargetVolatility(targetVolatility: number): OptimizationResult {
    console.log(`📊 Starting Target Volatility optimization: ${(targetVolatility * 100).toFixed(2)}%`);
    // Find tangency (max Sharpe) portfolio
    const tangency = this.optimizeMaxSharpe(5000);
    const tangencyReturn = tangency.expectedReturn;
    const tangencyVol = tangency.volatility;
    // Calculate risky and risk-free weights
    const riskyWeight = targetVolatility / tangencyVol;
    const riskFreeWeight = 1 - riskyWeight;
    // Clamp weights between 0 and 1
    const clampedRiskyWeight = Math.max(0, Math.min(1, riskyWeight));
    const clampedRiskFreeWeight = 1 - clampedRiskyWeight;
    // Portfolio metrics
    const expectedReturn = this.riskFreeRate + clampedRiskyWeight * (tangencyReturn - this.riskFreeRate);
    const volatility = targetVolatility;
    const sharpeRatio = (expectedReturn - this.riskFreeRate) / (volatility > 0 ? volatility : 1e-8);
    // Compose weights: risky asset weights scaled by riskyWeight, plus risk-free asset
    const riskyWeights = tangency.weights.map(w => w * clampedRiskyWeight);
    const weights = this.includeRiskFree
      ? [...riskyWeights, clampedRiskFreeWeight]
      : riskyWeights;

    const result: OptimizationResult = {
      weights,
      expectedReturn,
      volatility,
      sharpeRatio,
      constraintsSatisfied: true,
    };

    if (this.includeRiskFree) {
      result.riskFreeWeight = clampedRiskFreeWeight;
    }

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

  // FIXED: Enhanced weight generation methods
  private generateTargetReturnBiasedWeights(targetReturn: number): number[] {
    // Create weights biased towards assets that can achieve the target return
    const weights = this.meanReturns.map(assetReturn => {
      // Calculate how much this asset contributes to achieving target
      const returnDifference = Math.abs(assetReturn - targetReturn);
      const proximity = 1 / (1 + returnDifference * 10); // Proximity factor
      
      // Add randomness but bias towards suitable assets
      const baseWeight = proximity + Math.random() * 0.3;
      return Math.max(0.01, baseWeight); // Ensure positive weights
    });
    
    return this.normalizeWeights(weights);
  }

  private generateTargetVolatilityBiasedWeights(targetVolatility: number): number[] {
    // Create weights biased towards achieving target volatility through diversification
    const weights = this.assetVolatilities.map((assetVol, i) => {
      // Calculate how this asset's volatility relates to target
      const volDifference = Math.abs(assetVol - targetVolatility);
      const proximity = 1 / (1 + volDifference * 5); // Proximity factor
      
      // Consider correlation with other assets for diversification
      let diversificationBonus = 1;
      for (let j = 0; j < this.n; j++) {
        if (i !== j) {
          const correlation = this.covarianceMatrix[i][j] / (this.assetVolatilities[i] * this.assetVolatilities[j]);
          diversificationBonus += (1 - Math.abs(correlation)) * 0.1; // Bonus for low correlation
        }
      }
      
      const baseWeight = proximity * diversificationBonus + Math.random() * 0.2;
      return Math.max(0.01, baseWeight);
    });
    
    return this.normalizeWeights(weights);
  }

  // HELPER METHODS

  private optimizeMaxSharpeQP(): OptimizationResult | null {
    try {
      // Set up the quadratic programming problem
      // Objective: Maximize (w'μ - rf) / sqrt(w'Σw)
      // This is equivalent to minimizing -w'μ / sqrt(w'Σw)
      
      // Calculate the inverse of the covariance matrix
      const invCovMatrix = math.inv(this.covarianceMatrix);
      
      // Calculate the optimal weights using the analytical solution
      // w* = (Σ^-1 * (μ - rf)) / (1' * Σ^-1 * (μ - rf))
      const excessReturns = this.meanReturns.map(r => r - this.riskFreeRate);
      const numerator = math.multiply(invCovMatrix, excessReturns);
      const denominator = math.sum(numerator);
      
      if (Math.abs(denominator) < 1e-10) {
        throw new Error('Denominator too close to zero in QP solution');
      }
      
      const weights = (numerator as number[]).map((w: number) => w / denominator);
      
      // Normalize weights to ensure they sum to 1
      const normalizedWeights = this.normalizeWeights(weights);
      
      // Calculate portfolio metrics
      const portfolioReturn = this.calculatePortfolioReturn(normalizedWeights);
      const volatility = this.calculatePortfolioVolatility(normalizedWeights);
      const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
      
      // Validate the solution
      const validation = this.validateOptimizationResult(normalizedWeights);
      if (!validation.isValid) {
        throw new Error('Invalid QP solution: ' + JSON.stringify(validation));
      }
      
      return {
        weights: normalizedWeights,
        expectedReturn: portfolioReturn,
        volatility: volatility,
        sharpeRatio: sharpeRatio,
        targetAchieved: true,
        constraintsSatisfied: true
      };
      
    } catch (error) {
      console.error('QP optimization failed:', error);
      return null;
    }
  }

  private optimizeMinRiskQP(): OptimizationResult | null {
    try {
      // Set up the quadratic programming problem for minimum variance
      // Objective: Minimize w'Σw
      // Subject to: w'1 = 1
      
      // Calculate the inverse of the covariance matrix
      const invCovMatrix = math.inv(this.covarianceMatrix);
      
      // Calculate the optimal weights using the analytical solution
      // w* = (Σ^-1 * 1) / (1' * Σ^-1 * 1)
      const ones = Array(this.n).fill(1);
      const numerator = math.multiply(invCovMatrix, ones);
      const denominator = math.sum(numerator);
      
      if (Math.abs(denominator) < 1e-10) {
        throw new Error('Denominator too close to zero in QP solution');
      }
      
      const weights = numerator.map((w: number) => w / denominator);
      
      // Normalize weights to ensure they sum to 1
      const normalizedWeights = this.normalizeWeights(weights);
      
      // Calculate portfolio metrics
      const portfolioReturn = this.calculatePortfolioReturn(normalizedWeights);
      const volatility = this.calculatePortfolioVolatility(normalizedWeights);
      const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
      
      // Validate the solution
      const validation = this.validateOptimizationResult(normalizedWeights);
      if (!validation.isValid) {
        throw new Error('Invalid QP solution: ' + JSON.stringify(validation));
      }
      
      return {
        weights: normalizedWeights,
        expectedReturn: portfolioReturn,
        volatility: volatility,
        sharpeRatio: sharpeRatio,
        targetAchieved: true,
        constraintsSatisfied: true
      };
      
    } catch (error) {
      console.error('QP optimization failed:', error);
      return null;
    }
  }

  private generateRandomWeights(): number[] {
    // Use a deterministic seed for consistent results
    const seed = 42; // Fixed seed for reproducibility
    const weights = Array(this.n).fill(0).map((_, i) => {
      // Use a deterministic pseudo-random number generation
      const x = Math.sin(seed + i) * 10000;
      return x - Math.floor(x);
    });
    return this.normalizeWeights(weights);
  }

  private generateEqualWeights(): number[] {
    return Array(this.n).fill(1 / this.n);
  }

  private perturbWeights(baseWeights: number[], intensity: number = 0.1): number[] {
    const perturbedWeights = baseWeights.map(w => {
      const perturbation = (Math.random() - 0.5) * intensity * 2;
      return Math.max(0.001, w + perturbation);
    });
    return this.normalizeWeights(perturbedWeights);
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

  private buildOptimizationResult(weights: number[], allSimulations?: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>): OptimizationResult {
    const expectedReturn = this.calculatePortfolioReturn(weights);
    const volatility = this.calculatePortfolioVolatility(weights);
    const sharpeRatio = volatility > 0 ? (expectedReturn - this.riskFreeRate) / volatility : 0;

    const result: OptimizationResult = {
      weights,
      expectedReturn,
      volatility,
      sharpeRatio,
      constraintsSatisfied: true
    };

    if (allSimulations && allSimulations.length > 0) {
      result.allSimulations = allSimulations;
      result.efficientFrontier = this.generateAnalyticalEfficientFrontier(100);
    }

    return result;
  }

  // FIXED: Add missing methods
  generateAnalyticalEfficientFrontier(points: number = 100): Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> {
    console.log('📈 Generating Continuous Efficient Frontier...');
    
    // First find the minimum variance portfolio
    const minVarResult = this.optimizeMinRisk();
    const minVarReturn = minVarResult.expectedReturn;
    const minVarVol = minVarResult.volatility;
    
    console.log('\n🔍 Key Portfolios:');
    console.log(`Minimum Variance Portfolio: Return=${(minVarReturn * 100).toFixed(2)}%, Vol=${(minVarVol * 100).toFixed(2)}%`);
    
    // Then find the maximum Sharpe ratio portfolio
    const maxSharpeResult = this.optimizeMaxSharpe();
    const maxSharpeReturn = maxSharpeResult.expectedReturn;
    const maxSharpeVol = maxSharpeResult.volatility;
    
    console.log(`Maximum Sharpe Portfolio: Return=${(maxSharpeReturn * 100).toFixed(2)}%, Vol=${(maxSharpeVol * 100).toFixed(2)}%, Sharpe=${maxSharpeResult.sharpeRatio.toFixed(2)}`);
    
    // Calculate the range of returns to explore
    const minReturn = Math.min(minVarReturn, maxSharpeReturn);
    const maxReturn = Math.max(minVarReturn, maxSharpeReturn);
    
    // Add some buffer to the range to ensure we capture the full frontier
    const returnRange = maxReturn - minReturn;
    const targetMinReturn = minReturn - returnRange * 0.1;
    const targetMaxReturn = maxReturn + returnRange * 0.1;
    
    console.log(`\n📊 Exploring return range: ${(targetMinReturn * 100).toFixed(2)}% to ${(targetMaxReturn * 100).toFixed(2)}%`);
    
    // Generate a more continuous set of points
    const frontier: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> = [];
    const adaptivePoints: number[] = [];
    
    // First, generate base points with adaptive spacing
    const basePoints = Math.floor(points * 0.7); // 70% of points for base distribution
    console.log(`\n📈 Generating ${basePoints} base points...`);
    
    for (let i = 0; i < basePoints; i++) {
      // Use a cubic distribution to focus more points in the middle range
      const t = i / (basePoints - 1);
      const targetReturn = targetMinReturn + (targetMaxReturn - targetMinReturn) * (t * t * t);
      adaptivePoints.push(targetReturn);
    }
    
    // Add more points around the minimum variance and maximum Sharpe portfolios
    const extraPoints = Math.floor(points * 0.3); // 30% of points for critical regions
    const minVarRange = returnRange * 0.1;
    const maxSharpeRange = returnRange * 0.1;
    
    console.log(`\n📈 Adding ${extraPoints} extra points around critical regions...`);
    
    for (let i = 0; i < extraPoints / 2; i++) {
      const t = i / (extraPoints / 2 - 1);
      // Points around minimum variance
      adaptivePoints.push(minVarReturn - minVarRange/2 + minVarRange * t);
      // Points around maximum Sharpe
      adaptivePoints.push(maxSharpeReturn - maxSharpeRange/2 + maxSharpeRange * t);
    }
    
    // Sort and remove duplicates
    adaptivePoints.sort((a, b) => a - b);
    const uniquePoints = [...new Set(adaptivePoints)];
    
    console.log(`\n📊 Total unique target returns to evaluate: ${uniquePoints.length}`);
    
    // Generate the frontier using the adaptive points
    let lastValidPoint: {expectedReturn: number, volatility: number, sharpeRatio: number} | null = null;
    let pointCount = 0;
    
    console.log('\n🔍 Evaluating points:');
    console.log('Return (%) | Volatility (%) | Sharpe Ratio | Status');
    console.log('------------------------------------------------');
    
    for (const targetReturn of uniquePoints) {
      try {
        const weights = this.solveMinVarianceForTargetReturn(targetReturn);
        const expectedReturn = this.calculatePortfolioReturn(weights);
        const volatility = this.calculatePortfolioVolatility(weights);
        
        if (volatility > 0 && !isNaN(expectedReturn) && isFinite(expectedReturn)) {
          const sharpeRatio = (expectedReturn - this.riskFreeRate) / volatility;
          const currentPoint = { expectedReturn, volatility, sharpeRatio };
          
          // Check if this point improves the frontier
          const isEfficient = frontier.every(point => 
            point.expectedReturn >= expectedReturn || point.volatility >= volatility
          );
          
          if (isEfficient) {
            // If we have a last valid point, check if we need to interpolate
            if (lastValidPoint) {
              const returnGap = Math.abs(expectedReturn - lastValidPoint.expectedReturn);
              const volGap = Math.abs(volatility - lastValidPoint.volatility);
              
              // If the gap is too large, add interpolated points
              if (returnGap > returnRange * 0.05 || volGap > returnRange * 0.05) {
                const numInterpPoints = Math.ceil(Math.max(returnGap, volGap) / (returnRange * 0.01));
                for (let i = 1; i < numInterpPoints; i++) {
                  const t = i / numInterpPoints;
                  const interpReturn = lastValidPoint.expectedReturn + (expectedReturn - lastValidPoint.expectedReturn) * t;
                  const interpVol = lastValidPoint.volatility + (volatility - lastValidPoint.volatility) * t;
                  const interpSharpe = (interpReturn - this.riskFreeRate) / interpVol;
                  
                  frontier.push({
                    expectedReturn: interpReturn,
                    volatility: interpVol,
                    sharpeRatio: interpSharpe
                  });
                  pointCount++;
                  console.log(`${(interpReturn * 100).toFixed(2)}% | ${(interpVol * 100).toFixed(2)}% | ${interpSharpe.toFixed(2)} | interpolated`);
                }
              }
            }
            
            frontier.push(currentPoint);
            lastValidPoint = currentPoint;
            pointCount++;
            console.log(`${(expectedReturn * 100).toFixed(2)}% | ${(volatility * 100).toFixed(2)}% | ${sharpeRatio.toFixed(2)} | efficient`);
          } else {
            console.log(`${(expectedReturn * 100).toFixed(2)}% | ${(volatility * 100).toFixed(2)}% | ${sharpeRatio.toFixed(2)} | inefficient`);
          }
        }
      } catch (error) {
        console.log(`${(targetReturn * 100).toFixed(2)}% | failed | failed | error`);
        continue;
      }
    }
    
    // Ensure we have the minimum variance and maximum Sharpe portfolios
    if (!frontier.some(p => Math.abs(p.expectedReturn - minVarReturn) < 0.0001)) {
      frontier.push({
        expectedReturn: minVarReturn,
        volatility: minVarVol,
        sharpeRatio: (minVarReturn - this.riskFreeRate) / minVarVol
      });
      pointCount++;
      console.log(`${(minVarReturn * 100).toFixed(2)}% | ${(minVarVol * 100).toFixed(2)}% | ${((minVarReturn - this.riskFreeRate) / minVarVol).toFixed(2)} | min variance`);
    }
    
    if (!frontier.some(p => Math.abs(p.expectedReturn - maxSharpeReturn) < 0.0001)) {
      frontier.push({
        expectedReturn: maxSharpeReturn,
        volatility: maxSharpeVol,
        sharpeRatio: maxSharpeResult.sharpeRatio
      });
      pointCount++;
      console.log(`${(maxSharpeReturn * 100).toFixed(2)}% | ${(maxSharpeVol * 100).toFixed(2)}% | ${maxSharpeResult.sharpeRatio.toFixed(2)} | max sharpe`);
    }
    
    // Sort by expected return
    frontier.sort((a, b) => a.expectedReturn - b.expectedReturn);
    
    // Remove any remaining inefficient points
    const efficientFrontier = frontier.filter((point, index) => {
      if (index === 0) return true;
      const prevPoint = frontier[index - 1];
      return point.volatility < prevPoint.volatility;
    });
    
    console.log('\n📊 Summary:');
    console.log(`Total points evaluated: ${uniquePoints.length}`);
    console.log(`Points generated: ${pointCount}`);
    console.log(`Final efficient frontier points: ${efficientFrontier.length}`);
    
    return efficientFrontier;
  }

  private solveMinVarianceForTargetReturn(targetReturn: number): number[] {
    const ones = Array(this.n).fill(1);
    const mu = this.meanReturns;
    const Sigma = this.covarianceMatrix;
    const invSigma = math.inv(Sigma);

    // All these are numbers (dot products)
    const A = math.dot(ones, math.multiply(invSigma, ones));
    const B = math.dot(ones, math.multiply(invSigma, mu));
    const C = math.dot(mu, math.multiply(invSigma, mu));
    const D = A * C - B * B;
    if (Math.abs(D) < 1e-10) throw new Error('Singular matrix in efficient frontier QP');
    const g = (C - B * targetReturn) / D;
    const h = (A * targetReturn - B) / D;

    // weights = g * invSigma * ones + h * invSigma * mu
    const w1 = math.multiply(invSigma, ones).map((x: number) => x * g);
    const w2 = math.multiply(invSigma, mu).map((x: number) => x * h);
    const weights = w1.map((x: number, i: number) => x + w2[i]);
    return this.normalizeWeights(weights);
  }

  calculateCapitalAllocation(targetReturn?: number, targetVolatility?: number): any {
    // Simplified capital allocation calculation
    try {
      const tangencyWeights = this.optimizeMaxSharpe(5000).weights;
      const tangencyReturn = this.calculatePortfolioReturn(tangencyWeights);
      const tangencyVolatility = this.calculatePortfolioVolatility(tangencyWeights);

      if (targetReturn) {
        const riskyWeight = (targetReturn - this.riskFreeRate) / (tangencyReturn - this.riskFreeRate);
        return {
          riskyWeight: Math.max(0, Math.min(1, riskyWeight)),
          riskFreeWeight: 1 - Math.max(0, Math.min(1, riskyWeight)),
          portfolioReturn: targetReturn,
          portfolioVolatility: Math.max(0, Math.min(1, riskyWeight)) * tangencyVolatility,
          tangencyWeights: tangencyWeights
        };
      }

      if (targetVolatility) {
        const riskyWeight = targetVolatility / tangencyVolatility;
        return {
          riskyWeight: Math.max(0, Math.min(1, riskyWeight)),
          riskFreeWeight: 1 - Math.max(0, Math.min(1, riskyWeight)),
          portfolioReturn: this.riskFreeRate + Math.max(0, Math.min(1, riskyWeight)) * (tangencyReturn - this.riskFreeRate),
          portfolioVolatility: targetVolatility,
          tangencyWeights: tangencyWeights
        };
      }

      return {
        riskyWeight: 1,
        riskFreeWeight: 0,
        portfolioReturn: tangencyReturn,
        portfolioVolatility: tangencyVolatility,
        tangencyWeights: tangencyWeights
      };
    } catch (error) {
      console.warn('Capital allocation calculation failed:', error);
      return null;
    }
  }

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

  private calculateSkewness(data: number[], mean: number, volatility: number): number {
    const skewness = data.reduce((sum: number, x: number) => sum + Math.pow(x - mean, 3), 0) / (data.length * Math.pow(volatility, 3));
    return skewness;
  }

  private calculateKurtosis(data: number[], mean: number, volatility: number): number {
    const kurtosis = data.reduce((sum: number, x: number) => sum + Math.pow(x - mean, 4), 0) / (data.length * Math.pow(volatility, 4)) - 3;
    return kurtosis;
  }

  private calculateCornishFisherAdjustment(zScore: number, skewness: number, kurtosis: number): number {
    return (zScore * zScore - 1) * skewness / 6 + (zScore * zScore * zScore - 3 * zScore) * kurtosis / 24 - (2 * zScore * zScore * zScore - 5 * zScore) * skewness * skewness / 36;
  }

  private getZScore(confidenceLevel: number): number {
    const alpha = 1 - confidenceLevel;
    return -Math.abs(this.inverseNormalCDF(alpha / 2));
  }

  private inverseNormalCDF(p: number): number {
    // Abramowitz and Stegun approximation
    const a1 = -3.969683028665376e+01;
    const a2 = 2.209460984245205e+02;
    const a3 = -2.759285104469687e+02;
    const a4 = 1.383577518672690e+02;
    const a5 = -3.066479806614716e+01;
    const a6 = 2.506628277459239e+00;

    const b1 = -5.447609879822406e+01;
    const b2 = 1.615858368580409e+02;
    const b3 = -1.556989798598866e+02;
    const b4 = 6.680131188771972e+01;
    const b5 = -1.328068155288572e+01;

    const c1 = -7.784894002430293e-03;
    const c2 = -3.223964580411365e-01;
    const c3 = -2.400758277161838e+00;
    const c4 = -2.549732539343734e+00;
    const c5 = 4.374664141464968e+00;
    const c6 = 2.938163982698783e+00;

    const d1 = 7.784695709041462e-03;
    const d2 = 3.224671290700398e-01;
    const d3 = 2.445134137142996e+00;
    const d4 = 3.754408661907416e+00;

    const p_low = 0.02425;
    const p_high = 1 - p_low;

    let q, r, x;

    if (p < p_low) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= p_high) {
      q = p - 0.5;
      r = q * q;
      x = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }

    return x;
  }
}

// ENHANCED VaR Calculator Class with Backtest and Stress Testing
export class VaRCalculator {
  // FIXED: Individual parametric VaR with Cornish-Fisher adjustment
  static calculateIndividualParametricVaR(
    assetReturns: number[],
    symbol: string,
    confidenceLevel: number = 0.95,
    positionValue: number = 1000000
  ): IndividualVaRResult {
    try {
      // Clean and validate data
      const cleanReturns = this.removeOutliers(assetReturns, 'modified_zscore', 3.5);
      
      if (cleanReturns.length < 30) {
        throw new Error(`Insufficient data for ${symbol} VaR calculation: ${cleanReturns.length} observations`);
      }

      const originalCount = assetReturns.length;
      const cleanedCount = cleanReturns.length;
      const outliersRemoved = originalCount - cleanedCount;

      // Calculate moments
      const mean = cleanReturns.reduce((s, r) => s + r, 0) / cleanReturns.length;
      const variance = cleanReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (cleanReturns.length - 1);
      const volatility = Math.sqrt(variance);
      
      const skewness = this.calculateSkewness(cleanReturns, mean, volatility);
      const kurtosis = this.calculateKurtosis(cleanReturns, mean, volatility);

      // Cornish-Fisher adjustment for non-normal distribution
      const zScore = this.getZScore(confidenceLevel);
      const cornishFisherAdjustment = this.calculateCornishFisherAdjustment(zScore, skewness, kurtosis);
      const adjustedZScore = zScore + cornishFisherAdjustment;
      
      // Calculate VaR
      const var95 = Math.abs(mean + adjustedZScore * volatility) * positionValue;
      
      // Expected Shortfall using adjusted distribution
      const expectedShortfall = this.calculateParametricExpectedShortfall(
        mean, volatility, confidenceLevel, adjustedZScore, positionValue
      );

      return {
        symbol,
        var: var95,
        expectedShortfall: expectedShortfall,
        return: mean,
        volatility: volatility,
        skewness: skewness,
        kurtosis: kurtosis,
        cornishFisherAdjustment: cornishFisherAdjustment,
        confidenceLevel: confidenceLevel,
        method: 'Parametric',
        dataQuality: {
          originalObservations: originalCount,
          cleanedObservations: cleanedCount,
          outliersRemoved: outliersRemoved
        }
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Individual parametric VaR calculation failed for ${symbol}: ${error.message}`);
      } else {
        throw new Error(`Individual parametric VaR calculation failed for ${symbol}: Unknown error`);
      }
    }
  }

  // FIXED: Individual historical VaR
  static calculateIndividualHistoricalVaR(
    assetReturns: number[],
    symbol: string,
    confidenceLevel: number = 0.95,
    positionValue: number = 1000000
  ): IndividualVaRResult {
    try {
      const cleanReturns = this.removeOutliers(assetReturns, 'modified_zscore', 3.5);
      
      if (cleanReturns.length < 30) {
        throw new Error(`Insufficient data for ${symbol} historical VaR: ${cleanReturns.length} observations`);
      }
      
      const sortedReturns = cleanReturns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var95 = Math.abs(sortedReturns[Math.max(0, index)]) * positionValue;
      
      // Expected Shortfall - average of tail losses
      const tailReturns = sortedReturns.slice(0, Math.max(1, index + 1));
      const expectedShortfall = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * positionValue :
        var95 * 1.3;

      const mean = cleanReturns.reduce((s, r) => s + r, 0) / cleanReturns.length;
      const variance = cleanReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (cleanReturns.length - 1);

      return {
        symbol,
        var: var95,
        expectedShortfall: expectedShortfall,
        return: mean,
        volatility: Math.sqrt(variance),
        confidenceLevel: confidenceLevel,
        method: 'Historical',
        dataQuality: {
          originalObservations: assetReturns.length,
          cleanedObservations: cleanReturns.length,
          outliersRemoved: assetReturns.length - cleanReturns.length
        }
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Individual historical VaR calculation failed for ${symbol}: ${error.message}`);
      } else {
        throw new Error(`Individual historical VaR calculation failed for ${symbol}: Unknown error`);
      }
    }
  }

  // ENHANCED: Portfolio VaR with component analysis
  static calculatePortfolioVaR(
    returnsMatrix: number[][],
    weights: number[],
    confidenceLevel: number = 0.95,
    portfolioValue: number = 1000000
  ): PortfolioVaRResult {
    try {
      // Clean and validate input data
      const cleanReturns = returnsMatrix.map(assetReturns => 
        this.removeOutliers(assetReturns, 'modified_zscore', 3.0)
      );

      const minLength = Math.min(...cleanReturns.map(r => r.length));
      if (minLength < 60) { // Require at least 60 days of data
        throw new Error('Insufficient data for portfolio VaR calculation');
      }

      // Calculate portfolio returns
      const portfolioReturns = this.calculatePortfolioReturns(cleanReturns, weights);
      
      // Calculate basic statistics
      const mean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
      const variance = portfolioReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (portfolioReturns.length - 1);
      const volatility = Math.sqrt(variance);

      // Calculate higher moments
      const skewness = this.calculateSkewness(portfolioReturns, mean, volatility);
      const kurtosis = this.calculateKurtosis(portfolioReturns, mean, volatility);

      // Apply Cornish-Fisher adjustment only if non-normality is significant
      const zScore = this.getZScore(confidenceLevel);
      let adjustedZScore = zScore;
      
      if (Math.abs(skewness) > 0.5 || Math.abs(kurtosis) > 1) {
        const cfAdjustment = this.calculateCornishFisherAdjustment(zScore, skewness, kurtosis);
        adjustedZScore = zScore + cfAdjustment;
      }

      const varValue = Math.abs(adjustedZScore * volatility * portfolioValue);
      
      // Calculate both parametric and historical ES
      const parametricES = this.calculateParametricExpectedShortfall(
        mean, volatility, confidenceLevel, adjustedZScore, portfolioValue
      );
      
      const historicalES = this.calculateHistoricalExpectedShortfall(
        portfolioReturns, confidenceLevel, portfolioValue
      );
      
      // Use the more conservative estimate
      const expectedShortfall = Math.max(parametricES, historicalES);

      // Calculate component and marginal VaR
      const componentVaR = this.calculateComponentVaR(cleanReturns, weights, confidenceLevel, portfolioValue);
      const marginalVaR = this.calculateMarginalVaR(cleanReturns, weights, confidenceLevel, portfolioValue);

      // Calculate diversification benefit as percentage reduction
      const individualVaRSum = Object.values(componentVaR).reduce((sum, var_) => sum + var_, 0);
      let diversificationBenefit = 0;
      
      if (individualVaRSum > 0) {
        // Calculate as percentage reduction: (sum of individual VaRs - portfolio VaR) / sum of individual VaRs
        diversificationBenefit = Math.max(0, (individualVaRSum - varValue) / individualVaRSum);
      }

      // Calculate correlation matrix for validation
      const correlationMatrix = this.calculateRobustCorrelationMatrix(cleanReturns);
      
      // Validate correlation matrix
      const avgCorrelation = this.calculateAverageCorrelation(correlationMatrix);
      if (avgCorrelation > 0.8) {
        console.warn('High average correlation detected, diversification benefit may be overstated');
      }

      return {
        var: varValue,
        expectedShortfall,
        confidenceLevel,
        method: 'Parametric (Cornish-Fisher)',
        portfolioReturn: mean,
        portfolioVolatility: volatility,
        componentVaR,
        marginalVaR,
        diversificationBenefit,
        correlationMatrix
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn('Portfolio VaR calculation failed:', error.message);
      } else {
        console.warn('Portfolio VaR calculation failed: Unknown error');
      }
      return {
        var: 0,
        expectedShortfall: 0,
        confidenceLevel,
        method: 'Parametric (Cornish-Fisher)',
        portfolioReturn: 0,
        portfolioVolatility: 0
      };
    }
  }

  // ENHANCED: Historical portfolio VaR
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
        throw new Error('Insufficient valid data for historical portfolio VaR');
      }
      
      const sortedReturns = cleanReturns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var95 = Math.abs(sortedReturns[Math.max(0, index)]) * portfolioValue;
      
      const tailReturns = sortedReturns.slice(0, Math.max(1, index + 1));
      const expectedShortfall = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * portfolioValue :
        var95 * 1.3;

      const mean = cleanReturns.reduce((s, r) => s + r, 0) / cleanReturns.length;
      const variance = cleanReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (cleanReturns.length - 1);

      // Component analysis for historical VaR
      const componentVaR = this.calculateComponentVaR(returnsMatrix, weights, confidenceLevel, portfolioValue);
      const marginalVaR = this.calculateMarginalVaR(returnsMatrix, weights, confidenceLevel, portfolioValue);
      
      const individualVaRSum = componentVaR ? 
        Object.values(componentVaR).reduce((sum: number, comp: number) => sum + comp, 0) : 
        var95;
      const diversificationBenefit = Math.max(0, (individualVaRSum - var95) / individualVaRSum);

      const correlationMatrix = this.calculateRobustCorrelationMatrix(returnsMatrix);

      return {
        var: var95,
        expectedShortfall: expectedShortfall,
        portfolioReturn: mean,
        portfolioVolatility: Math.sqrt(variance),
        componentVaR: componentVaR,
        marginalVaR: marginalVaR,
        diversificationBenefit: diversificationBenefit,
        correlationMatrix: correlationMatrix,
        confidenceLevel: confidenceLevel,
        method: 'Historical Portfolio'
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Historical portfolio VaR calculation failed: ${error.message}`);
      } else {
        throw new Error('Historical portfolio VaR calculation failed: Unknown error');
      }
    }
  }

  // NEW: Monte Carlo VaR
  static calculateMonteCarloVaR(
    returns: number[],
    confidenceLevel: number,
    portfolioValue: number,
    numSimulations: number = 10000
  ): VaRResult {
    try {
      if (!returns.length) {
        throw new Error('No returns provided');
      }
      if (returns.length < 2) {
        throw new Error('At least two returns are required for Monte Carlo VaR');
      }

      const mean = returns.reduce((sum: number, x: number) => sum + x, 0) / returns.length;
      const volatility = Math.sqrt(
        returns.reduce((sum: number, x: number) => sum + Math.pow(x - mean, 2), 0) /
          (returns.length - 1)
      );

      const simulations: number[] = [];
      for (let i = 0; i < numSimulations; i++) {
        const z = this.generateNormalRandom();
        const simulatedReturn = mean + volatility * z;
        simulations.push(simulatedReturn * portfolioValue);
      }

      simulations.sort((a: number, b: number) => a - b);
      const varIndex = Math.floor(numSimulations * (1 - confidenceLevel));
      const varValue = Math.abs(simulations[Math.max(0, varIndex)]);

      const tail = simulations.slice(0, Math.max(1, varIndex + 1));
      const expectedShortfall = Math.abs(
        tail.reduce((sum, r) => sum + r, 0) / tail.length
      );

      return {
        var: varValue,
        expectedShortfall,
        confidenceLevel,
        method: 'monte_carlo'
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Monte Carlo VaR calculation failed: ${error.message}`);
      } else {
        throw new Error('Monte Carlo VaR calculation failed: Unknown error');
      }
    }
  }

  private static generateNormalRandom(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // HELPER METHODS

  // Calculate portfolio returns from individual asset returns
  static calculatePortfolioReturns(returnsMatrix: number[][], weights: number[]): number[] {
    // Validate inputs
    if (!returnsMatrix.length || !weights.length || returnsMatrix.length !== weights.length) {
      throw new Error('Invalid input dimensions for portfolio returns calculation');
    }

    const n = returnsMatrix[0].length;
    const portfolioReturns: number[] = [];
    
    // Normalize weights to sum to 1
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map(w => w / totalWeight);
    
    for (let i = 0; i < n; i++) {
      let portfolioReturn = 0;
      let validAssets = 0;
      
      for (let j = 0; j < returnsMatrix.length; j++) {
        const return_ = returnsMatrix[j][i];
        if (!isNaN(return_) && isFinite(return_)) {
          portfolioReturn += return_ * normalizedWeights[j];
          validAssets++;
        }
      }
      
      // Only include returns where we have valid data for all assets
      if (validAssets === returnsMatrix.length) {
        portfolioReturns.push(portfolioReturn);
      }
    }
    
    if (portfolioReturns.length < 30) {
      throw new Error('Insufficient valid data points for portfolio returns calculation');
    }
    
    return portfolioReturns;
  }

  // Enhanced outlier removal
  private static removeOutliers(data: number[], method: 'zscore' | 'modified_zscore' | 'iqr' = 'modified_zscore', threshold: number = 3.5): number[] {
    if (!data || data.length < 10) return data;

    const cleanData = data.filter(x => !isNaN(x) && isFinite(x));
    if (cleanData.length < 10) return data;

    let filteredData: number[];
    switch (method) {
      case 'zscore':
        const mean = cleanData.reduce((sum, x) => sum + x, 0) / cleanData.length;
        const std = Math.sqrt(cleanData.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / cleanData.length);
        filteredData = cleanData.filter(x => Math.abs((x - mean) / std) <= threshold);
        break;

      case 'modified_zscore':
        const median = this.calculateMedian(cleanData);
        const mad = this.calculateMAD(cleanData, median);
        filteredData = cleanData.filter(x => Math.abs(0.6745 * (x - median) / mad) <= threshold);
        break;

      case 'iqr':
        const sorted = [...cleanData].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        filteredData = cleanData.filter(x => x >= q1 - threshold * iqr && x <= q3 + threshold * iqr);
        break;

      default:
        return cleanData;
    }

    // Ensure we don't remove too much data
    if (filteredData.length < cleanData.length * 0.5) {
      console.warn('Too many outliers removed, using original data');
      return cleanData;
    }

    return filteredData;
  }

  private static calculateMAD(data: number[], median: number): number {
    const deviations = data.map(x => Math.abs(x - median));
    return this.calculateMedian(deviations);
  }

  // Statistical calculation methods
  private static calculateSkewness(data: number[], mean: number, volatility: number): number {
    return data.reduce((sum: number, x: number) => sum + Math.pow(x - mean, 3), 0) / (data.length * Math.pow(volatility, 3));
  }

  private static calculateKurtosis(data: number[], mean: number, volatility: number): number {
    return data.reduce((sum: number, x: number) => sum + Math.pow(x - mean, 4), 0) / (data.length * Math.pow(volatility, 4)) - 3;
  }

  private static calculateCornishFisherAdjustment(zScore: number, skewness: number, kurtosis: number): number {
    return (zScore * zScore - 1) * skewness / 6 + (zScore * zScore * zScore - 3 * zScore) * kurtosis / 24 - (2 * zScore * zScore * zScore - 5 * zScore) * skewness * skewness / 36;
  }

  private static getZScore(confidenceLevel: number): number {
    const alpha = 1 - confidenceLevel;
    return -Math.abs(this.inverseNormalCDF(alpha / 2));
  }

  private static inverseNormalCDF(p: number): number {
    // Abramowitz and Stegun approximation
    const a1 = -3.969683028665376e+01;
    const a2 = 2.209460984245205e+02;
    const a3 = -2.759285104469687e+02;
    const a4 = 1.383577518672690e+02;
    const a5 = -3.066479806614716e+01;
    const a6 = 2.506628277459239e+00;

    const b1 = -5.447609879822406e+01;
    const b2 = 1.615858368580409e+02;
    const b3 = -1.556989798598866e+02;
    const b4 = 6.680131188771972e+01;
    const b5 = -1.328068155288572e+01;

    const c1 = -7.784894002430293e-03;
    const c2 = -3.223964580411365e-01;
    const c3 = -2.400758277161838e+00;
    const c4 = -2.549732539343734e+00;
    const c5 = 4.374664141464968e+00;
    const c6 = 2.938163982698783e+00;

    const d1 = 7.784695709041462e-03;
    const d2 = 3.224671290700398e-01;
    const d3 = 2.445134137142996e+00;
    const d4 = 3.754408661907416e+00;

    const p_low = 0.02425;
    const p_high = 1 - p_low;

    let q, r, x;

    if (p < p_low) {
      q = Math.sqrt(-2 * Math.log(p));
      x = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= p_high) {
      q = p - 0.5;
      r = q * q;
      x = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q / (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) / ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }

    return x;
  }

  private static calculateParametricExpectedShortfall(
    mean: number, 
    volatility: number, 
    confidenceLevel: number, 
    adjustedZScore: number, 
    portfolioValue: number
  ): number {
    try {
      const alpha = 1 - confidenceLevel;
      
      // For normal distribution, ES = μ + σ * φ(z) / (1 - α)
      // Where φ is the standard normal PDF
      const pdf = Math.exp(-0.5 * adjustedZScore * adjustedZScore) / Math.sqrt(2 * Math.PI);
      
      // Calculate ES for normal distribution
      const normalES = Math.abs(mean + volatility * pdf / alpha) * portfolioValue;
      
      // Adjust for non-normal distribution using Cornish-Fisher
      const skewness = this.calculateSkewness([mean], mean, volatility);
      const kurtosis = this.calculateKurtosis([mean], mean, volatility);
      
      if (Math.abs(skewness) > 0.5 || Math.abs(kurtosis) > 1) {
        // Adjust ES for non-normal distribution
        const cfAdjustment = this.calculateCornishFisherAdjustment(adjustedZScore, skewness, kurtosis);
        const adjustedES = normalES * (1 + cfAdjustment / adjustedZScore);
        return Math.max(normalES, adjustedES); // Take the more conservative estimate
      }
      
      return normalES;
    } catch (error) {
      console.warn('Expected shortfall calculation failed:', error);
      // Fallback to a conservative estimate: 1.25 * VaR
      return Math.abs(adjustedZScore * volatility * portfolioValue * 1.25);
    }
  }

  // Add historical expected shortfall calculation
  private static calculateHistoricalExpectedShortfall(
    returns: number[],
    confidenceLevel: number,
    portfolioValue: number
  ): number {
    try {
      const cleanReturns = returns.filter(r => !isNaN(r) && isFinite(r));
      if (cleanReturns.length < 30) {
        throw new Error('Insufficient data for historical ES calculation');
      }

      const sortedReturns = [...cleanReturns].sort((a, b) => a - b);
      const cutoffIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const tailReturns = sortedReturns.slice(0, cutoffIndex);
      
      if (tailReturns.length === 0) {
        return Math.abs(sortedReturns[0] * portfolioValue);
      }

      // Calculate average of tail returns
      const tailMean = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
      return Math.abs(tailMean * portfolioValue);
    } catch (error) {
      console.warn('Historical expected shortfall calculation failed:', error);
      return 0;
    }
  }

  private static calculateMedian(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  // Component VaR calculation
  private static calculateComponentVaR(
    returnsMatrix: number[][], 
    weights: number[], 
    confidenceLevel: number,
    portfolioValue: number
  ): { [key: string]: number } {
    try {
      const componentVaR: { [key: string]: number } = {};
      
      // Calculate individual VaRs first
      for (let i = 0; i < returnsMatrix.length; i++) {
        const assetReturns = returnsMatrix[i];
        const assetPositionValue = portfolioValue * weights[i];
        
        // Calculate individual asset statistics
        const mean = assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length;
        const variance = assetReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (assetReturns.length - 1);
        const volatility = Math.sqrt(variance);
        
        // Calculate individual VaR
        const zScore = this.getZScore(confidenceLevel);
        const skewness = this.calculateSkewness(assetReturns, mean, volatility);
        const kurtosis = this.calculateKurtosis(assetReturns, mean, volatility);
        const cornishFisherAdjustment = this.calculateCornishFisherAdjustment(zScore, skewness, kurtosis);
        const adjustedZScore = zScore + cornishFisherAdjustment;
        const individualVar = Math.abs(adjustedZScore * volatility * assetPositionValue);
        
        componentVaR[`Asset_${i}`] = individualVar;
      }
      
      return componentVaR;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn('Component VaR calculation failed:', error.message);
      } else {
        console.warn('Component VaR calculation failed: Unknown error');
      }
      return {};
    }
  }

  // Marginal VaR calculation
  private static calculateMarginalVaR(
    returnsMatrix: number[][],
    weights: number[],
    confidenceLevel: number,
    portfolioValue: number
  ): number[] {
    try {
      const cleanReturns = returnsMatrix.map((assetReturns: number[]) => 
        assetReturns.filter((r: number) => !isNaN(r) && isFinite(r))
      );

      const minLength = Math.min(...cleanReturns.map((r: number[]) => r.length));
      if (minLength < 2) {
        throw new Error('Insufficient data for Marginal VaR calculation');
      }

      const covarianceMatrix = this.calculateCovarianceMatrix(cleanReturns);
      const portfolioVariance = weights.reduce((sum: number, wi: number, i: number) => 
        sum + weights.reduce((innerSum: number, wj: number, j: number) => 
          innerSum + wi * wj * covarianceMatrix[i][j], 0
        ), 0
      );

      const portfolioVolatility = Math.sqrt(portfolioVariance);
      const zScore = this.getZScore(confidenceLevel);

      return weights.map((weight: number, i: number) => {
        const marginalContribution = weights.reduce((sum: number, wj: number, j: number) => 
          sum + wj * covarianceMatrix[i][j], 0
        );
        return Math.abs((marginalContribution / portfolioVolatility) * zScore * portfolioValue);
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.warn(`Marginal VaR calculation failed: ${error.message}`);
      } else {
        console.warn('Marginal VaR calculation failed: Unknown error');
      }
      return weights.map(() => 0);
    }
  }

  private static calculateCovarianceMatrix(returns: number[][]): number[][] {
    const n = returns.length;
    const covarianceMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
    
    // Calculate means
    const means = returns.map((assetReturns: number[]) => 
      assetReturns.reduce((sum: number, r: number) => sum + r, 0) / assetReturns.length
    );
    
    // Calculate standard deviations
    const stdDevs = returns.map((assetReturns: number[], i: number) => {
      const mean = means[i];
      return Math.sqrt(
        assetReturns.reduce((sum: number, r: number) => sum + Math.pow(r - mean, 2), 0) / assetReturns.length
      );
    });
    
    // Calculate covariances
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const validReturns = returns[i].filter((_, k) => 
          !isNaN(returns[i][k]) && !isNaN(returns[j][k]) && 
          isFinite(returns[i][k]) && isFinite(returns[j][k])
        );
        
        if (validReturns.length < 2) {
          covarianceMatrix[i][j] = covarianceMatrix[j][i] = 0;
          continue;
        }
        
        const meanI = means[i];
        const meanJ = means[j];
        const covariance = validReturns.reduce((sum: number, _, k: number) => 
          sum + (returns[i][k] - meanI) * (returns[j][k] - meanJ), 0
        ) / validReturns.length;
        
        covarianceMatrix[i][j] = covarianceMatrix[j][i] = covariance;
      }
    }
    
    return covarianceMatrix;
  }

  // ENHANCED: Robust correlation matrix calculation
  static calculateRobustCorrelationMatrix(returnsMatrix: number[][]): number[][] {
    const n = returnsMatrix.length;
    const correlationMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // Calculate means
    const means = returnsMatrix.map(returns => {
      const validReturns = returns.filter(r => !isNaN(r) && isFinite(r));
      return validReturns.reduce((s, r) => s + r, 0) / validReturns.length;
    });
    
    // Calculate standard deviations
    const stds = returnsMatrix.map((returns, i) => {
      const validReturns = returns.filter(r => !isNaN(r) && isFinite(r));
      const variance = validReturns.reduce((s, r) => s + Math.pow(r - means[i], 2), 0) / (validReturns.length - 1);
      return Math.sqrt(variance);
    });
    
    // Calculate correlations
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1;
        } else {
          const covariance = this.calculateCovariance(returnsMatrix[i], returnsMatrix[j], means[i], means[j]);
          const correlation = (stds[i] > 0 && stds[j] > 0) ? covariance / (stds[i] * stds[j]) : 0;
          correlationMatrix[i][j] = Math.max(-0.99, Math.min(0.99, correlation));
        }
      }
    }
    
    return correlationMatrix;
  }

  private static calculateCovariance(returns1: number[], returns2: number[], mean1: number, mean2: number): number {
    const minLength = Math.min(returns1.length, returns2.length);
    let covariance = 0;
    let validCount = 0;
    
    for (let i = 0; i < minLength; i++) {
      const r1 = returns1[i];
      const r2 = returns2[i];
      
      if (!isNaN(r1) && !isNaN(r2) && isFinite(r1) && isFinite(r2)) {
        covariance += (r1 - mean1) * (r2 - mean2);
        validCount++;
      }
    }
    
    return validCount > 1 ? covariance / (validCount - 1) : 0;
  }

  // Add helper method to calculate average correlation
  private static calculateAverageCorrelation(correlationMatrix: number[][]): number {
    const n = correlationMatrix.length;
    if (n <= 1) return 1;

    let sum = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        sum += Math.abs(correlationMatrix[i][j]);
        count++;
      }
    }

    return count > 0 ? sum / count : 1;
  }
}

// CAPM Analyzer
export class CAPMAnalyzer {
  private assetReturns: number[];
  private marketReturns: number[];
  private riskFreeRate: number;

  constructor(assetReturns: number[], marketReturns: number[], riskFreeRate: number = 0.02) {
    this.assetReturns = assetReturns;
    this.marketReturns = marketReturns;
    this.riskFreeRate = riskFreeRate / 252; // Convert to daily
  }

  calculateCAPMMetrics(symbol: string): any {
    const minLength = Math.min(this.assetReturns.length, this.marketReturns.length);
    const alignedAssetReturns = this.assetReturns.slice(-minLength);
    const alignedMarketReturns = this.marketReturns.slice(-minLength);

    // Calculate excess returns
    const assetExcessReturns = alignedAssetReturns.map(r => r - this.riskFreeRate);
    const marketExcessReturns = alignedMarketReturns.map(r => r - this.riskFreeRate);

    // Calculate beta using covariance and variance
    const covariance = this.calculateCovariance(assetExcessReturns, marketExcessReturns);
    const marketVariance = this.calculateVariance(marketExcessReturns);
    
    const beta = marketVariance > 0 ? covariance / marketVariance : 1.0;

    // Calculate alpha
    const assetMean = assetExcessReturns.reduce((s, r) => s + r, 0) / assetExcessReturns.length;
    const marketMean = marketExcessReturns.reduce((s, r) => s + r, 0) / marketExcessReturns.length;
    const alpha = (assetMean - beta * marketMean) * 252; // Annualize

    // Calculate CAPM expected return
    const capmExpectedReturn = this.riskFreeRate * 252 + beta * (marketMean * 252);

    return {
      beta: beta,
      alpha: alpha,
      capmExpectedReturn: capmExpectedReturn,
      symbol: symbol
    };
  }

  private calculateCovariance(x: number[], y: number[]): number {
    const meanX = x.reduce((s, v) => s + v, 0) / x.length;
    const meanY = y.reduce((s, v) => s + v, 0) / y.length;
    
    let covariance = 0;
    for (let i = 0; i < x.length; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }
    
    return covariance / (x.length - 1);
  }

  private calculateVariance(data: number[]): number {
    const mean = data.reduce((s, v) => s + v, 0) / data.length;
    const variance = data.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (data.length - 1);
    return variance;
  }
}

// Risk Attribution Calculator
export class RiskAttributionCalculator {
  static calculateRiskContribution(weights: number[], covarianceMatrix: number[][]): { [key: string]: number } {
    const n = weights.length;
    const riskContributions: { [key: string]: number } = {};

    // Calculate portfolio variance
    let portfolioVariance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        portfolioVariance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }

    if (portfolioVariance === 0) {
      // Equal risk contributions if no variance
      for (let i = 0; i < n; i++) {
        riskContributions[`Asset_${i}`] = 1 / n;
      }
      return riskContributions;
    }

    // Calculate risk contributions
    for (let i = 0; i < n; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution += weights[j] * covarianceMatrix[i][j];
      }
      riskContributions[`Asset_${i}`] = weights[i] * marginalContribution / portfolioVariance;
    }

    return riskContributions;
  }
}

// Correlation Calculator
export class CorrelationCalculator {
  static calculateCorrelationMatrix(returnsMatrix: number[][]): number[][] {
    return VaRCalculator.calculateRobustCorrelationMatrix(returnsMatrix);
  }
}

export default PortfolioOptimizer;
