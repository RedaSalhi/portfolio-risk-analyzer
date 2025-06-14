import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    CorrelationMatrixChart,
    MonteCarloChart,
    PnLVsVaRChart,
    ReturnsDistributionChart,
    VaRMetricsCard
} from '../src/components/Charts';
import { dataFetcher } from '../src/utils/dataFetcher';
import { VaRCalculator } from '../src/utils/financialCalculations';

interface VaRResults {
  method: string;
  var95: number;
  var99: number;
  expectedShortfall: number;
  volatility: number;
  confidenceLevel: number;
  positionSize: number;
  ticker?: string;
  tickers?: string[];
  exceedances?: number;
  exceedanceRate?: number;
  pnlSeries?: number[];
  simulations?: number[];
  correlationMatrix?: number[][];
  diversificationBenefit?: number;
  additionalMetrics?: any;
}

export default function VaRAnalysisScreen() {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [ticker, setTicker] = useState('AAPL');
  const [tickers, setTickers] = useState('AAPL,MSFT,GOOG');
  const [weights, setWeights] = useState('33.3,33.3,33.4');
  const [positionSize, setPositionSize] = useState(100000);
  const [confidence, setConfidence] = useState(0.95);
  const [maturity, setMaturity] = useState(10);
  const [numSimulations, setNumSimulations] = useState(5000); // Reduced from 10000
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VaRResults | null>(null);

  const varMethods = [
    {
      id: 'parametric',
      title: 'Parametric VaR',
      subtitle: 'Single Asset (Normal Distribution)',
      icon: 'trending-up' as const,
      color: '#4B8BBE',
      description: 'Uses normal distribution assumptions for single asset VaR'
    },
    {
      id: 'monte_carlo',
      title: 'Monte Carlo VaR',
      subtitle: 'Portfolio Simulation',
      icon: 'shuffle' as const,
      color: '#44A08D',
      description: 'Simulation-based approach with correlation modeling'
    },
    {
      id: 'fixed_income',
      title: 'Fixed Income VaR',
      subtitle: 'Bond PV01 Method',
      icon: 'bar-chart' as const,
      color: '#E55656',
      description: 'Duration-based approach for bond portfolios'
    },
    {
      id: 'portfolio',
      title: 'Portfolio VaR',
      subtitle: 'Variance-Covariance Method',
      icon: 'pie-chart' as const,
      color: '#F39C12',
      description: 'Analytical portfolio VaR with diversification benefits'
    }
  ];

  const runVaRAnalysis = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a VaR method first');
      return;
    }

    console.log(`🚀 Starting VaR analysis: ${selectedMethod}`);
    setLoading(true);
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Calculation timeout after 30 seconds')), 30000)
      );

      let calculationPromise;
      
      switch (selectedMethod) {
        case 'parametric':
          calculationPromise = calculateParametricVaR();
          break;
        case 'monte_carlo':
          calculationPromise = calculateMonteCarloVaR();
          break;
        case 'fixed_income':
          calculationPromise = calculateFixedIncomeVaR();
          break;
        case 'portfolio':
          calculationPromise = calculatePortfolioVaR();
          break;
        default:
          throw new Error('Invalid VaR method selected');
      }

      // Race between calculation and timeout
      const varResults = await Promise.race([calculationPromise, timeoutPromise]) as VaRResults;
      
      console.log('✅ VaR analysis completed successfully');
      setResults(varResults);

    } catch (error) {
      console.error('❌ VaR calculation error:', error);
      const errorMessage = error.message || 'Failed to calculate VaR';
      Alert.alert('Error', `${errorMessage}. Please check your inputs and try again.`);
    } finally {
      setLoading(false);
    }
  };

  const calculateParametricVaR = async (): Promise<VaRResults> => {
    console.log('🔄 Starting Parametric VaR calculation for:', ticker);
    
    try {
      // Fetch data with timeout
      console.log('📊 Fetching stock data...');
      const stockData = await dataFetcher.fetchStockData(ticker, '6mo'); // Shorter period for speed
      console.log('✅ Data fetched:', stockData.metadata);
      
      const returns = stockData.returns.map(r => r.return);
      console.log('📈 Returns extracted:', returns.length, 'data points');

      if (returns.length === 0) {
        throw new Error('No return data available for the selected ticker');
      }

      // Calculate VaR using simplified method
      console.log('🧮 Calculating VaR...');
      const varResult = VaRCalculator.calculateParametricVaR(returns, confidence, positionSize);
      console.log('✅ VaR calculated successfully');

      // Calculate other confidence levels separately to avoid blocking
      const var95 = confidence === 0.95 ? varResult.var : 
        VaRCalculator.calculateParametricVaR(returns, 0.95, positionSize).var;
      const var99 = confidence === 0.99 ? varResult.var : 
        VaRCalculator.calculateParametricVaR(returns, 0.99, positionSize).var;

      return {
        method: 'parametric',
        var95: var95,
        var99: var99,
        expectedShortfall: varResult.var * 1.25,
        volatility: varResult.volatility,
        confidenceLevel: confidence,
        positionSize: positionSize,
        ticker: ticker,
        exceedances: varResult.exceedances,
        exceedanceRate: varResult.exceedanceRate,
        pnlSeries: varResult.pnlSeries,
        additionalMetrics: {
          mean: varResult.mean,
          zScore: varResult.zScore,
          returns: returns.slice(0, 100) // Limit for charts
        }
      };
    } catch (error) {
      console.error('❌ Parametric VaR calculation failed:', error);
      throw error;
    }
  };

  const calculateMonteCarloVaR = async (): Promise<VaRResults> => {
    console.log('🔄 Starting Monte Carlo VaR calculation...');
    
    try {
      // Parse inputs
      const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());
      const weightList = weights.split(',').map(w => parseFloat(w.trim()) / 100);

      console.log('📊 Portfolio:', tickerList, 'Weights:', weightList);

      if (tickerList.length !== weightList.length) {
        throw new Error('Number of tickers must match number of weights');
      }

      if (Math.abs(weightList.reduce((sum, w) => sum + w, 0) - 1) > 0.01) {
        throw new Error('Weights must sum to 100%');
      }

      // Fetch data with shorter period for speed
      console.log('📊 Fetching portfolio data...');
      const portfolioData = await dataFetcher.fetchMultipleStocks(tickerList, '6mo');
      const returnsMatrix = tickerList.map(ticker => portfolioData.returns[ticker] || []);
      console.log('✅ Portfolio data fetched');

      if (returnsMatrix.some(returns => returns.length === 0)) {
        throw new Error('Unable to fetch data for some tickers');
      }

      // Use fewer simulations for speed
      const actualSimulations = Math.min(numSimulations, 10000);
      console.log(`🎲 Running ${actualSimulations} simulations...`);

      // Calculate Monte Carlo VaR
      const varResult = VaRCalculator.calculateMonteCarloVaR(
        returnsMatrix, 
        weightList, 
        confidence, 
        actualSimulations, 
        positionSize
      );
      console.log('✅ Monte Carlo VaR calculated');

      // Calculate other confidence levels
      const var95 = confidence === 0.95 ? varResult.var : 
        VaRCalculator.calculateMonteCarloVaR(returnsMatrix, weightList, 0.95, actualSimulations, positionSize).var;
      const var99 = confidence === 0.99 ? varResult.var : 
        VaRCalculator.calculateMonteCarloVaR(returnsMatrix, weightList, 0.99, actualSimulations, positionSize).var;

      return {
        method: 'monte_carlo',
        var95: var95,
        var99: var99,
        expectedShortfall: varResult.expectedShortfall,
        volatility: 0.02, // Simplified calculation
        confidenceLevel: confidence,
        positionSize: positionSize,
        tickers: tickerList,
        simulations: varResult.simulations.slice(0, 1000), // Limit for charts
        correlationMatrix: varResult.correlationMatrix,
        additionalMetrics: {
          numSimulations: actualSimulations,
          weights: weightList
        }
      };
    } catch (error) {
      console.error('❌ Monte Carlo VaR calculation failed:', error);
      throw error;
    }
  };

  const calculateFixedIncomeVaR = async (): Promise<VaRResults> => {
    console.log('Calculating Fixed Income VaR');
    
    // For demo, we'll use a bond price of $100 and current 10-year rate
    const bondPrice = 100;
    const currentYield = 0.045; // 4.5% assumption for 10-year bond

    const varResult = VaRCalculator.calculateFixedIncomeVaR(
      bondPrice, 
      maturity, 
      currentYield, 
      confidence, 
      positionSize
    );

    return {
      method: 'fixed_income',
      var95: confidence === 0.95 ? varResult.var : VaRCalculator.calculateFixedIncomeVaR(bondPrice, maturity, currentYield, 0.95, positionSize).var,
      var99: confidence === 0.99 ? varResult.var : VaRCalculator.calculateFixedIncomeVaR(bondPrice, maturity, currentYield, 0.99, positionSize).var,
      expectedShortfall: varResult.var * 1.2,
      volatility: 0.01, // Typical bond volatility
      confidenceLevel: confidence,
      positionSize: positionSize,
      additionalMetrics: {
        pv01: varResult.pv01,
        modifiedDuration: varResult.modifiedDuration,
        yieldVolatility: varResult.yieldVolatility,
        maturity: maturity
      }
    };
  };

  const calculatePortfolioVaR = async (): Promise<VaRResults> => {
    console.log('Calculating Portfolio VaR');
    
    // Parse portfolio inputs
    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());
    const weightList = weights.split(',').map(w => parseFloat(w.trim()) / 100);

    if (tickerList.length !== weightList.length) {
      throw new Error('Number of tickers must match number of weights');
    }

    // Fetch data for all assets
    const portfolioData = await dataFetcher.fetchMultipleStocks(tickerList, '1y');
    const returnsMatrix = tickerList.map(ticker => portfolioData.returns[ticker] || []);

    if (returnsMatrix.some(returns => returns.length === 0)) {
      throw new Error('Unable to fetch data for some tickers');
    }

    // Calculate Portfolio VaR
    const varResult = VaRCalculator.calculatePortfolioVaR(
      returnsMatrix, 
      weightList, 
      confidence, 
      positionSize
    );

    return {
      method: 'portfolio',
      var95: confidence === 0.95 ? varResult.var : VaRCalculator.calculatePortfolioVaR(returnsMatrix, weightList, 0.95, positionSize).var,
      var99: confidence === 0.99 ? varResult.var : VaRCalculator.calculatePortfolioVaR(returnsMatrix, weightList, 0.99, positionSize).var,
      expectedShortfall: varResult.var * 1.25,
      volatility: varResult.portfolioVolatility,
      confidenceLevel: confidence,
      positionSize: positionSize,
      tickers: tickerList,
      correlationMatrix: varResult.correlationMatrix,
      diversificationBenefit: varResult.diversificationBenefit,
      additionalMetrics: {
        individualVaRs: varResult.individualVaRs,
        sumIndividualVaRs: varResult.sumIndividualVaRs,
        portfolioMean: varResult.portfolioMean,
        weights: weightList
      }
    };
  };

  const renderMethodSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select VaR Method</Text>
      <Text style={styles.sectionSubtitle}>Choose the calculation approach for your risk analysis</Text>
      
      {varMethods.map((method) => (
        <TouchableOpacity
          key={method.id}
          style={[
            styles.methodCard,
            selectedMethod === method.id && { borderColor: method.color, borderWidth: 2 }
          ]}
          onPress={() => setSelectedMethod(method.id)}
        >
          <View style={styles.methodHeader}>
            <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
              <Ionicons name={method.icon} size={24} color="white" />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
            </View>
            {selectedMethod === method.id && (
              <Ionicons name="checkmark-circle" size={24} color={method.color} />
            )}
          </View>
          <Text style={styles.methodDescription}>{method.description}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderParameters = () => {
    if (!selectedMethod) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analysis Parameters</Text>
        
        {/* Single Asset Parameters */}
        {selectedMethod === 'parametric' && (
          <View style={styles.parameterGroup}>
            <Text style={styles.parameterLabel}>Asset Ticker</Text>
            <TextInput
              style={styles.textInput}
              value={ticker}
              onChangeText={setTicker}
              placeholder="Enter ticker (e.g., AAPL, MSFT)"
              placeholderTextColor="#999"
            />
          </View>
        )}

        {/* Portfolio Parameters */}
        {(selectedMethod === 'monte_carlo' || selectedMethod === 'portfolio') && (
          <>
            <View style={styles.parameterGroup}>
              <Text style={styles.parameterLabel}>Portfolio Tickers (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                value={tickers}
                onChangeText={setTickers}
                placeholder="AAPL,MSFT,GOOG"
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.parameterGroup}>
              <Text style={styles.parameterLabel}>Portfolio Weights (%) (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                value={weights}
                onChangeText={setWeights}
                placeholder="33.3,33.3,33.4"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>
          </>
        )}

        {/* Common Parameters */}
        <View style={styles.parameterGroup}>
          <Text style={styles.parameterLabel}>Position Size: ${positionSize.toLocaleString()}</Text>
          <Slider
            style={styles.slider}
            minimumValue={10000}
            maximumValue={10000000}
            value={positionSize}
            onValueChange={(value) => setPositionSize(Math.round(value))}
            minimumTrackTintColor="#4B8BBE"
            maximumTrackTintColor="#ddd"
            step={10000}
          />
        </View>

        <View style={styles.parameterGroup}>
          <Text style={styles.parameterLabel}>Confidence Level: {(confidence * 100).toFixed(0)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.90}
            maximumValue={0.99}
            value={confidence}
            onValueChange={setConfidence}
            minimumTrackTintColor="#4B8BBE"
            maximumTrackTintColor="#ddd"
            step={0.01}
          />
        </View>

        {/* Method-specific parameters */}
        {selectedMethod === 'fixed_income' && (
          <View style={styles.parameterGroup}>
            <Text style={styles.parameterLabel}>Bond Maturity: {maturity} years</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={30}
              value={maturity}
              onValueChange={(value) => setMaturity(Math.round(value))}
              minimumTrackTintColor="#4B8BBE"
              maximumTrackTintColor="#ddd"
              step={1}
            />
          </View>
        )}

        {selectedMethod === 'monte_carlo' && (
          <View style={styles.parameterGroup}>
            <Text style={styles.parameterLabel}>Simulations: {numSimulations.toLocaleString()}</Text>
            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={20000}
              value={numSimulations}
              onValueChange={(value) => setNumSimulations(Math.round(value))}
              minimumTrackTintColor="#4B8BBE"
              maximumTrackTintColor="#ddd"
              step={1000}
            />
            <Text style={styles.helpText}>Fewer simulations = faster calculation</Text>
          </View>
        )}
      </View>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    return (
      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>VaR Analysis Results</Text>
        <Text style={styles.resultsSubtitle}>
          {results.method.toUpperCase().replace('_', ' ')} Method
        </Text>

        {/* VaR Metrics Card */}
        <VaRMetricsCard
          var95={results.var95}
          var99={results.var99}
          expectedShortfall={results.expectedShortfall}
          volatility={results.volatility}
          title="Risk Metrics Summary"
        />

        {/* Returns Distribution for Parametric VaR */}
        {results.method === 'parametric' && results.additionalMetrics?.returns && (
          <ReturnsDistributionChart
            returns={results.additionalMetrics.returns}
            title={`${results.ticker} Returns Distribution`}
          />
        )}

        {/* P&L vs VaR Chart for methods with P&L data */}
        {results.pnlSeries && (
          <PnLVsVaRChart
            pnlData={results.pnlSeries}
            varValue={results.var95}
            breaches={results.exceedances || 0}
            title="Daily P&L vs VaR Threshold"
          />
        )}

        {/* Monte Carlo Simulation Results */}
        {results.simulations && (
          <MonteCarloChart
            simulations={results.simulations}
            varValue={results.var95}
            title="Monte Carlo Simulation Results"
          />
        )}

        {/* Correlation Matrix for Portfolio methods */}
        {results.correlationMatrix && results.tickers && results.correlationMatrix.length > 1 && (
          <CorrelationMatrixChart
            correlationMatrix={results.correlationMatrix}
            assetNames={results.tickers}
            title="Asset Correlation Matrix"
          />
        )}

        {/* Additional Method-specific Information */}
        <View style={styles.additionalInfo}>
          <Text style={styles.additionalTitle}>Method-Specific Details</Text>
          
          {results.method === 'parametric' && results.additionalMetrics && (
            <>
              <Text style={styles.additionalText}>Daily Mean Return: {(results.additionalMetrics.mean * 100).toFixed(4)}%</Text>
              <Text style={styles.additionalText}>Z-Score ({(results.confidenceLevel * 100).toFixed(0)}%): {results.additionalMetrics.zScore.toFixed(3)}</Text>
              <Text style={styles.additionalText}>VaR Exceedances: {results.exceedances} ({results.exceedanceRate?.toFixed(2)}%)</Text>
            </>
          )}

          {results.method === 'monte_carlo' && results.additionalMetrics && (
            <>
              <Text style={styles.additionalText}>Simulations: {results.additionalMetrics.numSimulations.toLocaleString()}</Text>
              <Text style={styles.additionalText}>Portfolio Weights: {results.additionalMetrics.weights.map((w: number) => (w * 100).toFixed(1) + '%').join(', ')}</Text>
            </>
          )}

          {results.method === 'fixed_income' && results.additionalMetrics && (
            <>
              <Text style={styles.additionalText}>Modified Duration: {results.additionalMetrics.modifiedDuration.toFixed(2)} years</Text>
              <Text style={styles.additionalText}>PV01: ${results.additionalMetrics.pv01.toFixed(2)}</Text>
              <Text style={styles.additionalText}>Bond Maturity: {results.additionalMetrics.maturity} years</Text>
            </>
          )}

          {results.method === 'portfolio' && results.additionalMetrics && (
            <>
              <Text style={styles.additionalText}>Diversification Benefit: {(results.diversificationBenefit! * 100).toFixed(1)}%</Text>
              <Text style={styles.additionalText}>Sum of Individual VaRs: ${(results.additionalMetrics.sumIndividualVaRs / 1000).toFixed(0)}k</Text>
              <Text style={styles.additionalText}>Portfolio Expected Return: {(results.additionalMetrics.portfolioMean * 100).toFixed(3)}%</Text>
            </>
          )}
        </View>

        {/* Risk Interpretation */}
        <View style={styles.interpretationBox}>
          <Ionicons name="information-circle" size={20} color="#4B8BBE" />
          <Text style={styles.interpretationText}>
            With {(results.confidenceLevel * 100).toFixed(0)}% confidence, your maximum daily loss should not exceed{' '}
            <Text style={styles.interpretationHighlight}>
              ${(results.var95 / 1000).toFixed(0)}k
            </Text>{' '}
            under normal market conditions.
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderMethodSelector()}
        {renderParameters()}

        {/* Run Analysis Button */}
        {selectedMethod && (
          <TouchableOpacity
            style={[styles.runButton, loading && styles.runButtonDisabled]}
            onPress={runVaRAnalysis}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="white" />
                <Text style={styles.loadingText}>Calculating VaR with real data...</Text>
              </View>
            ) : (
              <>
                <Ionicons name="analytics" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.runButtonText}>Calculate VaR</Text>
              </>
            )}
          </TouchableOpacity>
        )}

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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  methodCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  methodSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  methodDescription: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  parameterGroup: {
    marginBottom: 16,
  },
  parameterLabel: {
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
  slider: {
    width: '100%',
    height: 40,
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
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  additionalInfo: {
    backgroundColor: '#f0f4f8',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  additionalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  additionalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  interpretationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4f8',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4B8BBE',
    marginTop: 16,
  },
  interpretationText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  interpretationHighlight: {
    fontWeight: 'bold',
    color: '#E55656',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
});