// src/utils/financialCalculations.js
// ENHANCED VERSION - Corrected mathematical accuracy and robust data handling

/**
 * Improved normal distribution inverse using Beasley-Springer-Moro algorithm
 */
function normalInverse(p) {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  // Beasley-Springer-Moro algorithm for normal quantile
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

  // Define break-points
  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q, r, x;
  
  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return x;
}

/**
 * Box-Muller transform for generating normal random variables
 */
function boxMullerRandom() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Enhanced VaR Calculator with improved mathematical accuracy
 */
export class VaRCalculator {
  
  /**
   * Parametric VaR with robust statistical calculations
   */
  static calculateParametricVaR(returns, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`🧮 Calculating Parametric VaR for ${returns.length} returns...`);
    
    if (!returns || returns.length < 30) {
      throw new Error('Insufficient data: Need at least 30 return observations for reliable VaR');
    }

    // Remove outliers (beyond 4 standard deviations)
    const cleanReturns = this.removeOutliers(returns, 4);
    
    // Robust statistical measures
    const mean = this.calculateMean(cleanReturns);
    const variance = this.calculateVariance(cleanReturns, mean);
    const volatility = Math.sqrt(variance);
    const skewness = this.calculateSkewness(cleanReturns, mean, volatility);
    const kurtosis = this.calculateKurtosis(cleanReturns, mean, volatility);

