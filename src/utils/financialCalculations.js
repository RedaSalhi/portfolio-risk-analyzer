// src/utils/financialCalculations.js - FIXED VERSION
// Corrected mathematical implementations and VaR calculations

/**
 * Improved normal distribution inverse using Beasley-Springer-Moro algorithm
 */
function normalInverse(p) {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  // Beasley-Springer-Moro algorithm
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r, x;
  
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return x;
}

function boxMullerRandom() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * FIXED VaR Calculator with proper per-asset and portfolio calculations
 */
export class VaRCalculator {
  
  /**
   * FIXED: Individual Asset Parametric VaR
   */
  static calculateIndividualParametricVaR(assetReturns, ticker, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`🧮 Calculating Individual Parametric VaR for ${ticker}...`);
    
    if (!assetReturns || assetReturns.length < 30) {
      throw new Error(`Insufficient data for ${ticker}: Need at least 30 return observations`);
    }

    // Clean data
    const cleanReturns = this.removeOutliers(assetReturns, 3);
    
    // Calculate statistics
    const mean = this.calculateMean(cleanReturns);
    const variance = this.calculateVariance(cleanReturns, mean);
    const volatility = Math.sqrt(variance);
    const skewness = this.calculateSkewness(cleanReturns, mean, volatility);
    const kurtosis = this.calculateKurtosis(cleanReturns, mean, volatility);

