// app/var.tsx - FIXED VaR ANALYZER
// Proper individual vs portfolio VaR calculations

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

interface IndividualVaRResult {
  ticker: string;
  var: number;
  expectedShortfall: number;
  volatility?: number;
  mean?: number;
  exceedanceRate?: number;
  method: string;
}

interface PortfolioVaRResult {
  var: number;
  expectedShortfall: number;
  portfolioMean?: number;
  portfolioVolatility?: number;
  componentVaR?: { [key: string]: number };
  marginalVaR?: number[];
  diversificationBenefit?: number;
  correlationMatrix?: number[][];
  method: string;
}

interface VaRResults {
  // Individual asset results (for parametric/historical per asset)
  individualResults?: IndividualVaRResult[];
  
  // Portfolio results (for portfolio methods)
  portfolioResult?: PortfolioVaRResult;
  
  // Common fields
  method: string;
  confidenceLevel: number;
  positionSize: number;
  tickers: string[];
  weights: number[];
  
  // Backtesting and stress testing
  backtestResults?: {
    exceedances: number;
    exceedanceRate: number;
    expectedRate: number;
    kupiecTest: number;
    totalObservations: number;
  };
  stressResults?: Array<{
    scenario: string;
    loss: number;
    probability: number;
    description?: string;
  }>;
  
  metadata: {
    dataSource: string;
    fetchTime: string;
    calculationTime: number;
  };
}

