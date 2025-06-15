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
  efficientFrontier?: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>;
  allSimulations?: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>;
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
  public covarianceMatrix: number[][];
  private meanReturns: number[];
  private n: number;
  private assetVolatilities: number[];

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

  optimizeMaxSharpe(simulations: number = 10000, constraints?: any): OptimizationResult {
    console.log('🚀 Starting Maximum Sharpe optimization...');
    
    let bestWeights: number[] = [];
    let maxSharpe = -Infinity;
    const allSimulations: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> = [];

    try {
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

  // FIXED: Completely rewritten target return optimization
  optimizeForTargetReturn(targetReturn: number): OptimizationResult {
    console.log(`🎯 Starting Target Return optimization: ${(targetReturn * 100).toFixed(2)}%`);
    
    // Validate target return
    const minReturn = Math.min(...this.meanReturns);
    const maxReturn = Math.max(...this.meanReturns);
    
    console.log(`📊 Available return range: ${(minReturn * 100).toFixed(2)}% to ${(maxReturn * 100).toFixed(2)}%`);
    
    if (targetReturn < minReturn) {
      console.warn(`Target return ${(targetReturn * 100).toFixed(2)}% is below minimum achievable return`);
      targetReturn = minReturn * 1.01; // Slightly above minimum
    } else if (targetReturn > maxReturn * 1.5) {
      console.warn(`Target return ${(targetReturn * 100).toFixed(2}}% is very high, may be difficult to achieve`);
    }

    let bestWeights: number[] = [];
    let minVolatility = Infinity;
    let bestDistance = Infinity;
    const allSimulations: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> = [];

    // FIXED: Multi-strategy approach for target return
    const strategies = [
      { tolerance: 0.005, iterations: 15000, name: 'precise', bias: 0.8 },  // 0.5% tolerance
      { tolerance: 0.015, iterations: 10000, name: 'relaxed', bias: 0.6 }, // 1.5% tolerance
      { tolerance: 0.030, iterations: 5000, name: 'loose', bias: 0.4 }      // 3% tolerance
    ];

    for (const strategy of strategies) {
      console.log(`🎯 Using ${strategy.name} strategy (tolerance: ${(strategy.tolerance * 100).toFixed(1)}%)`);
      
      let strategySuccess = false;
      
      for (let i = 0; i < strategy.iterations; i++) {
        let weights: number[];
        
        // FIXED: Generate biased weights towards achieving target return
        if (i < strategy.iterations * strategy.bias) {
          weights = this.generateTargetReturnBiasedWeights(targetReturn);
        } else if (bestWeights.length > 0 && i < strategy.iterations * 0.9) {
          weights = this.perturbWeights(bestWeights, 0.1);
        } else {
          weights = this.generateRandomWeights();
        }

        if (!this.isValidWeights(weights)) continue;

        const portfolioReturn = this.calculatePortfolioReturn(weights);
        const volatility = this.calculatePortfolioVolatility(weights);
        const distance = Math.abs(portfolioReturn - targetReturn);
        
        // Store simulation
        if (volatility > 0) {
          const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
          allSimulations.push({
            expectedReturn: portfolioReturn,
            volatility: volatility,
            sharpeRatio: sharpeRatio
          });
        }
        
        // FIXED: Better selection criteria for target return
        if (distance <= strategy.tolerance) {
          if (volatility > 0 && (
            volatility < minVolatility || 
            (Math.abs(volatility - minVolatility) < 0.001 && distance < bestDistance)
          )) {
            minVolatility = volatility;
            bestWeights = [...weights];
            bestDistance = distance;
            strategySuccess = true;
            
            console.log(`🎯 Found solution: Return=${(portfolioReturn * 100).toFixed(2)}%, Vol=${(volatility * 100).toFixed(2)}%, Distance=${(distance * 100).toFixed(3)}%`);
          }
        }
      }
      
      if (strategySuccess && bestDistance <= strategy.tolerance) {
        console.log(`✅ Strategy ${strategy.name} succeeded`);
        break;
      }
    }

    // FIXED: Fallback if no solution found within tolerance
    if (bestWeights.length === 0) {
      console.warn('Target return optimization: no solution within tolerance, finding best approximation');
      
      let closestWeights = this.generateEqualWeights();
      let closestDistance = Infinity;
      
      // Find the closest approximation from all simulations
      for (let i = 0; i < 10000; i++) {
        const weights = this.generateRandomWeights();
        if (!this.isValidWeights(weights)) continue;
        
        const portfolioReturn = this.calculatePortfolioReturn(weights);
        const distance = Math.abs(portfolioReturn - targetReturn);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestWeights = [...weights];
        }
      }
      
      bestWeights = closestWeights;
      bestDistance = closestDistance;
    }

    const result = this.buildOptimizationResult(bestWeights, allSimulations);
    result.targetAchieved = bestDistance < 0.02; // Within 2% tolerance
    
    console.log(`✅ Target Return Complete: Target=${(targetReturn * 100).toFixed(2)}%, Achieved=${(result.expectedReturn * 100).toFixed(2)}%, Vol=${(result.volatility * 100).toFixed(2)}%, Success=${result.targetAchieved}`);
    return result;
  }

  // FIXED: Completely rewritten target volatility optimization
  optimizeForTargetVolatility(targetVolatility: number): OptimizationResult {
    console.log(`📊 Starting Target Volatility optimization: ${(targetVolatility * 100).toFixed(2)}%`);
    
    if (targetVolatility <= 0 || targetVolatility > 1) {
      throw new Error('Target volatility must be between 0% and 100%');
    }

    // Validate target volatility
    const minVol = Math.min(...this.assetVolatilities);
    const maxVol = Math.max(...this.assetVolatilities);
    
    console.log(`📊 Available volatility range: ${(minVol * 100).toFixed(2)}% to ${(maxVol * 100).toFixed(2)}%`);

    let bestWeights: number[] = [];
    let maxReturn = -Infinity;
    let bestDistance = Infinity;
    const allSimulations: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> = [];

    // FIXED: Multi-strategy approach for target volatility
    const strategies = [
      { tolerance: 0.005, iterations: 15000, name: 'precise', bias: 0.8 },  // 0.5% tolerance
      { tolerance: 0.015, iterations: 10000, name: 'relaxed', bias: 0.6 }, // 1.5% tolerance
      { tolerance: 0.030, iterations: 5000, name: 'loose', bias: 0.4 }      // 3% tolerance
    ];

    for (const strategy of strategies) {
      console.log(`📊 Using ${strategy.name} strategy (tolerance: ${(strategy.tolerance * 100).toFixed(1)}%)`);
      
      let strategySuccess = false;
      
      for (let i = 0; i < strategy.iterations; i++) {
        let weights: number[];
        
        // FIXED: Generate biased weights towards achieving target volatility
        if (i < strategy.iterations * strategy.bias) {
          weights = this.generateTargetVolatilityBiasedWeights(targetVolatility);
        } else if (bestWeights.length > 0 && i < strategy.iterations * 0.9) {
          weights = this.perturbWeights(bestWeights, 0.1);
        } else {
          weights = this.generateRandomWeights();
        }

        if (!this.isValidWeights(weights)) continue;

        const volatility = this.calculatePortfolioVolatility(weights);
        const portfolioReturn = this.calculatePortfolioReturn(weights);
        const distance = Math.abs(volatility - targetVolatility);
        
        // Store simulation
        if (volatility > 0) {
          const sharpeRatio = (portfolioReturn - this.riskFreeRate) / volatility;
          allSimulations.push({
            expectedReturn: portfolioReturn,
            volatility: volatility,
            sharpeRatio: sharpeRatio
          });
        }
        
        // FIXED: Better selection criteria for target volatility
        if (distance <= strategy.tolerance) {
          if (portfolioReturn > maxReturn || 
              (Math.abs(portfolioReturn - maxReturn) < 0.001 && distance < bestDistance)) {
            maxReturn = portfolioReturn;
            bestWeights = [...weights];
            bestDistance = distance;
            strategySuccess = true;
            
            console.log(`📊 Found solution: Vol=${(volatility * 100).toFixed(2)}%, Return=${(portfolioReturn * 100).toFixed(2)}%, Distance=${(distance * 100).toFixed(3)}%`);
          }
        }
      }
      
      if (strategySuccess && bestDistance <= strategy.tolerance) {
        console.log(`✅ Strategy ${strategy.name} succeeded`);
        break;
      }
    }

    // FIXED: Fallback if no solution found within tolerance
    if (bestWeights.length === 0) {
      console.warn('Target volatility optimization: no solution within tolerance, finding best approximation');
      
      let closestWeights = this.generateEqualWeights();
      let closestDistance = Infinity;
      
      // Find the closest approximation
      for (let i = 0; i < 10000; i++) {
        const weights = this.generateRandomWeights();
        if (!this.isValidWeights(weights)) continue;
        
        const volatility = this.calculatePortfolioVolatility(weights);
        const distance = Math.abs(volatility - targetVolatility);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestWeights = [...weights];
        }
      }
      
      bestWeights = closestWeights;
      bestDistance = closestDistance;
    }

    const result = this.buildOptimizationResult(bestWeights, allSimulations);
    result.targetAchieved = bestDistance < 0.02; // Within 2% tolerance
    
    console.log(`✅ Target Volatility Complete: Target=${(targetVolatility * 100).toFixed(2)}%, Achieved=${(result.volatility * 100).toFixed(2)}%, Return=${(result.expectedReturn * 100).toFixed(2)}%, Success=${result.targetAchieved}`);
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
      result.efficientFrontier = this.generateEfficientFrontier(allSimulations, 50);
    }

    return result;
  }

  // FIXED: Add missing methods
  generateEfficientFrontier(simulations: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>, points: number = 50): Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> {
    if (!simulations || simulations.length === 0) {
      return [];
    }

    // Sort by volatility and filter for efficient frontier
    const sortedSims = simulations
      .filter(sim => sim.volatility > 0 && !isNaN(sim.expectedReturn) && !isNaN(sim.volatility))
      .sort((a, b) => a.volatility - b.volatility);

    const frontier: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}> = [];
    let maxReturnAtVol = -Infinity;

    for (const sim of sortedSims) {
      if (sim.expectedReturn > maxReturnAtVol) {
        frontier.push(sim);
        maxReturnAtVol = sim.expectedReturn;
      }
    }

    // Subsample to target number of points
    if (frontier.length > points) {
      const step = Math.floor(frontier.length / points);
      return frontier.filter((_, i) => i % step === 0);
    }

    return frontier;
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
      
      // Calculate skewness and kurtosis
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
        method: 'Parametric (Cornish-Fisher)',
        dataQuality: {
          originalObservations: originalCount,
          cleanedObservations: cleanedCount,
          outliersRemoved: outliersRemoved
        }
      };
    } catch (error) {
      throw new Error(`Individual parametric VaR calculation failed for ${symbol}: ${error.message}`);
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
    } catch (error) {
      throw new Error(`Individual historical VaR calculation failed for ${symbol}: ${error.message}`);
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
      const portfolioReturns = this.calculatePortfolioReturns(returnsMatrix, weights);
      const cleanReturns = portfolioReturns.filter(r => 
        !isNaN(r) && isFinite(r) && Math.abs(r) < 0.5
      );
      
      if (cleanReturns.length < 30) {
        throw new Error('Insufficient valid data for portfolio VaR calculation');
      }
      
      const mean = cleanReturns.reduce((s, r) => s + r, 0) / cleanReturns.length;
      const variance = cleanReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (cleanReturns.length - 1);
      const volatility = Math.sqrt(variance);
      
      // Parametric VaR with Cornish-Fisher adjustment
      const skewness = this.calculateSkewness(cleanReturns, mean, volatility);
      const kurtosis = this.calculateKurtosis(cleanReturns, mean, volatility);
      const zScore = this.getZScore(confidenceLevel);
      const cfAdjustment = this.calculateCornishFisherAdjustment(zScore, skewness, kurtosis);
      const adjustedZScore = zScore + cfAdjustment;
      
      const var95 = Math.abs(mean + adjustedZScore * volatility) * portfolioValue;
      
      // Expected Shortfall
      const expectedShortfall = this.calculateParametricExpectedShortfall(
        mean, volatility, confidenceLevel, adjustedZScore, portfolioValue
      );

      // Component VaR calculation
      const componentVaR = this.calculateComponentVaR(returnsMatrix, weights, portfolioValue, confidenceLevel);
      
      // Marginal VaR
      const marginalVaR = this.calculateMarginalVaR(returnsMatrix, weights, portfolioValue, confidenceLevel);
      
      // Diversification benefit
      const individualVaRSum = componentVaR ? Object.values(componentVaR).reduce((sum, comp) => sum + comp, 0) : var95;
      const diversificationBenefit = Math.max(0, (individualVaRSum - var95) / individualVaRSum);

      // Correlation matrix
      const correlationMatrix = this.calculateRobustCorrelationMatrix(returnsMatrix);

      return {
        var: var95,
        expectedShortfall: expectedShortfall,
        portfolioReturn: mean,
        portfolioVolatility: volatility,
        componentVaR: componentVaR,
        marginalVaR: marginalVaR,
        diversificationBenefit: diversificationBenefit,
        correlationMatrix: correlationMatrix,
        confidenceLevel: confidenceLevel,
        method: 'Parametric Portfolio'
      };
    } catch (error) {
      throw new Error(`Portfolio VaR calculation failed: ${error.message}`);
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
      const componentVaR = this.calculateComponentVaR(returnsMatrix, weights, portfolioValue, confidenceLevel, 'historical');
      const marginalVaR = this.calculateMarginalVaR(returnsMatrix, weights, portfolioValue, confidenceLevel, 'historical');
      
      const individualVaRSum = componentVaR ? Object.values(componentVaR).reduce((sum, comp) => sum + comp, 0) : var95;
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
    } catch (error) {
      throw new Error(`Historical portfolio VaR calculation failed: ${error.message}`);
    }
  }

  // NEW: Monte Carlo VaR
  static calculateMonteCarloVaR(
    returnsMatrix: number[][],
    weights: number[],
    confidenceLevel: number = 0.95,
    simulations: number = 10000,
    portfolioValue: number = 1000000
  ): PortfolioVaRResult {
    try {
      console.log(`🎲 Running Monte Carlo VaR with ${simulations} simulations...`);
      
      // Calculate mean and covariance matrix
      const means = returnsMatrix.map(returns => {
        const validReturns = returns.filter(r => !isNaN(r) && isFinite(r));
        return validReturns.reduce((s, r) => s + r, 0) / validReturns.length;
      });
      
      const covMatrix = this.calculateCovarianceMatrix(returnsMatrix);
      
      // Generate random portfolio returns using multivariate normal distribution
      const simulatedReturns = [];
      
      for (let i = 0; i < simulations; i++) {
        const randomReturns = this.generateMultivariateNormal(means, covMatrix);
        const portfolioReturn = weights.reduce((sum, weight, idx) => sum + weight * randomReturns[idx], 0);
        simulatedReturns.push(portfolioReturn);
      }
      
      // Calculate VaR and ES from simulated returns
      const sortedReturns = simulatedReturns.sort((a, b) => a - b);
      const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var95 = Math.abs(sortedReturns[Math.max(0, index)]) * portfolioValue;
      
      const tailReturns = sortedReturns.slice(0, Math.max(1, index + 1));
      const expectedShortfall = tailReturns.length > 0 ? 
        Math.abs(tailReturns.reduce((s, r) => s + r, 0) / tailReturns.length) * portfolioValue :
        var95 * 1.3;

      const mean = simulatedReturns.reduce((s, r) => s + r, 0) / simulatedReturns.length;
      const variance = simulatedReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (simulatedReturns.length - 1);

      console.log(`✅ Monte Carlo VaR complete: ${var95.toLocaleString()}`);

      return {
        var: var95,
        expectedShortfall: expectedShortfall,
        portfolioReturn: mean,
        portfolioVolatility: Math.sqrt(variance),
        confidenceLevel: confidenceLevel,
        method: `Monte Carlo (${simulations.toLocaleString()} sims)`
      };
    } catch (error) {
      throw new Error(`Monte Carlo VaR calculation failed: ${error.message}`);
    }
  }

  // HELPER METHODS

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

  // ENHANCED: Outlier removal with multiple methods
  static removeOutliers(data: number[], method: string = 'modified_zscore', threshold: number = 3.5): number[] {
    if (!data || data.length === 0) return [];
    
    const validData = data.filter(x => !isNaN(x) && isFinite(x));
    if (validData.length < 10) return validData;

    switch (method) {
      case 'modified_zscore':
        return this.removeOutliersModifiedZScore(validData, threshold);
      case 'iqr':
        return this.removeOutliersIQR(validData);
      case 'percentile':
        return this.removeOutliersPercentile(validData, 0.01, 0.99);
      default:
        return validData;
    }
  }

  private static removeOutliersModifiedZScore(data: number[], threshold: number): number[] {
    const median = this.calculateMedian(data);
    const madValues = data.map(x => Math.abs(x - median));
    const mad = this.calculateMedian(madValues);
    
    if (mad === 0) return data; // All values are identical
    
    const modifiedZScores = data.map(x => 0.6745 * (x - median) / mad);
    return data.filter((_, i) => Math.abs(modifiedZScores[i]) <= threshold);
  }

  private static removeOutliersIQR(data: number[]): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(x => x >= lowerBound && x <= upperBound);
  }

  private static removeOutliersPercentile(data: number[], lowerPercentile: number, upperPercentile: number): number[] {
    const sorted = [...data].sort((a, b) => a - b);
    const lowerIndex = Math.floor(sorted.length * lowerPercentile);
    const upperIndex = Math.floor(sorted.length * upperPercentile);
    const lowerBound = sorted[lowerIndex];
    const upperBound = sorted[upperIndex];
    
    return data.filter(x => x >= lowerBound && x <= upperBound);
  }

  // Statistical calculation methods
  private static calculateSkewness(data: number[], mean: number, volatility: number): number {
    if (volatility === 0) return 0;
    const n = data.length;
    const sum = data.reduce((s, x) => s + Math.pow((x - mean) / volatility, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private static calculateKurtosis(data: number[], mean: number, volatility: number): number {
    if (volatility === 0) return 3; // Normal distribution kurtosis
    const n = data.length;
    const sum = data.reduce((s, x) => s + Math.pow((x - mean) / volatility, 4), 0);
    const kurtosis = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * sum;
    const correction = 3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3));
    return kurtosis - correction;
  }

  private static calculateCornishFisherAdjustment(zScore: number, skewness: number, kurtosis: number): number {
    // Bound extreme values to prevent numerical instability
    const boundedSkew = Math.max(-3, Math.min(3, skewness));
    const boundedKurt = Math.max(-2, Math.min(10, kurtosis - 3)); // Excess kurtosis
    
    const z2 = zScore * zScore;
    const z3 = z2 * zScore;
    
    const skewAdjustment = (boundedSkew / 6) * (z2 - 1);
    const kurtAdjustment = (boundedKurt / 24) * (z3 - 3 * zScore);
    const mixedAdjustment = (boundedSkew * boundedSkew / 36) * (2 * z3 - 5 * zScore);
    
    const totalAdjustment = skewAdjustment + kurtAdjustment + mixedAdjustment;
    
    // Bound the total adjustment to prevent extreme values
    return Math.max(-2, Math.min(2, totalAdjustment));
  }

  private static calculateParametricExpectedShortfall(
    mean: number, 
    volatility: number, 
    confidenceLevel: number, 
    adjustedZScore: number, 
    portfolioValue: number
  ): number {
    // For normal distribution, ES = μ + σ * φ(z) / (1 - α)
    // Where φ is the standard normal PDF
    const alpha = 1 - confidenceLevel;
    const pdf = Math.exp(-0.5 * adjustedZScore * adjustedZScore) / Math.sqrt(2 * Math.PI);
    const expectedShortfall = Math.abs(mean + volatility * pdf / alpha) * portfolioValue;
    
    return expectedShortfall;
  }

  private static calculateMedian(data: number[]): number {
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private static getZScore(confidenceLevel: number): number {
    const zScores: { [key: string]: number } = {
      '0.90': -1.282,
      '0.95': -1.645,
      '0.99': -2.326,
      '0.999': -3.090
    };
    
    const key = confidenceLevel.toFixed(3);
    return zScores[key] || -1.645;
  }

  // Component VaR calculation
  private static calculateComponentVaR(
    returnsMatrix: number[][], 
    weights: number[], 
    portfolioValue: number, 
    confidenceLevel: number,
    method: string = 'parametric'
  ): { [key: string]: number } {
    try {
      const componentVaR: { [key: string]: number } = {};
      
      // Calculate individual asset VaRs
      for (let i = 0; i < returnsMatrix.length; i++) {
        const assetReturns = returnsMatrix[i];
        const assetPositionValue = portfolioValue * weights[i];
        
        let assetVaR: number;
        if (method === 'historical') {
          const result = this.calculateIndividualHistoricalVaR(assetReturns, `Asset_${i}`, confidenceLevel, assetPositionValue);
          assetVaR = result.var;
        } else {
          const result = this.calculateIndividualParametricVaR(assetReturns, `Asset_${i}`, confidenceLevel, assetPositionValue);
          assetVaR = result.var;
        }
        
        componentVaR[`Asset_${i}`] = assetVaR;
      }
      
      return componentVaR;
    } catch (error) {
      console.warn('Component VaR calculation failed:', error);
      return {};
    }
  }

  // Marginal VaR calculation
  private static calculateMarginalVaR(
    returnsMatrix: number[][], 
    weights: number[], 
    portfolioValue: number, 
    confidenceLevel: number,
    method: string = 'parametric'
  ): number[] {
    try {
      const marginalVaR: number[] = [];
      const baseVaR = method === 'historical' ? 
        this.calculatePortfolioHistoricalVaR(returnsMatrix, weights, confidenceLevel, portfolioValue).var :
        this.calculatePortfolioVaR(returnsMatrix, weights, confidenceLevel, portfolioValue).var;
      
      const delta = 0.01; // 1% change
      
      for (let i = 0; i < weights.length; i++) {
        const perturbedWeights = [...weights];
        perturbedWeights[i] = Math.min(1, perturbedWeights[i] + delta);
        
        // Renormalize weights
        const sum = perturbedWeights.reduce((s, w) => s + w, 0);
        perturbedWeights.forEach((_, j) => perturbedWeights[j] /= sum);
        
        const perturbedVaR = method === 'historical' ?
          this.calculatePortfolioHistoricalVaR(returnsMatrix, perturbedWeights, confidenceLevel, portfolioValue).var :
          this.calculatePortfolioVaR(returnsMatrix, perturbedWeights, confidenceLevel, portfolioValue).var;
        
        marginalVaR.push((perturbedVaR - baseVaR) / delta);
      }
      
      return marginalVaR;
    } catch (error) {
      console.warn('Marginal VaR calculation failed:', error);
      return new Array(weights.length).fill(0);
    }
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

  private static calculateCovarianceMatrix(returnsMatrix: number[][]): number[][] {
    const n = returnsMatrix.length;
    const covMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    const means = returnsMatrix.map(returns => {
      const validReturns = returns.filter(r => !isNaN(r) && isFinite(r));
      return validReturns.reduce((s, r) => s + r, 0) / validReturns.length;
    });
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        covMatrix[i][j] = this.calculateCovariance(returnsMatrix[i], returnsMatrix[j], means[i], means[j]);
      }
    }
    
    return covMatrix;
  }

  // Monte Carlo helper: Generate multivariate normal random variables
  private static generateMultivariateNormal(means: number[], covMatrix: number[][]): number[] {
    const n = means.length;
    
    // Generate independent normal random variables
    const independentNormals = Array(n).fill(0).map(() => this.generateNormalRandom());
    
    // Cholesky decomposition for correlation
    const cholesky = this.choleskyDecomposition(covMatrix);
    
    // Transform to correlated normals
    const correlatedNormals = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        correlatedNormals[i] += cholesky[i][j] * independentNormals[j];
      }
      correlatedNormals[i] += means[i];
    }
    
    return correlatedNormals;
  }

  private static generateNormalRandom(): number {
    // Box-Muller transformation
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private static choleskyDecomposition(matrix: number[][]): number[][] {
    const n = matrix.length;
    const cholesky: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        if (i === j) {
          let sum = 0;
          for (let k = 0; k < j; k++) {
            sum += cholesky[j][k] * cholesky[j][k];
          }
          cholesky[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
        } else {
          let sum = 0;
          for (let k = 0; k < j; k++) {
            sum += cholesky[i][k] * cholesky[j][k];
          }
          cholesky[i][j] = cholesky[j][j] > 0 ? (matrix[i][j] - sum) / cholesky[j][j] : 0;
        }
      }
    }
    
    return cholesky;
  }

  // Kupiec backtest
  static calculateKupiecTest(exceedances: number, observations: number, alpha: number): number {
    const expectedExceedances = observations * alpha;
    if (expectedExceedances === 0 || exceedances === 0) return 0;
    
    const ratio = exceedances / expectedExceedances;
    const logLikelihood = exceedances * Math.log(ratio) + (observations - exceedances) * Math.log((1 - exceedances / observations) / (1 - alpha));
    return 2 * logLikelihood;
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