    // Cornish-Fisher VaR adjustment
    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);
    
    const cfAdjustment = (1/6) * (zScore * zScore - 1) * skewness + 
                        (1/24) * (zScore * zScore * zScore - 3 * zScore) * (kurtosis - 3) - 
                        (1/36) * (2 * zScore * zScore * zScore - 5 * zScore) * skewness * skewness;
    
    const adjustedZScore = zScore + cfAdjustment;
    
    // Calculate VaR (negative of the loss)
    const varPercent = -(mean + adjustedZScore * volatility);
    const varValue = Math.abs(varPercent * positionSize);

    // Expected Shortfall (approximation)
    const phi_z = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI);
    const expectedShortfall = Math.abs((mean + (phi_z / alpha) * volatility) * positionSize);

    console.log(`✅ ${ticker} Parametric VaR: $${varValue.toFixed(0)}`);

    return {
      ticker: ticker,
      var: varValue,
      expectedShortfall: expectedShortfall,
      volatility: volatility,
      mean: mean,
      zScore: Math.abs(adjustedZScore),
      skewness: skewness,
      kurtosis: kurtosis,
      confidenceLevel: confidenceLevel,
      method: 'parametric_individual'
    };
  }

  /**
   * FIXED: Individual Asset Historical VaR
   */
  static calculateIndividualHistoricalVaR(assetReturns, ticker, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`📊 Calculating Individual Historical VaR for ${ticker}...`);
    
    if (!assetReturns || assetReturns.length < 50) {
      throw new Error(`Insufficient data for ${ticker}: Need at least 50 observations for Historical VaR`);
    }

    // Convert returns to P&L
    const pnlSeries = assetReturns.map(r => r * positionSize);
    
    // Sort from worst to best
    const sortedPnL = [...pnlSeries].sort((a, b) => a - b);
    
    // Find VaR at confidence level
    const varIndex = Math.floor((1 - confidenceLevel) * sortedPnL.length);
    const varValue = Math.abs(sortedPnL[varIndex]);
    
    // Expected Shortfall (average of tail losses)
    const tailLosses = sortedPnL.slice(0, varIndex + 1);
    const expectedShortfall = Math.abs(tailLosses.reduce((sum, loss) => sum + loss, 0) / tailLosses.length);

    // Statistics for backtesting
    const exceedances = pnlSeries.filter(pnl => pnl < -varValue).length;
    const exceedanceRate = (exceedances / pnlSeries.length) * 100;

    console.log(`✅ ${ticker} Historical VaR: $${varValue.toFixed(0)}`);

    return {
      ticker: ticker,
      var: varValue,
      expectedShortfall: expectedShortfall,
      observations: assetReturns.length,
      percentileValue: sortedPnL[varIndex],
      exceedances: exceedances,
      exceedanceRate: exceedanceRate,
      confidenceLevel: confidenceLevel,
      method: 'historical_individual'
    };
  }

  /**
   * FIXED: Portfolio VaR with proper correlation handling
   */
  static calculatePortfolioVaR(returnsMatrix, weights, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`📈 Calculating Portfolio VaR for ${returnsMatrix.length} assets...`);
    
    if (!returnsMatrix || returnsMatrix.length === 0) {
      throw new Error('Returns matrix is empty');
    }

    if (weights.length !== returnsMatrix.length) {
      throw new Error('Weights length must match number of assets');
    }

    // Validate weights sum to 1
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      console.warn('Weights do not sum to 1.0, normalizing...');
      weights = weights.map(w => w / weightSum);
    }

    // Clean data
    const cleanReturnsMatrix = returnsMatrix.map(returns => this.removeOutliers(returns, 3));
    
    // Calculate portfolio returns
    const portfolioReturns = [];
    const minLength = Math.min(...cleanReturnsMatrix.map(r => r.length));
    
    for (let i = 0; i < minLength; i++) {
      let portfolioReturn = 0;
      for (let j = 0; j < cleanReturnsMatrix.length; j++) {
        portfolioReturn += weights[j] * cleanReturnsMatrix[j][i];
      }
      portfolioReturns.push(portfolioReturn);
    }

    // Portfolio statistics
    const portfolioMean = this.calculateMean(portfolioReturns);
    const portfolioVariance = this.calculateVariance(portfolioReturns, portfolioMean);
    const portfolioVolatility = Math.sqrt(portfolioVariance);
    
    // Portfolio VaR using parametric method
    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);
    const varPercent = -(portfolioMean + zScore * portfolioVolatility);
    const varValue = Math.abs(varPercent * positionSize);

    // Expected Shortfall
    const phi_z = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI);
    const expectedShortfall = Math.abs((portfolioMean + (phi_z / alpha) * portfolioVolatility) * positionSize);

    // Calculate individual asset statistics for component analysis
    const assetMeans = cleanReturnsMatrix.map(returns => this.calculateMean(returns));
    const assetStds = cleanReturnsMatrix.map((returns, i) => 
      Math.sqrt(this.calculateVariance(returns, assetMeans[i]))
    );
    
    // Correlation matrix
    const correlationMatrix = this.calculateRobustCorrelationMatrix(cleanReturnsMatrix);
    
    // FIXED Component VaR calculation
    const componentVaR = this.calculateComponentVaR(weights, assetStds, correlationMatrix, portfolioVolatility, varValue);
    
    // Marginal VaR
    const marginalVaR = this.calculateMarginalVaR(weights, assetStds, correlationMatrix, portfolioVolatility);
    
    // Diversification benefit
    const individualVaRs = cleanReturnsMatrix.map((returns, index) => {
      const assetVar = this.calculateIndividualParametricVaR(returns, `Asset_${index}`, confidenceLevel, positionSize * weights[index]);
      return assetVar.var;
    });

    const sumIndividualVaRs = individualVaRs.reduce((sum, var_) => sum + var_, 0);
    const diversificationBenefit = sumIndividualVaRs > 0 ? Math.max(0, (sumIndividualVaRs - varValue) / sumIndividualVaRs) : 0;

    console.log(`✅ Portfolio VaR: $${varValue.toFixed(0)} (${(diversificationBenefit*100).toFixed(1)}% diversification)`);

    return {
      var: varValue,
      expectedShortfall: expectedShortfall,
      portfolioMean: portfolioMean,
      portfolioVolatility: portfolioVolatility,
      componentVaR: componentVaR,
      marginalVaR: marginalVaR,
      individualVaRs: individualVaRs,
      diversificationBenefit: diversificationBenefit,
      correlationMatrix: correlationMatrix,
      confidenceLevel: confidenceLevel,
      method: 'portfolio_parametric'
    };
  }

  /**
   * FIXED: Portfolio Historical VaR
   */
  static calculatePortfolioHistoricalVaR(returnsMatrix, weights, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`📊 Calculating Portfolio Historical VaR...`);
    
    if (!returnsMatrix || returnsMatrix.length === 0) {
      throw new Error('Returns matrix is empty');
    }

    // Calculate portfolio returns
    const portfolioReturns = [];
    const minLength = Math.min(...returnsMatrix.map(r => r.length));
    
    for (let i = 0; i < minLength; i++) {
      let portfolioReturn = 0;
      for (let j = 0; j < returnsMatrix.length; j++) {
        portfolioReturn += weights[j] * returnsMatrix[j][i];
      }
      portfolioReturns.push(portfolioReturn * positionSize);
    }

    // Sort returns from worst to best
    const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
    
    // Find VaR at given confidence level
    const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const varValue = Math.abs(sortedReturns[varIndex]);
    
    // Expected Shortfall
    const tailLosses = sortedReturns.slice(0, varIndex + 1);
    const expectedShortfall = Math.abs(tailLosses.reduce((sum, loss) => sum + loss, 0) / tailLosses.length);

    // Exceedance analysis
    const exceedances = portfolioReturns.filter(pnl => pnl < -varValue).length;
    const exceedanceRate = (exceedances / portfolioReturns.length) * 100;

    console.log(`✅ Portfolio Historical VaR: $${varValue.toFixed(0)}`);

    return {
      var: varValue,
      expectedShortfall: expectedShortfall,
      portfolioReturns: portfolioReturns,
      observations: minLength,
      percentileValue: sortedReturns[varIndex],
      exceedances: exceedances,
      exceedanceRate: exceedanceRate,
      confidenceLevel: confidenceLevel,
      method: 'portfolio_historical'
    };
  }

  /**
   * Enhanced Monte Carlo VaR with proper correlation modeling
   */
  static calculateMonteCarloVaR(returnsMatrix, weights, confidenceLevel = 0.95, 
                               numSimulations = 10000, positionSize = 100000) {
    
    console.log(`🎲 Running Monte Carlo VaR with ${numSimulations} simulations...`);
    
    const numAssets = weights.length;
    
    if (numAssets !== returnsMatrix.length) {
      throw new Error('Weights length must match number of assets');
    }

    // Clean data and calculate statistics
    const cleanReturnsMatrix = returnsMatrix.map(returns => this.removeOutliers(returns, 3));
    const means = cleanReturnsMatrix.map(returns => this.calculateMean(returns));
    const stds = cleanReturnsMatrix.map((returns, i) => 
      Math.sqrt(this.calculateVariance(returns, means[i]))
    );

    // Calculate correlation matrix
    const correlationMatrix = this.calculateRobustCorrelationMatrix(cleanReturnsMatrix);
    
    // Cholesky decomposition for correlated random number generation
    const choleskyMatrix = this.choleskyDecomposition(correlationMatrix);
    
    const portfolioReturns = [];
    
    // Run Monte Carlo simulations
    for (let sim = 0; sim < numSimulations; sim++) {
      // Generate independent standard normal random variables
      const independentRandom = Array(numAssets).fill(0).map(() => boxMullerRandom());
      
      // Apply Cholesky decomposition to get correlated random variables
      const correlatedRandom = this.matrixVectorMultiply(choleskyMatrix, independentRandom);
      
      // Generate asset returns
      const assetReturns = correlatedRandom.map((random, i) => 
        means[i] + random * stds[i]
      );
      
      // Calculate portfolio return
      const portfolioReturn = weights.reduce((sum, weight, i) => 
        sum + weight * assetReturns[i], 0
      );
      
      portfolioReturns.push(portfolioReturn * positionSize);
    }

    // Calculate VaR and Expected Shortfall
    portfolioReturns.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * numSimulations);
    const varValue = Math.abs(portfolioReturns[varIndex]);

    // Expected Shortfall (Conditional VaR)
    const tailLosses = portfolioReturns.slice(0, varIndex + 1);
    const expectedShortfall = Math.abs(tailLosses.reduce((sum, loss) => sum + loss, 0) / tailLosses.length);

    console.log(`✅ Monte Carlo VaR: $${varValue.toFixed(0)}`);

    return {
      var: varValue,
      expectedShortfall: expectedShortfall,
      numSimulations: numSimulations,
      confidenceLevel: confidenceLevel,
      correlationMatrix: correlationMatrix,
      portfolioMean: means.reduce((sum, mean, i) => sum + weights[i] * mean, 0),
      portfolioVolatility: Math.sqrt(this.calculatePortfolioVariance(weights, stds, correlationMatrix)),
      method: 'monte_carlo'
    };
  }

  // ===== FIXED COMPONENT CALCULATIONS =====

  /**
   * FIXED Component VaR calculation
   */
  static calculateComponentVaR(weights, stds, correlationMatrix, portfolioVol, portfolioVaR) {
    const n = weights.length;
    const componentVaR = {};
    
    for (let i = 0; i < n; i++) {
      // Calculate marginal contribution to portfolio variance
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution += weights[j] * stds[i] * stds[j] * correlationMatrix[i][j];
      }
      
      // Component VaR = Weight × (Marginal VaR)
      const marginalVaR = marginalContribution / portfolioVol;
      const component = weights[i] * marginalVaR * (portfolioVaR / portfolioVol);
      
      componentVaR[`Asset_${i}`] = Math.max(component, 0);
    }
    
    return componentVaR;
  }

  /**
   * FIXED Marginal VaR calculation
   */
  static calculateMarginalVaR(weights, stds, correlationMatrix, portfolioVol) {
    const n = weights.length;
    const marginalVaR = [];
    
    for (let i = 0; i < n; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution += weights[j] * stds[i] * stds[j] * correlationMatrix[i][j];
      }
      
      marginalVaR.push(marginalContribution / portfolioVol);
    }
    
    return marginalVaR;
  }

  // ===== UTILITY METHODS =====

  static removeOutliers(data, threshold = 3) {
    if (!data || data.length < 10) return data;
    
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const std = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1));
    
    return data.filter(val => Math.abs(val - mean) <= threshold * std);
  }

  static calculateMean(data) {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  static calculateVariance(data, mean = null) {
    if (!data || data.length < 2) return 0;
    if (mean === null) mean = this.calculateMean(data);
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
  }

  static calculateSkewness(data, mean = null, std = null) {
    if (!data || data.length < 3) return 0;
    if (mean === null) mean = this.calculateMean(data);
    if (std === null) std = Math.sqrt(this.calculateVariance(data, mean));
    if (std === 0) return 0;
    
    const n = data.length;
    const skew = data.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n;
    return skew * Math.sqrt(n * (n - 1)) / (n - 2);
  }

  static calculateKurtosis(data, mean = null, std = null) {
    if (!data || data.length < 4) return 3;
    if (mean === null) mean = this.calculateMean(data);
    if (std === null) std = Math.sqrt(this.calculateVariance(data, mean));
    if (std === 0) return 3;
    
    const n = data.length;
    const kurt = data.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / n;
    return ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * kurt - 3 * (n - 1)) + 3;
  }

  static calculateRobustCorrelationMatrix(returnsMatrix) {
    const n = returnsMatrix.length;
    const correlationMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1.0;
        } else {
          correlationMatrix[i][j] = this.robustCorrelation(returnsMatrix[i], returnsMatrix[j]);
        }
      }
    }
    
    return correlationMatrix;
  }

  static robustCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 10) return 0;
    
    const meanX = x.slice(0, n).reduce((a, b) => a + b) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b) / n;
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      sumSqX += deltaX * deltaX;
      sumSqY += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : Math.max(-0.99, Math.min(0.99, numerator / denominator));
  }

  static choleskyDecomposition(matrix) {
    const n = matrix.length;
    const L = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        if (i === j) {
          let sum = 0;
          for (let k = 0; k < j; k++) {
            sum += L[j][k] * L[j][k];
          }
          L[j][j] = Math.sqrt(Math.max(matrix[j][j] - sum, 1e-10));
        } else {
          let sum = 0;
          for (let k = 0; k < j; k++) {
            sum += L[i][k] * L[j][k];
          }
          L[i][j] = (matrix[i][j] - sum) / L[j][j];
        }
      }
    }
    
    return L;
  }

  static matrixVectorMultiply(matrix, vector) {
    return matrix.map(row => 
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  static calculatePortfolioVariance(weights, stds, correlationMatrix) {
    let variance = 0;
    const n = weights.length;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * stds[i] * stds[j] * correlationMatrix[i][j];
      }
    }
    
    return Math.max(variance, 0);
  }

  /**
   * FIXED Kupiec Test
   */
  static calculateKupiecTest(exceedances, totalObservations, expectedRate) {
    if (totalObservations === 0) return 0;
    
    const p = expectedRate;
    const n = totalObservations;
    const x = exceedances;
    
    if (x === 0) {
      return -2 * n * Math.log(1 - p);
    }
    
    if (x === n) {
      return -2 * n * Math.log(p);
    }
    
    const pHat = x / n;
    const lr = x * Math.log(pHat / p) + (n - x) * Math.log((1 - pHat) / (1 - p));
    
    return Math.max(0, -2 * lr);
  }
}