export default function FixedVaRAnalyzer() {
  // Core VaR inputs
  const [tickers, setTickers] = useState('AAPL,MSFT,GOOGL,TSLA,AMZN');
  const [weights, setWeights] = useState('20,20,20,20,20');
  const [positionSize, setPositionSize] = useState(1000000);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  
  // VaR method selection - FIXED
  const [varMethod, setVarMethod] = useState('parametric_individual');
  const [timeHorizon, setTimeHorizon] = useState(1);
  const [numSimulations, setNumSimulations] = useState(10000);
  
  // Advanced options
  const [includeStressTesting, setIncludeStressTesting] = useState(true);
  const [runBacktest, setRunBacktest] = useState(true);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VaRResults | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [dataHealth, setDataHealth] = useState<any>(null);

  // FIXED VaR methods - clearly separated
  const varMethods = [
    { 
      key: 'parametric_individual', 
      label: 'Parametric (Per Asset)', 
      icon: '📊', 
      description: 'Normal distribution per individual asset',
      isIndividual: true 
    },
    { 
      key: 'historical_individual', 
      label: 'Historical (Per Asset)', 
      icon: '📈', 
      description: 'Historical simulation per individual asset',
      isIndividual: true 
    },
    { 
      key: 'portfolio_parametric', 
      label: 'Portfolio VaR (Parametric)', 
      icon: '💼', 
      description: 'Portfolio-level parametric VaR',
      isIndividual: false 
    },
    { 
      key: 'portfolio_historical', 
      label: 'Portfolio VaR (Historical)', 
      icon: '📉', 
      description: 'Portfolio-level historical VaR',
      isIndividual: false 
    },
    { 
      key: 'monte_carlo', 
      label: 'Monte Carlo VaR', 
      icon: '🎲', 
      description: 'Simulation-based portfolio VaR',
      isIndividual: false 
    }
  ];

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
        return Array(tickerCount).fill(100 / tickerCount).map(w => w / 100);
      }
      
      const sum = weightArray.reduce((acc, w) => acc + w, 0);
      if (Math.abs(sum - 100) > 1) {
        Alert.alert('Warning', 'Weights do not sum to 100%. Auto-normalizing...');
        return weightArray.map(w => w / sum);
      }
      
      return weightArray.map(w => w / 100);
    } catch (error) {
      return Array(tickerCount).fill(1 / tickerCount);
    }
  };

  // FIXED: Main VaR analysis function
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
      const selectedMethod = varMethods.find(m => m.key === varMethod);
      
      console.log(`🚀 Starting ${selectedMethod?.label} analysis for:`, tickerList);

      // Fetch real-time market data
      const stockData = await realTimeDataFetcher.fetchMultipleStocks(tickerList, '2y', true);
      
      if (!stockData.metadata || stockData.metadata.dataSource !== 'real-time-multi-source') {
        throw new Error('Failed to get real-time market data for VaR analysis');
      }

      console.log(`✅ Real-time data: ${stockData.symbols.join(', ')}`);

      // Prepare returns matrix
      const returnsMatrix = stockData.symbols.map(symbol => stockData.returns[symbol] || []);
      
      // Validate sufficient data
      const minObservations = Math.min(...returnsMatrix.map(r => r.length));
      if (minObservations < 50) {
        Alert.alert('Warning', `Limited data: only ${minObservations} observations. VaR estimates may be less reliable.`);
      }

      console.log(`📊 Analyzing ${minObservations} observations per asset`);

      // FIXED: Route to appropriate calculation method
      let varResults: VaRResults;
      
      if (selectedMethod?.isIndividual) {
        // Individual asset VaR calculations
        varResults = await calculateIndividualVaR(returnsMatrix, stockData.symbols, portfolioWeights, selectedMethod.key);
      } else {
        // Portfolio VaR calculations
        varResults = await calculatePortfolioVaR(returnsMatrix, stockData.symbols, portfolioWeights, selectedMethod.key);
      }

      // Add common metadata
      const calculationTime = Date.now() - startTime;
      varResults.metadata = {
        dataSource: stockData.metadata.dataSource,
        fetchTime: stockData.metadata.fetchTime,
        calculationTime: calculationTime
      };

      // Run additional analysis if enabled
      if (includeStressTesting) {
        console.log('💥 Running stress tests...');
        varResults.stressResults = await runStressTests(returnsMatrix, portfolioWeights, positionSize);
      }

      if (runBacktest && minObservations > 250) {
        console.log('📊 Running VaR backtesting...');
        varResults.backtestResults = performBacktest(returnsMatrix, portfolioWeights, varResults, confidenceLevel, positionSize);
      }

      setResults(varResults);
      setActiveTab('summary');

      // Success feedback
      const totalVar = varResults.individualResults 
        ? varResults.individualResults.reduce((sum, r) => sum + r.var, 0)
        : varResults.portfolioResult?.var || 0;

      const successMessage = `✅ VaR Analysis Complete!\n• Method: ${selectedMethod?.label}\n• ${(confidenceLevel * 100).toFixed(0)}% VaR: $${totalVar.toFixed(0)}\n• Calculation time: ${calculationTime}ms`;
      
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

  // FIXED: Individual asset VaR calculation
  const calculateIndividualVaR = async (returnsMatrix: number[][], tickers: string[], weights: number[], method: string): Promise<VaRResults> => {
    const individualResults: IndividualVaRResult[] = [];
    
    for (let i = 0; i < returnsMatrix.length; i++) {
      const assetReturns = returnsMatrix[i];
      const ticker = tickers[i];
      const assetPositionSize = positionSize * weights[i];
      
      try {
        let result: IndividualVaRResult;
        
        if (method === 'parametric_individual') {
          const varResult = VaRCalculator.calculateIndividualParametricVaR(
            assetReturns, ticker, confidenceLevel, assetPositionSize
          );
          result = varResult;
        } else if (method === 'historical_individual') {
          const varResult = VaRCalculator.calculateIndividualHistoricalVaR(
            assetReturns, ticker, confidenceLevel, assetPositionSize
          );
          result = varResult;
        } else {
          throw new Error(`Unsupported individual method: ${method}`);
        }
        
        individualResults.push(result);
        console.log(`✅ ${ticker} VaR: $${result.var.toFixed(0)}`);
        
      } catch (error) {
        console.error(`❌ Failed to calculate VaR for ${ticker}:`, error.message);
        // Continue with other assets
      }
    }
    
    if (individualResults.length === 0) {
      throw new Error('Failed to calculate VaR for any assets');
    }

    return {
      individualResults: individualResults,
      method: method,
      confidenceLevel: confidenceLevel,
      positionSize: positionSize,
      tickers: tickers,
      weights: weights,
      metadata: {
        dataSource: '',
        fetchTime: '',
        calculationTime: 0
      }
    };
  };

  // FIXED: Portfolio VaR calculation
  const calculatePortfolioVaR = async (returnsMatrix: number[][], tickers: string[], weights: number[], method: string): Promise<VaRResults> => {
    let portfolioResult: PortfolioVaRResult;
    
    try {
      if (method === 'portfolio_parametric') {
        portfolioResult = VaRCalculator.calculatePortfolioVaR(
          returnsMatrix, weights, confidenceLevel, positionSize
        );
      } else if (method === 'portfolio_historical') {
        portfolioResult = VaRCalculator.calculatePortfolioHistoricalVaR(
          returnsMatrix, weights, confidenceLevel, positionSize
        );
      } else if (method === 'monte_carlo') {
        portfolioResult = VaRCalculator.calculateMonteCarloVaR(
          returnsMatrix, weights, confidenceLevel, numSimulations, positionSize
        );
      } else {
        throw new Error(`Unsupported portfolio method: ${method}`);
      }
      
      console.log(`✅ Portfolio ${method} VaR: $${portfolioResult.var.toFixed(0)}`);
      
    } catch (error) {
      console.error('❌ Portfolio VaR calculation failed:', error);
      throw error;
    }

    return {
      portfolioResult: portfolioResult,
      method: method,
      confidenceLevel: confidenceLevel,
      positionSize: positionSize,
      tickers: tickers,
      weights: weights,
      metadata: {
        dataSource: '',
        fetchTime: '',
        calculationTime: 0
      }
    };
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
          probability: 0.01,
          description: scenario.description
        });
        
      } catch (error) {
        console.warn(`Stress test failed for ${scenario.name}:`, error.message);
      }
    }
    
    return stressResults;
  };

  const performBacktest = (returnsMatrix: number[][], weights: number[], varResults: VaRResults, confidenceLevel: number, positionSize: number) => {
    try {
      // Get the VaR value to test against
      let varThreshold = 0;
      if (varResults.individualResults) {
        varThreshold = varResults.individualResults.reduce((sum, r) => sum + r.var, 0);
      } else if (varResults.portfolioResult) {
        varThreshold = varResults.portfolioResult.var;
      }

      // Calculate portfolio returns for backtesting
      const portfolioReturns = [];
      const minLength = Math.min(...returnsMatrix.map(r => r.length));
      
      for (let i = 0; i < minLength; i++) {
        const portfolioReturn = returnsMatrix.reduce((sum, returns, assetIndex) => 
          sum + weights[assetIndex] * returns[i], 0
        );
        portfolioReturns.push(portfolioReturn * positionSize);
      }
      
      // Count exceedances
      const exceedances = portfolioReturns.filter(pnl => pnl < -Math.abs(varThreshold)).length;
      const exceedanceRate = (exceedances / portfolioReturns.length) * 100;
      const expectedRate = (1 - confidenceLevel) * 100;
      
      // Kupiec test
      const kupiecTest = VaRCalculator.calculateKupiecTest(exceedances, portfolioReturns.length, 1 - confidenceLevel);
      
      return {
        exceedances: exceedances,
        exceedanceRate: exceedanceRate,
        expectedRate: expectedRate,
        kupiecTest: kupiecTest,
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

  // Get total VaR for display
  const getTotalVaR = (): number => {
    if (!results) return 0;
    if (results.individualResults) {
      return results.individualResults.reduce((sum, r) => sum + r.var, 0);
    }
    return results.portfolioResult?.var || 0;
  };

  const getTotalES = (): number => {
    if (!results) return 0;
    if (results.individualResults) {
      return results.individualResults.reduce((sum, r) => sum + r.expectedShortfall, 0);
    }
    return results.portfolioResult?.expectedShortfall || 0;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>VaR Analyzer</Text>
          <Text style={styles.subtitle}>Fixed Risk Management Analysis</Text>
          
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

        {/* FIXED VaR Method Selection */}
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
                <Text style={[styles.methodType, varMethod === method.key && styles.methodTypeActive]}>
                  {method.isIndividual ? 'Per Asset' : 'Portfolio Level'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Monte Carlo Simulations */}
          {varMethod === 'monte_carlo' && (
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

        {/* FIXED Results Section */}
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
                <View style={[styles.metricCard, { borderLeftColor: getVaRColor(getTotalVaR(), results.positionSize) }]}>
                  <Text style={[styles.metricValue, { color: getVaRColor(getTotalVaR(), results.positionSize) }]}>
                    ${(getTotalVaR() / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.metricLabel}>{(results.confidenceLevel * 100).toFixed(0)}% VaR</Text>
                </View>
                <View style={[styles.metricCard, { borderLeftColor: '#9B59B6' }]}>
                  <Text style={[styles.metricValue, { color: '#9B59B6' }]}>
                    ${(getTotalES() / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.metricLabel}>Expected Shortfall</Text>
                </View>
              </View>
              
              {results.portfolioResult?.diversificationBenefit !== undefined && (
                <View style={styles.metricsRow}>
                  <View style={[styles.metricCard, { borderLeftColor: '#27AE60' }]}>
                    <Text style={[styles.metricValue, { color: '#27AE60' }]}>
                      {(results.portfolioResult.diversificationBenefit * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.metricLabel}>Diversification Benefit</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Results Tabs */}
            <View style={styles.tabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TabButton tabKey="summary" label="Summary" icon="📊" />
                {results.individualResults && <TabButton tabKey="individual" label="Per Asset" icon="🎯" />}
                {results.portfolioResult?.componentVaR && <TabButton tabKey="components" label="Components" icon="🔍" />}
                {results.stressResults && <TabButton tabKey="stress" label="Stress Tests" icon="💥" />}
                {results.backtestResults && <TabButton tabKey="backtest" label="Backtest" icon="📈" />}
                {results.portfolioResult?.correlationMatrix && <TabButton tabKey="correlation" label="Correlation" icon="🔗" />}
              </ScrollView>
            </View>

            {/* FIXED Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'summary' && (
                <View>
                  <Text style={styles.chartTitle}>Risk Summary</Text>
                  
                  <View style={styles.summaryGrid}>
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Analysis Type</Text>
                      <Text style={styles.summaryValue}>
                        {varMethods.find(m => m.key === results.method)?.label}
                      </Text>
                      <Text style={styles.summaryPercent}>
                        {varMethods.find(m => m.key === results.method)?.isIndividual ? 'Individual Assets' : 'Portfolio Level'}
                      </Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Total VaR ({(results.confidenceLevel * 100).toFixed(0)}%)</Text>
                      <Text style={styles.summaryValue}>${getTotalVaR().toLocaleString()}</Text>
                      <Text style={styles.summaryPercent}>
                        {((getTotalVaR() / results.positionSize) * 100).toFixed(2)}% of portfolio
                      </Text>
                    </View>
                    
                    <View style={styles.summaryItem}>
                      <Text style={styles.summaryLabel}>Expected Shortfall</Text>
                      <Text style={styles.summaryValue}>${getTotalES().toLocaleString()}</Text>
                      <Text style={styles.summaryPercent}>
                        Average loss beyond VaR
                      </Text>
                    </View>
                  </View>

                  <View style={styles.riskInterpretation}>
                    <Text style={styles.interpretationTitle}>Risk Interpretation</Text>
                    <Text style={styles.interpretationText}>
                      With {(results.confidenceLevel * 100).toFixed(0)}% confidence, your maximum daily loss should not exceed{' '}
                      <Text style={[styles.interpretationHighlight, { color: getVaRColor(getTotalVaR(), results.positionSize) }]}>
                        ${(getTotalVaR() / 1000).toFixed(0)}k
                      </Text>{' '}
                      under normal market conditions.
                    </Text>
                    
                    {results.portfolioResult?.diversificationBenefit && results.portfolioResult.diversificationBenefit > 0.1 && (
                      <Text style={styles.interpretationText}>
                        Your portfolio benefits from{' '}
                        <Text style={[styles.interpretationHighlight, { color: '#27AE60' }]}>
                          {(results.portfolioResult.diversificationBenefit * 100).toFixed(1)}% diversification
                        </Text>
                        , reducing risk compared to concentrated positions.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {activeTab === 'individual' && results.individualResults && (
                <View>
                  <Text style={styles.chartTitle}>Individual Asset VaR</Text>
                  {results.individualResults.map((assetResult, index) => (
                    <View key={assetResult.ticker} style={styles.componentRow}>
                      <Text style={styles.componentTicker}>{assetResult.ticker}</Text>
                      <View style={styles.componentMetrics}>
                        <Text style={styles.componentValue}>
                          ${(assetResult.var / 1000).toFixed(1)}k
                        </Text>
                        <Text style={styles.componentPercent}>
                          VaR: {((assetResult.var / results.positionSize) * 100).toFixed(2)}%
                        </Text>
                        <Text style={styles.componentPercent}>
                          ES: ${(assetResult.expectedShortfall / 1000).toFixed(1)}k
                        </Text>
                      </View>
                      {assetResult.volatility && (
                        <Text style={styles.marginalValue}>
                          Vol: {(assetResult.volatility * 100 * Math.sqrt(252)).toFixed(1)}%
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {activeTab === 'components' && results.portfolioResult?.componentVaR && (
                <View>
                  <Text style={styles.chartTitle}>Component VaR Analysis</Text>
                  {results.tickers.map((ticker, index) => {
                    const componentValue = results.portfolioResult!.componentVaR![`Asset_${index}`] || 0;
                    const componentPercent = getTotalVaR() > 0 ? (componentValue / getTotalVaR()) * 100 : 0;
                    
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
                        {results.portfolioResult!.marginalVaR && results.portfolioResult!.marginalVaR[index] && (
                          <Text style={styles.marginalValue}>
                            Marginal: {results.portfolioResult!.marginalVaR[index].toFixed(3)}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

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

              {activeTab === 'correlation' && results.portfolioResult?.correlationMatrix && (
                <View>
                  <CorrelationMatrixChart
                    correlationMatrix={results.portfolioResult.correlationMatrix}
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
              <Text style={styles.metadataText}>Method: {varMethods.find(m => m.key === results.method)?.description}</Text>
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
    minWidth: 160,
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
    marginBottom: 4,
  },
  methodDescriptionActive: {
    color: '#FFFFFF',
  },
  methodType: {
    fontSize: 10,
    color: '#95A5A6',
    textAlign: 'center',
    fontWeight: '600',
  },
  methodTypeActive: {
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
  metadataText: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 4,
  },
});
