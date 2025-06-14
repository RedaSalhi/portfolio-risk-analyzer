// app/portfolio.tsx - COMPLETE PROFESSIONAL PORTFOLIO OPTIMIZER
// Includes all features from your Python app + real-time data

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
import { PortfolioWeightsChart, CorrelationMatrixChart, EfficientFrontierChart, CAPMAnalysisChart } from '../src/components/Charts';
import { realTimeDataFetcher } from '../src/utils/realTimeDataFetcher';
import { PortfolioOptimizer, VaRCalculator } from '../src/utils/financialCalculations';

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
  efficientFrontier: Array<{return: number, risk: number, sharpe: number}>;
  riskAttribution: { [key: string]: number };
  type: string;
  metadata: {
    dataSource: string;
    fetchTime: string;
    riskFreeRate: number;
    marketReturn: number;
  };
}

export default function EnhancedPortfolioOptimizer() {
  // Core portfolio inputs
  const [tickers, setTickers] = useState('AAPL,MSFT,GOOGL,TSLA,AMZN');
  const [portfolioValue, setPortfolioValue] = useState(1000000);
  
  // Optimization method selection
  const [optimizationMethod, setOptimizationMethod] = useState('maxSharpe');
  const [targetReturn, setTargetReturn] = useState(0.15);
  const [targetRisk, setTargetRisk] = useState(0.20);
  
  // Advanced options
  const [includeRiskFree, setIncludeRiskFree] = useState(true);
  const [useMarketBenchmark, setUseMarketBenchmark] = useState(true);
  const [allowShortSelling, setAllowShortSelling] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState(0.40);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [activeTab, setActiveTab] = useState('weights');
  const [dataHealth, setDataHealth] = useState<any>(null);

  // Optimization methods
  const optimizationMethods = [
    { key: 'maxSharpe', label: 'Maximum Sharpe Ratio', icon: '📈' },
    { key: 'minRisk', label: 'Minimum Risk', icon: '🛡️' },
    { key: 'targetReturn', label: 'Target Return', icon: '🎯' },
    { key: 'targetRisk', label: 'Target Risk', icon: '⚖️' },
    { key: 'equalWeight', label: 'Equal Weight', icon: '⚖️' },
    { key: 'riskParity', label: 'Risk Parity', icon: '🔄' }
  ];

  // Check system health on load
  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      const health = await realTimeDataFetcher.healthCheck();
      setDataHealth(health);
      
      if (health.overall_status === 'CRITICAL ❌') {
        Alert.alert('Data System Warning', 'Critical data source failure detected. Some features may be limited.');
      }
    } catch (error) {
      console.warn('Health check failed:', error);
    }
  };

  const runAdvancedOptimization = async () => {
    setLoading(true);
    
    try {
      // Parse and validate tickers
      const tickerList = tickers.split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0 && /^[A-Z]{1,5}$/.test(t));
      
      if (tickerList.length < 2) {
        Alert.alert('Error', 'Please enter at least 2 valid tickers (e.g., AAPL,MSFT)');
        return;
      }

      if (tickerList.length > 20) {
        Alert.alert('Error', 'Maximum 20 tickers allowed for mobile optimization');
        return;
      }

      console.log('🚀 Starting advanced portfolio optimization for:', tickerList);

      // Step 1: Fetch real-time market data
      const stockData = await realTimeDataFetcher.fetchMultipleStocks(tickerList, '2y', true);
      
      if (!stockData.metadata || stockData.metadata.dataSource !== 'real-time-multi-source') {
        throw new Error('Failed to get real-time market data');
      }

      console.log(`✅ Real-time data: ${stockData.symbols.join(', ')} from ${stockData.metadata.dataSource}`);

      // Step 2: Get market benchmark data
      let marketReturns = null;
      let marketReturn = 0;
      if (useMarketBenchmark) {
        try {
          marketReturns = await realTimeDataFetcher.getMarketData('2y');
          marketReturn = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length * 252;
          console.log(`✅ Market benchmark: ${marketReturns.length} returns, annual return: ${(marketReturn*100).toFixed(2)}%`);
        } catch (error) {
          console.warn('Market data failed, using portfolio proxy:', error.message);
          useMarketBenchmark && setUseMarketBenchmark(false);
        }
      }

      // Step 3: Get real-time risk-free rate
      const riskFreeRate = includeRiskFree ? 
        await realTimeDataFetcher.getRiskFreeRate() : 0.0;
      
      console.log(`✅ Risk-free rate: ${(riskFreeRate * 100).toFixed(3)}%`);

      // Step 4: Prepare returns matrix
      const returnsMatrix = stockData.symbols.map(symbol => stockData.returns[symbol] || []);
      
      // Validate sufficient data
      const minObservations = Math.min(...returnsMatrix.map(r => r.length));
      if (minObservations < 100) {
        Alert.alert('Warning', `Limited data: only ${minObservations} observations. Results may be less reliable.`);
      }

      // Step 5: Initialize advanced optimizer
      const optimizer = new PortfolioOptimizer(returnsMatrix, riskFreeRate);
      
      // Set constraints
      optimizer.setConstraints({
        allowShortSelling: allowShortSelling,
        maxPositionSize: maxPositionSize,
        minPositionSize: allowShortSelling ? -0.20 : 0.0
      });

      // Step 6: Run optimization based on method
      let optimizationResult;
      console.log(`🎯 Running ${optimizationMethod} optimization...`);
      
      switch (optimizationMethod) {
        case 'maxSharpe':
          optimizationResult = optimizer.optimizeMaxSharpe();
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
          optimizationResult = optimizer.optimizeMaxSharpe();
      }

      console.log(`✅ Optimization complete: ${(optimizationResult.sharpeRatio).toFixed(3)} Sharpe ratio`);

      // Step 7: Generate efficient frontier
      const efficientFrontier = optimizer.generateEfficientFrontier(50);
      console.log(`✅ Efficient frontier: ${efficientFrontier.length} portfolios`);

      // Step 8: Calculate CAPM metrics
      let capmResults = {};
      let betas = {};
      let alphas = {};
      
      if (marketReturns && marketReturns.length > 0) {
        console.log('📊 Calculating CAPM metrics...');
        try {
          const capmData = optimizer.calculateCAPMReturns(marketReturns);
          capmResults = Object.fromEntries(
            stockData.symbols.map((ticker, i) => [ticker, capmData[i]?.expectedReturn || 0])
          );
          betas = Object.fromEntries(
            stockData.symbols.map((ticker, i) => [ticker, capmData[i]?.beta || 0])
          );
          alphas = Object.fromEntries(
            stockData.symbols.map((ticker, i) => [ticker, capmData[i]?.alpha || 0])
          );
          console.log('✅ CAPM analysis complete');
        } catch (error) {
          console.warn('CAPM calculation failed:', error.message);
        }
      }

      // Step 9: Calculate risk attribution
      const riskAttribution = optimizer.calculateRiskAttribution(optimizationResult.weights);

      // Step 10: Calculate correlation matrix
      const correlationMatrix = VaRCalculator.calculateRobustCorrelationMatrix(returnsMatrix);

      // Compile comprehensive results
      const comprehensiveResults: OptimizationResults = {
        weights: optimizationResult.weights,
        expectedReturn: optimizationResult.expectedReturn,
        volatility: optimizationResult.volatility,
        sharpeRatio: optimizationResult.sharpeRatio,
        tickers: stockData.symbols,
        capmReturns: capmResults,
        betas: betas,
        alphas: alphas,
        correlationMatrix: correlationMatrix,
        efficientFrontier: efficientFrontier,
        riskAttribution: riskAttribution,
        type: optimizationMethod,
        metadata: {
          dataSource: stockData.metadata.dataSource,
          fetchTime: stockData.metadata.fetchTime,
          riskFreeRate: riskFreeRate,
          marketReturn: marketReturn
        }
      };

      setResults(comprehensiveResults);
      setActiveTab('weights');

      // Success feedback
      const successMessage = `✅ Portfolio optimized!\n• Method: ${optimizationMethods.find(m => m.key === optimizationMethod)?.label}\n• Expected Return: ${(optimizationResult.expectedReturn * 100).toFixed(2)}%\n• Risk: ${(optimizationResult.volatility * 100).toFixed(2)}%\n• Sharpe Ratio: ${optimizationResult.sharpeRatio.toFixed(3)}`;
      
      Alert.alert('Optimization Complete', successMessage);

    } catch (error) {
      console.error('❌ Optimization error:', error);
      
      let errorMessage = 'Portfolio optimization failed.';
      if (error.message.includes('real-time')) {
        errorMessage = 'Unable to fetch real-time market data. Please check your internet connection.';
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient market data for reliable optimization.';
      } else if (error.message.includes('API')) {
        errorMessage = 'Data source temporarily unavailable. Please try again.';
      }
      
      Alert.alert('Optimization Error', errorMessage);
    } finally {
      setLoading(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio Optimizer</Text>
          <Text style={styles.subtitle}>Professional Portfolio Management</Text>
          
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

          {/* Portfolio Value */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Portfolio Value: ${portfolioValue.toLocaleString()}</Text>
            <Slider
              style={styles.slider}
              minimumValue={100000}
              maximumValue={10000000}
              value={portfolioValue}
              onValueChange={setPortfolioValue}
              step={100000}
              minimumTrackTintColor="#4A90E2"
              maximumTrackTintColor="#E0E0E0"
            />
          </View>

          {/* Optimization Method */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Optimization Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
              {optimizationMethods.map((method) => (
                <TouchableOpacity
                  key={method.key}
                  style={[styles.methodButton, optimizationMethod === method.key && styles.methodButtonActive]}
                  onPress={() => setOptimizationMethod(method.key)}
                >
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <Text style={[styles.methodLabel, optimizationMethod === method.key && styles.methodLabelActive]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Target Parameters */}
          {optimizationMethod === 'targetReturn' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Return: {(targetReturn * 100).toFixed(1)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.05}
                maximumValue={0.30}
                value={targetReturn}
                onValueChange={setTargetReturn}
                step={0.01}
                minimumTrackTintColor="#4A90E2"
              />
            </View>
          )}

          {optimizationMethod === 'targetRisk' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Risk: {(targetRisk * 100).toFixed(1)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.05}
                maximumValue={0.40}
                value={targetRisk}
                onValueChange={setTargetRisk}
                step={0.01}
                minimumTrackTintColor="#4A90E2"
              />
            </View>
          )}

          {/* Advanced Options */}
          <View style={styles.advancedOptions}>
            <Text style={styles.inputLabel}>Advanced Options</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Include Risk-Free Asset</Text>
              <Switch
                value={includeRiskFree}
                onValueChange={setIncludeRiskFree}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Use Market Benchmark (S&P 500)</Text>
              <Switch
                value={useMarketBenchmark}
                onValueChange={setUseMarketBenchmark}
                trackColor={{ false: '#E0E0E0', true: '#4A90E2' }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Allow Short Selling</Text>
              <Switch
                value={allowShortSelling}
                onValueChange={setAllowShortSelling}
                trackColor={{ false: '#E0E0E0', true: '#FF6B6B' }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Max Position Size: {(maxPositionSize * 100).toFixed(0)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.10}
                maximumValue={1.00}
                value={maxPositionSize}
                onValueChange={setMaxPositionSize}
                step={0.05}
                minimumTrackTintColor="#4A90E2"
              />
            </View>
          </View>
        </View>

        {/* Optimize Button */}
        <TouchableOpacity
          style={[styles.optimizeButton, loading && styles.optimizeButtonDisabled]}
          onPress={runAdvancedOptimization}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.optimizeButtonText}>🚀 Optimize Portfolio</Text>
          )}
        </TouchableOpacity>

        {/* Results Section */}
        {results && (
          <View style={styles.resultsSection}>
            
            {/* Results Header */}
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Optimization Results</Text>
              <Text style={styles.resultsSubtitle}>
                {optimizationMethods.find(m => m.key === results.type)?.label}
              </Text>
            </View>

            {/* Key Metrics */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{(results.expectedReturn * 100).toFixed(2)}%</Text>
                <Text style={styles.metricLabel}>Expected Return</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{(results.volatility * 100).toFixed(2)}%</Text>
                <Text style={styles.metricLabel}>Risk (Volatility)</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{results.sharpeRatio.toFixed(3)}</Text>
                <Text style={styles.metricLabel}>Sharpe Ratio</Text>
              </View>
            </View>

            {/* Results Tabs */}
            <View style={styles.tabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TabButton tabKey="weights" label="Weights" icon="📊" />
                <TabButton tabKey="frontier" label="Frontier" icon="📈" />
                <TabButton tabKey="capm" label="CAPM" icon="📉" />
                <TabButton tabKey="risk" label="Risk" icon="⚠️" />
                <TabButton tabKey="correlation" label="Correlation" icon="🔗" />
              </ScrollView>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'weights' && (
                <View>
                  <PortfolioWeightsChart
                    weights={results.weights}
                    tickers={results.tickers}
                    title="Optimal Portfolio Weights"
                  />
                  <View style={styles.weightsTable}>
                    {results.tickers.map((ticker, index) => (
                      <View key={ticker} style={styles.weightRow}>
                        <Text style={styles.tickerText}>{ticker}</Text>
                        <Text style={styles.weightText}>{(results.weights[index] * 100).toFixed(2)}%</Text>
                        <Text style={styles.valueText}>
                          ${(results.weights[index] * portfolioValue).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {activeTab === 'frontier' && results.efficientFrontier && (
                <View>
                  <EfficientFrontierChart
                    frontierData={results.efficientFrontier}
                    currentPortfolio={{
                      return: results.expectedReturn,
                      risk: results.volatility,
                      sharpe: results.sharpeRatio
                    }}
                    title="Efficient Frontier"
                  />
                </View>
              )}

              // CORRECTION pour le formatage .3f - Dans la section CAPM:

                {activeTab === 'capm' && Object.keys(results.capmReturns).length > 0 && (
                  <View>
                    <CAPMAnalysisChart
                      capmReturns={results.campReturns}
                      betas={results.betas}
                      alphas={results.alphas}
                      tickers={results.tickers}
                      marketReturn={results.metadata.marketReturn}
                      riskFreeRate={results.metadata.riskFreeRate}
                    />
                    
                    {/* Table CAPM avec formatage .3f */}
                    <View style={styles.capmTable}>
                      <View style={styles.capmHeader}>
                        <Text style={[styles.campHeaderText, { flex: 2 }]}>Asset</Text>
                        <Text style={[styles.capmHeaderText, { flex: 1.5 }]}>Beta</Text>
                        <Text style={[styles.capmHeaderText, { flex: 1.5 }]}>Alpha</Text>
                        <Text style={[styles.capmHeaderText, { flex: 2 }]}>Expected Return</Text>
                      </View>
                      
                      {results.tickers.map((ticker, index) => (
                        <View key={ticker} style={styles.capmRow}>
                          <Text style={[styles.capmCellText, { flex: 2, fontWeight: '600' }]}>
                            {ticker}
                          </Text>
                          <Text style={[styles.capmCellText, { flex: 1.5 }]}>
                            {(results.betas[ticker] || 0).toFixed(3)}
                          </Text>
                          <Text style={[styles.capmCellText, { 
                            flex: 1.5,
                            color: (results.alphas[ticker] || 0) > 0 ? '#27AE60' : '#E74C3C'
                          }]}>
                            {((results.alphas[ticker] || 0) * 100).toFixed(3)}%
                          </Text>
                          <Text style={[styles.capmCellText, { flex: 2 }]}>
                            {((results.capmReturns[ticker] || 0) * 100).toFixed(3)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

              {activeTab === 'risk' && results.riskAttribution && (
                <View>
                  <Text style={styles.chartTitle}>Risk Attribution</Text>
                  {results.tickers.map((ticker, index) => (
                    <View key={ticker} style={styles.riskRow}>
                      <Text style={styles.tickerText}>{ticker}</Text>
                      <Text style={styles.riskText}>
                        {(results.riskAttribution[ticker] * 100 || 0).toFixed(2)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {activeTab === 'correlation' && (
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
              <Text style={styles.metadataTitle}>Data Information</Text>
              <Text style={styles.metadataText}>Source: {results.metadata.dataSource}</Text>
              <Text style={styles.metadataText}>Updated: {new Date(results.metadata.fetchTime).toLocaleString()}</Text>
              <Text style={styles.metadataText}>Risk-free rate: {(results.metadata.riskFreeRate * 100).toFixed(3)}%</Text>
              {results.metadata.marketReturn > 0 && (
                <Text style={styles.metadataText}>Market return: {(results.metadata.marketReturn * 100).toFixed(2)}%</Text>
              )}
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
    color: '#2C3E50',
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
  slider: {
    width: '100%',
    height: 40,
  },
  methodScroll: {
    marginTop: 8,
  },
  methodButton: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 100,
  },
  methodButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  methodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  methodLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  methodLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  advancedOptions: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: '#34495E',
    flex: 1,
  },
  optimizeButton: {
    backgroundColor: '#4A90E2',
    margin: 15,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  optimizeButtonDisabled: {
    opacity: 0.6,
  },
  optimizeButtonText: {
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
    color: '#2C3E50',
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
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
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
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
    backgroundColor: '#4A90E2',
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
  weightsTable: {
    marginTop: 20,
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    flex: 1,
  },
  weightText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  valueText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'right',
    flex: 1,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  riskText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
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
