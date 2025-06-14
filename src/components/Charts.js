// src/components/Charts.js
// SIMPLIFIED VERSION - Works without react-native-chart-kit
// Falls back to simple styled components if chart library not available

import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const screenWidth = Dimensions.get('window').width;

/**
 * VaR Metrics Summary Card (always works)
 */
export const VaRMetricsCard = ({ var95, var99, expectedShortfall, volatility, title = "VaR Metrics" }) => {
  const formatCurrency = (value) => `$${(Math.abs(value) / 1000).toFixed(0)}k`;
  const formatPercent = (value) => `${(value * 100).toFixed(2)}%`;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.metricsGrid}>
        <View style={[styles.metricCard, { backgroundColor: '#FFE5E5' }]}>
          <Text style={styles.metricLabel}>VaR (95%)</Text>
          <Text style={[styles.metricValue, { color: '#E55656' }]}>
            {formatCurrency(var95)}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#FFE0E0' }]}>
          <Text style={styles.metricLabel}>VaR (99%)</Text>
          <Text style={[styles.metricValue, { color: '#C0392B' }]}>
            {formatCurrency(var99)}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#F3E5F5' }]}>
          <Text style={styles.metricLabel}>Expected Shortfall</Text>
          <Text style={[styles.metricValue, { color: '#8E44AD' }]}>
            {formatCurrency(expectedShortfall)}
          </Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: '#E8F4F8' }]}>
          <Text style={styles.metricLabel}>Daily Volatility</Text>
          <Text style={[styles.metricValue, { color: '#4B8BBE' }]}>
            {formatPercent(volatility)}
          </Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Simple Returns Distribution Display
 */
export const ReturnsDistributionChart = ({ returns, title = "Returns Distribution" }) => {
  // Calculate simple statistics
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / returns.length;
  const std = Math.sqrt(variance);
  const min = Math.min(...returns);
  const max = Math.max(...returns);

  // Create simple histogram data
  const numBins = 10;
  const binWidth = (max - min) / numBins;
  const bins = Array(numBins).fill(0);
  
  returns.forEach(r => {
    const binIndex = Math.min(Math.floor((r - min) / binWidth), numBins - 1);
    bins[binIndex]++;
  });

  const maxCount = Math.max(...bins);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      {/* Simple histogram using bars */}
      <View style={styles.histogramContainer}>
        {bins.map((count, index) => {
          const height = (count / maxCount) * 100; // Max height 100
          const binStart = min + index * binWidth;
          return (
            <View key={index} style={styles.histogramBar}>
              <View 
                style={[
                  styles.histogramBarFill, 
                  { 
                    height: height,
                    backgroundColor: '#4B8BBE'
                  }
                ]} 
              />
              <Text style={styles.histogramLabel}>
                {(binStart * 100).toFixed(1)}%
              </Text>
            </View>
          );
        })}
      </View>
      
      <View style={styles.statsRow}>
        <Text style={styles.statText}>Mean: {(mean * 100).toFixed(3)}%</Text>
        <Text style={styles.statText}>Std: {(std * 100).toFixed(3)}%</Text>
        <Text style={styles.statText}>Min: {(min * 100).toFixed(2)}%</Text>
        <Text style={styles.statText}>Max: {(max * 100).toFixed(2)}%</Text>
      </View>
    </View>
  );
};

/**
 * Simple P&L vs VaR Display
 */
