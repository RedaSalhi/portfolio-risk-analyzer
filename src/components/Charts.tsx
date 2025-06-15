// src/components/Charts.tsx
// ENHANCED WITH SOPHISTICATED MARKOWITZ & CAPM VISUALIZATIONS

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryChart, VictoryScatter, VictoryPie, VictoryArea, VictoryAxis, 
         VictoryLine, VictoryLabel, VictoryTheme, VictoryContainer, VictoryTooltip } from 'victory-native';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const chartHeight = 280;

interface EfficientFrontierProps {
  efficientFrontier: Array<{
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  }>;
  optimalPortfolio: {
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
  allSimulations?: Array<{
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  }>;
  riskFreeRate: number;
  showCapitalMarketLine?: boolean;
}

export const EfficientFrontierChart: React.FC<EfficientFrontierProps> = ({
  efficientFrontier,
  optimalPortfolio,
  allSimulations = [],
  riskFreeRate,
  showCapitalMarketLine = true
}) => {
  // Prepare data for Monte Carlo simulations (background scatter)
  const simulationData = allSimulations.slice(0, 2000).map(point => ({
    x: point.volatility * 100, // Convert to percentage
    y: point.expectedReturn * 100,
    sharpe: point.sharpeRatio,
    fill: getSharpeRatioColor(point.sharpeRatio)
  }));

  // Prepare efficient frontier line data
  const frontierData = efficientFrontier.map(point => ({
    x: point.volatility * 100,
    y: point.expectedReturn * 100,
    sharpe: point.sharpeRatio
  }));

  // Optimal portfolio point
  const optimalPoint = {
    x: optimalPortfolio.volatility * 100,
    y: optimalPortfolio.expectedReturn * 100,
    sharpe: optimalPortfolio.sharpeRatio
  };

  // Capital Market Line (CML) data
  const cmlData = showCapitalMarketLine ? generateCapitalMarketLine(
    riskFreeRate * 100,
    optimalPoint.x,
    optimalPoint.y
  ) : [];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Efficient Frontier & Portfolio Optimization</Text>
      <Text style={styles.chartSubtitle}>
        Monte Carlo Simulation ({allSimulations.length.toLocaleString()} portfolios)
      </Text>
      
      <VictoryChart
        theme={VictoryTheme.material}
        width={chartWidth}
        height={chartHeight}
        padding={{ left: 80, top: 20, right: 60, bottom: 80 }}
        containerComponent={<VictoryContainer responsive={false} />}
      >
        {/* Monte Carlo simulation points */}
        {simulationData.length > 0 && (
          <VictoryScatter
            data={simulationData}
            size={1.5}
            style={{
              data: { fill: ({ datum }) => datum.fill, fillOpacity: 0.6 }
            }}
          />
        )}

        {/* Efficient Frontier Line */}
        <VictoryLine
          data={frontierData}
          style={{
            data: { stroke: "#1f4e79", strokeWidth: 3 }
          }}
          interpolation="cardinal"
        />

        {/* Capital Market Line */}
        {showCapitalMarketLine && cmlData.length > 0 && (
          <VictoryLine
            data={cmlData}
            style={{
              data: { stroke: "#ff6b35", strokeWidth: 2, strokeDasharray: "5,5" }
            }}
          />
        )}

        {/* Optimal Portfolio Point */}
        <VictoryScatter
          data={[optimalPoint]}
          size={8}
          style={{
            data: { fill: "#e63946", stroke: "#ffffff", strokeWidth: 2 }
          }}
          labelComponent={
            <VictoryTooltip
              flyoutStyle={{ fill: "white", stroke: "#1f4e79" }}
              style={{ fontSize: 12, fill: "#1f4e79" }}
            />
          }
          labels={({ datum }) => 
            `Optimal Portfolio\nReturn: ${datum.y.toFixed(2)}%\nRisk: ${datum.x.toFixed(2)}%\nSharpe: ${datum.sharpe.toFixed(3)}`
          }
        />

        {/* Risk-free rate point */}
        <VictoryScatter
          data={[{ x: 0, y: riskFreeRate * 100 }]}
          size={6}
          style={{
            data: { fill: "#2a9d8f", stroke: "#ffffff", strokeWidth: 2 }
          }}
          labelComponent={
            <VictoryLabel
              dx={15}
              style={{ fontSize: 10, fill: "#2a9d8f", fontWeight: "bold" }}
            />
          }
          labels={() => `Risk-Free\n${(riskFreeRate * 100).toFixed(2)}%`}
        />

        <VictoryAxis
          dependentAxis
          tickFormat={(x) => `${x.toFixed(1)}%`}
          style={{
            tickLabels: { fontSize: 12, fill: "#444" },
            axis: { stroke: "#666" },
            grid: { stroke: "#e0e0e0", strokeDasharray: "2,2" }
          }}
        />
        
        <VictoryAxis
          tickFormat={(x) => `${x.toFixed(1)}%`}
          style={{
            tickLabels: { fontSize: 12, fill: "#444" },
            axis: { stroke: "#666" },
            grid: { stroke: "#e0e0e0", strokeDasharray: "2,2" }
          }}
        />
      </VictoryChart>

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendColor, { backgroundColor: '#1f4e79' }]} />
          <Text style={styles.legendText}>Efficient Frontier</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendColor, { backgroundColor: '#e63946' }]} />
          <Text style={styles.legendText}>Optimal Portfolio</Text>
        </View>
        {showCapitalMarketLine && (
          <View style={styles.legendRow}>
            <View style={[styles.legendColor, { backgroundColor: '#ff6b35', height: 2 }]} />
            <Text style={styles.legendText}>Capital Market Line</Text>
          </View>
        )}
      </View>
    </View>
  );
};

