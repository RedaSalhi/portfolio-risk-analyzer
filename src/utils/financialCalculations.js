// src/utils/financialCalculations.js - FIXED VERSION
// Corrected for React Native compatibility without mathjs dependencies

/**
 * FIXED: Matrix operations without mathjs dependency
 * React Native compatible implementation
 */

// Simple Matrix class for financial calculations
class SimpleMatrix {
  constructor(rows, cols, data = null) {
    this.rows = rows;
    this.cols = cols;
    this.data = data || Array(rows).fill(null).map(() => Array(cols).fill(0));
  }

  get(row, col) {
    if (Array.isArray(row)) {
      // Handle [i, j] syntax like mathjs
      return this.data[row[0]][row[1]];
    }
    return this.data[row][col];
  }

  set(row, col, value) {
    if (Array.isArray(row)) {
      // Handle [i, j] syntax like mathjs
      this.data[row[0]][row[1]] = value;
    } else {
      this.data[row][col] = value;
    }
  }

  static zeros(dims) {
    if (Array.isArray(dims)) {
      return new SimpleMatrix(dims[0], dims[1]);
    }
    return new SimpleMatrix(dims, dims);
  }

  static identity(size) {
    const matrix = new SimpleMatrix(size, size);
    for (let i = 0; i < size; i++) {
      matrix.set(i, i, 1);
    }
    return matrix;
  }

  multiply(other) {
    if (typeof other === 'number') {
      // Scalar multiplication
      const result = new SimpleMatrix(this.rows, this.cols);
      for (let i = 0; i < this.rows; i++) {
        for (let j = 0; j < this.cols; j++) {
          result.set(i, j, this.get(i, j) * other);
        }
      }
      return result;
    }
    
    // Matrix multiplication
    if (this.cols !== other.rows) {
      throw new Error('Matrix dimensions incompatible for multiplication');
    }
    
    const result = new SimpleMatrix(this.rows, other.cols);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < other.cols; j++) {
        let sum = 0;
        for (let k = 0; k < this.cols; k++) {
          sum += this.get(i, k) * other.get(k, j);
        }
        result.set(i, j, sum);
      }
    }
    return result;
  }

  transpose() {
    const result = new SimpleMatrix(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        result.set(j, i, this.get(i, j));
      }
    }
    return result;
  }

  inverse() {
    if (this.rows !== this.cols) {
      throw new Error('Matrix must be square for inversion');
    }
    
    const n = this.rows;
    const augmented = Array(n).fill(null).map(() => Array(2 * n).fill(0));
    
    // Create augmented matrix [A|I]
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        augmented[i][j] = this.get(i, j);
        augmented[i][j + n] = i === j ? 1 : 0;
      }
    }
    
    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Make diagonal element 1
      const pivot = augmented[i][i];
      if (Math.abs(pivot) < 1e-10) {
        throw new Error('Matrix is singular and cannot be inverted');
      }
      
      for (let j = 0; j < 2 * n; j++) {
        augmented[i][j] /= pivot;
      }
      
      // Eliminate column
      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = augmented[k][i];
          for (let j = 0; j < 2 * n; j++) {
            augmented[k][j] -= factor * augmented[i][j];
          }
        }
      }
    }
    
    // Extract inverse matrix
    const result = new SimpleMatrix(n, n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result.set(i, j, augmented[i][j + n]);
      }
    }
    
    return result;
  }

  toArray() {
    return this.data.map(row => [...row]);
  }
}

/**
 * Improved normal distribution inverse using Beasley-Springer-Moro algorithm
 */