export const PnLVsVaRChart = ({ pnlData, varValue, breaches, title = "P&L vs VaR" }) => {
  // Sample data for display (show every 10th point to avoid clutter)
  const sampledData = pnlData.filter((_, index) => index % Math.max(1, Math.floor(pnlData.length / 20)) === 0);
  const maxPnL = Math.max(...pnlData);
  const minPnL = Math.min(...pnlData);
  const range = maxPnL - minPnL;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      {/* Simple line representation */}
      <View style={styles.lineChartContainer}>
        <View style={styles.lineChart}>
          {sampledData.map((pnl, index) => {
            const y = ((pnl - minPnL) / range) * 80; // Scale to 80% of container
            const isVaRBreach = pnl < -varValue;
            return (
              <View
                key={index}
                style={[
                  styles.dataPoint,
                  {
                    left: (index / sampledData.length) * 100 + '%',
                    bottom: y + '%',
                    backgroundColor: isVaRBreach ? '#E55656' : '#4B8BBE'
                  }
                ]}
              />
            );
          })}
          
          {/* VaR threshold line */}
          <View 
            style={[
              styles.varLine,
              { bottom: ((-varValue - minPnL) / range) * 80 + '%' }
            ]}
          />
        </View>
      </View>
      
      <View style={styles.chartInfo}>
        <Text style={styles.infoText}>VaR Breaches: {breaches}</Text>
        <Text style={styles.infoText}>VaR Threshold: ${(varValue/1000).toFixed(0)}k</Text>
      </View>
    </View>
  );
};

/**
 * Monte Carlo Simulation Summary
 */
