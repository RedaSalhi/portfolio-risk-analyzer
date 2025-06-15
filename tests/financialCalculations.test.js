const path = require('path');
let VaRCalculator;
let PortfolioOptimizer;

beforeAll(async () => {
  ({ VaRCalculator, PortfolioOptimizer } = await import(path.resolve(__dirname, '../src/utils/financialCalculations.js')));
});

describe('VaRCalculator.calculateIndividualParametricVaR', () => {
  const goodReturns = Array.from({ length: 60 }, (_, i) => Math.sin(i) / 100);

  test('throws with insufficient data', () => {
    expect(() => VaRCalculator.calculateIndividualParametricVaR([0.01, 0.02], 'TST')).toThrow('Insufficient data');
  });

  test('returns VaR metrics for valid data', () => {
    const result = VaRCalculator.calculateIndividualParametricVaR(goodReturns, 'TST', 0.95, 1000);
    expect(result).toHaveProperty('var');
    expect(result.var).toBeGreaterThan(0);
    expect(result.ticker).toBe('TST');
  });
});

describe('VaRCalculator.calculatePortfolioVaR', () => {
  const asset1 = Array.from({ length: 60 }, (_, i) => Math.sin(i) / 100);
  const asset2 = Array.from({ length: 60 }, (_, i) => Math.cos(i) / 100);
  const asset3 = Array.from({ length: 60 }, (_, i) => Math.sin(i * 2) / 100);
  const matrix = [asset1, asset2, asset3];

  test('normalizes weights that do not sum to 1', () => {
    const weightsBad = [0.5, 0.3, 0.5];
    const sumBad = weightsBad.reduce((s, w) => s + w, 0);
    const normalized = weightsBad.map(w => w / sumBad);
    const resBad = VaRCalculator.calculatePortfolioVaR(matrix, weightsBad, 0.95, 1000);
    const resNorm = VaRCalculator.calculatePortfolioVaR(matrix, normalized, 0.95, 1000);
    expect(resBad.var).toBeCloseTo(resNorm.var, 8);
  });

  test('throws when weights length mismatch', () => {
    expect(() => VaRCalculator.calculatePortfolioVaR(matrix, [0.5, 0.5], 0.95, 1000)).toThrow('Weights length');
  });
});

describe('PortfolioOptimizer core methods', () => {
  const asset1 = Array.from({ length: 60 }, (_, i) => Math.sin(i) / 100);
  const asset2 = Array.from({ length: 60 }, (_, i) => Math.cos(i) / 100);
  const matrix = [asset1, asset2];
  const optimizer = new PortfolioOptimizer(matrix);

  test('optimizeEqualWeight produces equal weights', () => {
    const res = optimizer.optimizeEqualWeight();
    expect(res.weights.length).toBe(2);
    expect(res.weights[0]).toBeCloseTo(0.5, 5);
    expect(res.weights[1]).toBeCloseTo(0.5, 5);
    expect(res.validation.isValid).toBe(true);
  });

  test('optimizeMaxSharpe weights sum to one', () => {
    const res = optimizer.optimizeMaxSharpe();
    const sum = res.weights.reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(res.weights.every(w => w >= 0)).toBe(true);
  });

  test('validateOptimizationResult detects wrong weight sum', () => {
    const validation = optimizer.validateOptimizationResult([0.6, 0.6]);
    expect(validation.isValid).toBe(false);
    expect(validation.issues.some(msg => msg.includes('sum'))).toBe(true);
  });
});
