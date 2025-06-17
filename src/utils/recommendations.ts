export interface IndividualResult {
  ticker: string;
  var: number;
  skewness?: number;
  dataQuality?: {
    originalObservations: number;
    cleanedObservations: number;
    outliersRemoved: number;
  };
}

export interface PortfolioResult {
  var: number;
  diversificationBenefit?: number;
}

export function generateRecommendations(individualResults: IndividualResult[]): string[] {
  const recommendations: string[] = [];
  const totalVar = individualResults.reduce((sum, r) => sum + r.var, 0);
  const highVarAssets = individualResults.filter(r => r.var / totalVar > 0.4);
  if (highVarAssets.length > 0) {
    recommendations.push(
      `Consider reducing exposure to high-risk assets: ${highVarAssets.map(r => r.ticker).join(', ')}`
    );
  }
  const negativeSkewAssets = individualResults.filter(r => r.skewness && r.skewness < -1);
  if (negativeSkewAssets.length > 0) {
    recommendations.push(
      `Assets with high tail risk: ${negativeSkewAssets.map(r => r.ticker).join(', ')}`
    );
  }
  const lowQualityAssets = individualResults.filter(
    r => r.dataQuality && r.dataQuality.outliersRemoved > r.dataQuality.originalObservations * 0.1
  );
  if (lowQualityAssets.length > 0) {
    recommendations.push(`Review data quality for: ${lowQualityAssets.map(r => r.ticker).join(', ')}`);
  }
  return recommendations;
}

export function generatePortfolioRecommendations(
  portfolioResult: PortfolioResult,
  positionSize: number
): string[] {
  const recommendations: string[] = [];
  if (portfolioResult.diversificationBenefit !== undefined) {
    if (portfolioResult.diversificationBenefit < 0.1) {
      recommendations.push('Low diversification benefit - consider more uncorrelated assets');
    } else if (portfolioResult.diversificationBenefit > 0.3) {
      recommendations.push('Good diversification - portfolio benefits from risk reduction');
    }
  }
  const varAsPercentage = (portfolioResult.var / positionSize) * 100;
  if (varAsPercentage > 5) {
    recommendations.push('High portfolio risk - consider risk reduction strategies');
  } else if (varAsPercentage < 1) {
    recommendations.push('Conservative portfolio - may consider slightly higher risk for returns');
  }
  return recommendations;
}