/**
 * Portfolio Optimizer - unchanged but included for completeness
 */
import * as math from 'mathjs';

export class PortfolioOptimizer {
  constructor(returnsMatrix, riskFreeRate = 0.02) {
    this.returnsMatrix = returnsMatrix; // Array of arrays: [[asset1_returns], [asset2_returns], ...]
    this.riskFreeRate = riskFreeRate;
    this.numAssets = returnsMatrix.length;
    this.numObservations = returnsMatrix[0].length;
    
    // Calculate annualized statistics
    this.meanReturns = this.calculateMeanReturns();
    this.covarianceMatrix = this.calculateCovarianceMatrix();
    
    console.log(`📊 Portfolio Optimizer initialized with ${this.numAssets} assets, ${this.numObservations} observations`);
  }

  calculateMeanReturns() {
    return this.returnsMatrix.map(assetReturns => {
      const mean = assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length;
      return mean * 252; // Annualized
    });
  }

  calculateCovarianceMatrix() {
    const n = this.numAssets;
    const covMatrix = math.zeros([n, n]);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const cov = this.calculateCovariance(this.returnsMatrix[i], this.returnsMatrix[j]);
        covMatrix.set([i, j], cov * 252); // Annualized
      }
    }
    
    return covMatrix;
  }

  calculateCovariance(x, y) {
    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }
    
    return covariance / (n - 1);
  }

  // MARKOWITZ MONTE CARLO OPTIMIZATION (like Python version)
  optimizeMaxSharpe(numSimulations = 10000) {
    console.log(`🎲 Running Markowitz optimization with ${numSimulations.toLocaleString()} Monte Carlo simulations`);
    
    let bestSharpe = -Infinity;
    let bestWeights = null;
    let bestMetrics = null;
    const allResults = [];

    for (let i = 0; i < numSimulations; i++) {
      // Generate random weights
      const weights = this.generateRandomWeights();
      const metrics = this.calculatePortfolioMetrics(weights);
      
      allResults.push({
        weights: [...weights],
        ...metrics
      });

      if (metrics.sharpeRatio > bestSharpe) {
        bestSharpe = metrics.sharpeRatio;
        bestWeights = [...weights];
        bestMetrics = metrics;
      }
    }

    console.log(`✅ Optimization complete. Best Sharpe ratio: ${bestSharpe.toFixed(4)}`);

    return {
      weights: bestWeights,
      ...bestMetrics,
      efficientFrontier: this.generateEfficientFrontier(allResults),
      allSimulations: allResults
    };
  }

  // TARGET RETURN OPTIMIZATION (like Python version)
  optimizeForTargetReturn(targetReturn) {
    console.log(`🎯 Optimizing for target return: ${(targetReturn * 100).toFixed(2)}%`);
    
    // Use quadratic programming approach for exact solution
    try {
      const weights = this.solveTargetReturnOptimization(targetReturn);
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights,
        ...metrics,
        targetAchieved: Math.abs(metrics.expectedReturn - targetReturn) < 0.001
      };
    } catch (error) {
      // Fallback to Monte Carlo if exact solution fails
      console.warn('⚠️ Exact optimization failed, using Monte Carlo fallback');
      return this.monteCarloTargetReturn(targetReturn);
    }
  }

  // TARGET VOLATILITY OPTIMIZATION (like Python version)
  optimizeForTargetVolatility(targetVolatility) {
    console.log(`🎯 Optimizing for target volatility: ${(targetVolatility * 100).toFixed(2)}%`);
    
    try {
      const weights = this.solveTargetVolatilityOptimization(targetVolatility);
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights,
        ...metrics,
        targetAchieved: Math.abs(metrics.volatility - targetVolatility) < 0.001
      };
    } catch (error) {
      console.warn('⚠️ Exact optimization failed, using Monte Carlo fallback');
      return this.monteCarloTargetVolatility(targetVolatility);
    }
  }

  // EFFICIENT FRONTIER GENERATION (like Python version)
  generateEfficientFrontier(allResults = null, numPoints = 100) {
    if (!allResults) {
      // Generate if not provided
      const tempResults = [];
      for (let i = 0; i < 5000; i++) {
        const weights = this.generateRandomWeights();
        const metrics = this.calculatePortfolioMetrics(weights);
        tempResults.push(metrics);
      }
      allResults = tempResults;
    }

    // Sort by volatility and filter for efficient portfolios
    const sortedResults = allResults.sort((a, b) => a.volatility - b.volatility);
    const efficientPortfolios = [];
    let maxReturnSoFar = -Infinity;

    for (const portfolio of sortedResults) {
      if (portfolio.expectedReturn > maxReturnSoFar) {
        efficientPortfolios.push(portfolio);
        maxReturnSoFar = portfolio.expectedReturn;
      }
    }

    // Interpolate to get exactly numPoints portfolios
    return this.interpolateEfficientFrontier(efficientPortfolios, numPoints);
  }

  interpolateEfficientFrontier(efficientPortfolios, numPoints) {
    if (efficientPortfolios.length < 2) return efficientPortfolios;

    const minVol = efficientPortfolios[0].volatility;
    const maxVol = efficientPortfolios[efficientPortfolios.length - 1].volatility;
    const volStep = (maxVol - minVol) / (numPoints - 1);

    const interpolatedFrontier = [];
    
    for (let i = 0; i < numPoints; i++) {
      const targetVol = minVol + i * volStep;
      
      // Find surrounding points
      let lowerIndex = 0;
      for (let j = 0; j < efficientPortfolios.length - 1; j++) {
        if (efficientPortfolios[j].volatility <= targetVol && 
            efficientPortfolios[j + 1].volatility > targetVol) {
          lowerIndex = j;
          break;
        }
      }
      
      const lower = efficientPortfolios[lowerIndex];
      const upper = efficientPortfolios[Math.min(lowerIndex + 1, efficientPortfolios.length - 1)];
      
      // Linear interpolation
      const weight = upper.volatility === lower.volatility ? 0 : 
                    (targetVol - lower.volatility) / (upper.volatility - lower.volatility);
      
      interpolatedFrontier.push({
        expectedReturn: lower.expectedReturn + weight * (upper.expectedReturn - lower.expectedReturn),
        volatility: targetVol,
        sharpeRatio: lower.sharpeRatio + weight * (upper.sharpeRatio - lower.sharpeRatio)
      });
    }

    return interpolatedFrontier;
  }

  calculatePortfolioMetrics(weights) {
    // Expected return
    const expectedReturn = weights.reduce((sum, weight, index) => 
      sum + weight * this.meanReturns[index], 0);

    // Portfolio variance
    let portfolioVariance = 0;
    for (let i = 0; i < this.numAssets; i++) {
      for (let j = 0; j < this.numAssets; j++) {
        portfolioVariance += weights[i] * weights[j] * this.covarianceMatrix.get([i, j]);
      }
    }

    const volatility = Math.sqrt(portfolioVariance);
    const sharpeRatio = (expectedReturn - this.riskFreeRate) / volatility;

    return {
      expectedReturn,
      volatility,
      sharpeRatio,
      excessReturn: expectedReturn - this.riskFreeRate
    };
  }

  generateRandomWeights() {
    const weights = Array.from({ length: this.numAssets }, () => Math.random());
    const sum = weights.reduce((acc, weight) => acc + weight, 0);
    return weights.map(weight => weight / sum);
  }

  // CAPITAL ALLOCATION WITH RISK-FREE ASSET (like Python version)
  calculateCapitalAllocation(targetReturn = null, targetVolatility = null) {
    // First find the tangency portfolio (max Sharpe ratio)
    const tangencyResult = this.optimizeMaxSharpe(5000);
    const tangencyReturn = tangencyResult.expectedReturn;
    const tangencyVolatility = tangencyResult.volatility;

    if (!targetReturn && !targetVolatility) {
      return {
        riskyWeight: 1.0,
        riskFreeWeight: 0.0,
        portfolioReturn: tangencyReturn,
        portfolioVolatility: tangencyVolatility,
        tangencyWeights: tangencyResult.weights
      };
    }

    let riskyWeight;
    if (targetReturn !== null) {
      // w = (R_target - R_f) / (R_p - R_f)
      riskyWeight = (targetReturn - this.riskFreeRate) / (tangencyReturn - this.riskFreeRate);
    } else if (targetVolatility !== null) {
      // w = σ_target / σ_p
      riskyWeight = targetVolatility / tangencyVolatility;
    }

    riskyWeight = Math.max(0, Math.min(riskyWeight, 5)); // Allow up to 5x leverage
    const riskFreeWeight = 1 - riskyWeight;

    const portfolioReturn = this.riskFreeRate + riskyWeight * (tangencyReturn - this.riskFreeRate);
    const portfolioVolatility = riskyWeight * tangencyVolatility;

    return {
      riskyWeight,
      riskFreeWeight,
      portfolioReturn,
      portfolioVolatility,
      tangencyWeights: tangencyResult.weights,
      leverage: riskyWeight > 1
    };
  }

  // Monte Carlo fallbacks
  monteCarloTargetReturn(targetReturn, tolerance = 0.005) {
    let bestWeights = null;
    let bestVolatility = Infinity;

    for (let i = 0; i < 50000; i++) {
      const weights = this.generateRandomWeights();
      const metrics = this.calculatePortfolioMetrics(weights);

      if (Math.abs(metrics.expectedReturn - targetReturn) <= tolerance) {
        if (metrics.volatility < bestVolatility) {
          bestVolatility = metrics.volatility;
          bestWeights = weights;
        }
      }
    }

    if (bestWeights) {
      return {
        weights: bestWeights,
        ...this.calculatePortfolioMetrics(bestWeights),
        targetAchieved: true
      };
    }

    throw new Error(`Could not find portfolio with target return ${targetReturn}`);
  }

  monteCarloTargetVolatility(targetVolatility, tolerance = 0.005) {
    let bestWeights = null;
    let bestReturn = -Infinity;

    for (let i = 0; i < 50000; i++) {
      const weights = this.generateRandomWeights();
      const metrics = this.calculatePortfolioMetrics(weights);

      if (Math.abs(metrics.volatility - targetVolatility) <= tolerance) {
        if (metrics.expectedReturn > bestReturn) {
          bestReturn = metrics.expectedReturn;
          bestWeights = weights;
        }
      }
    }

    if (bestWeights) {
      return {
        weights: bestWeights,
        ...this.calculatePortfolioMetrics(bestWeights),
        targetAchieved: true
      };
    }

    throw new Error(`Could not find portfolio with target volatility ${targetVolatility}`);
  }

  // VALIDATION METHODS
  validateOptimizationResult(weights) {
    const tolerance = 1e-6;
    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    const hasNaN = weights.some(w => isNaN(w) || !isFinite(w));
    const hasNegative = weights.some(w => w < -tolerance);

    return {
      isValid: !hasNaN && Math.abs(weightSum - 1.0) < tolerance && !hasNegative,
      weightSum,
      hasNaN,
      hasNegative,
      issues: [
        ...(hasNaN ? ['Contains NaN or infinite values'] : []),
        ...(Math.abs(weightSum - 1.0) >= tolerance ? [`Weights sum to ${weightSum.toFixed(6)}, not 1.0`] : []),
        ...(hasNegative ? ['Contains negative weights (short selling not allowed)'] : [])
      ]
    };
  }
}

