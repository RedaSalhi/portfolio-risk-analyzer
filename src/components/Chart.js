// src/components/Chart.js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

// Simple Portfolio Pie Chart Component
export const PortfolioPieChart = ({ data, title = "Portfolio Allocation" }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#4B8BBE', '#4ECDC4', '#45B7D1', '#FF6B6B', '#FFA726', '#66BB6A', '#AB47BC'];
  
  let cumulativePercentage = 0;
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <View style={styles.pieContainer}>
        <View style={styles.pieChart}>
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const startAngle = cumulativePercentage * 3.6; // Convert to degrees
            cumulativePercentage += percentage;
            
            return (
              <View
                key={index}
                style={[
                  styles.pieSlice,
                  {
                    backgroundColor: colors[index % colors.length],
                    transform: [{ rotate: `${startAngle}deg` }],
                  }
                ]}
              />
            );
          })}
        </View>
        
        {/* Center circle */}
        <View style={styles.centerCircle}>
          <Text style={styles.centerText}>Portfolio</Text>
        </View>
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: colors[index % colors.length] }]} />
            <Text style={styles.legendText}>
              {item.label}: {((item.value / total) * 100).toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Simple Bar Chart for Returns/Performance
export const SimpleBarChart = ({ data, title = "Performance", color = "#4B8BBE" }) => {
  const maxValue = Math.max(...data.map(item => Math.abs(item.value)));
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.barScrollView}>
        <View style={styles.barChartContainer}>
          {data.map((item, index) => {
            const height = Math.abs(item.value) / maxValue * 100;
            const isNegative = item.value < 0;
            
            return (
              <View key={index} style={styles.barContainer}>
                <View style={styles.barWrapper}>
                  <LinearGradient
                    colors={isNegative ? ['#FF6B6B', '#FF8E8E'] : [color, `${color}80`]}
                    style={[
                      styles.bar,
                      {
                        height: `${height}%`,
                        alignSelf: isNegative ? 'flex-end' : 'flex-start',
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.label}</Text>
                <Text style={[styles.barValue, { color: isNegative ? '#FF6B6B' : color }]}>
                  {item.value.toFixed(2)}%
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// Risk Meter Component
export const RiskMeter = ({ riskLevel, maxRisk = 100, title = "Risk Level" }) => {
  const percentage = (riskLevel / maxRisk) * 100;
  let color = '#66BB6A'; // Green
  let riskText = 'Low';
  
  if (percentage > 70) {
    color = '#FF6B6B';
    riskText = 'High';
  } else if (percentage > 40) {
    color = '#FFA726';
    riskText = 'Medium';
  }
  
  return (
    <View style={styles.riskMeterContainer}>
      <Text style={styles.riskMeterTitle}>{title}</Text>
      
      <View style={styles.meterContainer}>
        <View style={styles.meterBackground}>
          <LinearGradient
            colors={[color, `${color}80`]}
            style={[styles.meterFill, { width: `${percentage}%` }]}
          />
        </View>
        
        <View style={styles.riskIndicator}>
          <Text style={[styles.riskValue, { color }]}>
            {riskLevel.toFixed(1)}
          </Text>
          <Text style={[styles.riskLabel, { color }]}>
            {riskText} Risk
          </Text>
        </View>
      </View>
      
      <View style={styles.riskScale}>
        <Text style={styles.scaleText}>0</Text>
        <Text style={styles.scaleText}>{maxRisk}</Text>
      </View>
    </View>
  );
};

// VaR Visualization Component
export const VaRChart = ({ varValue, confidence, returns, title = "Value at Risk" }) => {
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const varIndex = Math.floor((1 - confidence) * returns.length);
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      
      <View style={styles.varContainer}>
        {/* Main VaR Display */}
        <LinearGradient
          colors={['#FF6B6B', '#FF8E8E']}
          style={styles.varMainCard}
        >
          <Ionicons name="trending-down" size={32} color="white" />
          <Text style={styles.varMainValue}>
            ${Math.abs(varValue).toLocaleString()}
          </Text>
          <Text style={styles.varMainLabel}>
            {(confidence * 100).toFixed(0)}% VaR
          </Text>
        </LinearGradient>
        
        {/* Risk Metrics */}
        <View style={styles.varMetrics}>
          <View style={styles.varMetric}>
            <Text style={styles.varMetricValue}>
              {(varValue / 1000000 * 100).toFixed(2)}%
            </Text>
            <Text style={styles.varMetricLabel}>of Portfolio</Text>
          </View>
          
          <View style={styles.varMetric}>
            <Text style={styles.varMetricValue}>
              {((1 - confidence) * 100).toFixed(1)}%
            </Text>
            <Text style={styles.varMetricLabel}>Expected Frequency</Text>
          </View>
        </View>
        
        {/* Simple Distribution Visualization */}
        <View style={styles.distributionContainer}>
          <Text style={styles.distributionTitle}>Return Distribution</Text>
          <View style={styles.distributionBars}>
            {sortedReturns.slice(0, 20).map((returnVal, index) => {
              const isVaRBreach = index < varIndex;
              return (
                <View
                  key={index}
                  style={[
                    styles.distributionBar,
                    {
                      backgroundColor: isVaRBreach ? '#FF6B6B' : '#4B8BBE',
                      height: Math.random() * 30 + 10, // Simplified visualization
                    }
                  ]}
                />
              );
            })}
          </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f4e79',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  // Pie Chart Styles
  pieContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pieChart: {
    width: 150,
    height: 150,
    borderRadius: 75,
    position: 'relative',
    overflow: 'hidden',
  },
  pieSlice: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    top: 0,
    left: '50%',
    transformOrigin: 'left bottom',
  },
  centerCircle: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  centerText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  
  // Bar Chart Styles
  barScrollView: {
    marginBottom: 10,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 150,
    paddingHorizontal: 10,
  },
  barContainer: {
    alignItems: 'center',
    marginHorizontal: 8,
    minWidth: 60,
  },
  barWrapper: {
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  bar: {
    width: 30,
    borderRadius: 4,
    minHeight: 5,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  barValue: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Risk Meter Styles
  riskMeterContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 8,
    elevation: 2,
  },
  riskMeterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  meterContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  meterBackground: {
    width: '100%',
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  meterFill: {
    height: '100%',
    borderRadius: 10,
  },
  riskIndicator: {
    alignItems: 'center',
  },
  riskValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  riskScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  scaleText: {
    fontSize: 12,
    color: '#999',
  },
  
  // VaR Chart Styles
  varContainer: {
    alignItems: 'center',
  },
  varMainCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    minWidth: 200,
  },
  varMainValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginVertical: 8,
  },
  varMainLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  varMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  varMetric: {
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
  },
  varMetricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  varMetricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  distributionContainer: {
    width: '100%',
    marginTop: 10,
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  distributionBars: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 50,
  },
  distributionBar: {
    width: 8,
    marginHorizontal: 1,
    borderRadius: 2,
  },
});