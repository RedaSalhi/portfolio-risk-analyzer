// src/utils/financialCalculations.js

// Mathematical utilities
export const gaussianInverse = (p) => {
    // Approximation of inverse normal CDF (for VaR calculations)
    // Based on Beasley-Springer-Moro algorithm
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  
    let q, t, u;
  
    if (p <= 0.5) {
      t = Math.sqrt(-2 * Math.log(p));
      return ((((c[4] * t + c[3]) * t + c[2]) * t + c[1]) * t + c[0]) / 
             ((((d[4] * t + d[3]) * t + d[2]) * t + d[1]) * t + 1);
    } else {
      t = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[4] * t + c[3]) * t + c[2]) * t + c[1]) * t + c[0]) / 
              ((((d[4] * t + d[3]) * t + d[2]) * t + d[1]) * t + 1));
    }
  };
  
  // Portfolio optimization utilities
  export class PortfolioOptimizer {
    constructor(returns, riskFreeRate = 0.02) {
      this.returns = returns;
      this.riskFreeRate = riskFreeRate;
      this.meanReturns = this.calculateMeanReturns();
      this.covMatrix = this.calculateCovarianceMatrix();
    }
  
    calculateMeanReturns() {
      const n = this.returns[0].length;
      return this.returns.map(asset => {
        const sum = asset.reduce((acc, val) => acc + val, 0);
        return (sum / n) * 252; // Annualized
      });
    }
  
    calculateCovarianceMatrix() {
      const n = this.returns.length;
      const matrix = Array(n).fill().map(() => Array(n).fill(0));
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          matrix[i][j] = this.covariance(this.returns[i], this.returns[j]) * 252;
        }
      }
      return matrix;
    }
  
    covariance(x, y) {
      const meanX = x.reduce((a, b) => a + b) / x.length;
      const meanY = y.reduce((a, b) => a + b) / y.length;
      
      const cov = x.reduce((acc, xi, i) => {
        return acc + (xi - meanX) * (y[i] - meanY);
      }, 0) / (x.length - 1);
      
      return cov;
    }
  
    calculatePortfolioMetrics(weights) {
      // Expected return
      const expectedReturn = weights.reduce((sum, w, i) => 
        sum + w * this.meanReturns[i], 0);
      
      // Portfolio variance
      let variance = 0;
      for (let i = 0; i < weights.length; i++) {
        for (let j = 0; j < weights.length; j++) {
          variance += weights[i] * weights[j] * this.covMatrix[i][j];
        }
      }
      
      const volatility = Math.sqrt(variance);
      const sharpeRatio = (expectedReturn - this.riskFreeRate) / volatility;
      
      return { expectedReturn, volatility, sharpeRatio };
    }
  
    optimizePortfolio(numSimulations = 10000) {
      let bestSharpe = -Infinity;
      let optimalWeights = null;
      let results = [];
  
      for (let i = 0; i < numSimulations; i++) {
        // Generate random weights
        const weights = this.generateRandomWeights(this.returns.length);
        const metrics = this.calculatePortfolioMetrics(weights);
        
        results.push({
          weights: [...weights],
          ...metrics
        });
  
        if (metrics.sharpeRatio > bestSharpe) {
          bestSharpe = metrics.sharpeRatio;
          optimalWeights = [...weights];
        }
      }
  
      return {
        optimalWeights,
        bestMetrics: this.calculatePortfolioMetrics(optimalWeights),
        allResults: results
      };
    }
  
    generateRandomWeights(n) {
      const weights = Array(n).fill(0).map(() => Math.random());
      const sum = weights.reduce((a, b) => a + b);
      return weights.map(w => w / sum);
    }
  }
  
  // VaR calculation utilities
  export class VaRCalculator {
    static parametricVaR(returns, confidenceLevel = 0.95, positionSize = 100000) {
      const mean = returns.reduce((a, b) => a + b) / returns.length;
      const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      const volatility = Math.sqrt(variance);
      
      const zScore = gaussianInverse(1 - confidenceLevel);
      const var1Day = -zScore * volatility * positionSize;
      
      // Calculate exceedances for backtesting
      const pnl = returns.map(r => r * positionSize);
      const exceedances = pnl.filter(p => p < -var1Day).length;
      const exceedanceRate = (exceedances / returns.length) * 100;
      
      return {
        var: var1Day,
        volatility,
        exceedances,
        exceedanceRate,
        zScore
      };
    }
  
    static monteCarloVaR(returns, weights, confidenceLevel = 0.95, 
                         numSimulations = 10000, positionSize = 100000) {
      // Calculate correlation matrix
      const corrMatrix = this.calculateCorrelationMatrix(returns);
      
      // Generate correlated random returns
      const simulations = [];
      for (let i = 0; i < numSimulations; i++) {
        const portfolioReturn = this.simulatePortfolioReturn(
          returns, weights, corrMatrix
        );
        simulations.push(portfolioReturn * positionSize);
      }
      
      // Sort and find VaR
      simulations.sort((a, b) => a - b);
      const varIndex = Math.floor((1 - confidenceLevel) * numSimulations);
      const var1Day = -simulations[varIndex];
      
      return {
        var: var1Day,
        simulations,
        percentile: (1 - confidenceLevel) * 100
      };
    }
  
    static calculateCorrelationMatrix(returns) {
      const n = returns.length;
      const matrix = Array(n).fill().map(() => Array(n).fill(0));
      
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) {
            matrix[i][j] = 1;
          } else {
            matrix[i][j] = this.correlation(returns[i], returns[j]);
          }
        }
      }
      return matrix;
    }
  
    static correlation(x, y) {
      const meanX = x.reduce((a, b) => a + b) / x.length;
      const meanY = y.reduce((a, b) => a + b) / y.length;
      
      let numerator = 0;
      let sumSqX = 0;
      let sumSqY = 0;
      
      for (let i = 0; i < x.length; i++) {
        const deltaX = x[i] - meanX;
        const deltaY = y[i] - meanY;
        numerator += deltaX * deltaY;
        sumSqX += deltaX * deltaX;
        sumSqY += deltaY * deltaY;
      }
      
      return numerator / Math.sqrt(sumSqX * sumSqY);
    }
  
    static simulatePortfolioReturn(returns, weights, corrMatrix) {
      // Simple simulation - in practice, use Cholesky decomposition
      const randomReturns = returns.map((assetReturns, i) => {
        const mean = assetReturns.reduce((a, b) => a + b) / assetReturns.length;
        const variance = assetReturns.reduce((acc, r) => 
          acc + Math.pow(r - mean, 2), 0) / (assetReturns.length - 1);
        
        // Generate normal random variable (Box-Muller transform)
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        
        return mean + Math.sqrt(variance) * z;
      });
      
      return randomReturns.reduce((sum, r, i) => sum + r * weights[i], 0);
    }
  
    static fixedIncomeVaR(yieldChanges, maturity = 10, couponRate = 0.05,
                          confidenceLevel = 0.95, positionSize = 100000) {
      // Calculate PV01 (price value of a basis point)
      const ytm = couponRate; // Simplified assumption
      const price = this.bondPrice(1, couponRate, ytm, maturity);
      const bumpedPrice = this.bondPrice(1, couponRate, ytm + 0.0001, maturity);
      const pv01 = price - bumpedPrice;
      
      // Calculate yield volatility in basis points
      const mean = yieldChanges.reduce((a, b) => a + b) / yieldChanges.length;
      const variance = yieldChanges.reduce((acc, y) => 
        acc + Math.pow(y - mean, 2), 0) / (yieldChanges.length - 1);
      const yieldVolBps = Math.sqrt(variance) * 100;
      
      // VaR calculation
      const zScore = gaussianInverse(1 - confidenceLevel);
      const var1Day = -zScore * pv01 * yieldVolBps * positionSize;
      
      return {
        var: var1Day,
        pv01,
        yieldVolatility: yieldVolBps,
        bondPrice: price
      };
    }
  
    static bondPrice(faceValue, couponRate, ytm, years, frequency = 2) {
      const periods = years * frequency;
      const coupon = faceValue * couponRate / frequency;
      let price = 0;
      
      // Present value of coupons
      for (let t = 1; t <= periods; t++) {
        price += coupon / Math.pow(1 + ytm / frequency, t);
      }
      
      // Present value of face value
      price += faceValue / Math.pow(1 + ytm / frequency, periods);
      
      return price;
    }
  }
  
  // CAPM calculations
  export class CAPMCalculator {
    static calculateBeta(assetReturns, marketReturns) {
      const correlation = VaRCalculator.correlation(assetReturns, marketReturns);
      
      const assetVar = this.variance(assetReturns);
      const marketVar = this.variance(marketReturns);
      
      return correlation * Math.sqrt(assetVar / marketVar);
    }
  
    static calculateAlpha(assetReturns, marketReturns, riskFreeRate = 0.02) {
      const beta = this.calculateBeta(assetReturns, marketReturns);
      const assetMean = assetReturns.reduce((a, b) => a + b) / assetReturns.length;
      const marketMean = marketReturns.reduce((a, b) => a + b) / marketReturns.length;
      
      return assetMean - (riskFreeRate + beta * (marketMean - riskFreeRate));
    }
  
    static variance(returns) {
      const mean = returns.reduce((a, b) => a + b) / returns.length;
      return returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    }
  
    static expectedReturn(beta, marketReturn, riskFreeRate = 0.02) {
      return riskFreeRate + beta * (marketReturn - riskFreeRate);
    }
  }
  
  // Utility functions for data processing
  export const calculateLogReturns = (prices) => {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    return returns;
  };
  
  export const calculateSimpleReturns = (prices) => {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  };
  
  export const annualizeReturns = (returns) => {
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    return mean * 252; // 252 trading days per year
  };
  
  export const annualizeVolatility = (returns) => {
    const mean = returns.reduce((a, b) => a + b) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance * 252);
  };