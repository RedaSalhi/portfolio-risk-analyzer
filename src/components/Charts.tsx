// Fixed Charts.tsx - Proper prop handling and null checking
// This replaces your existing src/components/Charts.tsx

import { Ionicons } from '@expo/vector-icons';
import { Chart, registerables } from 'chart.js';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import Svg, { Circle, Line, Path, RNSVGText as SvgText } from 'react-native-svg';
Chart.register(...registerables);

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const chartHeight = 300;
const padding = 40;

// FIXED: Updated interfaces to match actual usage
interface PortfolioWeightsProps {
  weights: number[];
  tickers: string[];
  title?: string;
}

interface EfficientFrontierProps {
  efficientFrontier: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>;
  optimalPortfolio: {
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
  };
  allSimulations?: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>;
  riskFreeRate?: number;
  showCapitalMarketLine?: boolean;
}

interface CAPMAnalysisProps {
  capmData: { [ticker: string]: {
    alpha: number;
    beta: number;
    capmExpectedReturn: number;
    rSquared: number;
  }};
  riskFreeRate: number;
  marketReturn: number;
}

interface CorrelationMatrixProps {
  correlationMatrix: number[][];
  tickers: string[];
}

interface CapitalAllocationProps {
  riskyWeight: number;
  riskFreeWeight: number;
  tangencyWeights: number[];
  tickers: string[];
  targetReturn?: number;
  targetVolatility?: number;
}