interface PortfolioWeightsProps {
  weights: number[];
  tickers: string[];
  title?: string;
}

export const PortfolioWeightsChart: React.FC<PortfolioWeightsProps> = ({
  weights,
  tickers,
  title = "Optimal Portfolio Allocation"
}) => {
  const data = weights.map((weight, index) => ({
    x: tickers[index] || `Asset ${index + 1}`,
    y: weight * 100,
    label: `${tickers[index]}\n${(weight * 100).toFixed(1)}%`
  }));

  const colorScale = [
    "#1f4e79", "#2a9d8f", "#e9c46a", "#f4a261", "#e63946",
    "#264653", "#2a9d8f", "#e76f51", "#6a994e", "#bc6c25"
  ];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>Asset Weight Distribution</Text>
      
      <VictoryPie
        data={data}
        width={chartWidth}
        height={chartHeight}
        colorScale={colorScale}
        innerRadius={60}
        padAngle={2}
        labelRadius={({ innerRadius }) => innerRadius + 80}
        style={{
          labels: { fontSize: 12, fill: "#333", fontWeight: "600" }
        }}
        labelComponent={
          <VictoryLabel
            style={[
              { fill: "#333", fontSize: 11, fontWeight: "600" },
              { fill: "#666", fontSize: 10 }
            ]}
          />
        }
      />
      
      <View style={styles.pieCenter}>
        <Text style={styles.pieCenterText}>Portfolio</Text>
        <Text style={styles.pieCenterSubtext}>{tickers.length} Assets</Text>
      </View>
    </View>
  );
};

interface CapitalAllocationProps {
  riskyWeight: number;
  riskFreeWeight: number;
  tangencyWeights: number[];
  tickers: string[];
  targetReturn?: number;
  targetVolatility?: number;
}

export const CapitalAllocationChart: React.FC<CapitalAllocationProps> = ({
  riskyWeight,
  riskFreeWeight,
  tangencyWeights,
  tickers,
  targetReturn,
  targetVolatility
}) => {
  // Prepare data with risk-free asset and individual risky assets
  const data = [
    {
      x: "Risk-Free Asset",
      y: riskFreeWeight * 100,
      label: `Risk-Free\n${(riskFreeWeight * 100).toFixed(1)}%`
    },
    ...tangencyWeights.map((weight, index) => ({
      x: tickers[index] || `Asset ${index + 1}`,
      y: (riskyWeight * weight * 100),
      label: `${tickers[index]}\n${(riskyWeight * weight * 100).toFixed(1)}%`
    }))
  ].filter(item => item.y > 0.1); // Filter out very small allocations

  const colorScale = ["#2a9d8f", "#1f4e79", "#e9c46a", "#f4a261", "#e63946", "#264653"];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Capital Allocation</Text>
      <Text style={styles.chartSubtitle}>
        {riskyWeight > 1 ? `Leveraged Portfolio (${(riskyWeight * 100).toFixed(0)}% in risky assets)` : 
         riskFreeWeight > 0 ? "Risk-Free + Risky Assets" : "100% Risky Assets"}
      </Text>
      
      <VictoryPie
        data={data}
        width={chartWidth}
        height={chartHeight}
        colorScale={colorScale}
        innerRadius={50}
        padAngle={3}
        labelRadius={({ innerRadius }) => innerRadius + 70}
        style={{
          labels: { fontSize: 11, fill: "#333", fontWeight: "600" }
        }}
      />

      <View style={styles.pieCenter}>
        <Text style={styles.pieCenterText}>
          {targetReturn ? `${(targetReturn * 100).toFixed(1)}%` : 
           targetVolatility ? `${(targetVolatility * 100).toFixed(1)}%` : "Optimal"}
        </Text>
        <Text style={styles.pieCenterSubtext}>
          {targetReturn ? "Target Return" : targetVolatility ? "Target Risk" : "Max Sharpe"}
        </Text>
      </View>
    </View>
  );
};

