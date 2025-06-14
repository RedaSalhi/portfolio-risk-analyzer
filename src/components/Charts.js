// src/components/Charts.tsx - ENHANCED MOBILE CHART COMPONENTS
// Professional visualizations optimized for mobile devices

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 40;

// Chart configuration for consistent styling
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
  style: {
    borderRadius: 12,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#4A90E2'
  },
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: '#E0E0E0',
    strokeDasharray: '5,5'
  }
};

// Enhanced color palette for better mobile visibility
const colors = [
  '#4A90E2', // Blue
  '#50C878', // Green  
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#9B59B6', // Purple
  '#F39C12', // Orange
  '#1ABC9C', // Teal
  '#E74C3C', // Dark Red
  '#3498DB', // Light Blue
  '#2ECC71', // Light Green
  '#F1C40F', // Gold
  '#E67E22', // Dark Orange
  '#9C88FF', // Lavender
  '#FF8C94', // Pink
  '#45B7D1', // Sky Blue
];

interface PortfolioWeightsChartProps {
  weights: number[];
  tickers: string[];
  title: string;
}

export const PortfolioWeightsChart: React.FC<PortfolioWeightsChartProps> = ({
  weights,
  tickers,
  title
}) => {
  // Prepare data for pie chart
  const pieData = weights.map((weight, index) => ({
    name: tickers[index],
    population: weight * 100,
    color: colors[index % colors.length],
    legendFontColor: '#2C3E50',
    legendFontSize: 12,
  })).filter(item => item.population > 0.5); // Filter out very small weights

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      {pieData.length > 0 ? (
        <>
          <PieChart
            data={pieData}
            width={chartWidth}
            height={250}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            hasLegend={false} // We'll create custom legend
          />
          
          {/* Custom Legend */}
          <ScrollView style={styles.legend} showsVerticalScrollIndicator={false}>
            {pieData.map((item, index) => (
              <View key={item.name} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>
                  {item.name}: {item.population.toFixed(1)}%
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No significant positions to display</Text>
        </View>
      )}
    </View>
  );
};

interface EfficientFrontierChartProps {
  frontierData: Array<{return: number, risk: number, sharpe: number}>;
  currentPortfolio: {return: number, risk: number, sharpe: number};
  title: string;
}

export const EfficientFrontierChart: React.FC<EfficientFrontierChartProps> = ({
  frontierData,
  currentPortfolio,
  title
}) => {
  if (!frontierData || frontierData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Efficient frontier data not available</Text>
        </View>
      </View>
    );
  }

  // Prepare data for line chart
  const chartData = {
    labels: frontierData.map((_, index) => 
      index % Math.floor(frontierData.length / 5) === 0 ? 
      `${(frontierData[index].risk * 100).toFixed(0)}%` : ''
    ),
    datasets: [
      {
        data: frontierData.map(point => point.return * 100),
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 3,
      }
    ]
  };

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <LineChart
        data={chartData}
        width={chartWidth}
        height={250}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        }}
        bezier
        style={styles.chart}
        yAxisSuffix="%"
        xAxisLabel="Risk →"
        yAxisLabel="Return ↑"
      />
      
      {/* Current Portfolio Indicator */}
      <View style={styles.portfolioIndicator}>
        <View style={styles.indicatorRow}>
          <View style={[styles.indicatorDot, { backgroundColor: '#E74C3C' }]} />
          <Text style={styles.indicatorText}>
            Current Portfolio: {(currentPortfolio.return * 100).toFixed(2)}% return, 
            {(currentPortfolio.risk * 100).toFixed(2)}% risk
          </Text>
        </View>
        <Text style={styles.indicatorSubtext}>
          Sharpe Ratio: {currentPortfolio.sharpe.toFixed(3)}
        </Text>
      </View>
    </View>
  );
};

interface CAPMAnalysisChartProps {
  capmReturns: { [key: string]: number };
  betas: { [key: string]: number };
  alphas: { [key: string]: number };
  tickers: string[];
  marketReturn: number;
  riskFreeRate: number;
}

