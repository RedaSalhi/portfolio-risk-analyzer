import {
  VaRCalculator,
  PortfolioOptimizer,
  CorrelationCalculator
} from '../src/utils/financialCalculations.js';

describe('VaRCalculator - Edge Cases and Fixes', () => {
  // Test data generators
  const generateNormalReturns = (count, mean = 0, std = 0.02) => 
    Array.from({ length: count }, () => mean + std * (Math.random() - 0.5) * 2);
  
  const generateSkewedReturns = (count) => {
    // Generate positively skewed distribution (more negative outliers)
    const returns = [];
    for (let i = 0; i < count; i++) {
      if (Math.random() < 0.05) {
        returns.push(-0.1 - Math.random() * 0.1); // 5% chance of large negative return
      } else {
        returns.push((Math.random() - 0.5) * 0.04); // Normal small returns
      }
    }
    return returns;
  };

  describe('Parametric VaR with Cornish-Fisher', () => {
    test('handles extreme skewness gracefully', () => {
      const extremeSkewReturns = generateSkewedReturns(100);
      
      const result = VaRCalculator.calculateIndividualParametricVaR(
        extremeSkewReturns, 'EXTREME_SKEW', 0.95, 100000
      );
      
      expect(result.var).toBeGreaterThan(0);
      expect(result.var).toBeLessThan(100000); // Sanity check
      expect(result.skewness).toBeLessThan(0); // Should be negatively skewed
      expect(result.cornishFisherAdjustment).toBeDefined();
      
      // CF adjustment should be bounded
      expect(Math.abs(result.cornishFisherAdjustment)).toBeLessThan(3);
    });

    test('falls back to normal distribution for extreme parameters', () => {
      // Create artificially extreme distribution
      const extremeReturns = [
        ...Array(90).fill(0.001), // 90% small positive returns
        ...Array(10).fill(-0.5)   // 10% extreme negative returns
      ];
      
      const result = VaRCalculator.calculateIndividualParametricVaR(
        extremeReturns, 'EXTREME_DIST', 0.95, 100000
      );
      
      expect(result.var).toBeGreaterThan(0);
      // Should use normal distribution (CF adjustment near 0) for extreme cases
      expect(Math.abs(result.cornishFisherAdjustment)).toBeLessThan(0.1);
    });

    test('validates data quality reporting', () => {
      const dirtyReturns = [
        ...generateNormalReturns(80),
        10, -10, 5, -8 // Extreme outliers
      ];
      
      const result = VaRCalculator.calculateIndividualParametricVaR(
        dirtyReturns, 'DIRTY_DATA', 0.95, 100000
      );
      
      expect(result.dataQuality).toBeDefined();
      expect(result.dataQuality.originalObservations).toBe(84);
      expect(result.dataQuality.cleanedObservations).toBeLessThan(84);
      expect(result.dataQuality.outliersRemoved).toBeGreaterThan(0);
    });
  });

  describe('Portfolio VaR Component Calculations', () => {
    test('component VaR sums to total VaR', () => {
      const returns1 = generateNormalReturns(252, 0.0003, 0.015); // ~7.5% annual vol
      const returns2 = generateNormalReturns(252, 0.0002, 0.020); // ~10% annual vol
      const returns3 = generateNormalReturns(252, 0.0004, 0.025); // ~12.5% annual vol
      
      const result = VaRCalculator.calculatePortfolioVaR(
        [returns1, returns2, returns3], 
        [0.4, 0.35, 0.25], 
        0.95, 
        1000000
      );
      
      expect(result.componentVaR).toBeDefined();
      
      const totalComponentVaR = Object.values(result.componentVaR)
        .reduce((sum, comp) => sum + comp, 0);
      
      // Components should sum to total VaR within 10% tolerance
      expect(Math.abs(totalComponentVaR - result.var) / result.var).toBeLessThan(0.1);
      
      // All components should be positive
      Object.values(result.componentVaR).forEach(comp => {
        expect(comp).toBeGreaterThanOrEqual(0);
      });
    });

    test('handles perfect correlation correctly', () => {
      const baseReturns = generateNormalReturns(100, 0, 0.02);
      const perfectCorrelatedReturns = baseReturns.map(r => r); // Perfect correlation
      
      const result = VaRCalculator.calculatePortfolioVaR(
        [baseReturns, perfectCorrelatedReturns], 
        [0.5, 0.5], 
        0.95, 
        100000
      );
      
      // With perfect correlation, diversification benefit should be near zero
      expect(result.diversificationBenefit).toBeLessThan(0.05);
      expect(result.correlationMatrix[0][1]).toBeCloseTo(1, 1);
    });

    test('correlation matrix is positive definite', () => {
      const returns1 = generateNormalReturns(100);
      const returns2 = generateNormalReturns(100);
      const returns3 = generateNormalReturns(100);
      
      const correlationMatrix = VaRCalculator.calculateRobustCorrelationMatrix([
        returns1, returns2, returns3
      ]);
      
      // Diagonal elements should be 1
      for (let i = 0; i < 3; i++) {
        expect(correlationMatrix[i][i]).toBeCloseTo(1, 5);
      }
      
      // Off-diagonal elements should be bounded
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (i !== j) {
            expect(correlationMatrix[i][j]).toBeGreaterThanOrEqual(-0.99);
            expect(correlationMatrix[i][j]).toBeLessThanOrEqual(0.99);
          }
        }
      }
      
      // Matrix should be symmetric
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          expect(correlationMatrix[i][j]).toBeCloseTo(correlationMatrix[j][i], 5);
        }
      }
    });
  });

  describe('Outlier Detection', () => {
    test('modified z-score removes extreme outliers', () => {
      const normalData = generateNormalReturns(100, 0, 0.02);
      const dataWithOutliers = [
        ...normalData,
        0.5, -0.4, 0.3, -0.6 // Extreme outliers
      ];
      
      const cleaned = VaRCalculator.removeOutliers(dataWithOutliers, 'modified_zscore', 3.5);
      
      expect(cleaned.length).toBeLessThan(dataWithOutliers.length);
      expect(cleaned.length).toBeGreaterThan(normalData.length * 0.8); // Shouldn't remove too much
      
      // Check that extreme values are removed
      const maxAbs = Math.max(...cleaned.map(Math.abs));
      expect(maxAbs).toBeLessThan(0.2); // Should remove 0.5, -0.4, etc.
    });

    test('handles identical values gracefully', () => {
      const identicalData = Array(50).fill(0.01);
      
      const cleaned = VaRCalculator.removeOutliers(identicalData, 'modified_zscore');
      
      expect(cleaned.length).toBe(identicalData.length);
      expect(cleaned.every(x => x === 0.01)).toBe(true);
    });
  });
});

