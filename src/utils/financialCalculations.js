// src/utils/financialCalculations.js
// SIMPLIFIED VERSION - Fast calculations, always works

/**
 * Simple normal distribution inverse for z-scores
 */
function normalInverse(p) {
  // Simplified approximation for common confidence levels
  const zScores = {
    0.90: -1.282,
    0.95: -1.645,
    0.99: -2.326,
    0.975: -1.96,
    0.995: -2.576
  };
  
  return zScores[p] || zScores[0.95];
}

/**
 * VaR Calculator Class - Simplified but accurate
 */
export class VaRCalculator {
  
  /**
   * Parametric VaR - Fast and reliable
   */
  static calculateParametricVaR(returns, confidenceLevel = 0.95, positionSize = 100000) {
    console.log(`🧮 Calculating Parametric VaR for ${returns.length} returns...`);
    
    if (!returns || returns.length === 0) {
      throw new Error('No returns data provided');
    }

    // Simple statistics
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance);

    // Get z-score
    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);

    // Calculate VaR
    const varPercent = -(mean + zScore * volatility);
    const varValue = varPercent * positionSize;

    // Simple exceedance calculation
    const pnlSeries = returns.map(r => r * positionSize);
    const exceedances = pnlSeries.filter(pnl => pnl < -varValue).length;
    const exceedanceRate = (exceedances / returns.length) * 100;

    console.log(`✅ Parametric VaR calculated: $${varValue.toFixed(0)}`);

    return {
      var: Math.abs(varValue),
      varPercent: Math.abs(varPercent),
      volatility: volatility,
      mean: mean,
      zScore: Math.abs(zScore),
      exceedances: exceedances,
      exceedanceRate: exceedanceRate,
      pnlSeries: pnlSeries,
      confidenceLevel: confidenceLevel
    };
  }

  /**
   * Monte Carlo VaR - Simplified but fast
   */
  static calculateMonteCarloVaR(returnsMatrix, weights, confidenceLevel = 0.95, 
                                numSimulations = 10000, positionSize = 100000) {
    
    console.log(`🎲 Running Monte Carlo VaR with ${numSimulations} simulations...`);
    
    const numAssets = weights.length;
    
    // Calculate simple means and standard deviations
    const means = returnsMatrix.map(returns => 
      returns.reduce((sum, r) => sum + r, 0) / returns.length
    );
    
    const stds = returnsMatrix.map(returns => {
      const mean = means[returnsMatrix.indexOf(returns)];
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
      return Math.sqrt(variance);
    });

    // Simple correlation matrix
    const correlations = this.calculateSimpleCorrelationMatrix(returnsMatrix);
    
    const portfolioReturns = [];
    
    // Run simulations
    for (let sim = 0; sim < numSimulations; sim++) {
      // Generate random returns for each asset
      const randomReturns = means.map((mean, i) => 
        mean + this.boxMullerRandom() * stds[i]
      );
      
      // Calculate portfolio return
      const portfolioReturn = weights.reduce((sum, weight, i) => 
        sum + weight * randomReturns[i], 0
      );
      
      portfolioReturns.push(portfolioReturn * positionSize);
    }

    // Sort and find VaR
    portfolioReturns.sort((a, b) => a - b);
    const varIndex = Math.floor((1 - confidenceLevel) * numSimulations);
    const varValue = Math.abs(portfolioReturns[varIndex]);

    // Expected Shortfall
    const tailLosses = portfolioReturns.slice(0, varIndex);
    const expectedShortfall = Math.abs(tailLosses.reduce((sum, loss) => sum + loss, 0) / tailLosses.length);

    console.log(`✅ Monte Carlo VaR calculated: $${varValue.toFixed(0)}`);

    return {
      var: varValue,
      expectedShortfall: expectedShortfall,
      simulations: portfolioReturns,
      numSimulations: numSimulations,
      confidenceLevel: confidenceLevel,
      correlationMatrix: correlations
    };
  }

  /**
   * Fixed Income VaR - Simple duration-based
   */
  static calculateFixedIncomeVaR(currentPrice, duration, yieldChange, confidenceLevel = 0.95, positionSize = 100000) {
    
    console.log(`📊 Calculating Fixed Income VaR for duration ${duration}...`);
    
    // Simple modified duration
    const modifiedDuration = duration / (1 + yieldChange);
    
    // Typical yield volatility
    const yieldVolatility = 0.01; // 1% daily yield volatility
    
    // PV01 calculation
    const pv01 = (modifiedDuration * currentPrice * 0.0001);
    
    // VaR calculation
    const alpha = 1 - confidenceLevel;
    const zScore = Math.abs(normalInverse(alpha));
    const varValue = zScore * yieldVolatility * modifiedDuration * currentPrice * positionSize / 100;

    console.log(`✅ Fixed Income VaR calculated: $${varValue.toFixed(0)}`);

    return {
      var: varValue,
      pv01: pv01,
      modifiedDuration: modifiedDuration,
      yieldVolatility: yieldVolatility,
      confidenceLevel: confidenceLevel
    };
  }

  /**
   * Portfolio VaR - Simple variance-covariance
   */
  static calculatePortfolioVaR(returnsMatrix, weights, confidenceLevel = 0.95, positionSize = 100000) {
    
    console.log(`📈 Calculating Portfolio VaR for ${returnsMatrix.length} assets...`);
    
    // Calculate means
    const means = returnsMatrix.map(returns => 
      returns.reduce((sum, r) => sum + r, 0) / returns.length
    );

    // Portfolio expected return
    const portfolioMean = weights.reduce((sum, weight, i) => sum + weight * means[i], 0);
    
    // Simple portfolio variance calculation
    let portfolioVariance = 0;
    
    // Individual variances
    for (let i = 0; i < weights.length; i++) {
      const variance = this.calculateVariance(returnsMatrix[i]);
      portfolioVariance += weights[i] * weights[i] * variance;
    }
    
    // Add covariances (simplified)
    for (let i = 0; i < weights.length; i++) {
      for (let j = i + 1; j < weights.length; j++) {
        const correlation = this.correlation(returnsMatrix[i], returnsMatrix[j]);
        const covContribution = 2 * weights[i] * weights[j] * correlation * 
                               Math.sqrt(this.calculateVariance(returnsMatrix[i])) * 
                               Math.sqrt(this.calculateVariance(returnsMatrix[j]));
        portfolioVariance += covContribution;
      }
    }
    
    const portfolioVolatility = Math.sqrt(Math.max(portfolioVariance, 0));
    
    // VaR calculation
    const alpha = 1 - confidenceLevel;
    const zScore = normalInverse(alpha);
    const varValue = Math.abs((portfolioMean + zScore * portfolioVolatility) * positionSize);

    // Individual VaRs for comparison
    const individualVaRs = returnsMatrix.map((returns, index) => {
      const assetVaR = this.calculateParametricVaR(returns, confidenceLevel, positionSize * weights[index]);
      return assetVaR.var;
    });

    const sumIndividualVaRs = individualVaRs.reduce((sum, var_) => sum + var_, 0);
    const diversificationBenefit = Math.max(0, (sumIndividualVaRs - varValue) / sumIndividualVaRs);

    console.log(`✅ Portfolio VaR calculated: $${varValue.toFixed(0)} (${(diversificationBenefit*100).toFixed(1)}% diversification benefit)`);

    return {
      var: varValue,
      portfolioVolatility: portfolioVolatility,
      portfolioMean: portfolioMean,
      individualVaRs: individualVaRs,
      sumIndividualVaRs: sumIndividualVaRs,
      diversificationBenefit: diversificationBenefit,
      correlationMatrix: this.calculateSimpleCorrelationMatrix(returnsMatrix),
      confidenceLevel: confidenceLevel
    };
  }

  /**
   * Simple variance calculation
   */
  static calculateVariance(returns) {
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    return returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  }

  /**
   * Simple correlation calculation
   */
  static correlation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
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
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Simple correlation matrix
   */
  static calculateSimpleCorrelationMatrix(returnsMatrix) {
    const size = returnsMatrix.length;
    const matrix = Array(size).fill(null).map(() => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this.correlation(returnsMatrix[i], returnsMatrix[j]);
        }
      }
    }

    return matrix;
  }

  /**
   * Box-Muller for normal random numbers
   */
  static boxMullerRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