export const CAPMAnalysisChart: React.FC<CAPMAnalysisChartProps> = ({
  capmReturns,
  betas,
  alphas,
  tickers,
  marketReturn,
  riskFreeRate
}) => {
  if (!capmReturns || Object.keys(capmReturns).length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>CAPM Analysis</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Market benchmark data required for CAPM analysis</Text>
        </View>
      </View>
    );
  }

  // Prepare beta chart data
  const betaData = {
    labels: tickers.map(ticker => ticker.length > 4 ? ticker.substring(0, 4) : ticker),
    datasets: [{
      data: tickers.map(ticker => betas[ticker] || 0),
      color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
      strokeWidth: 2,
    }]
  };

  return (
    <ScrollView style={styles.chartContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.chartTitle}>CAPM Analysis</Text>
      
      {/* Market Information */}
      <View style={styles.capmInfo}>
        <Text style={styles.capmInfoTitle}>Market Environment</Text>
        <Text style={styles.capmInfoText}>
          Risk-free rate: {(riskFreeRate * 100).toFixed(3)}%
        </Text>
        <Text style={styles.capmInfoText}>
          Market return: {(marketReturn * 100).toFixed(2)}%
        </Text>
        <Text style={styles.capmInfoText}>
          Market risk premium: {((marketReturn - riskFreeRate) * 100).toFixed(2)}%
        </Text>
      </View>

      {/* Beta Chart */}
      <Text style={styles.subChartTitle}>Beta Coefficients</Text>
      <BarChart
        data={betaData}
        width={chartWidth}
        height={200}
        chartConfig={chartConfig}
        style={styles.chart}
        yAxisSuffix=""
        showValuesOnTopOfBars={true}
      />

      {/* Beta Reference Line */}
    <View style={styles.betaReference}>
      <Text style={styles.referenceText}>
        "Beta = 1.0 (Market Risk) • Beta > 1.0 (Higher Risk) • Beta < 1.0 (Lower Risk)"
      </Text>
    </View>

      {/* CAPM Details Table */}
      <View style={styles.capmTable}>
        <View style={styles.capmHeader}>
          <Text style={[styles.capmHeaderText, { flex: 2 }]}>Asset</Text>
          <Text style={[styles.capmHeaderText, { flex: 1.5 }]}>Beta</Text>
          <Text style={[styles.capmHeaderText, { flex: 1.5 }]}>Alpha</Text>
          <Text style={[styles.capmHeaderText, { flex: 2 }]}>Expected Return</Text>
        </View>
        
        {tickers.map((ticker, index) => (
          <View key={ticker} style={styles.capmRow}>
            <Text style={[styles.capmCellText, { flex: 2, fontWeight: '600' }]}>{ticker}</Text>
            <Text style={[styles.capmCellText, { flex: 1.5 }]}>
              {(betas[ticker] || 0).toFixed(3)}
            </Text>
            <Text style={[styles.capmCellText, { 
              flex: 1.5,
              color: (alphas[ticker] || 0) > 0 ? '#27AE60' : '#E74C3C'
            }]}>
              {((alphas[ticker] || 0) * 100).toFixed(2)}%
            </Text>
            <Text style={[styles.capmCellText, { flex: 2 }]}>
              {((capmReturns[ticker] || 0) * 100).toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>

      {/* CAPM Interpretation */}
      <View style={styles.capmInterpretation}>
        <Text style={styles.interpretationTitle}>Interpretation</Text>
        <Text style={styles.interpretationText}>
          • <Text style={styles.boldText}>Beta</Text>: Measures systematic risk relative to market
        </Text>
        <Text style={styles.interpretationText}>
          • <Text style={styles.boldText}>Alpha</Text>: Risk-adjusted excess return vs. CAPM prediction
        </Text>
        <Text style={styles.interpretationText}>
          • <Text style={styles.boldText}>Positive Alpha</Text>: Outperforming market expectations
        </Text>
      </View>
    </ScrollView>
  );
};

interface CorrelationMatrixChartProps {
  correlationMatrix: number[][];
  tickers: string[];
  title: string;
}

export const CorrelationMatrixChart: React.FC<CorrelationMatrixChartProps> = ({
  correlationMatrix,
  tickers,
  title
}) => {
  if (!correlationMatrix || correlationMatrix.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Correlation data not available</Text>
        </View>
      </View>
    );
  }

  // Function to get color based on correlation value
  const getCorrelationColor = (value: number): string => {
    if (value > 0.7) return '#E74C3C'; // Strong positive - Red
    if (value > 0.3) return '#F39C12'; // Moderate positive - Orange
    if (value > -0.3) return '#95A5A6'; // Weak - Gray
    if (value > -0.7) return '#3498DB'; // Moderate negative - Blue
    return '#2ECC71'; // Strong negative - Green
  };

  return (
    <ScrollView style={styles.chartContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      {/* Correlation Matrix */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.correlationMatrix}>
          {/* Header Row */}
          <View style={styles.correlationHeaderRow}>
            <View style={styles.correlationCell} />
            {tickers.map(ticker => (
              <View key={ticker} style={styles.correlationCell}>
                <Text style={styles.correlationHeaderText}>{ticker}</Text>
              </View>
            ))}
          </View>
          
          {/* Data Rows */}
          {tickers.map((rowTicker, rowIndex) => (
            <View key={rowTicker} style={styles.correlationRow}>
              <View style={styles.correlationCell}>
                <Text style={styles.correlationHeaderText}>{rowTicker}</Text>
              </View>
              {tickers.map((colTicker, colIndex) => {
                const correlation = correlationMatrix[rowIndex]?.[colIndex] || 0;
                return (
                  <TouchableOpacity
                    key={colTicker}
                    style={[
                      styles.correlationCell,
                      { backgroundColor: getCorrelationColor(correlation) }
                    ]}
                  >
                    <Text style={styles.correlationValue}>
                      {correlation.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Correlation Legend */}
      <View style={styles.correlationLegend}>
        <Text style={styles.legendTitle}>Correlation Strength</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendSquare, { backgroundColor: '#E74C3C' }]} />
          <Text style={styles.legendLabel}>Strong Positive (>0.7)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSquare, { backgroundColor: '#F39C12' }]} />
          <Text style={styles.legendLabel}>Moderate Positive (0.3-0.7)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSquare, { backgroundColor: '#95A5A6' }]} />
          <Text style={styles.legendLabel}>Weak (-0.3-0.3)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSquare, { backgroundColor: '#3498DB' }]} />
          <Text style={styles.legendLabel}>Moderate Negative (-0.7--0.3)</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendSquare, { backgroundColor: '#2ECC71' }]} />
          <Text style={styles.legendLabel}>Strong Negative (<-0.7)</Text>
        </View>
      </View>

      {/* Diversification Insights */}
      <View style={styles.diversificationInsights}>
        <Text style={styles.insightsTitle}>Diversification Analysis</Text>
        {(() => {
          const avgCorrelation = correlationMatrix.reduce((sum, row, i) => {
            return sum + row.reduce((rowSum, val, j) => {
              return i !== j ? rowSum + val : rowSum;
            }, 0);
          }, 0) / (tickers.length * (tickers.length - 1));

          const highCorrelations = correlationMatrix.reduce((count, row, i) => {
            return count + row.reduce((rowCount, val, j) => {
              return i !== j && val > 0.7 ? rowCount + 1 : rowCount;
            }, 0);
          }, 0) / 2; // Divide by 2 to avoid double counting

          return (
            <>
              <Text style={styles.insightText}>
                Average correlation: {avgCorrelation.toFixed(3)}
              </Text>
              <Text style={styles.insightText}>
                High correlations (>0.7): {highCorrelations} pairs
              </Text>
              <Text style={styles.insightText}>
                Diversification benefit: {avgCorrelation < 0.3 ? 'High' : avgCorrelation < 0.7 ? 'Moderate' : 'Low'}
              </Text>
            </>
          );
        })()}
      </View>
    </ScrollView>
  );
};

