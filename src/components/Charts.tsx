// src/components/Charts.tsx - ENHANCED WITH BEAUTIFUL ANIMATIONS
// Enhanced with beautiful animations, better interactions, and modern design

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { VictoryChart, VictoryScatter, VictoryPie, VictoryArea, VictoryAxis, 
         VictoryLine, VictoryLabel, VictoryTheme, VictoryContainer, VictoryTooltip,
         VictoryBar, VictoryBoxPlot } from 'victory-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;
const chartHeight = 300;

// Enhanced Performance Chart with beautiful animations
interface PerformanceChartProps {
  data: Array<{
    date: Date;
    value: number;
    portfolio?: number;
    benchmark?: number;
  }>;
  title?: string;
  showBenchmark?: boolean;
  showDrawdown?: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title = "Portfolio Performance",
  showBenchmark = true,
  showDrawdown = false
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Prepare data for visualization
  const chartData = data.map((point, index) => ({
    x: index,
    y: point.value,
    portfolio: point.portfolio || point.value,
    benchmark: point.benchmark || 0,
    date: point.date,
    label: `${point.date.toLocaleDateString()}\nPortfolio: ${(point.value * 100).toFixed(2)}%${
      point.benchmark ? `\nBenchmark: ${(point.benchmark * 100).toFixed(2)}%` : ''
    }`
  }));

  const portfolioData = chartData.map(d => ({ x: d.x, y: d.portfolio * 100 }));
  const benchmarkData = showBenchmark ? chartData.map(d => ({ x: d.x, y: d.benchmark * 100 })) : [];