interface CAPMAnalysisProps {
  capmData: {
    [ticker: string]: {
      alpha: number;
      beta: number;
      capmExpectedReturn: number;
      rSquared: number;
    };
  };
  riskFreeRate: number;
  marketReturn: number;
}

export const CAPMAnalysisChart: React.FC<CAPMAnalysisProps> = ({
  capmData,
  riskFreeRate,
  marketReturn
}) => {
  const tickers = Object.keys(capmData);
  
  // Prepare data for beta visualization
  const betaData = tickers.map((ticker, index) => ({
    x: index + 1,
    y: capmData[ticker].beta,
    label: ticker,
    alpha: capmData[ticker].alpha,
    rSquared: capmData[ticker].rSquared
  }));

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>CAPM Analysis</Text>
      <Text style={styles.chartSubtitle}>Beta & Alpha vs Market Benchmark</Text>
      
      <VictoryChart
        theme={VictoryTheme.material}
        width={chartWidth}
        height={chartHeight}
        padding={{ left: 80, top: 20, right: 60, bottom: 80 }}
      >
        {/* Beta = 1 reference line */}
        <VictoryLine
          data={[{ x: 0, y: 1 }, { x: tickers.length + 1, y: 1 }]}
          style={{
            data: { stroke: "#666", strokeWidth: 1, strokeDasharray: "3,3" }
          }}
        />

        {/* Beta bars */}
        <VictoryScatter
          data={betaData}
          size={({ datum }) => Math.abs(datum.alpha) * 1000 + 5} // Size based on alpha magnitude
          style={{
            data: { 
              fill: ({ datum }) => datum.alpha > 0 ? "#2a9d8f" : "#e63946",
              fillOpacity: ({ datum }) => datum.rSquared,
              stroke: "#fff",
              strokeWidth: 2
            }
          }}
          labelComponent={
            <VictoryTooltip
              flyoutStyle={{ fill: "white", stroke: "#1f4e79" }}
              style={{ fontSize: 11, fill: "#1f4e79" }}
            />
          }
          labels={({ datum }) => 
            `${datum.label}\nBeta: ${datum.y.toFixed(3)}\nAlpha: ${(datum.alpha * 100).toFixed(2)}%\nR²: ${datum.rSquared.toFixed(3)}`
          }
        />

        <VictoryAxis
          dependentAxis
          tickFormat={(x) => x.toFixed(2)}
          style={{
            tickLabels: { fontSize: 12, fill: "#444" },
            axis: { stroke: "#666" },
            grid: { stroke: "#e0e0e0" }
          }}
          label="Beta (Systematic Risk)"
          style={{
            axisLabel: { fontSize: 14, padding: 40, fill: "#333" }
          }}
        />
        
        <VictoryAxis
          tickFormat={() => ""}
          style={{
            tickLabels: { fontSize: 10, fill: "#444" },
            axis: { stroke: "#666" }
          }}
        />
      </VictoryChart>

      {/* CAPM Metrics Summary */}
      <View style={styles.capmSummary}>
        {tickers.map((ticker) => (
          <View key={ticker} style={styles.capmMetric}>
            <Text style={styles.capmTicker}>{ticker}</Text>
            <Text style={styles.capmValue}>
              β: {capmData[ticker].beta.toFixed(3)}
            </Text>
            <Text style={[
              styles.capmValue,
              { color: capmData[ticker].alpha > 0 ? '#2a9d8f' : '#e63946' }
            ]}>
              α: {(capmData[ticker].alpha * 100).toFixed(2)}%
            </Text>
            <Text style={styles.capmValue}>
              CAPM: {(capmData[ticker].capmExpectedReturn * 100).toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

interface CorrelationMatrixProps {
  correlationMatrix: number[][];
  tickers: string[];
}

export const CorrelationMatrixChart: React.FC<CorrelationMatrixProps> = ({
  correlationMatrix,
  tickers
}) => {
  // Convert matrix to heatmap data
  const heatmapData = [];
  for (let i = 0; i < tickers.length; i++) {
    for (let j = 0; j < tickers.length; j++) {
      heatmapData.push({
        x: j + 1,
        y: i + 1,
        z: correlationMatrix[i][j],
        label: `${tickers[i]} vs ${tickers[j]}\n${correlationMatrix[i][j].toFixed(3)}`
      });
    }
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Asset Correlation Matrix</Text>
      <Text style={styles.chartSubtitle}>Pearson Correlation Coefficients</Text>
      
      <VictoryChart
        theme={VictoryTheme.material}
        width={chartWidth}
        height={chartHeight}
        padding={{ left: 80, top: 20, right: 60, bottom: 80 }}
      >
        <VictoryScatter
          data={heatmapData}
          size={15}
          style={{
            data: { 
              fill: ({ datum }) => getCorrelationColor(datum.z),
              stroke: "#fff",
              strokeWidth: 1
            }
          }}
          labelComponent={
            <VictoryTooltip
              flyoutStyle={{ fill: "white", stroke: "#1f4e79" }}
              style={{ fontSize: 10, fill: "#1f4e79" }}
            />
          }
          labels={({ datum }) => datum.label}
        />

        <VictoryAxis
          dependentAxis
          tickFormat={(x) => tickers[x - 1] || ""}
          style={{
            tickLabels: { fontSize: 10, fill: "#444", angle: -45 },
            axis: { stroke: "#666" }
          }}
        />
        
        <VictoryAxis
          tickFormat={(x) => tickers[x - 1] || ""}
          style={{
            tickLabels: { fontSize: 10, fill: "#444", angle: 45 },
            axis: { stroke: "#666" }
          }}
        />
      </VictoryChart>

      {/* Correlation legend */}
      <View style={styles.correlationLegend}>
        <Text style={styles.legendTitle}>Correlation Scale</Text>
        <View style={styles.correlationScale}>
          <View style={[styles.correlationBox, { backgroundColor: '#d73027' }]} />
          <Text style={styles.correlationLabel}>-1.0</Text>
          <View style={[styles.correlationBox, { backgroundColor: '#ffffff' }]} />
          <Text style={styles.correlationLabel}>0.0</Text>
          <View style={[styles.correlationBox, { backgroundColor: '#1a9850' }]} />
          <Text style={styles.correlationLabel}>+1.0</Text>
        </View>
      </View>
    </View>
  );
};

// UTILITY FUNCTIONS

function getSharpeRatioColor(sharpeRatio: number): string {
  // Color scale from red (low Sharpe) to green (high Sharpe)
  if (sharpeRatio < 0) return '#d73027';
  if (sharpeRatio < 0.5) return '#fc8d59';
  if (sharpeRatio < 1.0) return '#fee08b';
  if (sharpeRatio < 1.5) return '#d9ef8b';
  if (sharpeRatio < 2.0) return '#91bfdb';
  return '#1a9850';
}

function getCorrelationColor(correlation: number): string {
  // Blue to white to red color scale
  const absCorr = Math.abs(correlation);
  if (correlation > 0) {
    // Positive correlation: white to green
    const intensity = Math.floor(255 - (absCorr * 180));
    return `rgb(${intensity}, 255, ${intensity})`;
  } else {
    // Negative correlation: white to red
    const intensity = Math.floor(255 - (absCorr * 180));
    return `rgb(255, ${intensity}, ${intensity})`;
  }
}

function generateCapitalMarketLine(riskFreeRate: number, optimalVol: number, optimalReturn: number) {
  const slope = (optimalReturn - riskFreeRate) / optimalVol;
  const maxVol = optimalVol * 2; // Extend CML beyond optimal portfolio
  
  return [
    { x: 0, y: riskFreeRate },
    { x: optimalVol, y: optimalReturn },
    { x: maxVol, y: riskFreeRate + slope * maxVol }
  ];
}

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    marginRight: 6,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: '#444',
    fontWeight: '500',
  },
  pieCenter: {
    position: 'absolute',
    top: chartHeight / 2 - 20,
    left: chartWidth / 2 - 30,
    alignItems: 'center',
  },
  pieCenterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f4e79',
  },
  pieCenterSubtext: {
    fontSize: 11,
    color: '#666',
  },
  capmSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  capmMetric: {
    alignItems: 'center',
    margin: 4,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 80,
  },
  capmTicker: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f4e79',
    marginBottom: 4,
  },
  capmValue: {
    fontSize: 10,
    color: '#333',
    marginVertical: 1,
  },
  correlationLegend: {
    alignItems: 'center',
    marginTop: 12,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  correlationScale: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  correlationBox: {
    width: 20,
    height: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 2,
  },
  correlationLabel: {
    fontSize: 10,
    color: '#666',
    marginHorizontal: 6,
  },
});