interface PerformanceChartProps {
  data: Array<{date: Date, value: number}>;
  title: string;
  color?: string;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  color = '#4A90E2'
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No performance data available</Text>
        </View>
      </View>
    );
  }

  // Prepare data for line chart
  const chartData = {
    labels: data.map((_, index) => 
      index % Math.floor(data.length / 6) === 0 ? 
      data[index].date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
    ),
    datasets: [{
      data: data.map(point => point.value),
      color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
      strokeWidth: 2,
    }]
  };

  const totalReturn = data.length > 1 ? 
    ((data[data.length - 1].value - data[0].value) / data[0].value * 100) : 0;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <LineChart
        data={chartData}
        width={chartWidth}
        height={220}
        chartConfig={{
          ...chartConfig,
          color: (opacity = 1) => color.replace('1)', `${opacity})`),
        }}
        bezier
        style={styles.chart}
      />
      
      <View style={styles.performanceStats}>
        <Text style={styles.performanceText}>
          Total Return: <Text style={{ 
            color: totalReturn >= 0 ? '#27AE60' : '#E74C3C',
            fontWeight: 'bold'
          }}>
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 15,
  },
  subChartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495E',
    marginTop: 20,
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  legend: {
    maxHeight: 120,
    marginTop: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  legendText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  noDataContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#95A5A6',
    textAlign: 'center',
  },
  portfolioIndicator: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  indicatorText: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
  },
  indicatorSubtext: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 20,
  },
  capmInfo: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  capmInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  capmInfoText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 4,
  },
  betaReference: {
    backgroundColor: '#EBF3FD',
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 20,
  },
  referenceText: {
    fontSize: 12,
    color: '#4A90E2',
    textAlign: 'center',
  },
  capmTable: {
    marginTop: 20,
  },
  capmHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  capmHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  capmRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  capmCellText: {
    fontSize: 13,
    color: '#34495E',
    textAlign: 'center',
  },
  capmInterpretation: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  interpretationText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 6,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  correlationMatrix: {
    minWidth: chartWidth,
  },
  correlationHeaderRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  correlationRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  correlationCell: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 2,
  },
  correlationHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  correlationValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  correlationLegend: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendSquare: {
    width: 16,
    height: 16,
    marginRight: 10,
  },
  legendLabel: {
    fontSize: 14,
    color: '#34495E',
  },
  diversificationInsights: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#EBF3FD',
    borderRadius: 8,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 10,
  },
  insightText: {
    fontSize: 14,
    color: '#34495E',
    marginBottom: 4,
  },
  performanceStats: {
    marginTop: 15,
    alignItems: 'center',
  },
  performanceText: {
    fontSize: 16,
    color: '#2C3E50',
  },
});