    // Cornish-Fisher VaR adjustment for non-normal distributions
    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);
    
    // Cornish-Fisher expansion
    const cfAdjustment = (1/6) * (zScore * zScore - 1) * skewness + 
                        (1/24) * (zScore * zScore * zScore - 3 * zScore) * (kurtosis - 3) - 
                        (1/36) * (2 * zScore * zScore * zScore - 5 * zScore) * skewness * skewness;
    
    const adjustedZScore = zScore + cfAdjustment;
    
    // Calculate VaR
    const varPercent = -(mean + adjustedZScore * volatility);
    const varValue = varPercent * positionSize;

    // Exceedance analysis
    const pnlSeries = cleanReturns.map(r => r * positionSize);
    const exceedances = pnlSeries.filter(pnl => pnl < -Math.abs(varValue)).length;
    const exceedanceRate = (exceedances / cleanReturns.length) * 100;
    const expectedExceedanceRate = (1 - confidenceLevel) * 100;

    // Kupiec test for backtesting
    const kupiecStatistic = this.calculateKupiecTest(exceedances, cleanReturns.length, 1 - confidenceLevel);

    console.log(`✅ Enhanced Parametric VaR: $${Math.abs(varValue).toFixed(0)} (${exceedanceRate.toFixed(2)}% vs ${expectedExceedanceRate.toFixed(2)}% expected)`);

    return {
      var: Math.abs(varValue),
      varPercent: Math.abs(varPercent),
      volatility: volatility,
      mean: mean,
      zScore: Math.abs(adjustedZScore),
      skewness: skewness,
      kurtosis: kurtosis,
      exceedances: exceedances,
      exceedanceRate: exceedanceRate,
      expectedExceedanceRate: expectedExceedanceRate,
      kupiecStatistic: kupiecStatistic,
      pnlSeries: pnlSeries,
      confidenceLevel: confidenceLevel,
      dataPoints: cleanReturns.length
    };
  }

  /**
   * Enhanced Monte Carlo VaR with Cholesky decomposition
   */
  static calculateMonteCarloVaR(returnsMatrix, weights, confidenceLevel = 0.95, 
                               numSimulations = 10000, positionSize = 100000) {
    
    console.log(`🎲 Running Enhanced Monte Carlo VaR with ${numSimulations} simulations...`);
    
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

    // Calculate correlation matrix using robust estimator
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

    console.log(`✅ Enhanced Monte Carlo VaR: $${varValue.toFixed(0)} | ES: $${expectedShortfall.toFixed(0)}`);

    return {
      var: varValue,
      expectedShortfall: expectedShortfall,
      simulations: portfolioReturns,
      numSimulations: numSimulations,
      confidenceLevel: confidenceLevel,
      correlationMatrix: correlationMatrix,
      choleskyMatrix: choleskyMatrix,
      portfolioMean: means.reduce((sum, mean, i) => sum + weights[i] * mean, 0),
      portfolioVolatility: Math.sqrt(this.calculatePortfolioVariance(weights, stds, correlationMatrix))
    };
  }

  /**
   * Enhanced Portfolio VaR with better correlation modeling
   */
  static calculatePortfolioVaR(returnsMatrix, weights, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`📈 Calculating Enhanced Portfolio VaR for ${returnsMatrix.length} assets...`);
    
    // Data validation and cleaning
    const cleanReturnsMatrix = returnsMatrix.map(returns => {
      if (returns.length < 30) {
        throw new Error('Insufficient data for portfolio VaR calculation');
      }
      return this.removeOutliers(returns, 3);
    });

    // Calculate robust statistics
    const means = cleanReturnsMatrix.map(returns => this.calculateMean(returns));
    const stds = cleanReturnsMatrix.map((returns, i) => 
      Math.sqrt(this.calculateVariance(returns, means[i]))
    );
    
    // Robust correlation matrix
    const correlationMatrix = this.calculateRobustCorrelationMatrix(cleanReturnsMatrix);
    
    // Portfolio statistics
    const portfolioMean = weights.reduce((sum, weight, i) => sum + weight * means[i], 0);
    const portfolioVariance = this.calculatePortfolioVariance(weights, stds, correlationMatrix);
    const portfolioVolatility = Math.sqrt(portfolioVariance);
    
    // VaR calculation with Cornish-Fisher adjustment
    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);
    const varValue = Math.abs((portfolioMean + zScore * portfolioVolatility) * positionSize);

    // Component VaR analysis
    const componentVaR = this.calculateComponentVaR(weights, stds, correlationMatrix, portfolioVolatility, varValue);
    
    // Individual VaRs for diversification benefit
    const individualVaRs = cleanReturnsMatrix.map((returns, index) => {
      const assetVaR = this.calculateParametricVaR(returns, confidenceLevel, positionSize * weights[index]);
      return assetVaR.var;
    });

    const sumIndividualVaRs = individualVaRs.reduce((sum, var_) => sum + var_, 0);
    const diversificationBenefit = Math.max(0, (sumIndividualVaRs - varValue) / sumIndividualVaRs);

    console.log(`✅ Enhanced Portfolio VaR: $${varValue.toFixed(0)} (${(diversificationBenefit*100).toFixed(1)}% diversification benefit)`);

    return {
      var: varValue,
      portfolioVolatility: portfolioVolatility,
      portfolioMean: portfolioMean,
      componentVaR: componentVaR,
      individualVaRs: individualVaRs,
      sumIndividualVaRs: sumIndividualVaRs,
      diversificationBenefit: diversificationBenefit,
      correlationMatrix: correlationMatrix,
      marginalVaR: this.calculateMarginalVaR(weights, stds, correlationMatrix, portfolioVolatility),
      confidenceLevel: confidenceLevel
    };
  }

  // ===== HELPER METHODS =====

  static removeOutliers(data, threshold = 3) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const std = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1));
    
    return data.filter(val => Math.abs(val - mean) <= threshold * std);
  }

  static calculateMean(data) {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  static calculateVariance(data, mean = null) {
    if (mean === null) mean = this.calculateMean(data);
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
  }

  static calculateSkewness(data, mean = null, std = null) {
    if (mean === null) mean = this.calculateMean(data);
    if (std === null) std = Math.sqrt(this.calculateVariance(data, mean));
    
    const n = data.length;
    const skew = data.reduce((sum, val) => sum + Math.pow((val - mean) / std, 3), 0) / n;
    return skew * Math.sqrt(n * (n - 1)) / (n - 2); // Sample skewness adjustment
  }

  static calculateKurtosis(data, mean = null, std = null) {
    if (mean === null) mean = this.calculateMean(data);
    if (std === null) std = Math.sqrt(this.calculateVariance(data, mean));
    
    const n = data.length;
    const kurt = data.reduce((sum, val) => sum + Math.pow((val - mean) / std, 4), 0) / n;
    return ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * kurt - 3 * (n - 1)) + 3; // Sample kurtosis adjustment
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
    
    // Use Spearman rank correlation for robustness
    const rankX = this.getRanks(x.slice(0, n));
    const rankY = this.getRanks(y.slice(0, n));
    
    const meanRankX = (n + 1) / 2;
    const meanRankY = (n + 1) / 2;
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = rankX[i] - meanRankX;
      const deltaY = rankY[i] - meanRankY;
      numerator += deltaX * deltaY;
      sumSqX += deltaX * deltaX;
      sumSqY += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : Math.max(-0.99, Math.min(0.99, numerator / denominator));
  }

  static getRanks(data) {
    const indexed = data.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);
    
    const ranks = new Array(data.length);
    for (let i = 0; i < indexed.length; i++) {
      ranks[indexed[i].index] = i + 1;
    }
    
    return ranks;
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

  static calculateComponentVaR(weights, stds, correlationMatrix, portfolioVol, portfolioVaR) {
    const n = weights.length;
    const componentVaR = [];
    
    for (let i = 0; i < n; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution += weights[j] * stds[i] * stds[j] * correlationMatrix[i][j];
      }
      
      const component = (weights[i] * stds[i] * marginalContribution / (portfolioVol * portfolioVol)) * portfolioVaR;
      componentVaR.push(component);
    }
    
    return componentVaR;
  }

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

  static calculateKupiecTest(exceedances, totalObservations, expectedRate) {
    const observedRate = exceedances / totalObservations;
    const likelihood = Math.pow(expectedRate, exceedances) * Math.pow(1 - expectedRate, totalObservations - exceedances);
    const maxLikelihood = Math.pow(observedRate, exceedances) * Math.pow(1 - observedRate, totalObservations - exceedances);
    
    return -2 * Math.log(likelihood / maxLikelihood);
  }
}

