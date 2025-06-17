export interface StressScenario {
  name: string;
  shock: number;
  description: string;
  icon: string;
  probability: number;
}

export interface StressResult {
  scenario: string;
  loss: number;
  probability: number;
  description: string;
  icon: string;
  relativeToNormalVaR: number;
  portfolioImpact: string;
}

import { VaRCalculator } from './financialCalculations';

export async function runAdvancedStressTests(
  returnsMatrix: number[][],
  weights: number[],
  positionSize: number,
  normalVaR: number,
  scenarios: StressScenario[]
): Promise<StressResult[]> {
  const stressResults: StressResult[] = [];
  console.log('💥 Running comprehensive stress tests...');

  for (const scenario of scenarios) {
    try {
      const stressedReturns = returnsMatrix.map(returns =>
        returns.map(r => r + scenario.shock)
      );
      const stressVaR = VaRCalculator.calculatePortfolioVaR(
        stressedReturns,
        weights,
        0.95,
        positionSize
      );
      const relativeToNormalVaR = stressVaR.var / normalVaR;
      let portfolioImpact: string;
      if (relativeToNormalVaR > 3) {
        portfolioImpact = 'Severe';
      } else if (relativeToNormalVaR > 2) {
        portfolioImpact = 'High';
      } else if (relativeToNormalVaR > 1.5) {
        portfolioImpact = 'Moderate';
      } else {
        portfolioImpact = 'Low';
      }
      stressResults.push({
        scenario: scenario.name,
        loss: stressVaR.var,
        probability: scenario.probability,
        description: scenario.description,
        icon: scenario.icon,
        relativeToNormalVaR,
        portfolioImpact,
      });
      console.log(
        `💥 ${scenario.name}: $${stressVaR.var.toLocaleString()} (${relativeToNormalVaR.toFixed(1)}x normal)`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      console.warn(`Stress test failed for ${scenario.name}:`, message);
    }
  }

  stressResults.sort((a, b) => b.loss - a.loss);
  return stressResults;
}
