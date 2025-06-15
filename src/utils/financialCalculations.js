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
export class PortfolioOptimizer {
  constructor(returnsMatrix, riskFreeRate = 0.02) {
    this.returnsMatrix = returnsMatrix.map(returns => VaRCalculator.removeOutliers(returns, 3));
    this.riskFreeRate = riskFreeRate / 252;
    this.numAssets = this.returnsMatrix.length;
    
    this.means = this.returnsMatrix.map(returns => VaRCalculator.calculateMean(returns));
    this.annualizedMeans = this.means.map(mean => mean * 252);
    this.covarianceMatrix = this.calculateCovarianceMatrix();
    this.annualizedCovMatrix = this.covarianceMatrix.map(row => row.map(val => val * 252));
    
    this.constraints = {
      allowShortSelling: false,
      maxPositionSize: 0.4,
      minPositionSize: 0.0
    };
  }

  setConstraints(constraints) {
    this.constraints = { ...this.constraints, ...constraints };
  }

  calculateCovarianceMatrix() {
    try {
      const n = this.numAssets;
      const covMatrix = Array(n).fill(null).map(() => Array(n).fill(0));
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          try {
            if (i === j) {
              const variance = VaRCalculator.calculateVariance(this.returnsMatrix[i], this.means[i]);
              covMatrix[i][j] = isFinite(variance) && variance > 0 ? variance : 0.0001; // Variance minimale
            } else {
              const covariance = this.calculateCovariance(
                this.returnsMatrix[i], 
                this.returnsMatrix[j], 
                this.means[i], 
                this.means[j]
              );
              covMatrix[i][j] = isFinite(covariance) ? covariance : 0;
            }
          } catch (error) {
            console.warn(`Covariance calculation failed for assets ${i},${j}:`, error.message);
            covMatrix[i][j] = i === j ? 0.0001 : 0; // Valeur par défaut
          }
        }
      }
      
      // Vérifier que la matrice est semi-définie positive
      if (!this.isValidCovarianceMatrix(covMatrix)) {
        console.warn('Covariance matrix is not positive semi-definite, using regularized version');
        return this.regularizeCovarianceMatrix(covMatrix);
      }
      
