export interface PerformanceMetrics {
  sharpeRatio: number;
  maximumDrawdown: number;
  calmarRatio: number;
  recoveryTime: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
}

export function calculatePerformanceMetrics(
  portfolioReturns: number[]
): PerformanceMetrics | undefined {
  try {
    if (!portfolioReturns || portfolioReturns.length === 0) {
      return undefined;
    }

    const returns = portfolioReturns.filter(r => !isNaN(r) && isFinite(r));
    if (returns.length < 10) return undefined;

    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1);
    const volatility = Math.sqrt(variance);

    const riskFreeRate = 0.02 / 252;
    const sharpeRatio = volatility > 0 ? (meanReturn - riskFreeRate) / volatility : 0;

    let peak = returns[0];
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let drawdownStart = 0;
    let recoveryTime = 0;

    for (let i = 1; i < returns.length; i++) {
      if (returns[i] > peak) {
        peak = returns[i];
        if (currentDrawdown > 0) {
          recoveryTime = i - drawdownStart;
          currentDrawdown = 0;
        }
      } else {
        if (currentDrawdown === 0) {
          drawdownStart = i;
        }
        currentDrawdown = (peak - returns[i]) / peak;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
    }

    const calmarRatio = maxDrawdown > 0 ? (meanReturn * 252) / maxDrawdown : 0;
    const positiveReturns = returns.filter(r => r > 0);
    const negativeReturns = returns.filter(r => r < 0);
    const winRate = (positiveReturns.length / returns.length) * 100;
    const averageWin =
      positiveReturns.length > 0 ? positiveReturns.reduce((sum, r) => sum + r, 0) / positiveReturns.length : 0;
    const averageLoss =
      negativeReturns.length > 0 ? negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length : 0;

    return {
      sharpeRatio: sharpeRatio * Math.sqrt(252),
      maximumDrawdown: maxDrawdown * 100,
      calmarRatio,
      recoveryTime,
      winRate,
      averageWin,
      averageLoss: Math.abs(averageLoss),
    };
  } catch (error) {
    console.warn('Performance metrics calculation failed:', error);
    return undefined;
  }
}
