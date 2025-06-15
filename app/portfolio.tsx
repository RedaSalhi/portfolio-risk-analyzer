// app/portfolio.tsx - ENHANCED WITH PYTHON STREAMLIT TECHNIQUES
// Full Markowitz optimization, CAPM analysis, and sophisticated visualizations

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
import { 
  EfficientFrontierChart, 
  PortfolioWeightsChart, 
  CapitalAllocationChart, 
  CAPMAnalysisChart,
  CorrelationMatrixChart 
} from '../src/components/Charts';
import { realTimeDataFetcher } from '../src/utils/realTimeDataFetcher';
import { PortfolioOptimizer, CAPMAnalyzer, RiskAttributionCalculator, CorrelationCalculator } from '../src/utils/financialCalculations';

const { width } = Dimensions.get('window');

interface OptimizationResults {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  tickers: string[];
  capmReturns: { [key: string]: number };
  betas: { [key: string]: number };
  alphas: { [key: string]: number };
  correlationMatrix: number[][];
  efficientFrontier: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>;
  riskAttribution: { [key: string]: number };
  allSimulations: Array<{expectedReturn: number, volatility: number, sharpeRatio: number}>;
  capitalAllocation?: {
    riskyWeight: number;
    riskFreeWeight: number;
    portfolioReturn: number;
    portfolioVolatility: number;
    tangencyWeights: number[];
  };
  type: string;
  metadata: {
    dataSource: string;
    fetchTime: string;
    riskFreeRate: number;
    marketReturn: number;
    monteCarloSimulations: number;
  };
}

