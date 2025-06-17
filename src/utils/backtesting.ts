export interface BacktestResult {
  exceedances: number;
  exceedanceRate: number;
  expectedRate: number;
  kupiecTest: number;
  totalObservations: number;
  passedTest: boolean;
  exceedanceDates: string[];
  portfolioReturns: number[];
  varBreaches: Array<{
    date: string;
    portfolioReturn: number;
    varThreshold: number;
    loss: number;
  }>;
}

export interface SimpleVaRResults {
  individualResults?: { var: number }[];
  portfolioResult?: { var: number };
}

export function performAdvancedBacktest(
  returnsMatrix: number[][],
  weights: number[],
  varResults: SimpleVaRResults,
  confidenceLevel: number,
  positionSize: number
): BacktestResult {
  try {
    console.log('📊 Running advanced VaR backtesting...');

    let varThreshold = 0;
    if (varResults.individualResults) {
      varThreshold = varResults.individualResults.reduce((sum, r) => sum + r.var, 0);
    } else if (varResults.portfolioResult) {
      varThreshold = varResults.portfolioResult.var;
    }

    const portfolioReturns: number[] = [];
    const minLength = Math.min(...returnsMatrix.map(r => r.length));
    const dates: string[] = [];

    for (let i = 0; i < minLength; i++) {
      const portfolioReturn = returnsMatrix.reduce(
        (sum, returns, assetIndex) => sum + weights[assetIndex] * returns[i],
        0
      );
      const portfolioPnL = portfolioReturn * positionSize;
      portfolioReturns.push(portfolioPnL);

      const date = new Date();
      date.setDate(date.getDate() - (minLength - i));
      dates.push(date.toISOString().split('T')[0]);
    }

    const varBreaches: BacktestResult['varBreaches'] = [];
    const exceedanceDates: string[] = [];
    let exceedances = 0;

    for (let i = 0; i < portfolioReturns.length; i++) {
      const loss = -portfolioReturns[i];
      if (loss > varThreshold) {
        exceedances++;
        exceedanceDates.push(dates[i]);
        varBreaches.push({
          date: dates[i],
          portfolioReturn: portfolioReturns[i],
          varThreshold,
          loss,
        });
      }
    }

    const exceedanceRate = (exceedances / portfolioReturns.length) * 100;
    const expectedRate = (1 - confidenceLevel) * 100;
    const testStatistic =
      -2 *
      Math.log(
        (Math.pow(exceedanceRate, exceedances) *
          Math.pow(1 - exceedanceRate, portfolioReturns.length - exceedances)) /
          (Math.pow(expectedRate, exceedances) *
            Math.pow(1 - expectedRate, portfolioReturns.length - exceedances))
      );
    const passedTest = Math.abs(exceedanceRate - expectedRate) < 2 && testStatistic < 3.84;

    console.log(
      `📊 Backtest Results: ${exceedances} exceedances out of ${portfolioReturns.length} observations`
    );
    console.log(
      `📊 Exceedance rate: ${exceedanceRate.toFixed(2)}% (expected: ${expectedRate.toFixed(2)}%)`
    );
    console.log(`📊 Kupiec test: ${testStatistic.toFixed(2)} (passed: ${passedTest})`);

    return {
      exceedances,
      exceedanceRate,
      expectedRate,
      kupiecTest: testStatistic,
      totalObservations: portfolioReturns.length,
      passedTest,
      exceedanceDates,
      portfolioReturns,
      varBreaches,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    console.warn('Advanced backtesting failed:', message);
    return {
      exceedances: 0,
      exceedanceRate: 0,
      expectedRate: 0,
      kupiecTest: 0,
      totalObservations: 0,
      passedTest: false,
      exceedanceDates: [],
      portfolioReturns: [],
      varBreaches: [],
    };
  }
}
