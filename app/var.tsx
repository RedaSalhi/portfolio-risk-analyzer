// app/var.tsx - ENHANCED PROFESSIONAL VAR ANALYZER
// Complete VaR analysis with component analysis, stress testing, and backtesting

import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
} from 'react-native';
import { PerformanceChart, CorrelationMatrixChart } from '../src/components/Charts';
import { realTimeDataFetcher } from '../src/utils/realTimeDataFetcher';
import { VaRCalculator } from '../src/utils/financialCalculations';

const { width } = Dimensions.get('window');

interface VaRResults {
  var95: number;
  var99: number;
  expectedShortfall: number;
  componentVaR?: { [key: string]: number };
  marginalVaR?: { [key: string]: number };
  diversificationBenefit?: number;
  method: string;
  confidenceLevel: number;
  positionSize: number;
  tickers: string[];
  correlationMatrix?: number[][];
  backtestResults?: {
    exceedances: number;
    exceedanceRate: number;
    expectedRate: number;
    kupiecTest: number;
  };
  stressResults?: Array<{
    scenario: string;
    loss: number;
    probability: number;
  }>;
  metadata: {
    dataSource: string;
    fetchTime: string;
    calculationTime: number;
  };
}

export default function EnhancedVaRAnalyzer() {
  // Core VaR inputs
  const [tickers, setTickers] = useState('AAPL,MSFT,GOOGL,TSLA,AMZN');
  const [weights, setWeights] = useState('20,20,20,20,20'); // Equal weights
  const [positionSize, setPositionSize] = useState(1000000);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  
  // VaR method selection
  const [varMethod, setVarMethod] = useState('parametric');
  const [timeHorizon, setTimeHorizon] = useState(1); // Days
  const [numSimulations, setNumSimulations] = useState(10000);
  
  // Advanced options
  const [includeStressTesting, setIncludeStressTesting] = useState(true);
  const [runBacktest, setRunBacktest] = useState(true);
  const [calculateComponents, setCalculateComponents] = useState(true);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VaRResults | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [dataHealth, setDataHealth] = useState<any>(null);

  // VaR methods
  const varMethods = [
    { key: 'parametric', label: 'Parametric VaR', icon: '📊', description: 'Normal distribution assumption' },
    { key: 'historical', label: 'Historical Simulation', icon: '📈', description: 'Based on historical returns' },
    { key: 'monteCarlo', label: 'Monte Carlo', icon: '🎲', description: 'Simulation-based approach' },
    { key: 'portfolio', label: 'Portfolio VaR', icon: '💼', description: 'Diversified portfolio analysis' },
    { key: 'componentVaR', label: 'Component VaR', icon: '🔍', description: 'Individual asset contributions' }
  ];

  // Stress test scenarios
  const stressScenarios = [
    { name: 'Market Crash', marketShock: -0.20, description: '20% market decline' },
    { name: 'Interest Rate Shock', bondShock: -0.10, description: '10% bond decline' },
    { name: 'Currency Crisis', currencyShock: -0.15, description: '15% USD strengthening' },
    { name: 'Black Swan Event', extremeShock: -0.30, description: '30% extreme decline' },
    { name: 'Correlation Breakdown', correlationShock: 0.9, description: 'Correlations spike to 0.9' }
  ];

  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const health = await realTimeDataFetcher.healthCheck();
      setDataHealth(health);
    } catch (error) {
      console.warn('Health check failed:', error);
    }
  };

  const parseWeights = (weightsString: string, tickerCount: number): number[] => {
    try {
      const weightArray = weightsString.split(',').map(w => parseFloat(w.trim()));
      
      if (weightArray.length !== tickerCount) {
        // Auto-generate equal weights
        return Array(tickerCount).fill(100 / tickerCount).map(w => w / 100);
      }
      
      const sum = weightArray.reduce((acc, w) => acc + w, 0);
      if (Math.abs(sum - 100) > 1) {
        Alert.alert('Warning', 'Weights do not sum to 100%. Auto-normalizing...');
        return weightArray.map(w => w / sum);
      }
      
      return weightArray.map(w => w / 100);
    } catch (error) {
      // Return equal weights on error
      return Array(tickerCount).fill(1 / tickerCount);
    }
  };

  const runAdvancedVaRAnalysis = async () => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      // Parse and validate inputs
      const tickerList = tickers.split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0 && /^[A-Z]{1,5}$/.test(t));
      
      if (tickerList.length < 1) {
        Alert.alert('Error', 'Please enter at least 1 valid ticker');
        return;
      }

      if (tickerList.length > 15) {
        Alert.alert('Error', 'Maximum 15 tickers allowed for mobile VaR analysis');
        return;
      }

      const portfolioWeights = parseWeights(weights, tickerList.length);
      
      console.log('🚀 Starting advanced VaR analysis for:', tickerList);
      console.log('💼 Portfolio weights:', portfolioWeights.map((w, i) => `${tickerList[i]}: ${(w*100).toFixed(1)}%`));

      // Step 1: Fetch real-time market data
      const stockData = await realTimeDataFetcher.fetchMultipleStocks(tickerList, '2y', true);
      
      if (!stockData.metadata || stockData.metadata.dataSource !== 'real-time-multi-source') {
        throw new Error('Failed to get real-time market data for VaR analysis');
      }

      console.log(`✅ Real-time data: ${stockData.symbols.join(', ')}`);

      // Step 2: Prepare returns matrix
      const returnsMatrix = stockData.symbols.map(symbol => stockData.returns[symbol] || []);
      
      // Validate sufficient data
      const minObservations = Math.min(...returnsMatrix.map(r => r.length));
      if (minObservations < 100) {
        Alert.alert('Warning', `Limited data: only ${minObservations} observations. VaR estimates may be less reliable.`);
      }

      console.log(`📊 Analyzing ${minObservations} observations per asset`);

      // Step 3: Run VaR calculation based on method
      let optimizationResult;
        console.log(`🎯 Running ${varMethod} optimization...`);
        
        switch (varMethod) {
          case 'parametric':
            if (tickerList.length === 1) {
              varResults = VaRCalculator.calculateParametricVaR(
                returnsMatrix[0], confidenceLevel, positionSize * portfolioWeights[0]
              );
              additionalMetrics = {
                mean: varResults.mean,
                volatility: varResults.volatility,
                zScore: varResults.zScore,
                skewness: varResults.skewness || 0,
                kurtosis: varResults.kurtosis || 0
              };
            } else {
              varResults = VaRCalculator.calculatePortfolioVaR(
                returnsMatrix, portfolioWeights, confidenceLevel, positionSize
              );
              additionalMetrics = {
                portfolioMean: varResults.portfolioMean,
                portfolioVolatility: varResults.portfolioVolatility,
                diversificationBenefit: varResults.diversificationBenefit
              };
            }
            break;
        
          case 'historical':
            varResults = VaRCalculator.calculateHistoricalVaR(
              returnsMatrix, portfolioWeights, confidenceLevel, positionSize
            );
            additionalMetrics = {
              historicalObservations: varResults.observations,
              percentileValue: varResults.percentileValue
            };
            break;
        
          case 'monteCarlo':
            varResults = VaRCalculator.calculateMonteCarloVaR(
              returnsMatrix, portfolioWeights, confidenceLevel, numSimulations, positionSize
            );
            additionalMetrics = {
              numSimulations: numSimulations,
              portfolioMean: varResults.portfolioMean,
              portfolioVolatility: varResults.portfolioVolatility
            };
            break;
        
          case 'portfolio':
          case 'componentVaR':
            // CORRECTION MAJEURE : Passer les tickers pour Component VaR
            varResults = VaRCalculator.calculatePortfolioVaR(
              returnsMatrix, portfolioWeights, confidenceLevel, positionSize
            );
            
            // CORRECTION : Calculer Component VaR avec les noms des tickers
            if (varResults.componentVaR) {
              const correctedComponentVaR = {};
              Object.keys(varResults.componentVaR).forEach((key, index) => {
                const tickerName = stockData.symbols[index] || `Asset_${index}`;
                correctedComponentVaR[tickerName] = varResults.componentVaR[key];
              });
              varResults.componentVaR = correctedComponentVaR;
            }
            
            additionalMetrics = {
              componentVaR: varResults.componentVaR,
              marginalVaR: varResults.marginalVaR,
              diversificationBenefit: varResults.diversificationBenefit
            };
            break;
        
          default:
            varResults = VaRCalculator.calculateParametricVaR(
              returnsMatrix[0], confidenceLevel, positionSize
            );
        }

      console.log(`✅ ${varMethod} VaR calculated: $${varResults.var.toFixed(0)}`);

      // Step 4: Calculate VaR at different confidence levels
      const var99Results = varMethod === 'monteCarlo' ? 
        VaRCalculator.calculateMonteCarloVaR(returnsMatrix, portfolioWeights, 0.99, numSimulations, positionSize) :
        VaRCalculator.calculateParametricVaR(returnsMatrix[0], 0.99, positionSize);

      // Step 5: Stress testing
      let stressResults = [];
      if (includeStressTesting) {
        console.log('💥 Running stress tests...');
        stressResults = await runStressTests(returnsMatrix, portfolioWeights, positionSize);
      }

      // Step 6: Backtesting
      let backtestResults = null;
      if (runBacktest && returnsMatrix[0].length > 250) {
        console.log('📊 Running VaR backtesting...');
        backtestResults = performBacktest(returnsMatrix, portfolioWeights, varResults, confidenceLevel, positionSize);
      }

      // Step 7: Calculate correlation matrix
      const correlationMatrix = VaRCalculator.calculateRobustCorrelationMatrix(returnsMatrix);

      // Compile comprehensive results
      const calculationTime = Date.now() - startTime;
      
      const comprehensiveResults: VaRResults = {
        var95: varResults.var,
        var99: var99Results.var || varResults.var * 1.3, // Approximate if not calculated
        expectedShortfall: varResults.expectedShortfall || varResults.var * 1.3,
        componentVaR: varResults.componentVaR,
        marginalVaR: varResults.marginalVaR,
        diversificationBenefit: varResults.diversificationBenefit,
        method: varMethod,
        confidenceLevel: confidenceLevel,
        positionSize: positionSize,
        tickers: stockData.symbols,
        correlationMatrix: correlationMatrix,
        backtestResults: backtestResults,
        stressResults: stressResults,
        metadata: {
          dataSource: stockData.metadata.dataSource,
          fetchTime: stockData.metadata.fetchTime,
          calculationTime: calculationTime
        }
      };

      setResults(comprehensiveResults);
      setActiveTab('summary');

      // Success feedback
      const successMessage = `✅ VaR Analysis Complete!\n• Method: ${varMethods.find(m => m.key === varMethod)?.label}\n• ${(confidenceLevel * 100).toFixed(0)}% VaR: $${varResults.var.toFixed(0)}\n• Expected Shortfall: $${(varResults.expectedShortfall || varResults.var * 1.3).toFixed(0)}\n• Calculation time: ${calculationTime}ms`;
      
      Alert.alert('VaR Analysis Complete', successMessage);

    } catch (error) {
      console.error('❌ VaR analysis error:', error);
      
      let errorMessage = 'VaR analysis failed.';
      if (error.message.includes('real-time')) {
        errorMessage = 'Unable to fetch real-time market data. Please check your internet connection.';
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient market data for reliable VaR calculation.';
      } else if (error.message.includes('calculation')) {
        errorMessage = 'VaR calculation failed. Please check your inputs.';
      }
      
      Alert.alert('VaR Analysis Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const runStressTests = async (returnsMatrix: number[][], weights: number[], positionSize: number) => {
    const stressResults = [];
    
    for (const scenario of stressScenarios) {
      try {
        // Apply stress scenario to returns
        const stressedReturns = returnsMatrix.map(returns => 
          returns.map(r => r + (scenario.marketShock || scenario.bondShock || scenario.extremeShock || 0))
        );
        
        // Calculate VaR under stress
        const stressVaR = VaRCalculator.calculatePortfolioVaR(
          stressedReturns, weights, 0.95, positionSize
        );
        
        stressResults.push({
          scenario: scenario.name,
          loss: stressVaR.var,
          probability: 0.01, // 1% probability for stress scenarios
          description: scenario.description
        });
        
      } catch (error) {
        console.warn(`Stress test failed for ${scenario.name}:`, error.message);
      }
    }
    
    return stressResults;
  };

  const performBacktest = (returnsMatrix, weights, varResults, confidenceLevel, positionSize) => {
  try {
    // Calculate portfolio returns
    const portfolioReturns = [];
    const minLength = Math.min(...returnsMatrix.map(r => r.length));
    
    for (let i = 0; i < minLength; i++) {
      const portfolioReturn = returnsMatrix.reduce((sum, returns, assetIndex) => 
        sum + weights[assetIndex] * returns[i], 0
      );
      portfolioReturns.push(portfolioReturn * positionSize);
    }
    
    // Count exceedances (correct threshold)
    const varThreshold = -Math.abs(varResults.var);
    const exceedances = portfolioReturns.filter(pnl => pnl < varThreshold).length;
    const exceedanceRate = (exceedances / portfolioReturns.length) * 100;
    const expectedRate = (1 - confidenceLevel) * 100;
    
    // Improved Kupiec test calculation
    let kupiecTest = 0;
    if (portfolioReturns.length > 0 && exceedances >= 0) {
      const p = 1 - confidenceLevel; // Expected exceedance rate
      const n = portfolioReturns.length;
      const x = exceedances;
      
      if (x === 0) {
        // When no exceedances
        kupiecTest = -2 * n * Math.log(1 - p);
      } else if (x === n) {
        // When all are exceedances  
        kupiecTest = -2 * n * Math.log(p);
      } else {
        // Normal case
        const pHat = x / n;
        const likelihood1 = Math.pow(p, x) * Math.pow(1 - p, n - x);
        const likelihood2 = Math.pow(pHat, x) * Math.pow(1 - pHat, n - x);
        
        if (likelihood1 > 0 && likelihood2 > 0) {
          kupiecTest = -2 * Math.log(likelihood1 / likelihood2);
        }
      }
    }
    
    return {
      exceedances: exceedances,
      exceedanceRate: exceedanceRate,
      expectedRate: expectedRate,
      kupiecTest: Math.max(0, kupiecTest), // Ensure non-negative
      totalObservations: portfolioReturns.length
    };
    
  } catch (error) {
    console.warn('Backtesting failed:', error.message);
    return {
      exceedances: 0,
      exceedanceRate: 0,
      expectedRate: (1 - confidenceLevel) * 100,
      kupiecTest: 0,
      totalObservations: 0
    };
  }
};

  const TabButton = ({ tabKey, label, icon }: { tabKey: string; label: string; icon: string }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabKey && styles.tabButtonActive]}
      onPress={() => setActiveTab(tabKey)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabLabel, activeTab === tabKey && styles.tabLabelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getVaRColor = (varValue: number, positionSize: number): string => {
    const varPercent = varValue / positionSize;
    if (varPercent > 0.05) return '#E74C3C'; // High risk - Red
    if (varPercent > 0.02) return '#F39C12'; // Medium risk - Orange
    return '#27AE60'; // Low risk - Green
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>VaR Analyzer</Text>
          <Text style={styles.subtitle}>Professional Risk Management</Text>
          
          {/* System Health Indicator */}
          {dataHealth && (
            <View style={[styles.healthIndicator, 
              dataHealth.overall_status?.includes('HEALTHY') ? styles.healthGood :
              dataHealth.overall_status?.includes('DEGRADED') ? styles.healthWarning : styles.healthCritical
            ]}>
              <Text style={styles.healthText}>
                Data: {dataHealth.overall_status?.split(' ')[1] || '?'}
              </Text>
            </View>
          )}
        </View>

        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Configuration</Text>
          
          {/* Tickers Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Stock Tickers (comma-separated)</Text>
            <TextInput
              style={styles.textInput}
              value={tickers}
              onChangeText={setTickers}
              placeholder="AAPL,MSFT,GOOGL,TSLA,AMZN"
              autoCapitalize="characters"
            />
          </View>

          {/* Weights Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Portfolio Weights (%) - comma-separated</Text>
            <TextInput
              style={styles.textInput}
              value={weights}
              onChangeText={setWeights}
              placeholder="20,20,20,20,20"
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Leave empty for equal weights</Text>
          </View>

          {/* Position Size */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Position Size: ${positionSize.toLocaleString()}</Text>
            <Slider
              style={styles.slider}
              minimumValue={100000}
              maximumValue={10000000}
              value={positionSize}
              onValueChange={setPositionSize}
              step={100000}
              minimumTrackTintColor="#E74C3C"
              maximumTrackTintColor="#E0E0E0"
            />
          </View>

          {/* Confidence Level */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confidence Level: {(confidenceLevel * 100).toFixed(1)}%</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.90}
              maximumValue={0.99}
              value={confidenceLevel}
              onValueChange={setConfidenceLevel}
              step={0.01}
              minimumTrackTintColor="#E74C3C"
              maximumTrackTintColor="#E0E0E0"
            />
          </View>
        </View>

        {/* VaR Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VaR Methodology</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
            {varMethods.map((method) => (
              <TouchableOpacity
                key={method.key}
                style={[styles.methodCard, varMethod === method.key && styles.methodCardActive]}
                onPress={() => setVarMethod(method.key)}
              >
                <Text style={styles.methodIcon}>{method.icon}</Text>
                <Text style={[styles.methodTitle, varMethod === method.key && styles.methodTitleActive]}>
                  {method.label}
                </Text>
                <Text style={[styles.methodDescription, varMethod === method.key && styles.methodDescriptionActive]}>
                  {method.description}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Monte Carlo Simulations */}
          {varMethod === 'monteCarlo' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Simulations: {numSimulations.toLocaleString()}</Text>
              <Slider
                style={styles.slider}
                minimumValue={1000}
                maximumValue={50000}
                value={numSimulations}
                onValueChange={setNumSimulations}
                step={1000}
                minimumTrackTintColor="#4A90E2"
              />
            </View>
          )}
        </View>

        {/* Advanced Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Analysis</Text>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Include Stress Testing</Text>
            <Switch
              value={includeStressTesting}
              onValueChange={setIncludeStressTesting}
              trackColor={{ false: '#E0E0E0', true: '#E74C3C' }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Run Backtesting</Text>
            <Switch
              value={runBacktest}
              onValueChange={setRunBacktest}
              trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Calculate Component VaR</Text>
            <Switch
              value={calculateComponents}
              onValueChange={setCalculateComponents}
              trackColor={{ false: '#E0E0E0', true: '#27AE60' }}
            />
          </View>
        </View>

        {/* Analyze Button */}
        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
          onPress={runAdvancedVaRAnalysis}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.analyzeButtonText}>⚠️ Analyze Portfolio Risk</Text>
          )}
        </TouchableOpacity>

        {/* Results Section */}
        {results && (
          <View style={styles.resultsSection}>
            
            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>VaR Analysis Results</Text>
              <Text style={styles.resultsSubtitle}>
                {varMethods.find(m => m.key === results.method)?.label}
              </Text>
            </View>

            {/* Key Risk Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricsRow}>
                <View style={[styles.metricCard, { borderLeftColor: getVaRColor(results.var95, results.positionSize) }]}>
                  <Text style={[styles.metricValue, { color: getVaRColor(results.var95, results.positionSize) }]}>
                    ${(results.var95 / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.metricLabel}>{(results.confidenceLevel * 100).toFixed(0)}% VaR</Text>
                </View>
                <View style={[styles.metricCard, { borderLeftColor: '#E74C3C' }]}>
                  <Text style={[styles.metricValue, { color: '#E74C3C' }]}>
                    ${(results.var99 / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.metricLabel}>99% VaR</Text>
                </View>
              </View>
              
              <View style={styles.metricsRow}>
                <View style={[styles.metricCard, { borderLeftColor: '#9B59B6' }]}>
                  <Text style={[styles.metricValue, { color: '#9B59B6' }]}>
                    ${(results.expectedShortfall / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.metricLabel}>Expected Shortfall</Text>
                </View>
                {results.diversificationBenefit !== undefined && (
                  <View style={[styles.metricCard, { borderLeftColor: '#27AE60' }]}>
                    <Text style={[styles.metricValue, { color: '#27AE60' }]}>
                      {(results.diversificationBenefit * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.metricLabel}>Diversification Benefit</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Results Tabs */}
            <View style={styles.tabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TabButton tabKey="summary" label="Summary" icon="📊" />
                <TabButton tabKey="components" label="Components" icon="🔍" />
                <TabButton tabKey="stress" label="Stress Tests" icon="💥" />
                <TabButton tabKey="backtest" label="Backtest" icon="📈" />
                <TabButton tabKey="correlation" label="Correlation" icon="🔗" />
              </ScrollView>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'summary' && (
                <View>
                  <Text style={styles.chartTitle}>Risk Summary</Text>
                  
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Daily VaR ({(results.confidenceLevel * 100).toFixed(0)}%)</Text>
                      <Text style={styles.summaryValue}>${results.var95.toLocaleString()}</Text>
                      <Text style={styles.summaryPercent}>
                        {((results.var95 / results.positionSize) * 100).toFixed(2)}% of portfolio
                      </Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Expected Shortfall</Text>
                      <Text style={styles.summaryValue}>${results.expectedShortfall.toLocaleString()}</Text>
                      <Text style={styles.summaryPercent}>
                        Average loss beyond VaR
                      </Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Risk Method</Text>
                      <Text style={styles.summaryValue}>{varMethods.find(m => m.key === results.method)?.label}</Text>
                      <Text style={styles.summaryPercent}>
                        Calculation time: {results.metadata.calculationTime}ms
                      </Text>
                    </View>
                  </View>

                  <View style={styles.riskInterpretation}>
                    <Text style={styles.interpretationTitle}>Risk Interpretation</Text>
                    <Text style={styles.interpretationText}>
                      With {(results.confidenceLevel * 100).toFixed(0)}% confidence, your maximum daily loss should not exceed{' '}
                      <Text style={[styles.interpretationHighlight, { color: getVaRColor(results.var95, results.positionSize) }]}>
                        ${(results.var95 / 1000).toFixed(0)}k
                      </Text>{' '}
                      under normal market conditions.
                    </Text>
                    
                    {results.diversificationBenefit && results.diversificationBenefit > 0.1 && (
                      <Text style={styles.interpretationText}>
                        Your portfolio benefits from{' '}
                        <Text style={[styles.interpretationHighlight, { color: '#27AE60' }]}>
                          {(results.diversificationBenefit * 100).toFixed(1)}% diversification
                        </Text>
                        , reducing risk compared to concentrated positions.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {activeTab === 'components' && results.componentVaR && (
              <View>
                <Text style={styles.chartTitle}>Component VaR Analysis</Text>
                {results.tickers.map((ticker, index) => {
                  // CORRECTION : Obtenir la valeur Component VaR correcte
                  const componentValue = results.componentVaR[ticker] || 0;
                  const componentPercent = results.var95 > 0 ? (componentValue / results.var95) * 100 : 0;
                  
                  return (
                    <View key={ticker} style={styles.componentRow}>
                      <Text style={styles.componentTicker}>{ticker}</Text>
                      <View style={styles.componentMetrics}>
                        <Text style={styles.componentValue}>
                          ${(componentValue / 1000).toFixed(1)}k
                        </Text>
                        <Text style={styles.componentPercent}>
                          {componentPercent.toFixed(1)}%
                        </Text>
                      </View>
                      {results.marginalVaR && results.marginalVaR[index] && (
                        <Text style={styles.marginalValue}>
                          Marginal: {results.marginalVaR[index].toFixed(3)}
                        </Text>
                      )}
                    </View>
                  );
                })}

              {activeTab === 'stress' && results.stressResults && results.stressResults.length > 0 && (
                <View>
                  <Text style={styles.chartTitle}>Stress Test Results</Text>
                  {results.stressResults.map((stress, index) => (
                    <View key={index} style={styles.stressRow}>
                      <Text style={styles.stressScenario}>{stress.scenario}</Text>
                      <Text style={styles.stressLoss}>
                        ${(stress.loss / 1000).toFixed(0)}k loss
                      </Text>
                      <Text style={styles.stressDescription}>
                        {stress.description}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {activeTab === 'backtest' && results.backtestResults && (
              <View>
                <Text style={styles.chartTitle}>VaR Model Backtesting</Text>
                
                <View style={styles.backtestGrid}>
                  <View style={styles.backtestItem}>
                    <Text style={styles.backtestLabel}>Actual Exceedances</Text>
                    <Text style={[styles.backtestValue, { 
                      color: results.backtestResults.exceedanceRate > results.backtestResults.expectedRate * 1.5 ? '#E74C3C' : '#27AE60'
                    }]}>
                      {results.backtestResults.exceedances}
                    </Text>
                  </View>
                  
                  <View style={styles.backtestItem}>
                    <Text style={styles.backtestLabel}>Exceedance Rate</Text>
                    <Text style={styles.backtestValue}>
                      {results.backtestResults.exceedanceRate.toFixed(3)}%
                    </Text>
                  </View>
                  
                  <View style={styles.backtestItem}>
                    <Text style={styles.backtestLabel}>Expected Rate</Text>
                    <Text style={styles.backtestValue}>
                      {results.backtestResults.expectedRate.toFixed(3)}%
                    </Text>
                  </View>
                  
                  <View style={styles.backtestItem}>
                    <Text style={styles.backtestLabel}>Kupiec Test</Text>
                    <Text style={[styles.backtestValue, { 
                      color: results.backtestResults.kupiecTest > 3.84 ? '#E74C3C' : '#27AE60'
                    }]}>
                      {results.backtestResults.kupiecTest.toFixed(3)}
                    </Text>
                  </View>
                </View>
            
                <View style={styles.backtestInterpretation}>
                  <Text style={styles.interpretationTitle}>Backtest Assessment</Text>
                  <Text style={styles.interpretationText}>
                    {results.backtestResults.kupiecTest <= 3.84 ? 
                      '✅ Model passes Kupiec test - VaR estimates are statistically accurate' :
                      '❌ Model fails Kupiec test - VaR may be underestimating risk'
                    }
                  </Text>
                  <Text style={styles.interpretationText}>
                    Critical value (95% confidence): 3.84
                  </Text>
                  <Text style={styles.interpretationText}>
                    Test statistic: {results.backtestResults.kupiecTest.toFixed(3)}
                  </Text>
                  <Text style={styles.interpretationText}>
                    Observations: {results.backtestResults.totalObservations}
                  </Text>
                </View>
              </View>
            )}


              {activeTab === 'correlation' && results.correlationMatrix && (
                <View>
                  <CorrelationMatrixChart
                    correlationMatrix={results.correlationMatrix}
                    tickers={results.tickers}
                    title="Asset Correlation Matrix"
                  />
                </View>
              )}
            </View>

            {/* Metadata */}
            <View style={styles.metadata}>
              <Text style={styles.metadataTitle}>Analysis Information</Text>
              <Text style={styles.metadataText}>Data source: {results.metadata.dataSource}</Text>
              <Text style={styles.metadataText}>Calculation time: {results.metadata.calculationTime}ms</Text>
              <Text style={styles.metadataText}>Analysis completed: {new Date().toLocaleString()}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginBottom: 10,
  },
  healthIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthGood: { backgroundColor: '#D4EDDA' },
  healthWarning: { backgroundColor: '#FFF3CD' },
  healthCritical: { backgroundColor: '#F8D7DA' },
  healthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495E',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
  },
  helperText: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  methodScroll: {
    marginBottom: 15,
  },
  methodCard: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    marginRight: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    minWidth: 140,
  },
  methodCardActive: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  methodIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 4,
  },
  methodTitleActive: {
    color: '#FFFFFF',
  },
  methodDescription: {
    fontSize: 11,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 14,
  },
  methodDescriptionActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#34495E',
    flex: 1,
  },
  analyzeButton: {
    backgroundColor: '#E74C3C',
    margin: 15,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultsSection: {
    margin: 15,
  },
  resultsHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 4,
  },
  metricsContainer: {
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    padding: 15,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  tabButtonActive: {
    backgroundColor: '#E74C3C',
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  tabLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryGrid: {
    marginBottom: 20,
  },
  summaryItem: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  summaryPercent: {
    fontSize: 12,
    color: '#95A5A6',
  },
  riskInterpretation: {
    backgroundColor: '#FDF2F2',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#E74C3C',
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
    marginBottom: 8,
  },
  interpretationText: {
    fontSize: 14,
    color: '#34495E',
    lineHeight: 20,
    marginBottom: 8,
  },
  interpretationHighlight: {
    fontWeight: 'bold',
  },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  componentTicker: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  componentMetrics: {
    alignItems: 'flex-end',
    flex: 1,
  },
  componentValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
  },
  componentPercent: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  marginalValue: {
    fontSize: 11,
    color: '#95A5A6',
    flex: 1,
    textAlign: 'right',
  },
  stressRow: {
    backgroundColor: '#FDF6E3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#F39C12',
  },
  stressScenario: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  stressLoss: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginBottom: 4,
  },
  stressDescription: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  backtestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backtestItem: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  backtestLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 4,
    textAlign: 'center',
  },
  backtestValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  backtestInterpretation: {
    backgroundColor: '#EBF3FD',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  metadata: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  metadataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  validationBox: {
  backgroundColor: '#F0F8FF',
  padding: 15,
  borderRadius: 8,
  marginTop: 20,
  borderLeftWidth: 4,
  borderLeftColor: '#4A90E2',
},
validationTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#2C3E50',
  marginBottom: 8,
},
validationText: {
  fontSize: 14,
  color: '#34495E',
  marginBottom: 4,
},
validationWarning: {
  fontSize: 14,
  color: '#E74C3C',
  fontWeight: '600',
  marginTop: 8,
},
  metadataText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
});