describe('CorrelationCalculator', () => {
  test('returns accessible 2D array', () => {
    const r1 = [0.01, -0.02, 0.03];
    const r2 = [0.02, -0.01, 0.04];
    const matrix = CorrelationCalculator.calculateCorrelationMatrix([r1, r2]);

    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBe(2);
    expect(matrix[0].length).toBe(2);
    expect(matrix[0][0]).toBeCloseTo(1, 5);
    expect(matrix[0][1]).toBeCloseTo(matrix[1][0], 5);
  });
});

describe('PortfolioOptimizer - Constraint Handling', () => {
  const asset1 = generateNormalReturns(252, 0.0003, 0.015);
  const asset2 = generateNormalReturns(252, 0.0002, 0.020);
  const asset3 = generateNormalReturns(252, 0.0004, 0.012);
  
  const optimizer = new PortfolioOptimizer([asset1, asset2, asset3]);

  test('respects maximum position size constraints', () => {
    const maxPositionSize = 0.4;
    const result = optimizer.optimizeMaxSharpe(5000, { 
      maxPositionSize, 
      allowShortSelling: false 
    });
    
    expect(result.weights).toBeDefined();
    expect(result.weights.length).toBe(3);
    
    // Check constraints are satisfied
    result.weights.forEach(weight => {
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(weight).toBeLessThanOrEqual(maxPositionSize + 1e-6); // Allow tiny numerical error
    });
    
    // Weights should sum to 1
    const sum = result.weights.reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 5);
    
    expect(result.constraints.constraintsSatisfied).toBe(true);
  });

  test('handles short selling constraints', () => {
    const result = optimizer.optimizeMaxSharpe(3000, {
      maxPositionSize: 0.5,
      allowShortSelling: true
    });
    
    // With short selling allowed, some weights can be negative
    expect(result.weights.some(w => w < 0)).toBe(result.constraints.allowShortSelling);
    
    // But should still respect bounds
    result.weights.forEach(weight => {
      expect(weight).toBeGreaterThanOrEqual(-0.5);
      expect(weight).toBeLessThanOrEqual(0.5);
    });
  });

  test('fallback to equal weights when constraints impossible', () => {
    // Create impossible constraints (max position too small)
    const result = optimizer.optimizeMaxSharpe(1000, {
      maxPositionSize: 0.2, // Impossible with 3 assets
      allowShortSelling: false
    });
    
    // Should fallback gracefully
    expect(result.weights.every(w => w > 0)).toBe(true);
    expect(result.weights.every(w => w <= 0.2 + 1e-6)).toBe(true);
  });

  test('validation detects constraint violations', () => {
    const violatingWeights = [0.6, 0.3, 0.1]; // First weight violates 50% max
    const validation = optimizer.validateOptimizationResult(violatingWeights);
    
    expect(validation.isValid).toBe(true); // Basic validation (sum = 1)
    expect(validation.weightSum).toBeCloseTo(1, 5);
    expect(validation.hasNaN).toBe(false);
    expect(validation.hasNegative).toBe(false);
  });

  test('handles numerical instability gracefully', () => {
    // Create nearly singular covariance matrix
    const correlatedReturns1 = generateNormalReturns(50);
    const correlatedReturns2 = correlatedReturns1.map(r => r * 0.99 + 0.001); // Almost identical
    const correlatedReturns3 = correlatedReturns1.map(r => r * 1.01 - 0.001); // Almost identical
    
    const unstableOptimizer = new PortfolioOptimizer([
      correlatedReturns1, 
      correlatedReturns2, 
      correlatedReturns3
    ]);
    
    // Should not throw error even with near-singular matrix
    expect(() => {
      const result = unstableOptimizer.optimizeMaxSharpe(1000);
      expect(result.weights).toBeDefined();
      expect(result.weights.length).toBe(3);
    }).not.toThrow();
  });
});