export default function EnhancedPortfolioOptimizer() {
  // Core portfolio inputs
  const [tickers, setTickers] = useState('AAPL,MSFT,GOOGL,TSLA,AMZN');
  const [portfolioValue, setPortfolioValue] = useState(1000000);
  
  // Optimization method selection (like Python Streamlit version)
  const [optimizationMethod, setOptimizationMethod] = useState('maxSharpe');
  const [targetReturn, setTargetReturn] = useState(0.15);
  const [targetRisk, setTargetRisk] = useState(0.20);
  
  // Advanced options (matching Python version)
  const [includeRiskFree, setIncludeRiskFree] = useState(true);
  const [useMarketBenchmark, setUseMarketBenchmark] = useState(true);
  const [monteCarloSimulations, setMonteCarloSimulations] = useState(10000);
  const [allowShortSelling, setAllowShortSelling] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState(0.40);
  
  // State management
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [activeTab, setActiveTab] = useState('weights');

  // Optimization methods (matching Python Streamlit interface)
  const optimizationMethods = [
    { key: 'maxSharpe', label: 'Maximum Sharpe Ratio', description: 'Optimize risk-adjusted returns' },
    { key: 'minRisk', label: 'Minimum Risk', description: 'Minimize portfolio volatility' },
    { key: 'targetReturn', label: 'Target Return', description: 'Achieve specific return target' },
    { key: 'targetRisk', label: 'Target Volatility', description: 'Achieve specific risk target' },
    { key: 'equalWeight', label: 'Equal Weight', description: '1/N diversification' },
    { key: 'riskParity', label: 'Risk Parity', description: 'Equal risk contribution' }
  ];

  const runOptimization = async () => {
    if (!tickers.trim()) {
      Alert.alert('Error', 'Please enter at least one ticker symbol');
      return;
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    
    if (tickerList.length < 2) {
      Alert.alert('Error', 'Please enter at least 2 ticker symbols for portfolio optimization');
      return;
    }

    setIsOptimizing(true);
    
    try {
      console.log(`🚀 Starting ${optimizationMethod} optimization for: ${tickerList.join(', ')}`);
      
      // Step 1: Fetch real-time market data (like Python yfinance)
      console.log('📊 Fetching real-time market data...');
      const stockData = await realTimeDataFetcher.getHistoricalData(tickerList, '5y');
      
      if (!stockData || !stockData.returns || Object.keys(stockData.returns).length === 0) {
        throw new Error('Failed to fetch market data. Please check ticker symbols and internet connection.');
      }

      // Step 2: Get risk-free rate (3-month Treasury like Python ^IRX)
      const riskFreeRate = includeRiskFree ? 
        await realTimeDataFetcher.getRiskFreeRate() : 0.02;
      
      console.log(`💰 Risk-free rate: ${(riskFreeRate * 100).toFixed(3)}%`);

      // Step 3: Get market benchmark data (S&P 500 like Python)
      let marketReturns = null;
      let marketReturn = 0.08; // Default market return
      
      if (useMarketBenchmark) {
        console.log('📈 Fetching S&P 500 benchmark data...');
        const marketData = await realTimeDataFetcher.getHistoricalData(['^GSPC'], '5y');
        if (marketData && marketData.returns['^GSPC']) {
          marketReturns = marketData.returns['^GSPC'];
          marketReturn = marketReturns.reduce((sum, ret) => sum + ret, 0) / marketReturns.length * 252;
          console.log(`📊 Market return: ${(marketReturn * 100).toFixed(2)}%`);
        }
      }

      // Step 4: Prepare returns matrix with validation
      const returnsMatrix = stockData.symbols.map(symbol => {
        const returns = stockData.returns[symbol] || [];
        if (returns.length < 100) {
          console.warn(`Warning: ${symbol} has only ${returns.length} observations`);
        }
        return returns;
      });
      
      // Validate sufficient data (like Python version)
      const minObservations = Math.min(...returnsMatrix.map(r => r.length));
      if (minObservations < 50) {
        throw new Error(`Insufficient data: minimum ${minObservations} observations. Need at least 50 for reliable optimization.`);
      }

      console.log(`📊 Optimization dataset: ${minObservations} observations per asset`);

      // Step 5: Initialize optimizer with validated data (like Python PortfolioOptimizer)
      const optimizer = new PortfolioOptimizer(returnsMatrix, riskFreeRate);
      
      // Step 6: Run optimization based on method (matching Python logic)
      let optimizationResult;
      console.log(`🎯 Running ${optimizationMethod} optimization with ${monteCarloSimulations.toLocaleString()} simulations...`);
      
      try {
        switch (optimizationMethod) {
          case 'maxSharpe':
            optimizationResult = optimizer.optimizeMaxSharpe(monteCarloSimulations);
            break;
          case 'minRisk':
            optimizationResult = optimizer.optimizeMinRisk();
            break;
          case 'targetReturn':
            optimizationResult = optimizer.optimizeForTargetReturn(targetReturn);
            break;
          case 'targetRisk':
            optimizationResult = optimizer.optimizeForTargetVolatility(targetRisk);
            break;
          case 'equalWeight':
            optimizationResult = optimizer.optimizeEqualWeight();
            break;
          case 'riskParity':
            optimizationResult = optimizer.optimizeRiskParity();
            break;
          default:
            optimizationResult = optimizer.optimizeMaxSharpe(monteCarloSimulations);
        }

        // Validate optimization results
        if (!optimizationResult.weights || optimizationResult.weights.length !== stockData.symbols.length) {
          throw new Error('Invalid optimization results: weights array mismatch');
        }

        const weightSum = optimizationResult.weights.reduce((sum, w) => sum + w, 0);
        if (Math.abs(weightSum - 1.0) > 0.05) {
          console.warn(`Warning: weights sum to ${weightSum.toFixed(3)}, normalizing...`);
          optimizationResult.weights = optimizationResult.weights.map(w => w / weightSum);
        }

        console.log(`✅ Optimization complete: ${optimizationResult.sharpeRatio.toFixed(3)} Sharpe ratio`);

      } catch (error) {
        console.error('Optimization failed:', error);
        throw new Error(`Optimization failed: ${error.message}`);
      }

      // Step 7: CAPM Analysis (like Python statsmodels regression)
      console.log('📈 Calculating CAPM metrics...');
      const capmResults = {};
      const betas = {};
      const alphas = {};
      
      if (marketReturns && marketReturns.length > 0) {
        for (let i = 0; i < stockData.symbols.length; i++) {
          const symbol = stockData.symbols[i];
          const assetReturns = returnsMatrix[i];
          
          // Align lengths
          const minLength = Math.min(assetReturns.length, marketReturns.length);
          const alignedAssetReturns = assetReturns.slice(-minLength);
          const alignedMarketReturns = marketReturns.slice(-minLength);
          
          try {
            const capmAnalyzer = new CAPMAnalyzer(alignedAssetReturns, alignedMarketReturns, riskFreeRate);
            const capmMetrics = capmAnalyzer.calculateCAPMMetrics(symbol);
            
            capmResults[symbol] = capmMetrics.capmExpectedReturn;
            betas[symbol] = capmMetrics.beta;
            alphas[symbol] = capmMetrics.alpha;
            
            console.log(`${symbol}: Beta=${capmMetrics.beta.toFixed(3)}, Alpha=${(capmMetrics.alpha * 100).toFixed(2)}%`);
          } catch (error) {
            console.warn(`CAPM calculation failed for ${symbol}:`, error);
            capmResults[symbol] = 0.08; // Default return
            betas[symbol] = 1.0;
            alphas[symbol] = 0.0;
          }
        }
      } else {
        // Fallback if no market data
        stockData.symbols.forEach(symbol => {
          capmResults[symbol] = 0.08;
          betas[symbol] = 1.0;
          alphas[symbol] = 0.0;
        });
      }

      // Step 8: Calculate correlation matrix (like Python pandas.corr())
      console.log('📊 Calculating correlation matrix...');
      const correlationMatrix = CorrelationCalculator.calculateCorrelationMatrix(returnsMatrix);
      const correlationArray = [];
      for (let i = 0; i < stockData.symbols.length; i++) {
        correlationArray[i] = [];
        for (let j = 0; j < stockData.symbols.length; j++) {
          correlationArray[i][j] = correlationMatrix.get([i, j]);
        }
      }

      // Step 9: Risk attribution analysis
      console.log('🎯 Calculating risk attribution...');
      const riskAttribution = RiskAttributionCalculator.calculateRiskContribution(
        optimizationResult.weights, 
        optimizer.covarianceMatrix
      );

      // Step 10: Capital allocation with risk-free asset (like Python CML)
      let capitalAllocation = null;
      if (includeRiskFree) {
        console.log('💰 Calculating capital allocation...');
        if (optimizationMethod === 'targetReturn') {
          capitalAllocation = optimizer.calculateCapitalAllocation(targetReturn, null);
        } else if (optimizationMethod === 'targetRisk') {
          capitalAllocation = optimizer.calculateCapitalAllocation(null, targetRisk);
        } else {
          capitalAllocation = optimizer.calculateCapitalAllocation();
        }
      }

      // Step 11: Generate efficient frontier (like Python matplotlib)
      console.log('📊 Generating efficient frontier...');
      const efficientFrontier = optimizationResult.efficientFrontier || 
        optimizer.generateEfficientFrontier(optimizationResult.allSimulations, 100);

      // Compile comprehensive results (matching Python Streamlit results)
      const comprehensiveResults: OptimizationResults = {
        weights: optimizationResult.weights,
        expectedReturn: optimizationResult.expectedReturn || 0,
        volatility: optimizationResult.volatility || 0,
        sharpeRatio: optimizationResult.sharpeRatio || 0,
        tickers: stockData.symbols,
        capmReturns: capmResults,
        betas: betas,
        alphas: alphas,
        correlationMatrix: correlationArray,
        efficientFrontier: efficientFrontier,
        riskAttribution: riskAttribution,
        allSimulations: optimizationResult.allSimulations || [],
        capitalAllocation: capitalAllocation,
        type: optimizationMethod,
        metadata: {
          dataSource: stockData.metadata.dataSource,
          fetchTime: stockData.metadata.fetchTime,
          riskFreeRate: riskFreeRate,
          marketReturn: marketReturn,
          monteCarloSimulations: monteCarloSimulations
        }
      };

      // Final validation
      if (comprehensiveResults.weights.some(w => isNaN(w) || !isFinite(w))) {
        throw new Error('Optimization produced invalid weights (NaN or Infinite)');
      }

      setResults(comprehensiveResults);
      setActiveTab('weights');

      // Success feedback with detailed metrics (like Python Streamlit)
      const successMessage = `✅ Portfolio optimized!\n• Method: ${optimizationMethods.find(m => m.key === optimizationMethod)?.label}\n• Expected Return: ${(optimizationResult.expectedReturn * 100).toFixed(2)}%\n• Risk: ${(optimizationResult.volatility * 100).toFixed(2)}%\n• Sharpe Ratio: ${optimizationResult.sharpeRatio.toFixed(3)}\n• Simulations: ${monteCarloSimulations.toLocaleString()}`;
      
      Alert.alert('Optimization Complete', successMessage);

    } catch (error) {
      console.error('❌ Optimization error:', error);
      
      let errorMessage = 'Portfolio optimization failed.';
      if (error.message.includes('real-time')) {
        errorMessage = 'Unable to fetch real-time market data. Please check your internet connection.';
      } else if (error.message.includes('insufficient') || error.message.includes('Insufficient')) {
        errorMessage = 'Insufficient market data for reliable optimization. Try with fewer assets or check ticker symbols.';
      } else if (error.message.includes('API')) {
        errorMessage = 'Data source temporarily unavailable. Please try again.';
      } else if (error.message.includes('Invalid')) {
        errorMessage = 'Invalid input parameters. Please check your settings.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Optimization Failed', errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };

  const resetToDefaults = () => {
    setTickers('AAPL,MSFT,GOOGL,TSLA,AMZN');
    setOptimizationMethod('maxSharpe');
    setTargetReturn(0.15);
    setTargetRisk(0.20);
    setIncludeRiskFree(true);
    setUseMarketBenchmark(true);
    setMonteCarloSimulations(10000);
    setAllowShortSelling(false);
    setMaxPositionSize(0.40);
    setResults(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio Optimizer</Text>
          <Text style={styles.subtitle}>Markowitz Mean-Variance & CAPM Analysis</Text>
        </View>

        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Configuration</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Asset Tickers (comma-separated)</Text>
            <TextInput
              style={styles.textInput}
              value={tickers}
              onChangeText={setTickers}
              placeholder="AAPL, MSFT, GOOGL, TSLA, AMZN"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Portfolio Value</Text>
            <TextInput
              style={styles.textInput}
              value={portfolioValue.toString()}
              onChangeText={(text) => setPortfolioValue(Number(text) || 1000000)}
              placeholder="1000000"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Optimization Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Optimization Method</Text>
          
          {optimizationMethods.map((method) => (
            <TouchableOpacity
              key={method.key}
              style={[
                styles.methodOption,
                optimizationMethod === method.key && styles.methodOptionSelected
              ]}
              onPress={() => setOptimizationMethod(method.key)}
            >
              <View style={styles.methodContent}>
                <Text style={[
                  styles.methodLabel,
                  optimizationMethod === method.key && styles.methodLabelSelected
                ]}>
                  {method.label}
                </Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>
              <Ionicons
                name={optimizationMethod === method.key ? "radio-button-on" : "radio-button-off"}
                size={20}
                color={optimizationMethod === method.key ? "#1f4e79" : "#ccc"}
              />
            </TouchableOpacity>
          ))}

          {/* Target Parameters */}
          {optimizationMethod === 'targetReturn' && (
            <View style={styles.targetSection}>
              <Text style={styles.targetLabel}>Target Annual Return: {(targetReturn * 100).toFixed(1)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.01}
                maximumValue={0.50}
                value={targetReturn}
                onValueChange={setTargetReturn}
                minimumTrackTintColor="#1f4e79"
                maximumTrackTintColor="#ccc"
                thumbStyle={styles.sliderThumb}
              />
            </View>
          )}

          {optimizationMethod === 'targetRisk' && (
            <View style={styles.targetSection}>
              <Text style={styles.targetLabel}>Target Annual Volatility: {(targetRisk * 100).toFixed(1)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.05}
                maximumValue={0.50}
                value={targetRisk}
                onValueChange={setTargetRisk}
                minimumTrackTintColor="#1f4e79"
                maximumTrackTintColor="#ccc"
                thumbStyle={styles.sliderThumb}
              />
            </View>
          )}
        </View>

        {/* Advanced Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Options</Text>
          
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Include Risk-Free Asset (3-Month Treasury)</Text>
              <Text style={styles.subLabel}>Enable capital allocation with ^IRX</Text>
            </View>
            <Switch
              value={includeRiskFree}
              onValueChange={setIncludeRiskFree}
              trackColor={{ false: '#ccc', true: '#1f4e79' }}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Use S&P 500 Benchmark</Text>
              <Text style={styles.subLabel}>Enable CAPM analysis with market data</Text>
            </View>
            <Switch
              value={useMarketBenchmark}
              onValueChange={setUseMarketBenchmark}
              trackColor={{ false: '#ccc', true: '#1f4e79' }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Monte Carlo Simulations: {monteCarloSimulations.toLocaleString()}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={50000}
              step={1000}
              value={monteCarloSimulations}
              onValueChange={setMonteCarloSimulations}
              minimumTrackTintColor="#1f4e79"
              maximumTrackTintColor="#ccc"
              thumbStyle={styles.sliderThumb}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Maximum Position Size: {(maxPositionSize * 100).toFixed(0)}%</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.10}
              maximumValue={1.00}
              step={0.05}
              value={maxPositionSize}
              onValueChange={setMaxPositionSize}
              minimumTrackTintColor="#1f4e79"
              maximumTrackTintColor="#ccc"
              thumbStyle={styles.sliderThumb}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runOptimization}
            disabled={isOptimizing}
          >
            {isOptimizing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Ionicons name="analytics" size={20} color="#ffffff" />
            )}
            <Text style={styles.buttonText}>
              {isOptimizing ? 'Optimizing...' : 'Run Optimization'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetToDefaults}
          >
            <Ionicons name="refresh" size={20} color="#1f4e79" />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        {results && (
          <View style={styles.resultsContainer}>
            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { key: 'weights', label: 'Weights', icon: 'pie-chart' },
                { key: 'frontier', label: 'Frontier', icon: 'trending-up' },
                { key: 'capm', label: 'CAPM', icon: 'analytics' },
                { key: 'correlation', label: 'Correlation', icon: 'grid' },
                { key: 'allocation', label: 'Allocation', icon: 'wallet' }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={activeTab === tab.key ? '#1f4e79' : '#666'}
                  />
                  <Text style={[
                    styles.tabText,
                    activeTab === tab.key && styles.activeTabText
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Portfolio Metrics Summary */}
            <View style={styles.metricsContainer}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Expected Return</Text>
                <Text style={styles.metricValue}>{(results.expectedReturn * 100).toFixed(2)}%</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Volatility</Text>
                <Text style={styles.metricValue}>{(results.volatility * 100).toFixed(2)}%</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Sharpe Ratio</Text>
                <Text style={styles.metricValue}>{results.sharpeRatio.toFixed(3)}</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Simulations</Text>
                <Text style={styles.metricValue}>{results.metadata.monteCarloSimulations.toLocaleString()}</Text>
              </View>
            </View>

            {/* Chart Content */}
            {activeTab === 'weights' && (
              <PortfolioWeightsChart
                weights={results.weights}
                tickers={results.tickers}
                title="Optimal Portfolio Allocation"
              />
            )}

            {activeTab === 'frontier' && (
              <EfficientFrontierChart
                efficientFrontier={results.efficientFrontier}
                optimalPortfolio={{
                  expectedReturn: results.expectedReturn,
                  volatility: results.volatility,
                  sharpeRatio: results.sharpeRatio
                }}
                allSimulations={results.allSimulations}
                riskFreeRate={results.metadata.riskFreeRate}
                showCapitalMarketLine={includeRiskFree}
              />
            )}

            {activeTab === 'capm' && (
              <CAPMAnalysisChart
                capmData={Object.fromEntries(
                  results.tickers.map(ticker => [
                    ticker,
                    {
                      alpha: results.alphas[ticker],
                      beta: results.betas[ticker],
                      capmExpectedReturn: results.capmReturns[ticker],
                      rSquared: 0.75 // Placeholder - would need to store this from CAPM calculation
                    }
                  ])
                )}
                riskFreeRate={results.metadata.riskFreeRate}
                marketReturn={results.metadata.marketReturn}
              />
            )}

            {activeTab === 'correlation' && (
              <CorrelationMatrixChart
                correlationMatrix={results.correlationMatrix}
                tickers={results.tickers}
              />
            )}

            {activeTab === 'allocation' && results.capitalAllocation && (
              <CapitalAllocationChart
                riskyWeight={results.capitalAllocation.riskyWeight}
                riskFreeWeight={results.capitalAllocation.riskFreeWeight}
                tangencyWeights={results.capitalAllocation.tangencyWeights}
                tickers={results.tickers}
                targetReturn={optimizationMethod === 'targetReturn' ? targetReturn : undefined}
                targetVolatility={optimizationMethod === 'targetRisk' ? targetRisk : undefined}
              />
            )}

            {/* Detailed Metrics */}
            <View style={styles.detailedMetrics}>
              <Text style={styles.detailedMetricsTitle}>Detailed Analysis</Text>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>Risk-Free Rate:</Text>
                <Text style={styles.metricRowValue}>{(results.metadata.riskFreeRate * 100).toFixed(3)}%</Text>
              </View>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>Market Return:</Text>
                <Text style={styles.metricRowValue}>{(results.metadata.marketReturn * 100).toFixed(2)}%</Text>
              </View>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>Data Source:</Text>
                <Text style={styles.metricRowValue}>{results.metadata.dataSource}</Text>
              </View>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>Optimization Method:</Text>
                <Text style={styles.metricRowValue}>
                  {optimizationMethods.find(m => m.key === results.type)?.label}
                </Text>
              </View>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#1f4e79',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#b8c5d1',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f4e79',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  methodOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1f4e79',
  },
  methodContent: {
    flex: 1,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  methodLabelSelected: {
    color: '#1f4e79',
  },
  methodDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  targetSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f4e79',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#1f4e79',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#1f4e79',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#1f4e79',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f4e79',
  },
  resultsContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
    gap: 4,
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
  },
  tabText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#1f4e79',
    fontWeight: '600',
  },
  metricsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f4e79',
    textAlign: 'center',
  },
  detailedMetrics: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailedMetricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f4e79',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricRowLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  metricRowValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
});