// CAPM ANALYSIS CLASS (like Python statsmodels)
export class CAPMAnalyzer {
  constructor(assetReturns, marketReturns, riskFreeRate = 0.02) {
    this.assetReturns = assetReturns;
    this.marketReturns = marketReturns;
    this.riskFreeRate = riskFreeRate;
  }

  calculateCAPMMetrics(assetSymbol) {
    console.log(`📈 Calculating CAPM metrics for ${assetSymbol}`);
    
    const assetExcessReturns = this.assetReturns.map(r => r - this.riskFreeRate / 252);
    const marketExcessReturns = this.marketReturns.map(r => r - this.riskFreeRate / 252);

    // Linear regression: R_i - R_f = alpha + beta * (R_m - R_f) + epsilon
    const regression = this.performLinearRegression(assetExcessReturns, marketExcessReturns);
    
    const alpha = regression.alpha * 252; // Annualized
    const beta = regression.beta;
    const rSquared = regression.rSquared;

    // CAPM expected return: R_f + beta * (E(R_m) - R_f)
    const marketPremium = (this.marketReturns.reduce((sum, r) => sum + r, 0) / this.marketReturns.length) * 252 - this.riskFreeRate;
    const capmExpectedReturn = this.riskFreeRate + beta * marketPremium;

    return {
      alpha,
      beta,
      capmExpectedReturn,
      rSquared,
      marketPremium,
      tracking_error: this.calculateTrackingError(assetExcessReturns, marketExcessReturns, beta),
      information_ratio: alpha / this.calculateTrackingError(assetExcessReturns, marketExcessReturns, beta)
    };
  }

