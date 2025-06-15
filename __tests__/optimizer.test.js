const { PortfolioOptimizer } = require('../src/utils/financialCalculations');

describe('Target weight optimizations', () => {
  const len = 260;
  const asset1 = Array.from({ length: len }, (_, i) => 0.0005 + 0.0001 * Math.sin(i));
  const asset2 = Array.from({ length: len }, (_, i) => 0.0008 + 0.00015 * Math.cos(i * 0.3));
  const asset3 = Array.from({ length: len }, (_, i) => 0.0003 + 0.00005 * Math.sin(i * 1.3));

  const optimizer = new PortfolioOptimizer([asset1, asset2, asset3], 0.01);

  test('calculateTargetReturnWeights hits target return', () => {
    const target = 0.15; // 15% annual return
    const w = optimizer.calculateTargetReturnWeights(target);
    const metrics = optimizer.calculatePortfolioMetrics(w);
    expect(metrics.expectedReturn).toBeCloseTo(target, 2);
    expect(optimizer.validateOptimizationResult(w).isValid).toBe(true);
  });

  test('calculateTargetVolatilityWeights hits target volatility', () => {
    const target = 0.1; // 10% annual vol
    const w = optimizer.calculateTargetVolatilityWeights(target);
    const metrics = optimizer.calculatePortfolioMetrics(w);
    expect(metrics.volatility).toBeCloseTo(target, 2);
    expect(optimizer.validateOptimizationResult(w).isValid).toBe(true);
  });
});