  return (
    <Animated.View 
      style={[
        styles.chartContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>{title}</Text>
        <Text style={styles.chartSubtitle}>
          Cumulative Returns Over Time
        </Text>
        
        <VictoryChart
          theme={VictoryTheme.material}
          width={chartWidth}
          height={chartHeight}
          padding={{ left: 80, top: 20, right: 60, bottom: 80 }}
          containerComponent={<VictoryContainer responsive={false} />}
        >
          {/* Performance area chart */}
          <VictoryArea
            data={portfolioData}
            style={{
              data: { 
                fill: "url(#portfolioGradient)", 
                fillOpacity: 0.6,
                stroke: "#1f4e79",
                strokeWidth: 3
              }
            }}
            animate={{
              duration: 2000,
              onLoad: { duration: 500 }
            }}
          />

          {/* Benchmark line */}
          {showBenchmark && benchmarkData.length > 0 && (
            <VictoryLine
              data={benchmarkData}
              style={{
                data: { 
                  stroke: "#e74c3c", 
                  strokeWidth: 2,
                  strokeDasharray: "5,5"
                }
              }}
              animate={{
                duration: 2000,
                onLoad: { duration: 1000 }
              }}
            />
          )}

          {/* Interactive points */}
          <VictoryScatter
            data={portfolioData.filter((_, i) => i % Math.floor(portfolioData.length / 10) === 0)}
            size={4}
            style={{
              data: { fill: "#1f4e79", stroke: "#ffffff", strokeWidth: 2 }
            }}
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{ 
                  fill: "white", 
                  stroke: "#1f4e79",
                  strokeWidth: 2,
                  dropShadow: "2px 2px 4px rgba(0,0,0,0.1)"
                }}
                style={{ fontSize: 12, fill: "#1f4e79" }}
              />
            }
            labels={({ datum, index }) => 
              `Portfolio: ${datum.y.toFixed(2)}%\nPeriod: ${Math.floor(index * portfolioData.length / 10)}`
            }
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
            tickFormat={() => ""}
            style={{
              tickLabels: { fontSize: 10, fill: "#444" },
              axis: { stroke: "#666" }
            }}
          />
        </VictoryChart>

        {/* Performance Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Return</Text>
            <Text style={[styles.statValue, { color: portfolioData[portfolioData.length - 1]?.y > 0 ? '#27ae60' : '#e74c3c' }]}>
              {portfolioData[portfolioData.length - 1]?.y.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Volatility</Text>
            <Text style={styles.statValue}>
              {calculateVolatility(portfolioData).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Max Drawdown</Text>
            <Text style={[styles.statValue, { color: '#e74c3c' }]}>
              {calculateMaxDrawdown(portfolioData).toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendColor, { backgroundColor: '#1f4e79' }]} />
            <Text style={styles.legendText}>Portfolio</Text>
          </View>
          {showBenchmark && (
            <View style={styles.legendRow}>
              <View style={[styles.legendColor, { backgroundColor: '#e74c3c', height: 2 }]} />
              <Text style={styles.legendText}>Benchmark</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Enhanced VaR Visualization Chart
interface VaRVisualizationProps {
  returns: number[];
  varValue: number;
  confidenceLevel: number;
  method: string;
  expectedShortfall?: number;
}

export const VaRVisualizationChart: React.FC<VaRVisualizationProps> = ({
  returns,
  varValue,
  confidenceLevel,
  method,
  expectedShortfall
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Create histogram data
  const histogram = createHistogram(returns, 50);
  const varPercentile = 1 - confidenceLevel;
  const varThreshold = -Math.abs(varValue);

  return (
    <Animated.View 
      style={[
        styles.chartContainer,
        { opacity: fadeAnim }
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#fff5f5']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>📊 VaR Distribution Analysis</Text>
        <Text style={styles.chartSubtitle}>
          {method} • {(confidenceLevel * 100).toFixed(0)}% Confidence Level
        </Text>
        
        <VictoryChart
          theme={VictoryTheme.material}
          width={chartWidth}
          height={chartHeight}
          padding={{ left: 80, top: 20, right: 60, bottom: 80 }}
        >
          {/* Histogram bars */}
          <VictoryBar
            data={histogram}
            style={{
              data: { 
                fill: ({ datum }) => datum.x < varThreshold ? "#e74c3c" : "#3498db",
                fillOpacity: 0.7,
                stroke: "#ffffff",
                strokeWidth: 1
              }
            }}
            animate={{
              duration: 1500,
              onLoad: { duration: 500 }
            }}
          />

          {/* VaR threshold line */}
          <VictoryLine
            data={[
              { x: varThreshold, y: 0 },
              { x: varThreshold, y: Math.max(...histogram.map(d => d.y)) }
            ]}
            style={{
              data: { stroke: "#e74c3c", strokeWidth: 3, strokeDasharray: "5,5" }
            }}
          />

          {/* Expected Shortfall line */}
          {expectedShortfall && (
            <VictoryLine
              data={[
                { x: -Math.abs(expectedShortfall), y: 0 },
                { x: -Math.abs(expectedShortfall), y: Math.max(...histogram.map(d => d.y)) }
              ]}
              style={{
                data: { stroke: "#8e44ad", strokeWidth: 2, strokeDasharray: "3,3" }
              }}
            />
          )}

          <VictoryAxis
            dependentAxis
            tickFormat={(x) => x.toString()}
            style={{
              tickLabels: { fontSize: 12, fill: "#444" },
              axis: { stroke: "#666" },
              grid: { stroke: "#f0f0f0" }
            }}
          />
          
          <VictoryAxis
            tickFormat={(x) => `${(x * 100).toFixed(1)}%`}
            style={{
              tickLabels: { fontSize: 11, fill: "#444" },
              axis: { stroke: "#666" }
            }}
          />
        </VictoryChart>

        {/* VaR Statistics */}
        <View style={styles.varStatsContainer}>
          <View style={[styles.varStatItem, { borderLeftColor: '#e74c3c' }]}>
            <Text style={styles.varStatLabel}>Value at Risk</Text>
            <Text style={[styles.varStatValue, { color: '#e74c3c' }]}>
              {(Math.abs(varValue) * 100).toFixed(2)}%
            </Text>
          </View>
          {expectedShortfall && (
            <View style={[styles.varStatItem, { borderLeftColor: '#8e44ad' }]}>
              <Text style={styles.varStatLabel}>Expected Shortfall</Text>
              <Text style={[styles.varStatValue, { color: '#8e44ad' }]}>
                {(Math.abs(expectedShortfall) * 100).toFixed(2)}%
              </Text>
            </View>
          )}
          <View style={[styles.varStatItem, { borderLeftColor: '#2980b9' }]}>
            <Text style={styles.varStatLabel}>Tail Probability</Text>
            <Text style={[styles.varStatValue, { color: '#2980b9' }]}>
              {(varPercentile * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Risk Interpretation */}
        <View style={styles.riskInterpretation}>
          <Text style={styles.interpretationTitle}>🎯 Risk Interpretation</Text>
          <Text style={styles.interpretationText}>
            With {(confidenceLevel * 100).toFixed(0)}% confidence, daily losses should not exceed{' '}
            <Text style={styles.interpretationHighlight}>
              {(Math.abs(varValue) * 100).toFixed(2)}%
            </Text>{' '}
            under normal market conditions.
          </Text>
          {expectedShortfall && (
            <Text style={styles.interpretationText}>
              If losses exceed VaR, the expected loss is{' '}
              <Text style={[styles.interpretationHighlight, { color: '#8e44ad' }]}>
                {(Math.abs(expectedShortfall) * 100).toFixed(2)}%
              </Text>
              .
            </Text>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Enhanced Risk Metrics Dashboard
interface RiskMetricsDashboardProps {
  metrics: {
    var95: number;
    var99: number;
    expectedShortfall: number;
    maxDrawdown: number;
    volatility: number;
    skewness: number;
    kurtosis: number;
    sharpeRatio: number;
  };
}

export const RiskMetricsDashboard: React.FC<RiskMetricsDashboardProps> = ({ metrics }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const riskMetrics = [
    { 
      label: 'VaR (95%)', 
      value: metrics.var95, 
      format: 'percentage', 
      icon: '⚠️',
      color: '#e74c3c',
      description: 'Maximum loss at 95% confidence'
    },
    { 
      label: 'VaR (99%)', 
      value: metrics.var99, 
      format: 'percentage', 
      icon: '🚨',
      color: '#c0392b',
      description: 'Maximum loss at 99% confidence'
    },
    { 
      label: 'Expected Shortfall', 
      value: metrics.expectedShortfall, 
      format: 'percentage', 
      icon: '📉',
      color: '#8e44ad',
      description: 'Average loss beyond VaR'
    },
    { 
      label: 'Max Drawdown', 
      value: metrics.maxDrawdown, 
      format: 'percentage', 
      icon: '⬇️',
      color: '#d35400',
      description: 'Largest peak-to-trough decline'
    },
    { 
      label: 'Volatility', 
      value: metrics.volatility, 
      format: 'percentage', 
      icon: '📊',
      color: '#2980b9',
      description: 'Annualized standard deviation'
    },
    { 
      label: 'Sharpe Ratio', 
      value: metrics.sharpeRatio, 
      format: 'ratio', 
      icon: '⚡',
      color: '#27ae60',
      description: 'Risk-adjusted return measure'
    },
    { 
      label: 'Skewness', 
      value: metrics.skewness, 
      format: 'ratio', 
      icon: '📈',
      color: '#f39c12',
      description: 'Distribution asymmetry'
    },
    { 
      label: 'Kurtosis', 
      value: metrics.kurtosis, 
      format: 'ratio', 
      icon: '🎯',
      color: '#9b59b6',
      description: 'Tail thickness measure'
    },
  ];

  return (
    <Animated.View 
      style={[
        styles.dashboardContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.dashboardGradient}
      >
        <Text style={styles.dashboardTitle}>📊 Risk Metrics Dashboard</Text>
        <Text style={styles.dashboardSubtitle}>Comprehensive Risk Analysis</Text>
        
        <View style={styles.metricsGrid}>
          {riskMetrics.map((metric, index) => (
            <Animated.View
              key={metric.label}
              style={[
                styles.metricCard,
                { borderLeftColor: metric.color }
              ]}
            >
              <TouchableOpacity 
                style={styles.metricContent}
                activeOpacity={0.8}
              >
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>{metric.icon}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
                
                <Text style={[styles.metricValue, { color: metric.color }]}>
                  {metric.format === 'percentage' 
                    ? `${(Math.abs(metric.value) * 100).toFixed(2)}%`
                    : metric.value.toFixed(3)
                  }
                </Text>
                
                <Text style={styles.metricDescription}>{metric.description}</Text>
                
                {/* Risk level indicator */}
                <View style={styles.riskIndicator}>
                  <View 
                    style={[
                      styles.riskBar,
                      { 
                        width: `${Math.min(Math.abs(metric.value) * 100, 100)}%`,
                        backgroundColor: metric.color + '30'
                      }
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
        
        {/* Risk Assessment Summary */}
        <View style={styles.riskSummary}>
          <Text style={styles.riskSummaryTitle}>🎯 Risk Assessment</Text>
          <Text style={styles.riskSummaryText}>
            {getRiskAssessment(metrics)}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Utility functions
function calculateVolatility(data: Array<{ x: number; y: number }>): number {
  if (data.length < 2) return 0;
  
  const returns = data.slice(1).map((point, i) => 
    (point.y - data[i].y) / data[i].y
  );
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  
  return Math.sqrt(variance * 252) * 100; // Annualized percentage
}

function calculateMaxDrawdown(data: Array<{ x: number; y: number }>): number {
  let maxDrawdown = 0;
  let peak = data[0]?.y || 0;
  
  for (const point of data) {
    if (point.y > peak) {
      peak = point.y;
    }
    const drawdown = (peak - point.y) / peak * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

function createHistogram(data: number[], bins: number): Array<{ x: number; y: number }> {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins;
  
  const histogram = Array(bins).fill(0).map((_, i) => ({
    x: min + i * binWidth + binWidth / 2,
    y: 0
  }));
  
  data.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
    histogram[binIndex].y++;
  });
  
  return histogram;
}

function getRiskAssessment(metrics: any): string {
  const var95 = Math.abs(metrics.var95) * 100;
  const volatility = metrics.volatility * 100;
  const sharpe = metrics.sharpeRatio;
  
  if (var95 < 2 && volatility < 15 && sharpe > 1) {
    return "✅ Low Risk: Portfolio shows conservative risk profile with good risk-adjusted returns.";
  } else if (var95 < 5 && volatility < 25 && sharpe > 0.5) {
    return "⚠️ Moderate Risk: Balanced risk-return profile suitable for most investors.";
  } else if (var95 < 10 && volatility < 40) {
    return "🔶 High Risk: Elevated risk levels requiring careful monitoring and risk management.";
  } else {
    return "🚨 Very High Risk: Extreme risk levels. Consider portfolio rebalancing or risk reduction strategies.";
  }
}

// Original charts (maintaining compatibility)
export { EfficientFrontierChart, PortfolioWeightsChart, CapitalAllocationChart, CAPMAnalysisChart, CorrelationMatrixChart } from './Charts';

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  chartGradient: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    marginRight: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  varStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  varStatItem: {
    alignItems: 'center',
    borderLeftWidth: 4,
    paddingLeft: 12,
    flex: 1,
  },
  varStatLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginBottom: 4,
    textAlign: 'center',
  },
  varStatValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  riskInterpretation: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 8,
  },
  interpretationText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    marginBottom: 8,
  },
  interpretationHighlight: {
    fontWeight: '700',
    color: '#e74c3c',
  },
  dashboardContainer: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dashboardGradient: {
    padding: 20,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricContent: {
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 10,
    color: '#7f8c8d',
    lineHeight: 12,
    marginBottom: 8,
  },
  riskIndicator: {
    height: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  riskBar: {
    height: '100%',
    borderRadius: 2,
  },
  riskSummary: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  riskSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 8,
  },
  riskSummaryText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});