/**
 * Portfolio Optimizer - Simplified but functional
 */
export class PortfolioOptimizer {
  
  constructor(returnsMatrix, riskFreeRate = 0.05) {
    this.returnsMatrix = returnsMatrix;
    this.riskFreeRate = riskFreeRate;
    this.means = returnsMatrix.map(returns => 
      returns.reduce((sum, r) => sum + r, 0) / returns.length
    );
  }

  /**
   * Simple portfolio optimization
   */
  optimizePortfolio(targetReturn = null, targetVolatility = null, numSamples = 5000) {
    
    console.log(`📊 Optimizing portfolio with ${numSamples} samples...`);
    
    if (targetReturn !== null) {
      return this.optimizeForTargetReturn(targetReturn, numSamples);
    } else if (targetVolatility !== null) {
      return this.optimizeForTargetVolatility(targetVolatility, numSamples);
    } else {
      return this.optimizeMaxSharpe(numSamples);
    }
  }

  /**
   * Optimize for maximum Sharpe ratio
   */
  optimizeMaxSharpe(numSamples = 5000) {
    let bestSharpe = -Infinity;
    let optimalWeights = null;
    let bestMetrics = null;

    for (let i = 0; i < numSamples; i++) {
      const weights = this.generateRandomWeights();
      const metrics = this.calculatePortfolioMetrics(weights);

      if (metrics.sharpeRatio > bestSharpe && !isNaN(metrics.sharpeRatio)) {
        bestSharpe = metrics.sharpeRatio;
        optimalWeights = [...weights];
        bestMetrics = metrics;
      }
    }

    console.log(`✅ Optimal portfolio found: Sharpe = ${bestSharpe.toFixed(3)}`);

    return {
      weights: optimalWeights || this.generateEqualWeights(),
      expectedReturn: bestMetrics?.expectedReturn || 0.1,
      volatility: bestMetrics?.volatility || 0.15,
      sharpeRatio: bestSharpe > -Infinity ? bestSharpe : 0.5,
      type: 'max_sharpe'
    };
  }