  performLinearRegression(y, x) {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const beta = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const alpha = (sumY - beta * sumX) / n;

    // R-squared calculation
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, val, i) => {
      const predicted = alpha + beta * x[i];
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    const ssTot = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = 1 - (ssRes / ssTot);

    return { alpha, beta, rSquared };
  }

  calculateTrackingError(assetExcessReturns, marketExcessReturns, beta) {
    const trackingDifferences = assetExcessReturns.map((assetReturn, i) => 
      assetReturn - beta * marketExcessReturns[i]
    );
    
    const variance = trackingDifferences.reduce((sum, diff) => {
      const mean = trackingDifferences.reduce((s, d) => s + d, 0) / trackingDifferences.length;
      return sum + Math.pow(diff - mean, 2);
    }, 0) / (trackingDifferences.length - 1);

    return Math.sqrt(variance * 252); // Annualized
  }
}

// RISK ATTRIBUTION CALCULATOR
export class RiskAttributionCalculator {
  static calculateRiskContribution(weights, covarianceMatrix) {
    const portfolioVariance = RiskAttributionCalculator.calculatePortfolioVariance(weights, covarianceMatrix);
    const riskContributions = {};
    
    weights.forEach((weight, i) => {
      let marginalContribution = 0;
      weights.forEach((otherWeight, j) => {
        marginalContribution += otherWeight * covarianceMatrix.get([i, j]);
      });
      
      const riskContribution = weight * marginalContribution / portfolioVariance;
      riskContributions[`Asset_${i}`] = riskContribution;
    });

    return riskContributions;
  }

  static calculatePortfolioVariance(weights, covarianceMatrix) {
    let variance = 0;
    for (let i = 0; i < weights.length; i++) {
      for (let j = 0; j < weights.length; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix.get([i, j]);
      }
    }
    return variance;
  }
}

// CORRELATION MATRIX CALCULATOR
export class CorrelationCalculator {
  static calculateCorrelationMatrix(returnsMatrix) {
    const n = returnsMatrix.length;
    const correlationMatrix = math.zeros([n, n]);
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const correlation = CorrelationCalculator.calculateCorrelation(
          returnsMatrix[i], 
          returnsMatrix[j]
        );
        correlationMatrix.set([i, j], correlation);
      }
    }
    
    return correlationMatrix;
  }

  static calculateCorrelation(x, y) {
    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumX2 += dx * dx;
      sumY2 += dy * dy;
    }
    
    const denominator = Math.sqrt(sumX2 * sumY2);
    return denominator === 0 ? 0 : numerator / denominator;
  }
}