export const MonteCarloChart = ({ simulations, varValue, title = "Monte Carlo Results" }) => {
  // Simple statistics
  const mean = simulations.reduce((a, b) => a + b, 0) / simulations.length;
  const min = Math.min(...simulations);
  const max = Math.max(...simulations);
  const percentile5 = simulations.sort((a, b) => a - b)[Math.floor(simulations.length * 0.05)];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <View style={styles.simulationStats}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Simulations</Text>
          <Text style={styles.statValue}>{simulations.length.toLocaleString()}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Mean P&L</Text>
          <Text style={styles.statValue}>${(mean/1000).toFixed(0)}k</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>5th Percentile</Text>
          <Text style={[styles.statValue, {color: '#E55656'}]}>
            ${(percentile5/1000).toFixed(0)}k
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>VaR</Text>
          <Text style={[styles.statValue, {color: '#C0392B'}]}>
            ${(varValue/1000).toFixed(0)}k
          </Text>
        </View>
      </View>
      
      {/* Simple range visualization */}
      <View style={styles.rangeVisualization}>
        <View style={styles.rangeBar}>
          <View style={[styles.rangeSegment, {backgroundColor: '#E55656', flex: 0.05}]} />
          <View style={[styles.rangeSegment, {backgroundColor: '#FFB74D', flex: 0.90}]} />
          <View style={[styles.rangeSegment, {backgroundColor: '#4CAF50', flex: 0.05}]} />
        </View>
        <View style={styles.rangeLabels}>
          <Text style={styles.rangeLabel}>Worst 5%</Text>
          <Text style={styles.rangeLabel}>Middle 90%</Text>
          <Text style={styles.rangeLabel}>Best 5%</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Correlation Matrix Display
 */
export const CorrelationMatrixChart = ({ correlationMatrix, assetNames, title = "Correlation Matrix" }) => {
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <View style={styles.correlationMatrix}>
        {/* Header row */}
        <View style={styles.matrixRow}>
          <View style={styles.matrixCornerCell} />
          {assetNames.map((name, index) => (
            <View key={index} style={styles.matrixHeaderCell}>
              <Text style={styles.matrixHeaderText}>{name}</Text>
            </View>
          ))}
        </View>
        
        {/* Data rows */}
        {correlationMatrix.map((row, i) => (
          <View key={i} style={styles.matrixRow}>
            <View style={styles.matrixHeaderCell}>
              <Text style={styles.matrixHeaderText}>{assetNames[i]}</Text>
            </View>
            {row.map((correlation, j) => {
              const backgroundColor = 
                correlation > 0.7 ? '#d73027' : 
                correlation > 0.3 ? '#f46d43' :
                correlation > -0.3 ? '#ffffbf' :
                correlation > -0.7 ? '#74add1' : '#313695';
              
              return (
                <View
                  key={j}
                  style={[styles.matrixCell, { backgroundColor }]}
                >
                  <Text style={styles.correlationText}>
                    {correlation.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
      
      <Text style={styles.chartSubtitle}>
        Red: Strong positive • Blue: Strong negative • Yellow: Weak correlation
      </Text>
    </View>
  );
};

/**
 * Portfolio Weights Display
 */
export const PortfolioWeightsChart = ({ weights, assetNames, title = "Portfolio Weights" }) => {
  const colors = [
    '#4B8BBE', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F39C12',
    '#9B59B6', '#E67E22', '#2ECC71', '#E74C3C', '#34495E'
  ];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      {/* Weight list */}
      <View style={styles.weightsContainer}>
        {weights.map((weight, index) => (
          <View key={index} style={styles.weightItem}>
            <View style={[styles.colorBox, { backgroundColor: colors[index % colors.length] }]} />
            <Text style={styles.weightLabel}>{assetNames[index]}</Text>
            <Text style={styles.weightValue}>{(weight * 100).toFixed(1)}%</Text>
          </View>
        ))}
      </View>
      
      {/* Simple pie visualization */}
      <View style={styles.pieVisualization}>
        {weights.map((weight, index) => (
          <View 
            key={index}
            style={[
              styles.pieSegment, 
              { 
                flex: weight,
                backgroundColor: colors[index % colors.length]
              }
            ]} 
          />
        ))}
      </View>
    </View>
  );
};

/**
 * Performance Metrics Display
 */
export const PerformanceChart = ({ expectedReturn, volatility, benchmarkReturn = 0.1, benchmarkVol = 0.15, title = "Risk-Return Profile" }) => {
  const sharpeRatio = (expectedReturn - 0.05) / volatility;
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <View style={styles.performanceGrid}>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Expected Return</Text>
          <Text style={[styles.performanceValue, {color: '#4B8BBE'}]}>
            {(expectedReturn * 100).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Volatility</Text>
          <Text style={[styles.performanceValue, {color: '#FF6B6B'}]}>
            {(volatility * 100).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.performanceItem}>
          <Text style={styles.performanceLabel}>Sharpe Ratio</Text>
          <Text style={[styles.performanceValue, {color: sharpeRatio > 1 ? '#2ECC71' : '#E67E22'}]}>
            {sharpeRatio.toFixed(3)}
          </Text>
        </View>
      </View>
      
      {/* Risk-Return comparison */}
      <View style={styles.comparisonContainer}>
        <Text style={styles.comparisonTitle}>vs Benchmark</Text>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>Return Difference:</Text>
          <Text style={[styles.comparisonValue, {color: expectedReturn > benchmarkReturn ? '#2ECC71' : '#E74C3C'}]}>
            {((expectedReturn - benchmarkReturn) * 100).toFixed(2)}%
          </Text>
        </View>
        <View style={styles.comparisonRow}>
          <Text style={styles.comparisonLabel}>Risk Difference:</Text>
          <Text style={[styles.comparisonValue, {color: volatility < benchmarkVol ? '#2ECC71' : '#E74C3C'}]}>
            {((volatility - benchmarkVol) * 100).toFixed(2)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 12,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  histogramContainer: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  histogramBar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 1,
  },
  histogramBarFill: {
    width: '80%',
    marginBottom: 4,
  },
  histogramLabel: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statText: {
    fontSize: 10,
    color: '#333',
  },
  lineChartContainer: {
    height: 100,
    marginVertical: 12,
  },
  lineChart: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  dataPoint: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  varLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E55656',
    opacity: 0.8,
  },
  chartInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
  },
  simulationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  rangeVisualization: {
    marginTop: 12,
  },
  rangeBar: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  rangeSegment: {
    height: '100%',
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 10,
    color: '#666',
  },
  correlationMatrix: {
    alignSelf: 'center',
  },
  matrixRow: {
    flexDirection: 'row',
  },
  matrixCornerCell: {
    width: 50,
    height: 25,
  },
  matrixHeaderCell: {
    width: 50,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  matrixHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  matrixCell: {
    width: 50,
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#ddd',
  },
  correlationText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
  },
  weightsContainer: {
    marginBottom: 12,
  },
  weightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  colorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 8,
  },
  weightLabel: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  weightValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4B8BBE',
  },
  pieVisualization: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  pieSegment: {
    height: '100%',
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  comparisonContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
  },
  comparisonValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});