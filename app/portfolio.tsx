// app/portfolio.tsx - FIXED VERSION WITH WORKING TARGET OPTIMIZATION
// Fixed target return/risk optimization + English translation

import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CapitalAllocationChart,
  CAPMAnalysisChart,
  CorrelationMatrixChart,
  EfficientFrontierChart,
  PortfolioWeightsChart
} from '../src/components/Charts';
import { CAPMAnalyzer, CorrelationCalculator, PortfolioOptimizer, RiskAttributionCalculator } from '../src/utils/financialCalculations';
import { realTimeDataFetcher } from '../src/utils/realTimeDataFetcher';

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
  targetAchieved?: boolean;
  targetDistance?: number;
  metadata: {
    dataSource: string;
    fetchTime: string;
    riskFreeRate: number;
    marketReturn: number;
    monteCarloSimulations: number;
  };
}

interface StockData {
  symbols: string[];
  returns: { [key: string]: number[] };
  metadata: {
    dataSource: string;
    fetchTime: string;
  };
}

interface MarketData {
  returns: { [key: string]: number[] };
}

interface CAPMMetrics {
  capmExpectedReturn: number;
  beta: number;
  alpha: number;
  rSquared: number;
}

export default function FixedPortfolioOptimizer() {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

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
  const [monteCarloSimulations, setMonteCarloSimulations] = useState(10000);
  const [allowShortSelling, setAllowShortSelling] = useState(false);
  const [maxPositionSize, setMaxPositionSize] = useState(0.40);
  
  // State management
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [results, setResults] = useState<OptimizationResults | null>(null);
  const [activeTab, setActiveTab] = useState('weights');
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');

  // FIXED: Updated optimization methods with proper descriptions
  const optimizationMethods = [
    { 
      key: 'maxSharpe', 
      label: 'Maximum Sharpe', 
      description: 'Optimize risk-adjusted returns',
      icon: '⚡',
      color: '#FF6B6B'
    },
    { 
      key: 'minRisk', 
      label: 'Minimum Risk', 
      description: 'Minimize portfolio volatility',
      icon: '🛡️',
      color: '#4ECDC4'
    },
    { 
      key: 'targetReturn', 
      label: 'Target Return', 
      description: 'Achieve specific return target',
      icon: '🎯',
      color: '#45B7D1'
    },
    { 
      key: 'targetRisk', 
      label: 'Target Risk', 
      description: 'Achieve specific risk target',
      icon: '📊',
      color: '#96CEB4'
    },
    { 
      key: 'equalWeight', 
      label: 'Equal Weight', 
      description: '1/N diversification',
      icon: '⚖️',
      color: '#FFEAA7'
    },
    { 
      key: 'riskParity', 
      label: 'Risk Parity', 
      description: 'Equal risk contribution',
      icon: '🎲',
      color: '#DDA0DD'
    }
  ];

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    const pulseAnimation = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulseAnimation).start();
  }, []);

  const animateProgress = (toValue: number) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const validatePortfolioInputs = () => {
    const errors = [];
  
    // Validate tickers
    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    if (tickerList.length < 2) {
      errors.push('At least 2 ticker symbols are required for portfolio optimization');
    }
    if (tickerList.length > 10) {
      errors.push('Maximum 10 ticker symbols allowed for mobile optimization');
    }
  
    // Validate ticker format
    const invalidTickers = tickerList.filter(t => !/^[A-Z^]{1,6}$/.test(t));
    if (invalidTickers.length > 0) {
      errors.push(`Invalid ticker symbols: ${invalidTickers.join(', ')}`);
    }
  
    // Validate portfolio value
    if (portfolioValue < 1000 || portfolioValue > 100000000) {
      errors.push('Portfolio value must be between $1,000 and $100,000,000');
    }
  
    // Validate target return
    if (optimizationMethod === 'targetReturn' && (targetReturn < 0.01 || targetReturn > 1.0)) {
      errors.push('Target return must be between 1% and 100%');
    }
  
    // Validate target risk
    if (optimizationMethod === 'targetRisk' && (targetRisk < 0.01 || targetRisk > 1.0)) {
      errors.push('Target risk must be between 1% and 100%');
    }
  
    // Validate Monte Carlo simulations
    if (monteCarloSimulations < 100 || monteCarloSimulations > 100000) {
      errors.push('Monte Carlo simulations must be between 100 and 100,000');
    }
  
    return errors;
  };

  // FIXED: Completely rewritten optimization function with proper target handling
  const runOptimization = async () => {
    // Validation
    const validationErrors = validatePortfolioInputs();
    if (validationErrors.length > 0) {
      Alert.alert(
        '⚠️ Input Validation Error',
        validationErrors.join('\n\n'),
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(t => t);
    
    setIsOptimizing(true);
    setOptimizationProgress(0);
    setResults(null);
    animateProgress(0);
  
    const startTime = Date.now();
  
    try {
      console.log(`🚀 Starting ${optimizationMethod} optimization for: ${tickerList.join(', ')}`);
    
      // Step 1: Fetch market data
      setOptimizationProgress(20);
      animateProgress(0.2);
      console.log('📊 Fetching real-time market data...');
    
      const stockData = await realTimeDataFetcher.getHistoricalData(tickerList, '5y') as StockData;
    
      if (!stockData || !stockData.returns || Object.keys(stockData.returns).length === 0) {
        throw new Error('Failed to fetch market data. Please check ticker symbols and internet connection.');
      }

      // Step 2: Get risk-free rate
      setOptimizationProgress(35);
      animateProgress(0.35);
      const riskFreeRate = includeRiskFree ? 
        await realTimeDataFetcher.getRiskFreeRate() : 0.02;
    
      console.log(`💰 Risk-free rate: ${(riskFreeRate * 100).toFixed(3)}%`);

      // Step 3: Get market benchmark
      setOptimizationProgress(50);
      animateProgress(0.5);
      let marketReturns = null;
      let marketReturn = 0.08;
    
      if (useMarketBenchmark) {
        console.log('📈 Fetching S&P 500 benchmark data...');
        try {
          const marketData = await realTimeDataFetcher.getHistoricalData(['^GSPC'], '5y') as MarketData;
          if (marketData && marketData.returns['^GSPC']) {
            marketReturns = marketData.returns['^GSPC'];
            marketReturn = marketReturns.reduce((sum: number, ret: number) => sum + ret, 0) / marketReturns.length * 252;
            console.log(`📊 Market return: ${(marketReturn * 100).toFixed(2)}%`);
          }
        } catch (error) {
          console.warn('Market data fetch failed, using defaults');
        }
      }

      // Step 4: Prepare returns matrix
      setOptimizationProgress(65);
      animateProgress(0.65);
      const returnsMatrix = stockData.symbols.map((symbol: string) => {
        const returns = stockData.returns[symbol] || [];
        if (returns.length < 100) {
          console.warn(`Warning: ${symbol} has only ${returns.length} observations`);
        }
        return returns;
      });
    
      const minObservations = Math.min(...returnsMatrix.map((r: number[]) => r.length));
      if (minObservations < 50) {
        throw new Error(`Insufficient data: minimum ${minObservations} observations. Need at least 50 for reliable optimization.`);
      }

      console.log(`📊 Optimization dataset: ${minObservations} observations per asset`);

      // Step 5: FIXED - Run optimization with proper target handling
      setOptimizationProgress(80);
      animateProgress(0.8);
      const optimizer = new PortfolioOptimizer(returnsMatrix, riskFreeRate, includeRiskFree);
    
      let optimizationResult;
      console.log(`🎯 Running ${optimizationMethod} optimization with ${monteCarloSimulations.toLocaleString()} simulations...`);
    
      const constraints = {
        maxPositionSize: maxPositionSize,
        allowShortSelling: allowShortSelling
      };
    
      // FIXED: Proper method calls with detailed logging
      switch (optimizationMethod) {
        case 'maxSharpe':
          console.log('🎯 Executing Maximum Sharpe optimization...');
          optimizationResult = optimizer.optimizeMaxSharpe(monteCarloSimulations, constraints);
          break;
          
        case 'minRisk':
          console.log('🛡️ Executing Minimum Risk optimization...');
          optimizationResult = optimizer.optimizeMinRisk();
          break;
          
        case 'targetReturn':
          console.log(`🎯 Executing Target Return optimization: ${(targetReturn * 100).toFixed(2)}%`);
          
          // FIXED: Validate target return is achievable
          const meanReturns = optimizer.getMeanReturns();
          const minPossibleReturn = Math.min(...meanReturns);
          const maxPossibleReturn = Math.max(...meanReturns);
          
          console.log(`📊 Return range: ${(minPossibleReturn * 100).toFixed(2)}% to ${(maxPossibleReturn * 100).toFixed(2)}%`);
          
          if (targetReturn < minPossibleReturn || targetReturn > maxPossibleReturn * 1.2) {
            console.warn(`⚠️ Target return ${(targetReturn * 100).toFixed(2)}% may be difficult to achieve`);
            Alert.alert(
              '⚠️ Target Return Warning',
              `Target return ${(targetReturn * 100).toFixed(2)}% is outside the achievable range (${(minPossibleReturn * 100).toFixed(2)}% to ${(maxPossibleReturn * 100).toFixed(2)}%). Optimization will find the closest achievable portfolio.`,
              [{ text: 'Continue', style: 'default' }]
            );
          }
          
          optimizationResult = optimizer.optimizeForTargetReturn(targetReturn);
          break;
          
        case 'targetRisk':
          console.log(`📊 Executing Target Risk optimization: ${(targetRisk * 100).toFixed(2)}%`);
          
          // FIXED: Validate target risk is achievable
          const assetVolatilities = optimizer.getAssetVolatilities();
          const minPossibleRisk = Math.min(...assetVolatilities);
          const maxPossibleRisk = Math.max(...assetVolatilities);
          
          console.log(`📊 Risk range: ${(minPossibleRisk * 100).toFixed(2)}% to ${(maxPossibleRisk * 100).toFixed(2)}%`);
          
          if (targetRisk < minPossibleRisk * 0.8 || targetRisk > maxPossibleRisk * 1.2) {
            console.warn(`⚠️ Target risk ${(targetRisk * 100).toFixed(2)}% may be difficult to achieve`);
            Alert.alert(
              '⚠️ Target Risk Warning',
              `Target risk ${(targetRisk * 100).toFixed(2)}% is outside the typical range (${(minPossibleRisk * 100).toFixed(2)}% to ${(maxPossibleRisk * 100).toFixed(2)}%). Optimization will find the closest achievable portfolio.`,
              [{ text: 'Continue', style: 'default' }]
            );
          }
          
          optimizationResult = optimizer.optimizeForTargetVolatility(targetRisk);
          break;
          
        case 'equalWeight':
          console.log('⚖️ Executing Equal Weight optimization...');
          optimizationResult = optimizer.optimizeEqualWeight();
          break;
          
        case 'riskParity':
          console.log('🎲 Executing Risk Parity optimization...');
          optimizationResult = optimizer.optimizeRiskParity();
          break;
          
        default:
          console.log('🔄 Fallback to Maximum Sharpe optimization...');
          optimizationResult = optimizer.optimizeMaxSharpe(monteCarloSimulations, constraints);
      }

      // Step 6: FIXED - Validate optimization results with detailed checks
      if (!optimizationResult.weights || optimizationResult.weights.length !== stockData.symbols.length) {
        throw new Error('Invalid optimization results: weights array mismatch');
      }

      // Check for NaN or infinite weights
      if (optimizationResult.weights.some(w => isNaN(w) || !isFinite(w))) {
        throw new Error('Optimization produced invalid weights (NaN or infinite values)');
      }

      // Normalize weights if needed
      const weightSum = optimizationResult.weights.reduce((sum, w) => sum + w, 0);
      if (Math.abs(weightSum - 1.0) > 0.05) {
        console.warn(`Warning: weights sum to ${weightSum.toFixed(3)}, normalizing...`);
        optimizationResult.weights = optimizationResult.weights.map(w => w / weightSum);
      }

      // FIXED: Calculate target achievement for target-based optimizations
      let targetAchieved = false;
      let targetDistance = 0;
      
      if (optimizationMethod === 'targetReturn') {
        targetDistance = Math.abs(optimizationResult.expectedReturn - targetReturn);
        targetAchieved = targetDistance < 0.02; // Within 2% tolerance
        console.log(`🎯 Target Return Achievement: ${targetAchieved ? 'SUCCESS' : 'PARTIAL'} (distance: ${(targetDistance * 100).toFixed(2)}%)`);
      }
      
      if (optimizationMethod === 'targetRisk') {
        targetDistance = Math.abs(optimizationResult.volatility - targetRisk);
        targetAchieved = targetDistance < 0.02; // Within 2% tolerance
        console.log(`📊 Target Risk Achievement: ${targetAchieved ? 'SUCCESS' : 'PARTIAL'} (distance: ${(targetDistance * 100).toFixed(2)}%)`);
      }

      // Step 7: Additional analysis
      setOptimizationProgress(90);
      animateProgress(0.9);
    
      // CAPM Analysis
      const capmResults: { [key: string]: number } = {};
      const betas: { [key: string]: number } = {};
      const alphas: { [key: string]: number } = {};
    
      if (marketReturns && marketReturns.length > 0) {
        for (let i = 0; i < stockData.symbols.length; i++) {
          const symbol = stockData.symbols[i];
          const assetReturns = returnsMatrix[i];
        
          const minLength = Math.min(assetReturns.length, marketReturns.length);
          const alignedAssetReturns = assetReturns.slice(-minLength);
          const alignedMarketReturns = marketReturns.slice(-minLength);
         
          try {
            const capmAnalyzer = new CAPMAnalyzer(alignedAssetReturns, alignedMarketReturns, riskFreeRate);
            const capmMetrics = capmAnalyzer.calculateCAPMMetrics(symbol);
          
            capmResults[symbol] = capmMetrics.capmExpectedReturn;
            betas[symbol] = capmMetrics.beta;
            alphas[symbol] = capmMetrics.alpha;
          } catch (error) {
            console.warn(`CAPM calculation failed for ${symbol}:`, error);
            capmResults[symbol] = 0.08;
            betas[symbol] = 1.0;
            alphas[symbol] = 0.0;
          }
        } 
      } else {
        stockData.symbols.forEach(symbol => {
          capmResults[symbol] = 0.08;
          betas[symbol] = 1.0;
          alphas[symbol] = 0.0;
        });
      }

      // Correlation matrix
      const correlationMatrix = CorrelationCalculator.calculateCorrelationMatrix(
        returnsMatrix
      );

      // Risk attribution
      const riskAttribution = RiskAttributionCalculator.calculateRiskContribution(
        optimizationResult.weights, 
        optimizer.covarianceMatrix
      );

      // Capital allocation
      let capitalAllocation = null;
      if (includeRiskFree) {
        if (optimizationMethod === 'targetReturn') {
          capitalAllocation = optimizer.calculateCapitalAllocation(targetReturn, undefined);
        } else if (optimizationMethod === 'targetRisk') {
          capitalAllocation = optimizer.calculateCapitalAllocation(undefined, targetRisk);
        } else {
          capitalAllocation = optimizer.calculateCapitalAllocation();
        }
      }

      // Efficient frontier
      const efficientFrontier = optimizer.generateAnalyticalEfficientFrontier(100);

      // Step 8: Final results
      setOptimizationProgress(100);
      animateProgress(1);

      const calculationTime = Date.now() - startTime;

      const comprehensiveResults: OptimizationResults = {
        weights: optimizationResult.weights,
        expectedReturn: optimizationResult.expectedReturn || 0,
        volatility: optimizationResult.volatility || 0,
        sharpeRatio: optimizationResult.sharpeRatio || 0,
        tickers: stockData.symbols,
        capmReturns: capmResults,
        betas: betas,
        alphas: alphas,
        correlationMatrix: correlationMatrix,
        efficientFrontier: efficientFrontier,
        riskAttribution: riskAttribution,
        allSimulations: optimizationResult.allSimulations || [],
        capitalAllocation: capitalAllocation,
        type: optimizationMethod,
        targetAchieved: targetAchieved,
        targetDistance: targetDistance,
        metadata: {
          dataSource: stockData.metadata.dataSource,
          fetchTime: stockData.metadata.fetchTime,
          riskFreeRate: riskFreeRate,
          marketReturn: marketReturn,
          monteCarloSimulations: monteCarloSimulations
        }
      };

      setResults(comprehensiveResults);
      setActiveTab('weights');

      // Success animation
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // FIXED: Enhanced success message with target achievement
      const maxPosition = Math.max(...comprehensiveResults.weights);
      let successMessage = `✅ Portfolio Optimized!\n• Method: ${optimizationMethods.find(m => m.key === optimizationMethod)?.label}\n• Expected Return: ${(comprehensiveResults.expectedReturn * 100).toFixed(2)}%\n• Risk: ${(comprehensiveResults.volatility * 100).toFixed(2)}%\n• Sharpe Ratio: ${comprehensiveResults.sharpeRatio.toFixed(3)}\n• Max Position: ${(maxPosition * 100).toFixed(1)}%\n• Calculation Time: ${calculationTime}ms`;
      
      if (optimizationMethod === 'targetReturn' || optimizationMethod === 'targetRisk') {
        successMessage += `\n• Target Achievement: ${targetAchieved ? 'SUCCESS ✅' : 'PARTIAL ⚠️'}`;
        if (!targetAchieved) {
          successMessage += `\n• Distance from Target: ${(targetDistance * 100).toFixed(2)}%`;
        }
      }
    
      Alert.alert('🎉 Optimization Complete!', successMessage);

    } catch (error: unknown) {
      console.error('❌ Optimization error:', error);
    
      let errorTitle = '❌ Optimization Failed';
      let errorMessage = 'Portfolio optimization encountered an error.';
    
      if (error instanceof Error) {
        if (error.message.includes('real-time')) {
          errorTitle = '🌐 Data Connection Issue';
          errorMessage = 'Unable to fetch real-time market data. Please check your internet connection and try again.';
        } else if (error.message.includes('singular') || error.message.includes('invert')) {
          errorTitle = '📊 Matrix Calculation Error';
          errorMessage = 'The covariance matrix is singular (non-invertible). This usually happens when assets are perfectly correlated. Try using different assets or a longer time period.';
        } else if (error.message.includes('sufficient') || error.message.includes('Insufficient')) {
          errorTitle = '📊 Data Quality Issue';
          errorMessage = error.message + '\n\nTry using fewer assets or a different time period.';
        } else if (error.message.includes('invalid weights')) {
          errorTitle = '🧮 Calculation Error';
          errorMessage = 'The optimization produced invalid results. This may be due to extreme market conditions in your data. Try adjusting the time period or optimization method.';
        } else if (error.message.includes('Target Return') || error.message.includes('Target Risk')) {
          errorTitle = '🎯 Target Not Achievable';
          errorMessage = 'The target return/risk you specified cannot be achieved with the selected assets. Try adjusting your target or using different assets.';
        } else {
          errorMessage = error.message;
        }
      }
    
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setIsOptimizing(false);
      setOptimizationProgress(0);
      animateProgress(0);
    }
  };

  const resetToDefaults = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

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

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderMethodCard = (method: typeof optimizationMethods[0]) => (
    <Animated.View
      key={method.key}
      style={[
        styles.methodCard,
        { transform: [{ scale: pulseAnim }] },
        optimizationMethod === method.key && [styles.methodCardActive, { borderColor: method.color }]
      ]}
    >
      <TouchableOpacity
        onPress={() => setOptimizationMethod(method.key)}
        style={styles.methodCardContent}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={optimizationMethod === method.key ? 
            [method.color + '20', method.color + '10'] : 
            ['#f8f9fa', '#ffffff']
          }
          style={styles.methodGradient}
        >
          <Text style={styles.methodIcon}>{method.icon}</Text>
          <Text style={[
            styles.methodLabel,
            optimizationMethod === method.key && { color: method.color }
          ]}>
            {method.label}
          </Text>
          <Text style={styles.methodDescription}>{method.description}</Text>
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
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Ionicons
          name={expandedSection === sectionKey ? "chevron-up" : "chevron-down"}
          size={24}
          color="#1f4e79"
        />
      </TouchableOpacity>
      
      {expandedSection === sectionKey && (
        <Animated.View
          style={styles.sectionContent}
        >
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#1f4e79', '#2a5f87', '#3570a0']}
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
            <Text style={styles.title}>📊 Portfolio Optimizer</Text>
            <Text style={styles.subtitle}>Advanced Markowitz Mean-Variance & CAPM Analysis</Text>
            
            {isOptimizing && (
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
                  Optimizing... {Math.round(optimizationProgress)}%
                </Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* Basic Configuration */}
        {renderExpandableSection('Basic Configuration', '⚙️', 'basic', (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Asset Tickers (comma-separated)</Text>
              <TextInput
                style={styles.textInput}
                value={tickers}
                onChangeText={setTickers}
                placeholder="AAPL, MSFT, GOOGL, TSLA, AMZN"
                autoCapitalize="characters"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Portfolio Value: ${portfolioValue.toLocaleString()}</Text>
              <Slider
                style={styles.slider}
                minimumValue={100000}
                maximumValue={10000000}
                value={portfolioValue}
                onValueChange={setPortfolioValue}
                step={100000}
                minimumTrackTintColor="#1f4e79"
                maximumTrackTintColor="#ddd"
              />
            </View>
          </>
        ))}

        {/* Optimization Method */}
        {renderExpandableSection('Optimization Strategy', '🎯', 'strategy', (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
              {optimizationMethods.map(renderMethodCard)}
            </ScrollView>

            {/* FIXED: Target Parameters with validation feedback */}
            {optimizationMethod === 'targetReturn' && (
              <Animated.View 
                style={[styles.targetSection, { opacity: fadeAnim }]}
              >
                <Text style={styles.targetLabel}>Target Annual Return: {(targetReturn * 100).toFixed(1)}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.01}
                  maximumValue={0.50}
                  value={targetReturn}
                  onValueChange={setTargetReturn}
                  minimumTrackTintColor="#FF6B6B"
                  maximumTrackTintColor="#ddd"
                />
                <Text style={styles.targetHelp}>
                  Optimization will find the portfolio with minimum risk that achieves this return target.
                </Text>
              </Animated.View>
            )}

            {optimizationMethod === 'targetRisk' && (
              <Animated.View 
                style={[styles.targetSection, { opacity: fadeAnim }]}
              >
                <Text style={styles.targetLabel}>Target Annual Volatility: {(targetRisk * 100).toFixed(1)}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0.05}
                  maximumValue={0.50}
                  value={targetRisk}
                  onValueChange={setTargetRisk}
                  minimumTrackTintColor="#4ECDC4"
                  maximumTrackTintColor="#ddd"
                />
                <Text style={styles.targetHelp}>
                  Optimization will find the portfolio with maximum return at this risk level.
                </Text>
              </Animated.View>
            )}
          </>
        ))}

        {/* Advanced Options */}
        {renderExpandableSection('Advanced Options', '🔧', 'advanced', (
          <>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>🏛️ Include Risk-Free Asset</Text>
                <Text style={styles.subLabel}>Enable capital allocation with 3-Month Treasury</Text>
              </View>
              <Switch
                value={includeRiskFree}
                onValueChange={setIncludeRiskFree}
                trackColor={{ false: '#ddd', true: '#1f4e79' }}
                thumbColor={includeRiskFree ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>📈 Use S&P 500 Benchmark</Text>
                <Text style={styles.subLabel}>Enable CAPM analysis with market data</Text>
              </View>
              <Switch
                value={useMarketBenchmark}
                onValueChange={setUseMarketBenchmark}
                trackColor={{ false: '#ddd', true: '#1f4e79' }}
                thumbColor={useMarketBenchmark ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🎲 Monte Carlo Simulations: {monteCarloSimulations.toLocaleString()}</Text>
              <Slider
                style={styles.slider}
                minimumValue={1000}
                maximumValue={50000}
                step={1000}
                value={monteCarloSimulations}
                onValueChange={setMonteCarloSimulations}
                minimumTrackTintColor="#9B59B6"
                maximumTrackTintColor="#ddd"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📊 Maximum Position Size: {(maxPositionSize * 100).toFixed(0)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0.10}
                maximumValue={1.00}
                step={0.05}
                value={maxPositionSize}
                onValueChange={setMaxPositionSize}
                minimumTrackTintColor="#E67E22"
                maximumTrackTintColor="#ddd"
              />
            </View>
          </>
        ))}

        {/* Action Buttons */}
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
            style={[styles.button, styles.primaryButton]}
            onPress={runOptimization}
            disabled={isOptimizing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isOptimizing ? ['#95a5a6', '#7f8c8d'] : ['#1f4e79', '#2980b9']}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isOptimizing ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons name="analytics" size={20} color="#ffffff" />
              )}
              <Text style={styles.buttonText}>
                {isOptimizing ? 'Optimizing...' : '🚀 Run Optimization'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetToDefaults}
            activeOpacity={0.8}
          >
            <View style={styles.secondaryButtonContent}>
              <Ionicons name="refresh" size={20} color="#1f4e79" />
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* FIXED: Enhanced Results Section with target achievement display */}
        {results && (
          <Animated.View 
            style={[
              styles.resultsContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
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
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={activeTab === tab.key ? 
                      ['#1f4e79', '#2980b9'] : 
                      ['transparent', 'transparent']
                    }
                    style={styles.tabGradient}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={16}
                      color={activeTab === tab.key ? '#ffffff' : '#666'}
                    />
                    <Text style={[
                      styles.tabText,
                      activeTab === tab.key && styles.activeTabText
                    ]}>
                      {tab.label}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* FIXED: Enhanced Portfolio Metrics with target achievement */}
            <LinearGradient
              colors={['#f8f9fa', '#ffffff']}
              style={styles.metricsContainer}
            >
              <View style={styles.metricsGrid}>
                <View style={[styles.metric, { borderLeftColor: '#1f4e79' }]}>
                  <Text style={styles.metricLabel}>Expected Return</Text>
                  <Text style={[styles.metricValue, { color: '#1f4e79' }]}>
                    {(results.expectedReturn * 100).toFixed(2)}%
                  </Text>
                </View>
                <View style={[styles.metric, { borderLeftColor: '#e74c3c' }]}>
                  <Text style={styles.metricLabel}>Volatility</Text>
                  <Text style={[styles.metricValue, { color: '#e74c3c' }]}>
                    {(results.volatility * 100).toFixed(2)}%
                  </Text>
                </View>
                <View style={[styles.metric, { borderLeftColor: '#27ae60' }]}>
                  <Text style={styles.metricLabel}>Sharpe Ratio</Text>
                  <Text style={[styles.metricValue, { color: '#27ae60' }]}>
                    {results.sharpeRatio.toFixed(3)}
                  </Text>
                </View>
                <View style={[styles.metric, { borderLeftColor: '#9b59b6' }]}>
                  <Text style={styles.metricLabel}>Simulations</Text>
                  <Text style={[styles.metricValue, { color: '#9b59b6' }]}>
                    {results.metadata.monteCarloSimulations.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* FIXED: Target Achievement Display */}
              {(results.type === 'targetReturn' || results.type === 'targetRisk') && (
                <View style={styles.targetAchievementContainer}>
                  <View style={[
                    styles.targetAchievementBadge,
                    { backgroundColor: results.targetAchieved ? '#27ae60' : '#f39c12' }
                  ]}>
                    <Ionicons
                      name={results.targetAchieved ? "checkmark-circle" : "warning"}
                      size={16}
                      color="#ffffff"
                    />
                    <Text style={styles.targetAchievementText}>
                      Target {results.targetAchieved ? 'Achieved' : 'Approximated'}
                    </Text>
                  </View>
                  
                  {!results.targetAchieved && results.targetDistance !== undefined && (
                    <Text style={styles.targetDistanceText}>
                      Distance from target: {(results.targetDistance * 100).toFixed(2)}%
                    </Text>
                  )}
                </View>
              )}
            </LinearGradient>

            {/* Chart Content */}
            <View style={styles.chartContainer}>
              {activeTab === 'weights' && (
                <PortfolioWeightsChart
                  weights={results.weights}
                  tickers={results.tickers}
                  title="🎯 Optimal Portfolio Allocation"
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
                  capmData={results.tickers.reduce((acc, ticker) => ({
                    ...acc,
                    [ticker]: {
                      alpha: results.alphas[ticker],
                      beta: results.betas[ticker],
                      capmExpectedReturn: results.capmReturns[ticker],
                      rSquared: 0.75
                    }
                  }), {})}
                  riskFreeRate={results.metadata.riskFreeRate}
                  marketReturn={results.metadata.marketReturn}
                />
              )}

              {activeTab === 'correlation' &&
                results.correlationMatrix &&
                results.tickers &&
                results.correlationMatrix.length > 0 && (
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
            </View>

            {/* Detailed Metrics */}
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.detailedMetrics}
            >
              <Text style={styles.detailedMetricsTitle}>📊 Detailed Analysis</Text>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>💰 Risk-Free Rate:</Text>
                <Text style={styles.metricRowValue}>{(results.metadata.riskFreeRate * 100).toFixed(3)}%</Text>
              </View>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>📈 Market Return:</Text>
                <Text style={styles.metricRowValue}>{(results.metadata.marketReturn * 100).toFixed(2)}%</Text>
              </View>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>🔗 Data Source:</Text>
                <Text style={styles.metricRowValue}>{results.metadata.dataSource}</Text>
              </View>
              
              <View style={styles.metricRow}>
                <Text style={styles.metricRowLabel}>⚡ Optimization Method:</Text>
                <Text style={styles.metricRowValue}>
                  {optimizationMethods.find(m => m.key === results.type)?.label}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Enhanced styles with new target achievement elements
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
  },
  progressContainer: {
    marginTop: 20,
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
  },
  sectionHeader: {
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
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
  slider: {
    width: '100%',
    height: 40,
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
    width: 160,
  },
  methodGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
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
  targetHelp: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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
  buttonContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  primaryButton: {},
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#1f4e79',
  },
  secondaryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f4e79',
  },
  resultsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
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
  tab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeTab: {},
  tabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
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
    flexWrap: 'wrap',
  },
  metric: {
    width: '50%',
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  targetAchievementContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  targetAchievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  targetAchievementText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  targetDistanceText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailedMetrics: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailedMetricsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f4e79',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricRowLabel: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  metricRowValue: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
    textAlign: 'right',
  },
});