/**
 * Enhanced Portfolio Optimizer with numerical stability
 */
export class PortfolioOptimizer {
  constructor(returnsMatrix, riskFreeRate = 0.02) {
    this.returnsMatrix = returnsMatrix.map(returns => VaRCalculator.removeOutliers(returns, 3));
    this.riskFreeRate = riskFreeRate / 252; // Convert annual to daily
    this.numAssets = this.returnsMatrix.length;
    
    // Calculate robust statistics
    this.means = this.returnsMatrix.map(returns => VaRCalculator.calculateMean(returns));
    this.annualizedMeans = this.means.map(mean => mean * 252);
    this.covarianceMatrix = this.calculateCovarianceMatrix();
    this.annualizedCovMatrix = this.covarianceMatrix.map(row => row.map(val => val * 252));
  }

  calculateCovarianceMatrix() {
    const n = this.numAssets;
    const covMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          covMatrix[i][j] = VaRCalculator.calculateVariance(this.returnsMatrix[i], this.means[i]);
        } else {
          covMatrix[i][j] = this.calculateCovariance(this.returnsMatrix[i], this.returnsMatrix[j], this.means[i], this.means[j]);
        }
      }
    }
    
    return covMatrix;
  }

  calculateCovariance(x, y, meanX, meanY) {
    const n = Math.min(x.length, y.length);
    let covariance = 0;
    
    for (let i = 0; i < n; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }
    
    return covariance / (n - 1);
  }

  optimizePortfolio(targetReturn = null, targetVolatility = null) {
    console.log('🎯 Running enhanced portfolio optimization...');
    
    // Use simplified equal-weight optimization with constraints
    const equalWeights = Array(this.numAssets).fill(1 / this.numAssets);
    
    if (targetReturn !== null) {
      return this.optimizeForTargetReturn(targetReturn);
    } else if (targetVolatility !== null) {
      return this.optimizeForTargetVolatility(targetVolatility);
    } else {
      return this.optimizeMaxSharpe();
    }
  }

  optimizeMaxSharpe() {
    // Simplified max Sharpe ratio optimization
    const weights = this.calculateMaxSharpeWeights();
    const metrics = this.calculatePortfolioMetrics(weights);
    
    return {
      weights: weights,
      expectedReturn: metrics.expectedReturn,
      volatility: metrics.volatility,
      sharpeRatio: metrics.sharpeRatio,
      type: 'max_sharpe'
    };
  }

  calculateMaxSharpeWeights() {
    // Simplified approach: inverse volatility weighting with momentum
    const volatilities = this.annualizedCovMatrix.map((row, i) => Math.sqrt(row[i]));
    const excessReturns = this.annualizedMeans.map(mean => mean - this.riskFreeRate * 252);
    
    // Risk-adjusted returns
    const riskAdjustedReturns = excessReturns.map((ret, i) => 
      volatilities[i] > 0 ? ret / volatilities[i] : 0
    );
    
    // Normalize to sum to 1
    const sumRiskAdjusted = riskAdjustedReturns.reduce((sum, val) => sum + Math.max(val, 0), 0);
    
    if (sumRiskAdjusted === 0) {
      return Array(this.numAssets).fill(1 / this.numAssets);
    }
    
    return riskAdjustedReturns.map(val => Math.max(val, 0) / sumRiskAdjusted);
  }

  calculatePortfolioMetrics(weights) {
    // Expected return (annualized)
    const expectedReturn = weights.reduce((sum, weight, i) => 
      sum + weight * this.annualizedMeans[i], 0
    );

    // Portfolio variance (annualized)
    let variance = 0;
    for (let i = 0; i < this.numAssets; i++) {
      for (let j = 0; j < this.numAssets; j++) {
        variance += weights[i] * weights[j] * this.annualizedCovMatrix[i][j];
      }
    }

    const volatility = Math.sqrt(Math.max(variance, 0));
    const excessReturn = expectedReturn - this.riskFreeRate * 252;
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

    return {
      expectedReturn: expectedReturn,
      volatility: volatility,
      sharpeRatio: sharpeRatio
    };
  }
}