function normalInverse(p) {
  if (p <= 0 || p >= 1) {
    throw new Error('Probability must be between 0 and 1');
  }

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
 * FIXED VaR Calculator with proper matrix handling
 */
export class VaRCalculator {
  
  static calculateIndividualParametricVaR(assetReturns, ticker, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`🧮 Calculating Individual Parametric VaR for ${ticker}...`);
    
    if (!assetReturns || assetReturns.length < 30) {
      throw new Error(`Insufficient data for ${ticker}: Need at least 30 return observations`);
    }

    const cleanReturns = this.removeOutliers(assetReturns, 3);
    
    const mean = this.calculateMean(cleanReturns);
    const variance = this.calculateVariance(cleanReturns, mean);
    const volatility = Math.sqrt(variance);
    const skewness = this.calculateSkewness(cleanReturns, mean, volatility);
    const kurtosis = this.calculateKurtosis(cleanReturns, mean, volatility);

    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);
    
    const cfAdjustment = (1/6) * (zScore * zScore - 1) * skewness + 
                        (1/24) * (zScore * zScore * zScore - 3 * zScore) * (kurtosis - 3) - 
                        (1/36) * (2 * zScore * zScore * zScore - 5 * zScore) * skewness * skewness;
    
    const adjustedZScore = zScore + cfAdjustment;
    
    const varPercent = -(mean + adjustedZScore * volatility);
    const varValue = Math.abs(varPercent * positionSize);

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

  static calculateIndividualHistoricalVaR(assetReturns, ticker, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`📊 Calculating Individual Historical VaR for ${ticker}...`);
    
    if (!assetReturns || assetReturns.length < 50) {
      throw new Error(`Insufficient data for ${ticker}: Need at least 50 observations for Historical VaR`);
    }

    const pnlSeries = assetReturns.map(r => r * positionSize);
    const sortedPnL = [...pnlSeries].sort((a, b) => a - b);
    
    const varIndex = Math.floor((1 - confidenceLevel) * sortedPnL.length);
    const varValue = Math.abs(sortedPnL[varIndex]);
    
    const tailLosses = sortedPnL.slice(0, varIndex + 1);
    const expectedShortfall = Math.abs(tailLosses.reduce((sum, loss) => sum + loss, 0) / tailLosses.length);

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
   * FIXED: Portfolio VaR with proper matrix handling
   */
  static calculatePortfolioVaR(returnsMatrix, weights, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`📈 Calculating Portfolio VaR for ${returnsMatrix.length} assets...`);
    
    if (!returnsMatrix || returnsMatrix.length === 0) {
      throw new Error('Returns matrix is empty');
    }

    if (weights.length !== returnsMatrix.length) {
      throw new Error('Weights length must match number of assets');
    }

    const weightSum = weights.reduce((sum, w) => sum + w, 0);
    if (Math.abs(weightSum - 1.0) > 0.01) {
      console.warn('Weights do not sum to 1.0, normalizing...');
      weights = weights.map(w => w / weightSum);
    }

    const cleanReturnsMatrix = returnsMatrix.map(returns => this.removeOutliers(returns, 3));
    
    const portfolioReturns = [];
    const minLength = Math.min(...cleanReturnsMatrix.map(r => r.length));
    
    for (let i = 0; i < minLength; i++) {
      let portfolioReturn = 0;
      for (let j = 0; j < cleanReturnsMatrix.length; j++) {
        portfolioReturn += weights[j] * cleanReturnsMatrix[j][i];
      }
      portfolioReturns.push(portfolioReturn);
    }

    const portfolioMean = this.calculateMean(portfolioReturns);
    const portfolioVariance = this.calculateVariance(portfolioReturns, portfolioMean);
    const portfolioVolatility = Math.sqrt(portfolioVariance);
    
    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);
    const varPercent = -(portfolioMean + zScore * portfolioVolatility);
    const varValue = Math.abs(varPercent * positionSize);

    const phi_z = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI);
    const expectedShortfall = Math.abs((portfolioMean + (phi_z / alpha) * portfolioVolatility) * positionSize);

    // Calculate individual asset statistics
    const assetMeans = cleanReturnsMatrix.map(returns => this.calculateMean(returns));
    const assetStds = cleanReturnsMatrix.map((returns, i) => 
      Math.sqrt(this.calculateVariance(returns, assetMeans[i]))
    );
    
    // FIXED: Correlation matrix calculation
    const correlationMatrix = this.calculateRobustCorrelationMatrix(cleanReturnsMatrix);
    
    // FIXED: Component VaR calculation
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

  static calculatePortfolioHistoricalVaR(returnsMatrix, weights, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`📊 Calculating Portfolio Historical VaR...`);
    
    if (!returnsMatrix || returnsMatrix.length === 0) {
      throw new Error('Returns matrix is empty');
    }

    const portfolioReturns = [];
    const minLength = Math.min(...returnsMatrix.map(r => r.length));
    
    for (let i = 0; i < minLength; i++) {
      let portfolioReturn = 0;
      for (let j = 0; j < returnsMatrix.length; j++) {
        portfolioReturn += weights[j] * returnsMatrix[j][i];
      }
      portfolioReturns.push(portfolioReturn * positionSize);
    }

    const sortedReturns = [...portfolioReturns].sort((a, b) => a - b);
    
    const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const varValue = Math.abs(sortedReturns[varIndex]);
    
    const tailLosses = sortedReturns.slice(0, varIndex + 1);
    const expectedShortfall = Math.abs(tailLosses.reduce((sum, loss) => sum + loss, 0) / tailLosses.length);

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

  static calculateMonteCarloVaR(returnsMatrix, weights, confidenceLevel = 0.95, 
                               numSimulations = 10000, positionSize = 100000) {
    
    console.log(`🎲 Running Monte Carlo VaR with ${numSimulations} simulations...`);
    
    const numAssets = weights.length;
    
    if (numAssets !== returnsMatrix.length) {
      throw new Error('Weights length must match number of assets');
    }

    const cleanReturnsMatrix = returnsMatrix.map(returns => this.removeOutliers(returns, 3));
    const means = cleanReturnsMatrix.map(returns => this.calculateMean(returns));
    const stds = cleanReturnsMatrix.map((returns, i) => 
      Math.sqrt(this.calculateVariance(returns, means[i]))
    );

    const correlationMatrix = this.calculateRobustCorrelationMatrix(cleanReturnsMatrix);
    const choleskyMatrix = this.choleskyDecomposition(correlationMatrix);
    
    const portfolioReturns = [];
    
    for (let sim = 0; sim < numSimulations; sim++) {
      const independentRandom = Array(numAssets).fill(0).map(() => boxMullerRandom());
      const correlatedRandom = this.matrixVectorMultiply(choleskyMatrix, independentRandom);
      
      const assetReturns = correlatedRandom.map((random, i) => 
        means[i] + random * stds[i]
      );
      
      const portfolioReturn = weights.reduce((sum, weight, i) => 
        sum + weight * assetReturns[i], 0
      );
      
      portfolioReturns.push(portfolioReturn * positionSize);
    }

    portfolioReturns.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * numSimulations);
    const varValue = Math.abs(portfolioReturns[varIndex]);

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

  static calculateComponentVaR(weights, stds, correlationMatrix, portfolioVol, portfolioVaR) {
    const n = weights.length;
    const componentVaR = {};
    
    for (let i = 0; i < n; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution += weights[j] * stds[i] * stds[j] * correlationMatrix[i][j];
      }
      
      const marginalVaR = marginalContribution / portfolioVol;
      const component = weights[i] * marginalVaR * (portfolioVaR / portfolioVol);
      
      componentVaR[`Asset_${i}`] = Math.max(component, 0);
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
 * FIXED Portfolio Optimizer without mathjs dependency
 */
export class PortfolioOptimizer {
  constructor(returnsMatrix, riskFreeRate = 0.02) {
    this.returnsMatrix = returnsMatrix;
    this.riskFreeRate = riskFreeRate;
    this.numAssets = returnsMatrix.length;
    this.numObservations = returnsMatrix[0].length;
    
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
    const covMatrix = new SimpleMatrix(n, n);
    
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

  optimizeMaxSharpe(numSimulations = 10000) {
    console.log(`🎲 Running Markowitz optimization with ${numSimulations.toLocaleString()} Monte Carlo simulations`);
    
    let bestSharpe = -Infinity;
    let bestWeights = null;
    let bestMetrics = null;
    const allResults = [];

    for (let i = 0; i < numSimulations; i++) {
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

  optimizeMinRisk() {
    console.log(`🛡️ Optimizing for minimum risk`);
    
    let bestVolatility = Infinity;
    let bestWeights = null;
    let bestMetrics = null;

    // More focused search for minimum variance
    for (let i = 0; i < 50000; i++) {
      const weights = this.generateRandomWeights();
      const metrics = this.calculatePortfolioMetrics(weights);

      if (metrics.volatility < bestVolatility) {
        bestVolatility = metrics.volatility;
        bestWeights = [...weights];
        bestMetrics = metrics;
      }
    }

    console.log(`✅ Min risk optimization complete. Volatility: ${(bestVolatility * 100).toFixed(2)}%`);

    return {
      weights: bestWeights,
      ...bestMetrics,
      validation: this.validateOptimizationResult(bestWeights)
    };
  }

  optimizeEqualWeight() {
    console.log(`⚖️ Calculating equal weight portfolio`);
    
    const weights = Array(this.numAssets).fill(1 / this.numAssets);
    const metrics = this.calculatePortfolioMetrics(weights);

    return {
      weights: weights,
      ...metrics,
      validation: this.validateOptimizationResult(weights)
    };
  }

  optimizeRiskParity() {
    console.log(`🎲 Optimizing for risk parity`);
    
    // Simplified risk parity - equal risk contribution
    let bestWeights = null;
    let bestRiskParityError = Infinity;

    for (let i = 0; i < 20000; i++) {
      const weights = this.generateRandomWeights();
      const riskContributions = this.calculateRiskContributions(weights);
      const targetContrib = 1 / this.numAssets;
      
      const error = riskContributions.reduce((sum, contrib) => 
        sum + Math.pow(contrib - targetContrib, 2), 0
      );

      if (error < bestRiskParityError) {
        bestRiskParityError = error;
        bestWeights = [...weights];
      }
    }

    const metrics = this.calculatePortfolioMetrics(bestWeights);

    console.log(`✅ Risk parity optimization complete. Error: ${bestRiskParityError.toFixed(6)}`);

    return {
      weights: bestWeights,
      ...metrics,
      validation: this.validateOptimizationResult(bestWeights)
    };
  }

  optimizeForTargetReturn(targetReturn) {
    console.log(`🎯 Optimizing for target return: ${(targetReturn * 100).toFixed(2)}%`);
    
    return this.monteCarloTargetReturn(targetReturn);
  }

  optimizeForTargetVolatility(targetVolatility) {
    console.log(`🎯 Optimizing for target volatility: ${(targetVolatility * 100).toFixed(2)}%`);
    
    return this.monteCarloTargetVolatility(targetVolatility);
  }

  generateEfficientFrontier(allResults = null, numPoints = 100) {
    if (!allResults) {
      const tempResults = [];
      for (let i = 0; i < 5000; i++) {
        const weights = this.generateRandomWeights();
        const metrics = this.calculatePortfolioMetrics(weights);
        tempResults.push(metrics);
      }
      allResults = tempResults;
    }

    const sortedResults = allResults.sort((a, b) => a.volatility - b.volatility);
    const efficientPortfolios = [];
    let maxReturnSoFar = -Infinity;

    for (const portfolio of sortedResults) {
      if (portfolio.expectedReturn > maxReturnSoFar) {
        efficientPortfolios.push(portfolio);
        maxReturnSoFar = portfolio.expectedReturn;
      }
    }

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
    const expectedReturn = weights.reduce((sum, weight, index) => 
      sum + weight * this.meanReturns[index], 0);

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

  calculateRiskContributions(weights) {
    const riskContributions = [];
    const portfolioVariance = this.calculatePortfolioVariance(weights);
    
    for (let i = 0; i < this.numAssets; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < this.numAssets; j++) {
        marginalContribution += weights[j] * this.covarianceMatrix.get([i, j]);
      }
      
      const riskContribution = weights[i] * marginalContribution / portfolioVariance;
      riskContributions.push(riskContribution);
    }
    
    return riskContributions;
  }

  calculatePortfolioVariance(weights) {
    let variance = 0;
    for (let i = 0; i < this.numAssets; i++) {
      for (let j = 0; j < this.numAssets; j++) {
        variance += weights[i] * weights[j] * this.covarianceMatrix.get([i, j]);
      }
    }
    return variance;
  }

  generateRandomWeights() {
    const weights = Array.from({ length: this.numAssets }, () => Math.random());
    const sum = weights.reduce((acc, weight) => acc + weight, 0);
    return weights.map(weight => weight / sum);
  }

  calculateCapitalAllocation(targetReturn = null, targetVolatility = null) {
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
      riskyWeight = (targetReturn - this.riskFreeRate) / (tangencyReturn - this.riskFreeRate);
    } else if (targetVolatility !== null) {
      riskyWeight = targetVolatility / tangencyVolatility;
    }

    riskyWeight = Math.max(0, Math.min(riskyWeight, 5));
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

// Keep other classes unchanged...
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

    const regression = this.performLinearRegression(assetExcessReturns, marketExcessReturns);
    
    const alpha = regression.alpha * 252;
    const beta = regression.beta;
    const rSquared = regression.rSquared;

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

    return Math.sqrt(variance * 252);
  }
}

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

export class CorrelationCalculator {
  static calculateCorrelationMatrix(returnsMatrix) {
    const n = returnsMatrix.length;
    const correlationMatrix = SimpleMatrix.zeros([n, n]);
    
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
