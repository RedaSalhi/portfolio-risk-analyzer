import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
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
} from 'react-native';
import { CorrelationMatrixChart, PerformanceChart, PortfolioWeightsChart } from '../src/components/Charts';
import { dataFetcher } from '../src/utils/dataFetcher';
import { PortfolioOptimizer, VaRCalculator } from '../src/utils/financialCalculations';

interface OptimizationResults {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  tickers: string[];
  capmReturns: { [key: string]: number };
  betas: { [key: string]: number };
  correlationMatrix: number[][];
  type: string;
}

export default function PortfolioOptimizerScreen() {
  const [tickers, setTickers] = useState('AAPL,MSFT,GOOG,TSLA');
  const [targetOption, setTargetOption] = useState('None');
  const [targetReturn, setTargetReturn] = useState(0.15);
  const [targetVolatility, setTargetVolatility] = useState(0.20);
  const [includeRiskFree, setIncludeRiskFree] = useState(true);
  const [useSP500, setUseSP500] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<OptimizationResults | null>(null);

  const targetOptions = ['None', 'Target Return', 'Target Volatility'];

  const runOptimization = async () => {
    setLoading(true);
    try {
      // Parse tickers
      const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t.length > 0);
      
      if (tickerList.length < 2) {
        Alert.alert('Error', 'Please enter at least 2 tickers');
        return;
      }

      console.log('Fetching data for:', tickerList);

      // Fetch real stock data
      const stockData = await dataFetcher.fetchMultipleStocks(tickerList, '1y');
      
      // Get market data (S&P 500) if needed
      let marketReturns = null;
      if (useSP500) {
        const marketData = await dataFetcher.fetchStockData('^GSPC', '1y');
        marketReturns = marketData.returns.map(r => r.return);
      }

      // Get risk-free rate
      const riskFreeRate = includeRiskFree ? await dataFetcher.getRiskFreeRate() : 0.05;

      // Prepare returns matrix
      const returnsMatrix = tickerList.map(ticker => stockData.returns[ticker] || []);
      
      // Ensure all return series have data
      if (returnsMatrix.some(returns => returns.length === 0)) {
        Alert.alert('Error', 'Unable to fetch data for some tickers. Please check ticker symbols.');
        return;
      }

      console.log('Data fetched successfully, running optimization...');

      // Initialize optimizer
      const optimizer = new PortfolioOptimizer(returnsMatrix, riskFreeRate);

      // Run optimization based on target
      let optimizationResult;
      if (targetOption === 'Target Return') {
        optimizationResult = optimizer.optimizePortfolio(targetReturn, null);
      } else if (targetOption === 'Target Volatility') {
        optimizationResult = optimizer.optimizePortfolio(null, targetVolatility);
      } else {
        optimizationResult = optimizer.optimizePortfolio();
      }

      // Calculate CAPM if market data available
      let capmResults = {};
      let betas = {};
      if (marketReturns) {
        const capmData = optimizer.calculateCAPMReturns(marketReturns);
        capmResults = Object.fromEntries(
          tickerList.map((ticker, i) => [ticker, capmData[i]?.expectedReturn || 0])
        );
        betas = Object.fromEntries(
          tickerList.map((ticker, i) => [ticker, capmData[i]?.beta || 0])
        );
      }

      // Calculate correlation matrix
      const correlationMatrix = VaRCalculator.calculateSimpleCorrelationMatrix(returnsMatrix);

      const results: OptimizationResults = {
        weights: optimizationResult.weights,
        expectedReturn: optimizationResult.expectedReturn,
        volatility: optimizationResult.volatility,
        sharpeRatio: optimizationResult.sharpeRatio,
        tickers: tickerList,
        capmReturns: capmResults,
        betas: betas,
        correlationMatrix: correlationMatrix,
        type: optimizationResult.type || 'max_sharpe'
      };

      setResults(results);

    } catch (error) {
      console.error('Optimization error:', error);
      Alert.alert('Error', 'Failed to optimize portfolio. Please check your internet connection and ticker symbols.');
    } finally {
      setLoading(false);
    }
  };

  const renderTargetSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Optimization Target</Text>
      {targetOptions.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.optionButton,
            targetOption === option && styles.optionButtonSelected
          ]}
          onPress={() => setTargetOption(option)}
        >
          <Text style={[
            styles.optionText,
            targetOption === option && styles.optionTextSelected
          ]}>
            {option}
          </Text>
        </TouchableOpacity>
      ))}
      
      {targetOption === 'Target Return' && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Target Return: {(targetReturn * 100).toFixed(1)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.05}
            maximumValue={0.35}
            value={targetReturn}
            onValueChange={setTargetReturn}
            minimumTrackTintColor="#4B8BBE"
            maximumTrackTintColor="#ddd"
          />
        </View>
      )}
      
      {targetOption === 'Target Volatility' && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>Target Volatility: {(targetVolatility * 100).toFixed(1)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.10}
            maximumValue={0.40}
            value={targetVolatility}
            onValueChange={setTargetVolatility}
            minimumTrackTintColor="#4B8BBE"
            maximumTrackTintColor="#ddd"
          />
        </View>
      )}
    </View>
  );

  const renderResults = () => {
    if (!results) return null;

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Optimization Results</Text>
        <Text style={styles.resultsSubtitle}>
          {results.type === 'max_sharpe' ? 'Maximum Sharpe Ratio' : 
           results.type === 'target_return' ? 'Target Return Optimization' : 'Target Volatility Optimization'}
        </Text>
        
        {/* Main Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Expected Return</Text>
            <Text style={styles.metricValue}>{(results.expectedReturn * 100).toFixed(2)}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Volatility</Text>
            <Text style={styles.metricValue}>{(results.volatility * 100).toFixed(2)}%</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Sharpe Ratio</Text>
            <Text style={styles.metricValue}>{results.sharpeRatio.toFixed(3)}</Text>
          </View>
        </View>

        {/* Portfolio Weights Chart */}
        <PortfolioWeightsChart 
          weights={results.weights}
          assetNames={results.tickers}
          title="Optimal Portfolio Allocation"
        />

        {/* Performance Chart */}
        <PerformanceChart
          expectedReturn={results.expectedReturn}
          volatility={results.volatility}
          benchmarkReturn={0.10}
          benchmarkVol={0.15}
          title="Risk-Return Profile"
        />

        {/* Correlation Matrix */}
        {results.correlationMatrix && results.correlationMatrix.length > 1 && (
          <CorrelationMatrixChart
            correlationMatrix={results.correlationMatrix}
            assetNames={results.tickers}
            title="Asset Correlation Matrix"
          />
        )}

        {/* CAPM Analysis */}
        {Object.keys(results.capmReturns).length > 0 && (
          <View style={styles.capmContainer}>
            <Text style={styles.capmTitle}>CAPM Analysis</Text>
            {results.tickers.map((ticker) => (
              <View key={ticker} style={styles.capmItem}>
                <Text style={styles.capmTicker}>{ticker}</Text>
                <Text style={styles.capmText}>
                  Expected Return: {(results.capmReturns[ticker] * 100).toFixed(2)}%
                </Text>
                <Text style={styles.capmText}>
                  Beta: {results.betas[ticker].toFixed(3)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Data Source Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color="#4B8BBE" />
          <Text style={styles.infoText}>
            Data sourced from Yahoo Finance. Calculations based on 1-year historical returns.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Configuration</Text>
          
          <Text style={styles.label}>Asset Tickers (comma-separated)</Text>
          <TextInput
            style={styles.textInput}
            value={tickers}
            onChangeText={setTickers}
            placeholder="AAPL,MSFT,GOOG,TSLA"
            placeholderTextColor="#999"
          />
          <Text style={styles.helpText}>
            Enter valid stock symbols (e.g., AAPL, MSFT, GOOG, TSLA, NVDA)
          </Text>
        </View>

        {renderTargetSelector()}

        {/* Options Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analysis Options</Text>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Include Risk-Free Rate (3M Treasury)</Text>
            <Switch
              value={includeRiskFree}
              onValueChange={setIncludeRiskFree}
              trackColor={{ false: '#ddd', true: '#4B8BBE' }}
              thumbColor={includeRiskFree ? '#306998' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Use S&P 500 for CAPM Analysis</Text>
            <Switch
              value={useSP500}
              onValueChange={setUseSP500}
              trackColor={{ false: '#ddd', true: '#4B8BBE' }}
              thumbColor={useSP500 ? '#306998' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Run Button */}
        <TouchableOpacity
          style={[styles.runButton, loading && styles.runButtonDisabled]}
          onPress={runOptimization}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" />
              <Text style={styles.loadingText}>Fetching data & optimizing...</Text>
            </View>
          ) : (
            <>
              <Ionicons name="trending-up" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.runButtonText}>Optimize Portfolio</Text>
            </>
          )}
        </TouchableOpacity>

        {renderResults()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f4e79',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  optionButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#4B8BBE',
    borderColor: '#4B8BBE',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: 'white',
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  runButton: {
    margin: 16,
    backgroundColor: '#4B8BBE',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  runButtonDisabled: {
    backgroundColor: '#ccc',
  },
  runButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  resultsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f4e79',
    marginBottom: 4,
    textAlign: 'center',
  },
  resultsSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B8BBE',
  },
  capmContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  capmTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  capmItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  capmTicker: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f4e79',
    marginBottom: 4,
  },
  capmText: {
    fontSize: 12,
    color: '#666',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});