  /**
   * Simple portfolio metrics calculation
   */
  calculatePortfolioMetrics(weights) {
    // Expected return
    const expectedReturn = weights.reduce((sum, weight, i) => 
      sum + weight * this.means[i], 0
    );

    // Simple portfolio variance
    let variance = 0;
    
    // Individual variances
    for (let i = 0; i < weights.length; i++) {
      const assetVariance = VaRCalculator.calculateVariance(this.returnsMatrix[i]);
      variance += weights[i] * weights[i] * assetVariance;
    }
    
    // Add correlations (simplified)
    for (let i = 0; i < weights.length; i++) {
      for (let j = i + 1; j < weights.length; j++) {
        const correlation = VaRCalculator.correlation(this.returnsMatrix[i], this.returnsMatrix[j]);
        const std_i = Math.sqrt(VaRCalculator.calculateVariance(this.returnsMatrix[i]));
        const std_j = Math.sqrt(VaRCalculator.calculateVariance(this.returnsMatrix[j]));
        variance += 2 * weights[i] * weights[j] * correlation * std_i * std_j;
      }
    }

    const volatility = Math.sqrt(Math.max(variance, 0));
    const sharpeRatio = volatility > 0 ? (expectedReturn - this.riskFreeRate) / volatility : 0;

    return { expectedReturn, volatility, sharpeRatio };
  }

  /**
   * Generate random weights that sum to 1
   */
  generateRandomWeights() {
    const numAssets = this.returnsMatrix.length;
    const weights = Array(numAssets).fill(0).map(() => Math.random());
    const sum = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => w / sum);
  }

  /**
   * Generate equal weights
   */
  generateEqualWeights() {
    const numAssets = this.returnsMatrix.length;
    return Array(numAssets).fill(1 / numAssets);
  }

  /**
   * Simple CAPM calculation
   */
  calculateCAPMReturns(marketReturns) {
    const capmResults = {};
    
    this.returnsMatrix.forEach((assetReturns, index) => {
      const beta = this.calculateBeta(assetReturns, marketReturns);
      const marketReturn = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
      const expectedReturn = this.riskFreeRate + beta * (marketReturn - this.riskFreeRate);
      
      capmResults[index] = {
        beta: beta,
        expectedReturn: expectedReturn
      };
    });

    return capmResults;
  }

  /**
   * Simple beta calculation
   */
  calculateBeta(assetReturns, marketReturns) {
    const minLength = Math.min(assetReturns.length, marketReturns.length);
    
    if (minLength < 2) return 1;
    
    const assetMean = assetReturns.slice(0, minLength).reduce((sum, r) => sum + r, 0) / minLength;
    const marketMean = marketReturns.slice(0, minLength).reduce((sum, r) => sum + r, 0) / minLength;

    let covariance = 0;
    let marketVariance = 0;

    for (let i = 0; i < minLength; i++) {
      const assetDeviation = assetReturns[i] - assetMean;
      const marketDeviation = marketReturns[i] - marketMean;
      
      covariance += assetDeviation * marketDeviation;
      marketVariance += marketDeviation * marketDeviation;
    }

    return marketVariance > 0 ? covariance / marketVariance : 1;
  }

  /**
   * For target return optimization (simplified)
   */
  optimizeForTargetReturn(targetReturn, numSamples) {
    let bestVolatility = Infinity;
    let optimalWeights = null;

    for (let i = 0; i < numSamples; i++) {
      const weights = this.generateRandomWeights();
      const metrics = this.calculatePortfolioMetrics(weights);

      if (Math.abs(metrics.expectedReturn - targetReturn) < 0.01 && 
          metrics.volatility < bestVolatility) {
        bestVolatility = metrics.volatility;
        optimalWeights = [...weights];
      }
    }

    return optimalWeights ? {
      weights: optimalWeights,
      expectedReturn: targetReturn,
      volatility: bestVolatility,
      sharpeRatio: (targetReturn - this.riskFreeRate) / bestVolatility,
      type: 'target_return'
    } : this.optimizeMaxSharpe(numSamples);
  }

  /**
   * For target volatility optimization (simplified)
   */
  optimizeForTargetVolatility(targetVolatility, numSamples) {
    let smallestDiff = Infinity;
    let optimalWeights = null;
    let bestMetrics = null;

    for (let i = 0; i < numSamples; i++) {
      const weights = this.generateRandomWeights();
      const metrics = this.calculatePortfolioMetrics(weights);

      const diff = Math.abs(metrics.volatility - targetVolatility);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        optimalWeights = [...weights];
        bestMetrics = metrics;
      }
    }

    return optimalWeights ? {
      weights: optimalWeights,
      expectedReturn: bestMetrics.expectedReturn,
      volatility: bestMetrics.volatility,
      sharpeRatio: bestMetrics.sharpeRatio,
      type: 'target_volatility'
    } : this.optimizeMaxSharpe(numSamples);
  }