// FIXED: Portfolio Weights Chart with proper prop handling
export const PortfolioWeightsChart: React.FC<PortfolioWeightsProps> = ({ 
  weights, 
  tickers, 
  title = "Portfolio Allocation" 
}) => {
  // Add null checking and validation
  if (!weights || !tickers || weights.length === 0 || tickers.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <LinearGradient colors={['#f8f9fa', '#ffffff']} style={styles.chartGradient}>
          <Text style={styles.chartTitle}>📊 {title}</Text>
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No portfolio data available</Text>
            <Text style={styles.emptySubtext}>Run optimization to see allocation</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const includeRiskFree = weights.length === tickers.length + 1;

  // Ensure weights and tickers have same length for risky assets
  const minLength = Math.min(weights.length, tickers.length);
  const validWeights = weights.slice(0, minLength);
  const validTickers = tickers.slice(0, minLength);

  // Generate colors for pie chart
  const colors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#607d8b'
  ];

  const pieData = validTickers.map((ticker, index) => ({
    name: ticker,
    population: Math.round(validWeights[index] * 100 * 100) / 100,
    color: colors[index % colors.length],
    legendFontColor: '#34495e',
    legendFontSize: 12,
  }));

  if (includeRiskFree) {
    pieData.push({
      name: 'Risk-Free',
      population: Math.round(weights[weights.length - 1] * 100 * 100) / 100,
      color: '#95a5a6',
      legendFontColor: '#34495e',
      legendFontSize: 12,
    });
  }

  return (
    <View style={styles.chartContainer}>
      <LinearGradient colors={['#f8f9fa', '#ffffff']} style={styles.chartGradient}>
        <Text style={styles.chartTitle}>📊 {title}</Text>
        
        <PieChart
          data={pieData}
          width={chartWidth}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
          absolute
        />

        <View style={styles.weightsList}>
          {pieData.map((item, index) => (
            <View key={item.name} style={styles.weightItem}>
              <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
              <Text style={styles.tickerText}>{item.name}</Text>
              <Text style={styles.weightText}>{item.population.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

// Enhanced EfficientFrontierChart - Adapted from Python matplotlib implementation
export const EfficientFrontierChart: React.FC<EfficientFrontierProps> = ({ 
  efficientFrontier, 
  optimalPortfolio, 
  allSimulations = [],
  riskFreeRate = 0.02,
  showCapitalMarketLine = false
}) => {
  console.log('🔍 EfficientFrontierChart Debug Info:');
  console.log('- efficientFrontier points:', efficientFrontier?.length || 0);
  console.log('- allSimulations points:', allSimulations?.length || 0);
  console.log('- showCapitalMarketLine:', showCapitalMarketLine);
  console.log('- riskFreeRate:', riskFreeRate);

  // Enhanced validation with debug info
  if (!efficientFrontier || efficientFrontier.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <LinearGradient colors={['#e3f2fd', '#ffffff']} style={styles.chartGradient}>
          <Text style={styles.chartTitle}>📈 Efficient Frontier</Text>
          <View style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No frontier data available</Text>
            <Text style={styles.debugText}>
              Debug: efficientFrontier = {efficientFrontier ? efficientFrontier.length : 'null'} points
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Combine all data to find ranges
  const allData = [...efficientFrontier, ...allSimulations];
  if (optimalPortfolio) allData.push(optimalPortfolio);
  
  // Set x-axis (volatility) from 0 to 1
  const minVol = 0;
  const maxVol = 1;
  const minReturn = 0; // Start from 0 for returns
  const maxReturn = Math.max(...allData.map(p => p.expectedReturn));

  // Add padding to y-axis only
  const volRange = maxVol - minVol;
  const returnRange = maxReturn - minReturn;
  const adjustedMaxReturn = maxReturn + returnRange * 0.1; // Add 10% padding to top
  const adjustedMaxVol = maxVol; // No padding, fixed at 1

  console.log('📊 Chart Ranges:');
  console.log(`- Volatility: 0% to ${(adjustedMaxVol * 100).toFixed(1)}%`);
  console.log(`- Return: 0% to ${(adjustedMaxReturn * 100).toFixed(1)}%`);

  // Scaling functions
  const scaleX = (vol: number) => padding + (vol / adjustedMaxVol) * (chartWidth - 2 * padding);
  const scaleY = (ret: number) => chartHeight - padding - (ret / adjustedMaxReturn) * (chartHeight - 2 * padding);

  // Create axis ticks for volatility (every 0.2 from 0 to 1)
  const volTicks = [];
  for (let i = 0; i <= 5; i++) {
    const vol = 0.2 * i;
    volTicks.push({ vol, x: scaleX(vol), label: vol.toFixed(1) });
  }
  // Y-axis ticks remain as before
  const returnTicks = [];
  for (let i = 0; i <= 5; i++) {
    const ret = (adjustedMaxReturn / 5) * i;
    returnTicks.push({ ret, y: scaleY(ret), label: (ret * 100).toFixed(1) });
  }

  // Viridis color mapping for Sharpe ratios
  const getViridisColor = (sharpe: number, minSharpe: number, maxSharpe: number): string => {
    if (maxSharpe === minSharpe) return 'rgb(68, 1, 84)'; // Default purple if no range
    
    const normalizedSharpe = Math.max(0, Math.min(1, (sharpe - minSharpe) / (maxSharpe - minSharpe)));
    
    if (normalizedSharpe < 0.25) {
      const t = normalizedSharpe / 0.25;
      const r = Math.round(68 + (58 - 68) * t);
      const g = Math.round(1 + (82 - 1) * t);
      const b = Math.round(84 + (139 - 84) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (normalizedSharpe < 0.5) {
      const t = (normalizedSharpe - 0.25) / 0.25;
      const r = Math.round(58 + (32 - 58) * t);
      const g = Math.round(82 + (144 - 82) * t);
      const b = Math.round(139 + (140 - 139) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (normalizedSharpe < 0.75) {
      const t = (normalizedSharpe - 0.5) / 0.25;
      const r = Math.round(32 + (94 - 32) * t);
      const g = Math.round(144 + (201 - 144) * t);
      const b = Math.round(140 + (98 - 140) * t);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      const t = (normalizedSharpe - 0.75) / 0.25;
      const r = Math.round(94 + (253 - 94) * t);
      const g = Math.round(201 + (231 - 201) * t);
      const b = Math.round(98 + (37 - 98) * t);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Calculate Sharpe ratio range from all available data
  const allSharpeRatios = allData.map(p => p.sharpeRatio).filter(s => isFinite(s) && !isNaN(s));
  const minSharpe = Math.min(...allSharpeRatios);
  const maxSharpe = Math.max(...allSharpeRatios);

  console.log(`📈 Sharpe range: ${minSharpe.toFixed(3)} to ${maxSharpe.toFixed(3)}`);

  // Show all simulation points (no sampling)
  const sampledSimulations = allSimulations;

  console.log(`🎯 Rendering ${sampledSimulations.length} simulation points`);

  // Create efficient frontier path
  const sortedFrontier = [...efficientFrontier].sort((a, b) => a.volatility - b.volatility);
  
  // Start from risk-free rate if showing CML
  let frontierPath = '';
  if (showCapitalMarketLine && riskFreeRate !== undefined) {
    const x0 = scaleX(0);
    const y0 = scaleY(riskFreeRate);
    frontierPath = `M${x0},${y0}`;
    
    sortedFrontier.forEach((point, index) => {
      const x = scaleX(point.volatility);
      const y = scaleY(point.expectedReturn);
      frontierPath += ` L${x},${y}`;
    });
  } else {
    sortedFrontier.forEach((point, index) => {
      const x = scaleX(point.volatility);
      const y = scaleY(point.expectedReturn);
      frontierPath += index === 0 ? `M${x},${y}` : ` L${x},${y}`;
    });
  }

  // Create Capital Market Line if requested
  let cmlPath = '';
  if (showCapitalMarketLine && riskFreeRate !== undefined && optimalPortfolio) {
    const slope = (optimalPortfolio.expectedReturn - riskFreeRate) / optimalPortfolio.volatility;
    const x1 = scaleX(0);
    const y1 = scaleY(riskFreeRate);
    const x2 = scaleX(adjustedMaxVol);
    const y2 = scaleY(riskFreeRate + slope * adjustedMaxVol);
    cmlPath = `M${x1},${y1} L${x2},${y2}`;
  }

  return (
    <View style={styles.chartContainer}>
      <LinearGradient colors={['#e3f2fd', '#ffffff']} style={styles.chartGradient}>
        <Text style={styles.chartTitle}>📈 Efficient Frontier</Text>
        <Text style={styles.chartSubtitle}>
          {showCapitalMarketLine ? 'Risk-Return Optimization with Risk-Free Asset' : 'Risk-Return Optimization (Markowitz)'}
        </Text>
        
        {/* Debug info panel */}
        <View style={styles.debugPanel}>
          <Text style={styles.debugText}>
            Debug: {sampledSimulations.length} portfolios | {sortedFrontier.length} frontier points
          </Text>
        </View>
        
        <View style={styles.svgContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Grid lines */}
            {volTicks.map((tick, index) => (
              <Line
                key={`vgrid-${index}`}
                x1={tick.x}
                y1={padding}
                x2={tick.x}
                y2={chartHeight - padding}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
            ))}
            {returnTicks.map((tick, index) => (
              <Line
                key={`hgrid-${index}`}
                x1={padding}
                y1={tick.y}
                x2={chartWidth - padding}
                y2={tick.y}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
            ))}

            {/* Portfolio simulations scatter plot */}
            {sampledSimulations.map((sim, index) => {
              const x = scaleX(sim.volatility);
              const y = scaleY(sim.expectedReturn);
              
              // Skip points outside the visible area
              if (x < padding || x > chartWidth - padding || y < padding || y > chartHeight - padding) {
                return null;
              }
              
              const color = getViridisColor(sim.sharpeRatio, minSharpe, maxSharpe);
              
              return (
                <Circle
                  key={`sim-${index}`}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill={color}
                  opacity="0.7"
                />
              );
            })}

            {/* Capital Market Line (behind efficient frontier) */}
            {showCapitalMarketLine && cmlPath && (
              <Path
                d={cmlPath}
                stroke="black"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                opacity="0.8"
              />
            )}

            {/* Efficient Frontier curve */}
            {frontierPath && (
              <Path
                d={frontierPath}
                stroke="#3498db"
                strokeWidth="4"
                fill="none"
              />
            )}

            {/* Optimal Portfolio highlight */}
            {optimalPortfolio && (
              <Circle
                cx={scaleX(optimalPortfolio.volatility)}
                cy={scaleY(optimalPortfolio.expectedReturn)}
                r="8"
                fill="#e74c3c"
                stroke="white"
                strokeWidth="3"
              />
            )}

            {/* Risk-free point */}
            {showCapitalMarketLine && riskFreeRate !== undefined && (
              <Circle
                cx={scaleX(0)}
                cy={scaleY(riskFreeRate)}
                r="6"
                fill="#2c3e50"
                stroke="white"
                strokeWidth="2"
              />
            )}

            {/* Axes */}
            <Line
              x1={padding}
              y1={chartHeight - padding}
              x2={chartWidth - padding}
              y2={chartHeight - padding}
              stroke="#2c3e50"
              strokeWidth="2"
            />
            <Line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={chartHeight - padding}
              stroke="#2c3e50"
              strokeWidth="2"
            />

            {/* X-axis labels */}
            {volTicks.map((tick, index) => (
              <SvgText
                key={`xlabel-${index}`}
                x={tick.x}
                y={chartHeight - padding + 20}
                fontSize="11"
                fill="#2c3e50"
                alignmentBaseline="middle"
              >
                <Text>{tick.label}</Text>
              </SvgText>
            ))}

            {/* Y-axis labels */}
            {returnTicks.map((tick, index) => (
              <SvgText
                key={`ylabel-${index}`}
                x={padding - 10}
                y={tick.y + 4}
                fontSize="11"
                fill="#2c3e50"
                alignmentBaseline="middle"
              >
                <Text>{tick.label}</Text>
              </SvgText>
            ))}

            {/* Axis titles */}
            <SvgText
              x={chartWidth / 2}
              y={chartHeight - 5}
              fontSize="12"
              fill="#2c3e50"
              alignmentBaseline="middle"
              fontWeight="600"
            >
              <Text>Volatility (Standard Deviation %)</Text>
            </SvgText>
            
            {/* Vertical axis title - using multiple lines */}
            <SvgText
              x={20}
              y={chartHeight / 2}
              fontSize="12"
              fill="#2c3e50"
              alignmentBaseline="middle"
              fontWeight="600"
            >
              <Text>Expected</Text>
            </SvgText>
            <SvgText
              x={20}
              y={chartHeight / 2 + 15}
              fontSize="12"
              fill="#2c3e50"
              alignmentBaseline="middle"
              fontWeight="600"
            >
              <Text>Return (%)</Text>
            </SvgText>
          </Svg>
        </View>

        {/* Color Legend for Sharpe Ratios */}
        <View style={styles.colorLegend}>
          <Text style={styles.legendTitle}>Sharpe Ratio</Text>
          <View style={styles.colorBar}>
            <View style={[styles.colorSegment, { backgroundColor: 'rgb(68, 1, 84)' }]} />
            <View style={[styles.colorSegment, { backgroundColor: 'rgb(58, 82, 139)' }]} />
            <View style={[styles.colorSegment, { backgroundColor: 'rgb(32, 144, 140)' }]} />
            <View style={[styles.colorSegment, { backgroundColor: 'rgb(94, 201, 98)' }]} />
            <View style={[styles.colorSegment, { backgroundColor: 'rgb(253, 231, 37)' }]} />
          </View>
          <View style={styles.legendLabels}>
            <Text style={styles.legendText}>{minSharpe.toFixed(2)}</Text>
            <Text style={styles.legendText}>{maxSharpe.toFixed(2)}</Text>
          </View>
        </View>

        {/* Statistics Panel */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>📊 Expected Return</Text>
            <Text style={styles.statValue}>
              {(optimalPortfolio.expectedReturn * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>📉 Volatility</Text>
            <Text style={styles.statValue}>
              {(optimalPortfolio.volatility * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>⚡ Sharpe Ratio</Text>
            <Text style={styles.statValue}>
              {optimalPortfolio.sharpeRatio.toFixed(3)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>🎯 Simulations</Text>
            <Text style={styles.statValue}>
              {sampledSimulations.length.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={styles.scatterDot} />
            <Text style={styles.legendText}>Portfolio Simulations</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { backgroundColor: '#3498db' }]} />
            <Text style={styles.legendText}>Efficient Frontier</Text>
          </View>
          {showCapitalMarketLine && (
            <View style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: '#000000' }]} />
              <Text style={styles.legendText}>Capital Market Line (CML)</Text>
            </View>
          )}
          <View style={styles.legendItem}>
            <View style={styles.redDot} />
            <Text style={styles.legendText}>Max Sharpe Ratio</Text>
          </View>
          {showCapitalMarketLine && (
            <View style={styles.legendItem}>
              <View style={styles.blackDot} />
              <Text style={styles.legendText}>Risk-Free Asset</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

// FIXED: CAPM Analysis Chart
export const CAPMAnalysisChart: React.FC<CAPMAnalysisProps> = ({ 
  capmData, 
  riskFreeRate, 
  marketReturn 
}) => {
  if (!capmData || Object.keys(capmData).length === 0) {
    return (
      <View style={styles.chartContainer}>
        <LinearGradient colors={['#fff3e0', '#ffffff']} style={styles.chartGradient}>
          <Text style={styles.chartTitle}>📊 CAPM Analysis</Text>
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No CAPM data available</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const tickers = Object.keys(capmData);
  const betas = tickers.map(ticker => capmData[ticker].beta);
  const alphas = tickers.map(ticker => capmData[ticker].alpha * 100); // Convert to percentage

  const chartData = {
    labels: tickers,
    datasets: [
      {
        data: betas,
        color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
        strokeWidth: 2,
      }
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient colors={['#fff3e0', '#ffffff']} style={styles.chartGradient}>
        <Text style={styles.chartTitle}>📊 CAPM Analysis</Text>
        <Text style={styles.chartSubtitle}>Beta & Alpha Analysis</Text>
        
        <BarChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
          yAxisSuffix=""
          yAxisLabel="β "
          showValuesOnTopOfBars={true}
        />

        <View style={styles.capmStats}>
          <Text style={styles.statLabel}>Risk-Free Rate: {(riskFreeRate * 100).toFixed(2)}%</Text>
          <Text style={styles.statLabel}>Market Return: {(marketReturn * 100).toFixed(2)}%</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.capmDetails}>
            {tickers.map(ticker => (
              <View key={ticker} style={styles.capmItem}>
                <Text style={styles.capmTicker}>{ticker}</Text>
                <Text style={styles.capmBeta}>β: {capmData[ticker].beta.toFixed(2)}</Text>
                <Text style={[
                  styles.capmAlpha, 
                  { color: capmData[ticker].alpha >= 0 ? '#27ae60' : '#e74c3c' }
                ]}>
                  α: {(capmData[ticker].alpha * 100).toFixed(2)}%
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

// FIXED: Correlation Matrix Chart
export const CorrelationMatrixChart: React.FC<Partial<CorrelationMatrixProps>> = ({
  correlationMatrix = [],
  tickers = []
}) => {
  if (!correlationMatrix || !tickers || correlationMatrix.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <LinearGradient colors={['#f3e5f5', '#ffffff']} style={styles.chartGradient}>
          <Text style={styles.chartTitle}>🔗 Correlation Matrix</Text>
          <View style={styles.emptyState}>
            <Ionicons name="grid-outline" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No correlation data available</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const getCorrelationColor = (correlation: number) => {
    if (correlation > 0.7) return '#e74c3c';
    if (correlation > 0.3) return '#f39c12';
    if (correlation > -0.3) return '#95a5a6';
    if (correlation > -0.7) return '#3498db';
    return '#2c3e50';
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient colors={['#f3e5f5', '#ffffff']} style={styles.chartGradient}>
        <Text style={styles.chartTitle}>🔗 Correlation Matrix</Text>
        <Text style={styles.chartSubtitle}>Asset Correlations</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.correlationMatrix}>
            <View style={styles.correlationHeader}>
              <View style={styles.correlationCell} />
              {tickers?.map(ticker => (
                <View key={ticker} style={styles.correlationCell}>
                  <Text style={styles.correlationHeaderText}>{ticker}</Text>
                </View>
              ))}
            </View>
            
            {correlationMatrix?.map((row, i) => (
              <View key={i} style={styles.correlationRow}>
                <View style={styles.correlationCell}>
                  <Text style={styles.correlationHeaderText}>{tickers[i]}</Text>
                </View>
                {row?.map((correlation, j) => (
                  <View key={j} style={[
                    styles.correlationCell,
                    { backgroundColor: getCorrelationColor(correlation) + '20' }
                  ]}>
                    <Text style={[
                      styles.correlationValue,
                      { color: getCorrelationColor(correlation) }
                    ]}>
                      {correlation.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.correlationLegend}>
          <Text style={styles.legendText}>
            {"Strong: |r| > 0.7 • Moderate: 0.3–0.7 • Weak: |r| < 0.3"}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// FIXED: Capital Allocation Chart
export const CapitalAllocationChart: React.FC<CapitalAllocationProps> = ({ 
  riskyWeight, 
  riskFreeWeight, 
  tangencyWeights, 
  tickers,
  targetReturn,
  targetVolatility
}) => {
  if (!tangencyWeights || !tickers || tangencyWeights.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <LinearGradient colors={['#e8f5e8', '#ffffff']} style={styles.chartGradient}>
          <Text style={styles.chartTitle}>💰 Capital Allocation</Text>
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No allocation data available</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const allocationData = [
    {
      name: 'Risk-Free Asset',
      population: Math.round(riskFreeWeight * 100 * 100) / 100,
      color: '#95a5a6',
      legendFontColor: '#34495e',
      legendFontSize: 12,
    },
    {
      name: 'Risky Portfolio',
      population: Math.round(riskyWeight * 100 * 100) / 100,
      color: '#e74c3c',
      legendFontColor: '#34495e',
      legendFontSize: 12,
    }
  ];

  return (
    <View style={styles.chartContainer}>
      <LinearGradient colors={['#e8f5e8', '#ffffff']} style={styles.chartGradient}>
        <Text style={styles.chartTitle}>💰 Capital Allocation Line</Text>
        <Text style={styles.chartSubtitle}>Risk-Free vs Risky Assets</Text>
        
        <PieChart
          data={allocationData}
          width={chartWidth}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(39, 174, 96, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          style={styles.chart}
          absolute
        />

        <View style={styles.allocationDetails}>
          <View style={styles.allocationRow}>
            <Text style={styles.allocationLabel}>Risky Portfolio Weight:</Text>
            <Text style={styles.allocationValue}>{(riskyWeight * 100).toFixed(1)}%</Text>
          </View>
          <View style={styles.allocationRow}>
            <Text style={styles.allocationLabel}>Risk-Free Weight:</Text>
            <Text style={styles.allocationValue}>{(riskFreeWeight * 100).toFixed(1)}%</Text>
          </View>
          {targetReturn && (
            <View style={styles.allocationRow}>
              <Text style={styles.allocationLabel}>Target Return:</Text>
              <Text style={styles.allocationValue}>{(targetReturn * 100).toFixed(2)}%</Text>
            </View>
          )}
          {targetVolatility && (
            <View style={styles.allocationRow}>
              <Text style={styles.allocationLabel}>Target Volatility:</Text>
              <Text style={styles.allocationValue}>{(targetVolatility * 100).toFixed(2)}%</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

// Enhanced StyleSheet
const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 15,
    marginHorizontal: 20,
    borderRadius: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chartGradient: {
    padding: 20,
    borderRadius: 20,
  },
  chartTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 5,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 15,
  },
  debugPanel: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 11,
    color: '#6c757d',
    textAlign: 'center',
  },
  svgContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  colorLegend: {
    marginTop: 15,
    paddingVertical: 10,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  colorBar: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  },
  colorSegment: {
    flex: 1,
  },
  legendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  statItem: {
    alignItems: 'center',
    minWidth: '22%',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  legend: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendLine: {
    width: 20,
    height: 3,
    marginRight: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  scatterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgb(94, 201, 98)',
    marginRight: 10,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e74c3c',
    marginRight: 8,
  },
  blackDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2c3e50',
    marginRight: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 5,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  weightsList: {
    marginTop: 15,
  },
  weightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f8f9fa',
    marginVertical: 2,
    borderRadius: 8,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  tickerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  weightText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  capmStats: {
    marginTop: 15,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  capmDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  capmItem: {
    alignItems: 'center',
    minWidth: '30%',
    marginVertical: 8,
  },
  capmTicker: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  capmBeta: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  capmAlpha: {
    fontSize: 12,
    color: '#e74c3c',
  },
  allocationDetails: {
    marginTop: 15,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  allocationLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  allocationValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  correlationMatrix: {
    marginTop: 10,
  },
  correlationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  correlationCell: {
    flex: 1,
    alignItems: 'center',
  },
  correlationHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  correlationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  correlationValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  correlationLegend: {
    marginTop: 10,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
});
