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
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
Chart.register(...registerables);

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

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

  // Ensure weights and tickers have same length
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
    population: Math.round(validWeights[index] * 100 * 100) / 100, // Round to 2 decimals
    color: colors[index % colors.length],
    legendFontColor: '#34495e',
    legendFontSize: 12,
  }));

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

// FIXED: Efficient Frontier Chart with proper validation
export const EfficientFrontierChart: React.FC<EfficientFrontierProps> = ({ 
  efficientFrontier, 
  optimalPortfolio, 
  allSimulations = [],
  riskFreeRate = 0.02,
  showCapitalMarketLine = false
}) => {
  // Validation
  if (!efficientFrontier || efficientFrontier.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <LinearGradient colors={['#e3f2fd', '#ffffff']} style={styles.chartGradient}>
          <Text style={styles.chartTitle}>📈 Efficient Frontier</Text>
          <View style={styles.emptyState}>
            <Ionicons name="trending-up-outline" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No frontier data available</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Prepare chart data
  const frontierPoints = efficientFrontier.slice(0, 20); // Limit points for readability
  
  const chartData = {
    labels: frontierPoints.map(p => (p.volatility * 100).toFixed(1)),
    datasets: [
      {
        data: frontierPoints.map(p => p.expectedReturn * 100),
        color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
        strokeWidth: 3,
      }
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient colors={['#e3f2fd', '#ffffff']} style={styles.chartGradient}>
        <Text style={styles.chartTitle}>📈 Efficient Frontier</Text>
        <Text style={styles.chartSubtitle}>Risk-Return Optimization (Markowitz)</Text>
        
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
          withDots={true}
          withShadow={false}
          withInnerLines={false}
        />

        {optimalPortfolio && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Optimal Portfolio</Text>
              <Text style={styles.statValue}>
                Sharpe: {optimalPortfolio.sharpeRatio.toFixed(3)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Expected Return</Text>
              <Text style={styles.statValue}>
                {(optimalPortfolio.expectedReturn * 100).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Volatility</Text>
              <Text style={styles.statValue}>
                {(optimalPortfolio.volatility * 100).toFixed(2)}%
              </Text>
            </View>
          </View>
        )}
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
    marginVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartGradient: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 18,
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
    marginVertical: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 2,
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
    marginTop: 10,
    alignItems: 'center',
  },
  capmDetails: {
    flexDirection: 'row',
    marginTop: 15,
  },
  capmItem: {
    alignItems: 'center',
    marginHorizontal: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    minWidth: 80,
  },
  capmTicker: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  capmBeta: {
    fontSize: 14,
    color: '#e74c3c',
    marginTop: 5,
  },
  capmAlpha: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  correlationMatrix: {
    alignItems: 'center',
    marginVertical: 10,
  },
  correlationHeader: {
    flexDirection: 'row',
  },
  correlationRow: {
    flexDirection: 'row',
  },
  correlationCell: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#ecf0f1',
  },
  correlationHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  correlationValue: {
    fontSize: 11,
    fontWeight: '600',
  },
  correlationLegend: {
    marginTop: 10,
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  allocationDetails: {
    marginTop: 15,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    marginVertical: 2,
    borderRadius: 8,
  },
  allocationLabel: {
    fontSize: 14,
    color: '#2c3e50',
  },
  allocationValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
});
