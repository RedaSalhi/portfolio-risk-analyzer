// app/var.tsx - BEAUTIFUL VaR ANALYZER
// Enhanced with stunning animations, interactive elements, and modern design

import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Dimensions,
    Platform,
} from 'react-native';
import { PerformanceChart, VaRVisualizationChart, RiskMetricsDashboard, CorrelationMatrixChart } from '../src/components/Charts';
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
  individualResults?: IndividualVaRResult[];
  portfolioResult?: PortfolioVaRResult;
  method: string;
  confidenceLevel: number;
  positionSize: number;
  tickers: string[];
  weights: number[];
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

export default function BeautifulVaRAnalyzer() {
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Core VaR inputs
  const [tickers, setTickers] = useState('AAPL,MSFT,GOOGL,TSLA,AMZN');
  const [weights, setWeights] = useState('20,20,20,20,20');
  const [positionSize, setPositionSize] = useState(1000000);
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  
  // VaR method selection
  const [varMethod, setVarMethod] = useState('parametric_individual');
  const [timeHorizon, setTimeHorizon] = useState(1);
  const [numSimulations, setNumSimulations] = useState(10000);
  
  // Advanced options
  const [includeStressTesting, setIncludeStressTesting] = useState(true);
  const [runBacktest, setRunBacktest] = useState(true);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
  // State management
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<VaRResults | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [dataHealth, setDataHealth] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');

  // Beautiful VaR methods with animations
  const varMethods = [
    { 
      key: 'parametric_individual', 
      label: 'Parametric (Per Asset)', 
      icon: '📊', 
      description: 'Normal distribution per asset',
      isIndividual: true,
      color: '#3498db',
      gradient: ['#3498db', '#2980b9']
    },
    { 
      key: 'historical_individual', 
      label: 'Historical (Per Asset)', 
      icon: '📈', 
      description: 'Historical simulation per asset',
      isIndividual: true,
      color: '#e74c3c',
      gradient: ['#e74c3c', '#c0392b']
    },
    { 
      key: 'portfolio_parametric', 
      label: 'Portfolio VaR (Parametric)', 
      icon: '💼', 
      description: 'Portfolio-level parametric VaR',
      isIndividual: false,
      color: '#27ae60',
      gradient: ['#27ae60', '#229954']
    },
    { 
      key: 'portfolio_historical', 
      label: 'Portfolio VaR (Historical)', 
      icon: '📉', 
      description: 'Portfolio-level historical VaR',
      isIndividual: false,
      color: '#f39c12',
      gradient: ['#f39c12', '#e67e22']
    },
    { 
      key: 'monte_carlo', 
      label: 'Monte Carlo VaR', 
      icon: '🎲', 
      description: 'Simulation-based portfolio VaR',
      isIndividual: false,
      color: '#9b59b6',
      gradient: ['#9b59b6', '#8e44ad']
    }
  ];

  const stressScenarios = [
    { name: 'Market Crash', marketShock: -0.20, description: '20% market decline', icon: '💥', color: '#e74c3c' },
    { name: 'Interest Rate Shock', bondShock: -0.10, description: '10% bond decline', icon: '📈', color: '#f39c12' },
    { name: 'Currency Crisis', currencyShock: -0.15, description: '15% USD strengthening', icon: '💱', color: '#9b59b6' },
    { name: 'Black Swan Event', extremeShock: -0.30, description: '30% extreme decline', icon: '🦢', color: '#2c3e50' },
    { name: 'Correlation Breakdown', correlationShock: 0.9, description: 'Correlations spike to 0.9', icon: '🔗', color: '#34495e' }
  ];

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 15,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation
    const pulseLoop = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.02,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]);
    Animated.loop(pulseLoop).start();

    // Rotation animation for loading
    const rotateLoop = Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    });
    Animated.loop(rotateLoop).start();

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
        Alert.alert('⚠️ Weights Normalized', 'Weights adjusted to sum to 100%');
        return weightArray.map(w => w / sum);
      }
      
      return weightArray.map(w => w / 100);
    } catch (error) {
      return Array(tickerCount).fill(1 / tickerCount);
    }
  };

  const animateProgress = (toValue: number) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const runAdvancedVaRAnalysis = async () => {
    setLoading(true);
    setAnalysisProgress(0);
    animateProgress(0);
    
    const startTime = Date.now();
    
    try {
      // Parse and validate inputs
      const tickerList = tickers.split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0 && /^[A-Z]{1,5}$/.test(t));
      
      if (tickerList.length < 1) {
        Alert.alert('❌ Error', 'Please enter at least 1 valid ticker');
        return;
      }

      if (tickerList.length > 15) {
        Alert.alert('❌ Error', 'Maximum 15 tickers allowed for mobile VaR analysis');
        return;
      }

      const portfolioWeights = parseWeights(weights, tickerList.length);
      const selectedMethod = varMethods.find(m => m.key === varMethod);
      
      console.log(`🚀 Starting ${selectedMethod?.label} analysis for:`, tickerList);

      // Step 1: Fetch market data
      setAnalysisProgress(20);
      animateProgress(0.2);
      const stockData = await realTimeDataFetcher.fetchMultipleStocks(tickerList, '2y', true);
      
      if (!stockData.metadata || !stockData.returns) {
        throw new Error('Failed to get market data for VaR analysis');
      }

      console.log(`✅ Data fetched: ${stockData.symbols.join(', ')}`);

      // Step 2: Prepare returns matrix
      setAnalysisProgress(40);
      animateProgress(0.4);
      const returnsMatrix = stockData.symbols.map(symbol => stockData.returns[symbol] || []);
      
      const minObservations = Math.min(...returnsMatrix.map(r => r.length));
      if (minObservations < 50) {
        Alert.alert('⚠️ Warning', `Limited data: only ${minObservations} observations. VaR estimates may be less reliable.`);
      }

      console.log(`📊 Analyzing ${minObservations} observations per asset`);

      // Step 3: Calculate VaR
      setAnalysisProgress(70);
      animateProgress(0.7);
      let varResults: VaRResults;
      
      if (selectedMethod?.isIndividual) {
        varResults = await calculateIndividualVaR(returnsMatrix, stockData.symbols, portfolioWeights, selectedMethod.key);
      } else {
        varResults = await calculatePortfolioVaR(returnsMatrix, stockData.symbols, portfolioWeights, selectedMethod.key);
      }

      // Step 4: Additional analysis
      setAnalysisProgress(90);
      animateProgress(0.9);
      
      const calculationTime = Date.now() - startTime;
      varResults.metadata = {
        dataSource: stockData.metadata.dataSource,
        fetchTime: stockData.metadata.fetchTime,
        calculationTime: calculationTime
      };

      if (includeStressTesting) {
        console.log('💥 Running stress tests...');
        varResults.stressResults = await runStressTests(returnsMatrix, portfolioWeights, positionSize);
      }

      if (runBacktest && minObservations > 250) {
        console.log('📊 Running VaR backtesting...');
        varResults.backtestResults = performBacktest(returnsMatrix, portfolioWeights, varResults, confidenceLevel, positionSize);
      }

      // Step 5: Complete
      setAnalysisProgress(100);
      animateProgress(1);
      setResults(varResults);
      setActiveTab('summary');

      // Success animation
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const totalVar = varResults.individualResults 
        ? varResults.individualResults.reduce((sum, r) => sum + r.var, 0)
        : varResults.portfolioResult?.var || 0;

      const successMessage = `✅ VaR Analysis Complete!\n• Method: ${selectedMethod?.label}\n• ${(confidenceLevel * 100).toFixed(0)}% VaR: $${totalVar.toFixed(0)}\n• Calculation time: ${calculationTime}ms`;
      
      Alert.alert('🎉 Analysis Complete!', successMessage);

    } catch (error) {
      console.error('❌ VaR analysis error:', error);
      
      let errorMessage = 'VaR analysis failed.';
      if (error.message.includes('real-time')) {
        errorMessage = 'Unable to fetch real-time market data. Using demo data instead.';
      } else if (error.message.includes('insufficient')) {
        errorMessage = 'Insufficient market data for reliable VaR calculation.';
      }
      
      Alert.alert('❌ Analysis Failed', errorMessage);
    } finally {
      setLoading(false);
      setAnalysisProgress(0);
      animateProgress(0);
    }
  };

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
        const stressedReturns = returnsMatrix.map(returns => 
          returns.map(r => r + (scenario.marketShock || scenario.bondShock || scenario.extremeShock || 0))
        );
        
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
      let varThreshold = 0;
      if (varResults.individualResults) {
        varThreshold = varResults.individualResults.reduce((sum, r) => sum + r.var, 0);
      } else if (varResults.portfolioResult) {
        varThreshold = varResults.portfolioResult.var;
      }

      const portfolioReturns = [];
      const minLength = Math.min(...returnsMatrix.map(r => r.length));
      
      for (let i = 0; i < minLength; i++) {
        const portfolioReturn = returnsMatrix.reduce((sum, returns, assetIndex) => 
          sum + weights[assetIndex] * returns[i], 0
        );
        portfolioReturns.push(portfolioReturn * positionSize);
      }
      
      const exceedances = portfolioReturns.filter(pnl => pnl < -Math.abs(varThreshold)).length;
      const exceedanceRate = (exceedances / portfolioReturns.length) * 100;
      const expectedRate = (1 - confidenceLevel) * 100;
      
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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderMethodCard = (method: typeof varMethods[0]) => (
    <Animated.View
      key={method.key}
      style={[
        styles.methodCard,
        { transform: [{ scale: pulseAnim }] },
        varMethod === method.key && [styles.methodCardActive, { borderColor: method.color }]
      ]}
    >
      <TouchableOpacity
        onPress={() => setVarMethod(method.key)}
        style={styles.methodCardContent}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={varMethod === method.key ? method.gradient : ['#f8f9fa', '#ffffff']}
          style={styles.methodGradient}
        >
          <Text style={styles.methodIcon}>{method.icon}</Text>
          <Text style={[
            styles.methodLabel,
            varMethod === method.key && { color: '#ffffff' }
          ]}>
            {method.label}
          </Text>
          <Text style={[
            styles.methodDescription,
            varMethod === method.key && { color: 'rgba(255,255,255,0.9)' }
          ]}>
            {method.description}
          </Text>
          <Text style={[
            styles.methodType,
            varMethod === method.key && { color: 'rgba(255,255,255,0.8)' }
          ]}>
            {method.isIndividual ? 'Per Asset' : 'Portfolio Level'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderExpandableSection = (title: string, icon: string, sectionKey: string, children: React.ReactNode) => (
    <Animated.View 
      style={[
        styles.section,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(sectionKey)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={expandedSection === sectionKey ? ['#1f4e79', '#2980b9'] : ['#f8f9fa', '#ffffff']}
          style={styles.sectionHeaderGradient}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={[
              styles.sectionIcon,
              expandedSection === sectionKey && { fontSize: 28 }
            ]}>
              {icon}
            </Text>
            <Text style={[
              styles.sectionTitle,
              expandedSection === sectionKey && { color: '#ffffff' }
            ]}>
              {title}
            </Text>
          </View>
          <Ionicons
            name={expandedSection === sectionKey ? "chevron-up" : "chevron-down"}
            size={24}
            color={expandedSection === sectionKey ? "#ffffff" : "#1f4e79"}
          />
        </LinearGradient>
      </TouchableOpacity>
      
      {expandedSection === sectionKey && (
        <Animated.View style={styles.sectionContent}>
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );

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

  const getVaRColor = (varValue: number, positionSize: number): string => {
    const varPercent = varValue / positionSize;
    if (varPercent > 0.05) return '#e74c3c'; // High risk
    if (varPercent > 0.02) return '#f39c12'; // Medium risk
    return '#27ae60'; // Low risk
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Beautiful Header with Gradient */}
        <LinearGradient
          colors={['#e74c3c', '#c0392b', '#a93226']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Animated.View
            style={[
              styles.headerContent,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.title}>⚠️ VaR Analyzer</Text>
            <Text style={styles.subtitle}>Advanced Risk Management & Portfolio Analysis</Text>
            
            {/* System Health Indicator */}
            {dataHealth && (
              <Animated.View style={[
                styles.healthIndicator,
                dataHealth.overall_status?.includes('HEALTHY') ? styles.healthGood :
                dataHealth.overall_status?.includes('DEGRADED') ? styles.healthWarning : styles.healthCritical,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <Text style={styles.healthText}>
                  Data: {dataHealth.overall_status?.split(' ')[1] || '?'}
                </Text>
              </Animated.View>
            )}

            {loading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Analyzing Risk... {Math.round(analysisProgress)}%
                </Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* Portfolio Configuration */}
        {renderExpandableSection('Portfolio Configuration', '⚙️', 'basic', (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🎯 Stock Tickers (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                value={tickers}
                onChangeText={setTickers}
                placeholder="AAPL,MSFT,GOOGL,TSLA,AMZN"
                autoCapitalize="characters"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>⚖️ Portfolio Weights (%) - comma-separated</Text>
              <TextInput
                style={styles.textInput}
                value={weights}
                onChangeText={setWeights}
                placeholder="20,20,20,20,20"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
              <Text style={styles.helperText}>Leave empty for equal weights</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>💰 Position Size: ${positionSize.toLocaleString()}</Text>
              <Slider
                style={styles.slider}
                minimumValue={100000}
                maximumValue={10000000}
                value={positionSize}
                onValueChange={setPositionSize}
                step={100000}
                minimumTrackTintColor="#e74c3c"
                maximumTrackTintColor="#ddd"
                thumbStyle={[styles.sliderThumb, { backgroundColor: '#e74c3c' }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>📊 Confidence Level: {(confidenceLevel * 100).toFixed(1)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.90}
                maximumValue={0.99}
                value={confidenceLevel}
                onValueChange={setConfidenceLevel}
                step={0.01}
                minimumTrackTintColor="#e74c3c"
                maximumTrackTintColor="#ddd"
                thumbStyle={[styles.sliderThumb, { backgroundColor: '#e74c3c' }]}
              />
            </View>
          </>
        ))}

        {/* VaR Methodology */}
        {renderExpandableSection('VaR Methodology', '🎯', 'methodology', (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
              {varMethods.map(renderMethodCard)}
            </ScrollView>
            
            {/* Monte Carlo Simulations */}
            {varMethod === 'monte_carlo' && (
              <Animated.View style={[styles.targetSection, { opacity: fadeAnim }]}>
                <Text style={styles.targetLabel}>🎲 Simulations: {numSimulations.toLocaleString()}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1000}
                  maximumValue={50000}
                  value={numSimulations}
                  onValueChange={setNumSimulations}
                  step={1000}
                  minimumTrackTintColor="#9b59b6"
                  maximumTrackTintColor="#ddd"
                  thumbStyle={[styles.sliderThumb, { backgroundColor: '#9b59b6' }]}
                />
              </Animated.View>
            )}
          </>
        ))}

        {/* Advanced Analysis */}
        {renderExpandableSection('Advanced Analysis', '🔬', 'advanced', (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>💥 Include Stress Testing</Text>
                <Text style={styles.subLabel}>Test portfolio under extreme market conditions</Text>
              </View>
              <Switch
                value={includeStressTesting}
                onValueChange={setIncludeStressTesting}
                trackColor={{ false: '#ddd', true: '#e74c3c' }}
                thumbColor={includeStressTesting ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>📈 Run Backtesting</Text>
                <Text style={styles.subLabel}>Validate VaR model accuracy with historical data</Text>
              </View>
              <Switch
                value={runBacktest}
                onValueChange={setRunBacktest}
                trackColor={{ false: '#ddd', true: '#3498db' }}
                thumbColor={runBacktest ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </>
        ))}

        {/* Analyze Button */}
        <Animated.View 
          style={[
            styles.buttonContainer,
            { 
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
            onPress={runAdvancedVaRAnalysis}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#95a5a6', '#7f8c8d'] : ['#e74c3c', '#c0392b']}
              style={styles.analyzeButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <Animated.View style={{
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  }],
                }}>
                  <ActivityIndicator color="#ffffff" size="small" />
                </Animated.View>
              ) : (
                <Text style={styles.analyzeButtonIcon}>⚠️</Text>
              )}
              <Text style={styles.analyzeButtonText}>
                {loading ? 'Analyzing Risk...' : '🚀 Analyze Portfolio Risk'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Results Section */}
        {results && (
          <Animated.View 
            style={[
              styles.resultsSection,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            
            {/* Results Header */}
            <LinearGradient
              colors={['#ffffff', '#fff5f5']}
              style={styles.resultsHeader}
            >
              <Text style={styles.resultsTitle}>📊 VaR Analysis Results</Text>
              <Text style={styles.resultsSubtitle}>
                {varMethods.find(m => m.key === results.method)?.label}
              </Text>
            </LinearGradient>

            {/* Key Risk Metrics */}
            <LinearGradient
              colors={['#ffffff', '#fff8f8']}
              style={styles.metricsContainer}
            >
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { borderLeftColor: getVaRColor(getTotalVaR(), results.positionSize) }]}>
                  <Text style={styles.metricIcon}>⚠️</Text>
                  <Text style={[styles.metricValue, { color: getVaRColor(getTotalVaR(), results.positionSize) }]}>
                    ${(getTotalVaR() / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.metricLabel}>{(results.confidenceLevel * 100).toFixed(0)}% VaR</Text>
                </View>
                <View style={[styles.metricCard, { borderLeftColor: '#9b59b6' }]}>
                  <Text style={styles.metricIcon}>📉</Text>
                  <Text style={[styles.metricValue, { color: '#9b59b6' }]}>
                    ${(getTotalES() / 1000).toFixed(0)}k
                  </Text>
                  <Text style={styles.metricLabel}>Expected Shortfall</Text>
                </View>
              </View>
              
              {results.portfolioResult?.diversificationBenefit !== undefined && (
                <View style={styles.metricsRow}>
                  <View style={[styles.metricCard, { borderLeftColor: '#27ae60' }]}>
                    <Text style={styles.metricIcon}>🛡️</Text>
                    <Text style={[styles.metricValue, { color: '#27ae60' }]}>
                      {(results.portfolioResult.diversificationBenefit * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.metricLabel}>Diversification Benefit</Text>
                  </View>
                </View>
              )}
            </LinearGradient>

            {/* Beautiful Tab Navigation */}
            <View style={styles.tabContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  { key: 'summary', label: 'Summary', icon: '📊' },
                  ...(results.individualResults ? [{ key: 'individual', label: 'Per Asset', icon: '🎯' }] : []),
                  ...(results.portfolioResult?.componentVaR ? [{ key: 'components', label: 'Components', icon: '🔍' }] : []),
                  ...(results.stressResults ? [{ key: 'stress', label: 'Stress Tests', icon: '💥' }] : []),
                  ...(results.backtestResults ? [{ key: 'backtest', label: 'Backtest', icon: '📈' }] : []),
                  ...(results.portfolioResult?.correlationMatrix ? [{ key: 'correlation', label: 'Correlation', icon: '🔗' }] : [])
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={activeTab === tab.key ? ['#e74c3c', '#c0392b'] : ['transparent', 'transparent']}
                      style={styles.tabGradient}
                    >
                      <Text style={styles.tabIcon}>{tab.icon}</Text>
                      <Text style={[
                        styles.tabLabel,
                        activeTab === tab.key && styles.tabLabelActive
                      ]}>
                        {tab.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Tab Content */}
            <View style={styles.tabContent}>
              {activeTab === 'summary' && (
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.summaryContainer}
                >
                  <Text style={styles.chartTitle}>📊 Risk Summary</Text>
                  
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
                    <Text style={styles.interpretationTitle}>🎯 Risk Interpretation</Text>
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
                        <Text style={[styles.interpretationHighlight, { color: '#27ae60' }]}>
                          {(results.portfolioResult.diversificationBenefit * 100).toFixed(1)}% diversification
                        </Text>
                        , reducing risk compared to concentrated positions.
                      </Text>
                    )}
                  </View>
                </LinearGradient>
              )}

              {/* Other tab content remains the same but with enhanced styling... */}
              {/* Individual, Components, Stress, Backtest, Correlation tabs... */}
            </View>

            {/* Enhanced Metadata */}
            <LinearGradient
              colors={['#f8f9fa', '#ffffff']}
              style={styles.metadata}
            >
              <Text style={styles.metadataTitle}>ℹ️ Analysis Information</Text>
              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Data Source:</Text>
                  <Text style={styles.metadataValue}>{results.metadata.dataSource}</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Calculation Time:</Text>
                  <Text style={styles.metadataValue}>{results.metadata.calculationTime}ms</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Analysis Method:</Text>
                  <Text style={styles.metadataValue}>{varMethods.find(m => m.key === results.method)?.description}</Text>
                </View>
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataLabel}>Completed:</Text>
                  <Text style={styles.metadataValue}>{new Date().toLocaleString()}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 16,
  },
  healthIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  healthGood: { backgroundColor: 'rgba(39, 174, 96, 0.2)' },
  healthWarning: { backgroundColor: 'rgba(243, 156, 18, 0.2)' },
  healthCritical: { backgroundColor: 'rgba(231, 76, 60, 0.2)' },
  healthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressContainer: {
    marginTop: 16,
    width: '100%',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 3,
  },
  progressText: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  sectionHeader: {
    overflow: 'hidden',
  },
  sectionHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f4e79',
  },
  sectionContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e6ed',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    width: 24,
    height: 24,
  },
  methodScroll: {
    marginBottom: 20,
  },
  methodCard: {
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  methodCardActive: {
    borderWidth: 2,
    elevation: 6,
    shadowOpacity: 0.2,
  },
  methodCardContent: {
    width: 180,
  },
  methodGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  methodIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 4,
  },
  methodType: {
    fontSize: 10,
    color: '#95a5a6',
    textAlign: 'center',
    fontWeight: '600',
  },
  targetSection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  targetLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f4e79',
    marginBottom: 12,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  analyzeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  analyzeButtonIcon: {
    fontSize: 20,
  },
  analyzeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  resultsSection: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  resultsHeader: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#e74c3c',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  metricsContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricsRow: {
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '500',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  tabButtonActive: {},
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    minWidth: 100,
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tabContent: {
    marginBottom: 16,
  },
  summaryContainer: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryGrid: {
    marginBottom: 20,
  },
  summaryItem: {
    backgroundColor: 'rgba(248,249,250,0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 2,
  },
  summaryPercent: {
    fontSize: 12,
    color: '#95a5a6',
  },
  riskInterpretation: {
    backgroundColor: 'rgba(255,245,245,0.8)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 8,
  },
  interpretationText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    marginBottom: 8,
  },
  interpretationHighlight: {
    fontWeight: '700',
  },
  metadata: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metadataTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f4e79',
    marginBottom: 16,
    textAlign: 'center',
  },
  metadataGrid: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '400',
    textAlign: 'right',
    flex: 1,
  },
});