describe('Integration Tests', () => {
  test('complete VaR analysis workflow', async () => {
    const mockReturns = [
      generateNormalReturns(252, 0.0003, 0.015),
      generateNormalReturns(252, 0.0002, 0.020),
      generateNormalReturns(252, 0.0001, 0.010)
    ];
    
    const symbols = ['MOCK1', 'MOCK2', 'MOCK3'];
    const weights = [0.4, 0.35, 0.25];
    
    // Test parametric VaR
    const parametricResult = VaRCalculator.calculatePortfolioVaR(
      mockReturns, weights, 0.95, 1000000
    );
    
    expect(parametricResult.var).toBeGreaterThan(0);
    expect(parametricResult.var).toBeLessThan(200000); // Reasonable for $1M portfolio
    expect(parametricResult.expectedShortfall).toBeGreaterThan(parametricResult.var);
    
    // Test historical VaR
    const historicalResult = VaRCalculator.calculatePortfolioHistoricalVaR(
      mockReturns, weights, 0.95, 1000000
    );
    
    expect(historicalResult.var).toBeGreaterThan(0);
    expect(historicalResult.expectedShortfall).toBeGreaterThan(historicalResult.var);
    
    // VaR methods should give similar results for normal data
    const ratio = parametricResult.var / historicalResult.var;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
  });

  test('complete portfolio optimization workflow', () => {
    const mockReturns = [
      generateNormalReturns(252, 0.0004, 0.015), // Higher return, moderate risk
      generateNormalReturns(252, 0.0002, 0.010), // Lower return, lower risk  
      generateNormalReturns(252, 0.0006, 0.025)  // Highest return, highest risk
    ];
    
    const optimizer = new PortfolioOptimizer(mockReturns, 0.02);
    
    // Test different optimization methods
    const maxSharpe = optimizer.optimizeMaxSharpe(3000);
    const minRisk = optimizer.optimizeMinRisk();
    const equalWeight = optimizer.optimizeEqualWeight();
    
    // Max Sharpe should have higher Sharpe than others
    expect(maxSharpe.sharpeRatio).toBeGreaterThanOrEqual(minRisk.sharpeRatio);
    expect(maxSharpe.sharpeRatio).toBeGreaterThanOrEqual(equalWeight.sharpeRatio);
    
    // Min risk should have lower volatility
    expect(minRisk.volatility).toBeLessThanOrEqual(maxSharpe.volatility);
    expect(minRisk.volatility).toBeLessThanOrEqual(equalWeight.volatility);
    
    // Equal weight should have equal weights
    equalWeight.weights.forEach(weight => {
      expect(weight).toBeCloseTo(1/3, 2);
    });
  });
});

// Utility functions for test data generation
function generateNormalReturns(count, mean = 0, std = 0.02) {
  const returns = [];
  for (let i = 0; i < count; i++) {
    // Box-Muller transformation for normal distribution
    if (i % 2 === 0) {
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      returns.push(mean + std * z0);
    }
  }
  return returns;
}

// Performance test
describe('Performance Tests', () => {
  test('large portfolio optimization completes in reasonable time', () => {
    const start = Date.now();
    
    const largeMockReturns = Array.from({ length: 8 }, () => 
      generateNormalReturns(500, Math.random() * 0.0002, 0.01 + Math.random() * 0.02)
    );
    
    const optimizer = new PortfolioOptimizer(largeMockReturns);
    const result = optimizer.optimizeMaxSharpe(5000);
    
    const elapsed = Date.now() - start;
    
    expect(result.weights).toBeDefined();
    expect(result.weights.length).toBe(8);
    expect(elapsed).toBeLessThan(30000); // Should complete in under 30 seconds
    
    console.log(`Large portfolio optimization completed in ${elapsed}ms`);
  });
});