      return covMatrix;
      
    } catch (error) {
      console.error('Covariance matrix calculation completely failed:', error.message);
      return this.createDefaultCovarianceMatrix();
    }
  }

  calculateCovariance(x, y, meanX, meanY) {
    try {
      if (!Array.isArray(x) || !Array.isArray(y) || x.length === 0 || y.length === 0) {
        return 0;
      }
      
      const n = Math.min(x.length, y.length);
      let covariance = 0;
      
      for (let i = 0; i < n; i++) {
        if (isFinite(x[i]) && isFinite(y[i])) {
          covariance += (x[i] - meanX) * (y[i] - meanY);
        }
      }
      
      const result = covariance / (n - 1);
      return isFinite(result) ? result : 0;
      
    } catch (error) {
      console.warn('Covariance calculation failed:', error.message);
      return 0;
    }
  }

  // NOUVEAU: Vérifier si la matrice de covariance est valide
  isValidCovarianceMatrix(matrix) {
    try {
      const n = matrix.length;
      
      // Vérifier la symétrie
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
            return false;
          }
        }
      }
      
      // Vérifier que les variances sont positives
      for (let i = 0; i < n; i++) {
        if (matrix[i][i] <= 0) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // NOUVEAU: Régulariser la matrice de covariance
  regularizeCovarianceMatrix(matrix) {
    const n = matrix.length;
    const regularized = matrix.map(row => [...row]); // Copie
    
    // Ajouter un petit terme de régularisation sur la diagonale
    const regularization = 0.0001;
    for (let i = 0; i < n; i++) {
      regularized[i][i] += regularization;
    }
    
    // Forcer la symétrie
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const avg = (regularized[i][j] + regularized[j][i]) / 2;
        regularized[i][j] = avg;
        regularized[j][i] = avg;
      }
    }
    
    return regularized;
  }

  optimizeMaxSharpe() {
    try {
      const weights = this.calculateMaxSharpeWeights();
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights: weights,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        type: 'max_sharpe'
      };
    } catch (error) {
      console.error('Max Sharpe optimization failed:', error.message);
      return this.getFallbackOptimization('max_sharpe');
    }
  }

  optimizeMinRisk() {
    try {
      const weights = this.calculateMinVarWeights();
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights: weights,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        type: 'min_risk'
      };
    } catch (error) {
      console.error('Min risk optimization failed:', error.message);
      return this.getFallbackOptimization('min_risk');
    }
  }

  optimizeEqualWeight() {
    try {
      const weights = Array(this.numAssets).fill(1 / this.numAssets);
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights: weights,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        type: 'equal_weight'
      };
    } catch (error) {
      console.error('Equal weight optimization failed:', error.message);
      return this.getFallbackOptimization('equal_weight');
    }
  }

  optimizeRiskParity() {
    try {
      const weights = this.calculateRiskParityWeights();
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights: weights,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        type: 'risk_parity'
      };
    } catch (error) {
      console.error('Risk parity optimization failed:', error.message);
      return this.getFallbackOptimization('risk_parity');
    }
  }

  optimizeForTargetReturn(targetReturn) {
    try {
      const weights = this.calculateTargetReturnWeights(targetReturn);
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights: weights,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        type: 'target_return'
      };
    } catch (error) {
      console.error('Target return optimization failed:', error.message);
      return this.getFallbackOptimization('target_return');
    }
  }

  optimizeForTargetVolatility(targetVolatility) {
    try {
      const weights = this.calculateTargetVolatilityWeights(targetVolatility);
      const metrics = this.calculatePortfolioMetrics(weights);
      
      return {
        weights: weights,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        type: 'target_volatility'
      };
    } catch (error) {
      console.error('Target volatility optimization failed:', error.message);
      return this.getFallbackOptimization('target_volatility');
    }
  }

  // NOUVEAU: Méthode de fallback en cas d'erreur
  getFallbackOptimization(type) {
    console.warn(`Using fallback equal weight portfolio for ${type}`);
    const weights = Array(this.numAssets).fill(1 / this.numAssets);
    
    try {
      const metrics = this.calculatePortfolioMetrics(weights);
      
      // Validation du résultat
      const validation = this.validateOptimizationResult(weights);
      if (!validation.isValid) {
        console.warn('Fallback optimization validation issues:', validation.issues);
      }
      
      return {
        weights: weights,
        expectedReturn: metrics.expectedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        type: type + '_fallback',
        validation: validation
      };
    } catch (error) {
      console.error('Even fallback optimization failed:', error.message);
      return {
        weights: weights,
        expectedReturn: 0.08, // 8% default
        volatility: 0.15, // 15% default
        sharpeRatio: 0.5, // Default ratio
        type: type + '_default',
        validation: { isValid: false, issues: ['Default values used'] }
      };
    }
  }

  /**
   * AMÉLIORÉE: Method to optimize portfolio with full validation
   */
  optimizePortfolioWithValidation(method, ...params) {
    try {
      let result;
      
      switch (method) {
        case 'maxSharpe':
          result = this.optimizeMaxSharpe();
          break;
        case 'minRisk':
          result = this.optimizeMinRisk();
          break;
        case 'equalWeight':
          result = this.optimizeEqualWeight();
          break;
        case 'riskParity':
          result = this.optimizeRiskParity();
          break;
        case 'targetReturn':
          result = this.optimizeForTargetReturn(params[0] || 0.08);
          break;
        case 'targetRisk':
          result = this.optimizeForTargetVolatility(params[0] || 0.15);
          break;
        default:
          throw new Error(`Unknown optimization method: ${method}`);
      }
      
      // Validation post-optimisation
      const validation = this.validateOptimizationResult(result.weights);
      
      if (!validation.isValid) {
        console.warn(`Optimization ${method} validation failed:`, validation.issues);
        
        // Corriger les poids si possible
        if (Math.abs(validation.weightSum - 1.0) > 0.01) {
          console.log('Normalizing weights...');
          result.weights = result.weights.map(w => w / validation.weightSum);
          
          // Recalculer les métriques avec les poids normalisés
          const newMetrics = this.calculatePortfolioMetrics(result.weights);
          result.expectedReturn = newMetrics.expectedReturn;
          result.volatility = newMetrics.volatility;
          result.sharpeRatio = newMetrics.sharpeRatio;
        }
      }
      
      result.validation = validation;
      console.log(`✅ Optimization ${method} completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`Optimization ${method} failed:`, error.message);
      return this.getFallbackOptimization(method);
    }
  }

  calculateMaxSharpeWeights() {
    const volatilities = this.annualizedCovMatrix.map((row, i) => Math.sqrt(row[i]));
    const excessReturns = this.annualizedMeans.map(mean => mean - this.riskFreeRate * 252);
    
    const sharpeRatios = excessReturns.map((ret, i) => 
      volatilities[i] > 0 ? ret / volatilities[i] : 0
    );
    
    const positiveSharpes = sharpeRatios.map(s => Math.max(s, 0));
    const sumSharpes = positiveSharpes.reduce((sum, val) => sum + val, 0);
    
    if (sumSharpes === 0) {
      return Array(this.numAssets).fill(1 / this.numAssets);
    }
    
    return positiveSharpes.map(val => val / sumSharpes);
  }

  calculateMinVarWeights() {
    const variances = this.annualizedCovMatrix.map((row, i) => row[i]);
    const invVariances = variances.map(v => v > 0 ? 1 / v : 0);
    const sumInvVar = invVariances.reduce((sum, val) => sum + val, 0);
    
    if (sumInvVar === 0) {
      return Array(this.numAssets).fill(1 / this.numAssets);
    }
    
    return invVariances.map(val => val / sumInvVar);
  }

  calculateRiskParityWeights() {
    const volatilities = this.annualizedCovMatrix.map((row, i) => Math.sqrt(row[i]));
    const invVols = volatilities.map(v => v > 0 ? 1 / v : 0);
    const sumInvVol = invVols.reduce((sum, val) => sum + val, 0);
    
    if (sumInvVol === 0) {
      return Array(this.numAssets).fill(1 / this.numAssets);
    }
    
    return invVols.map(val => val / sumInvVol);
  }

  calculateTargetReturnWeights(targetReturn) {
    // Mean-variance optimization: minimize variance subject to a target return
    const n = this.numAssets;
    const ones = Array(n).fill(1);

    const solve = (A, b) => {
      const L = PortfolioOptimizer.choleskyDecomposition(A);
      const y = Array(n).fill(0);
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let k = 0; k < i; k++) sum += L[i][k] * y[k];
        y[i] = (b[i] - sum) / L[i][i];
      }
      const x = Array(n).fill(0);
      for (let i = n - 1; i >= 0; i--) {
        let sum = 0;
        for (let k = i + 1; k < n; k++) sum += L[k][i] * x[k];
        x[i] = (y[i] - sum) / L[i][i];
      }
      return x;
    };

    const v1 = solve(this.annualizedCovMatrix, ones);
    const v2 = solve(this.annualizedCovMatrix, this.annualizedMeans);

    const A = ones.reduce((s, _, i) => s + ones[i] * v1[i], 0);
    const B = ones.reduce((s, _, i) => s + ones[i] * v2[i], 0);
    const C = this.annualizedMeans.reduce((s, _, i) => s + this.annualizedMeans[i] * v2[i], 0);

    const D = A * C - B * B;
    if (Math.abs(D) < 1e-10) {
      return this.calculateMinVarWeights();
    }

    const lambda = (C - B * targetReturn) / D;
    const gamma = (A * targetReturn - B) / D;

    let weights = v1.map((val, i) => lambda * val + gamma * v2[i]);

    // Enforce basic constraints
    weights = weights.map(w => {
      if (!this.constraints.allowShortSelling) w = Math.max(0, w);
      w = Math.max(this.constraints.minPositionSize, Math.min(w, this.constraints.maxPositionSize));
      return w;
    });

    const sum = weights.reduce((s, w) => s + w, 0);
    if (sum !== 0) weights = weights.map(w => w / sum);

    return weights;
  }

  calculateTargetVolatilityWeights(targetVolatility) {
    const tol = 1e-4;
    let low = Math.min(...this.annualizedMeans);
    let high = Math.max(...this.annualizedMeans);
    let weights = this.calculateMinVarWeights();

    for (let i = 0; i < 50; i++) {
      const mid = (low + high) / 2;
      weights = this.calculateTargetReturnWeights(mid);
      const vol = this.calculatePortfolioMetrics(weights).volatility;
      if (Math.abs(vol - targetVolatility) < tol) break;
      if (vol > targetVolatility) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return weights;
  }

  calculatePortfolioMetrics(weights) {
    const expectedReturn = weights.reduce((sum, weight, i) => 
      sum + weight * this.annualizedMeans[i], 0
    );

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

  generateEfficientFrontier(numPoints = 50) {
    const frontierPoints = [];
    
    for (let i = 0; i < numPoints; i++) {
      const alpha = i / (numPoints - 1);
      
      const minVarWeights = this.calculateMinVarWeights();
      const maxSharpeWeights = this.calculateMaxSharpeWeights();
      
      const weights = minVarWeights.map((w, j) => 
        (1 - alpha) * w + alpha * maxSharpeWeights[j]
      );
      
      const metrics = this.calculatePortfolioMetrics(weights);
      
      frontierPoints.push({
        return: metrics.expectedReturn,
        risk: metrics.volatility,
        sharpe: metrics.sharpeRatio,
        weights: weights
      });
    }
    
    return frontierPoints;
  }

  calculateCAPMReturns(marketReturns) {
    if (!marketReturns || marketReturns.length === 0) {
      return [];
    }

    const results = [];
    const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    const marketVar = marketReturns.reduce((sum, r) => sum + Math.pow(r - marketMean, 2), 0) / (marketReturns.length - 1);

    for (let i = 0; i < this.numAssets; i++) {
      const assetReturns = this.returnsMatrix[i];
      const assetMean = this.means[i];
      
      const minLength = Math.min(assetReturns.length, marketReturns.length);
      const alignedAsset = assetReturns.slice(-minLength);
      const alignedMarket = marketReturns.slice(-minLength);
      
      let covariance = 0;
      for (let j = 0; j < minLength; j++) {
        covariance += (alignedAsset[j] - assetMean) * (alignedMarket[j] - marketMean);
      }
      covariance /= (minLength - 1);
      
      const beta = marketVar > 0 ? covariance / marketVar : 0;
      const alpha = assetMean - beta * marketMean;
      const expectedReturn = this.riskFreeRate + beta * (marketMean - this.riskFreeRate);
      
      results.push({
        beta: beta,
        alpha: alpha,
        expectedReturn: expectedReturn * 252
      });
    }

    return results;
  }

  /**
   * NOUVELLE MÉTHODE: Calculate volatility derivative (required for some optimization methods)
   */
  calculateVolatilityDerivative(weights, assetIndex) {
    try {
      if (!Array.isArray(weights) || weights.length !== this.numAssets) {
        throw new Error('Invalid weights array');
      }
      
      if (assetIndex < 0 || assetIndex >= this.numAssets) {
        throw new Error('Invalid asset index');
      }
      
      // Calculate the partial derivative of portfolio volatility with respect to weight of asset i
      // ∂σ/∂w_i = (Σ_j w_j * σ_i * σ_j * ρ_ij) / σ_portfolio
      
      let numerator = 0;
      for (let j = 0; j < this.numAssets; j++) {
        const covValue = this.annualizedCovMatrix[assetIndex]?.[j] || 0;
        numerator += weights[j] * covValue;
      }
      
      // Calculate portfolio volatility
      const portfolioVariance = this.calculatePortfolioVariance(weights);
      const portfolioVolatility = Math.sqrt(Math.max(portfolioVariance, 1e-10));
      
      if (portfolioVolatility === 0) {
        return 0;
      }
      
      const derivative = numerator / portfolioVolatility;
      return isFinite(derivative) ? derivative : 0;

    } catch (error) {
      console.warn(`Volatility derivative calculation failed for asset ${assetIndex}:`, error.message);
      return 0;
    }
  }

  /**
   * NEW: Calculate volatility derivatives for all assets
   */
  calculateAllVolatilityDerivatives(weights) {
    try {
      if (!Array.isArray(weights) || weights.length !== this.numAssets) {
        throw new Error('Invalid weights array');
      }

      const derivatives = [];
      for (let i = 0; i < this.numAssets; i++) {
        derivatives.push(this.calculateVolatilityDerivative(weights, i));
      }

      return derivatives;

    } catch (error) {
      console.warn('All volatility derivatives calculation failed:', error.message);
      return Array(this.numAssets).fill(0);
    }
  }

  /**
   * NOUVELLE MÉTHODE: Calculate portfolio variance
   */
  calculatePortfolioVariance(weights) {
    try {
      if (!Array.isArray(weights) || weights.length !== this.numAssets) {
        throw new Error('Invalid weights array');
      }
      
      let variance = 0;
      for (let i = 0; i < this.numAssets; i++) {
        for (let j = 0; j < this.numAssets; j++) {
          const covValue = this.annualizedCovMatrix[i]?.[j] || 0;
          variance += weights[i] * weights[j] * covValue;
        }
      }
      
      return Math.max(variance, 0);
      
    } catch (error) {
      console.warn('Portfolio variance calculation failed:', error.message);
      return 0.01; // Default variance
    }
  }

  /**
   * CORRIGÉE: Calculate risk attribution using proper volatility derivatives
   */
  calculateRiskAttribution(weights) {
    try {
      const riskAttribution = {};
      const portfolioMetrics = this.calculatePortfolioMetrics(weights);
      
      if (portfolioMetrics.volatility === 0) {
        // Si pas de volatilité, attribution égale
        for (let i = 0; i < this.numAssets; i++) {
          riskAttribution[`Asset_${i}`] = 1 / this.numAssets;
        }
        return riskAttribution;
      }
      
      // Méthode correcte: utiliser les dérivées de volatilité
      const volatilityDerivatives = this.calculateAllVolatilityDerivatives(weights);
      
      for (let i = 0; i < this.numAssets; i++) {
        // Risk contribution = weight × marginal risk contribution
        const marginalContribution = volatilityDerivatives[i];
        const riskContribution = weights[i] * marginalContribution / portfolioMetrics.volatility;
        
        riskAttribution[`Asset_${i}`] = Math.max(0, riskContribution); // Ensure non-negative
      }
      
      // Normaliser pour que la somme soit 1
      const totalContribution = Object.values(riskAttribution).reduce((sum, val) => sum + val, 0);
      if (totalContribution > 0) {
        Object.keys(riskAttribution).forEach(key => {
          riskAttribution[key] = riskAttribution[key] / totalContribution;
        });
      }
      
      return riskAttribution;
      
    } catch (error) {
      console.warn('Risk attribution calculation failed:', error.message);
      // Fallback: attribution égale
      const riskAttribution = {};
      for (let i = 0; i < this.numAssets; i++) {
        riskAttribution[`Asset_${i}`] = 1 / this.numAssets;
      }
      return riskAttribution;
    }
  }

  /**
   * NOUVELLE MÉTHODE: Calculate return derivatives (for return targeting)
   */
  calculateReturnDerivative(weights, assetIndex) {
    try {
      if (assetIndex < 0 || assetIndex >= this.numAssets) {
        return 0;
      }
      
      // ∂R/∂w_i = r_i (the expected return of asset i)
      return this.annualizedMeans[assetIndex] || 0;
      
    } catch (error) {
      console.warn(`Return derivative calculation failed for asset ${assetIndex}:`, error.message);
      return 0;
    }
  }

  /**
   * NOUVELLE MÉTHODE: Calculate Sharpe ratio derivatives
   */
  calculateSharpeDerivative(weights, assetIndex) {
    try {
      const portfolioMetrics = this.calculatePortfolioMetrics(weights);
      const excessReturn = portfolioMetrics.expectedReturn - this.riskFreeRate * 252;
      
      if (portfolioMetrics.volatility === 0) {
        return 0;
      }
      
      const returnDerivative = this.calculateReturnDerivative(weights, assetIndex);
      const volatilityDerivative = this.calculateVolatilityDerivative(weights, assetIndex);
      
      // ∂(Sharpe)/∂w_i = (∂R/∂w_i * σ - R_excess * ∂σ/∂w_i) / σ²
      const numerator = returnDerivative * portfolioMetrics.volatility - 
                       excessReturn * volatilityDerivative;
      const denominator = portfolioMetrics.volatility * portfolioMetrics.volatility;
      
      return denominator > 0 ? numerator / denominator : 0;
      
    } catch (error) {
      console.warn(`Sharpe derivative calculation failed for asset ${assetIndex}:`, error.message);
      return 0;
    }
  }

  /**
   * NOUVELLE MÉTHODE: Calculate constraint gradients (for constrained optimization)
   */
  calculateConstraintGradients(weights) {
    try {
      const gradients = {
        weightSum: Array(this.numAssets).fill(1), // Constraint: Σw_i = 1
        maxPosition: [], // Constraint: w_i ≤ max_position
        minPosition: [], // Constraint: w_i ≥ min_position
      };
      
      for (let i = 0; i < this.numAssets; i++) {
        // Max position constraint: w_i - max_position ≤ 0
        gradients.maxPosition[i] = weights[i] > this.constraints.maxPositionSize ? 1 : 0;
        
        // Min position constraint: min_position - w_i ≤ 0  
        gradients.minPosition[i] = weights[i] < this.constraints.minPositionSize ? -1 : 0;
      }
      
      return gradients;
      
    } catch (error) {
      console.warn('Constraint gradients calculation failed:', error.message);
      return {
        weightSum: Array(this.numAssets).fill(1),
        maxPosition: Array(this.numAssets).fill(0),
        minPosition: Array(this.numAssets).fill(0),
      };
    }
  }

  /**
   * NOUVELLE MÉTHODE: Validate optimization results
   */
  validateOptimizationResult(weights) {
    try {
      // Check basic constraints
      const issues = [];
      
      if (!Array.isArray(weights) || weights.length !== this.numAssets) {
        issues.push('Invalid weights array');
        return { isValid: false, issues };
      }
      
      // Check for NaN or infinite values
      if (weights.some(w => !isFinite(w))) {
        issues.push('Weights contain NaN or infinite values');
      }
      
      // Check weight sum
      const weightSum = weights.reduce((sum, w) => sum + w, 0);
      if (Math.abs(weightSum - 1.0) > 0.01) {
        issues.push(`Weights sum to ${weightSum.toFixed(4)}, should be 1.0`);
      }
      
      // Check position size constraints
      const maxWeight = Math.max(...weights);
      const minWeight = Math.min(...weights);
      
      if (maxWeight > this.constraints.maxPositionSize + 0.001) {
        issues.push(`Maximum weight ${maxWeight.toFixed(4)} exceeds limit ${this.constraints.maxPositionSize}`);
      }
      
      if (!this.constraints.allowShortSelling && minWeight < -0.001) {
        issues.push(`Negative weight ${minWeight.toFixed(4)} found but short selling not allowed`);
      }
      
      if (minWeight < this.constraints.minPositionSize - 0.001) {
        issues.push(`Minimum weight ${minWeight.toFixed(4)} below limit ${this.constraints.minPositionSize}`);
      }
      
      return {
        isValid: issues.length === 0,
        issues: issues,
        weightSum: weightSum,
        maxWeight: maxWeight,
        minWeight: minWeight
      };
      
    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation failed: ${error.message}`]
      };
    }
  }
}
