// app/var.tsx - COMPLETE VaR ANALYZER WITH ALL FEATURES
// Enhanced with backtest visualization, stress testing, and English translation

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

// ===== INTERFACES & TYPES =====
interface IndividualVaRResult {
  ticker: string;
  var: number;
  expectedShortfall: number;
  volatility?: number;
  mean?: number;
  exceedanceRate?: number;
  method: string;
  skewness?: number;
  kurtosis?: number;
  cornishFisherAdjustment?: number;
  dataQuality?: {
    originalObservations: number;
    cleanedObservations: number;
    outliersRemoved: number;
  };
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
    passedTest: boolean;
    exceedanceDates: string[];
    portfolioReturns: number[];
    varBreaches: Array<{
      date: string;
      portfolioReturn: number;
      varThreshold: number;
      loss: number;
    }>;
  };
  stressResults?: Array<{
    scenario: string;
    loss: number;
    probability: number;
    description: string;
    icon: string;
    relativeToNormalVaR: number;
    portfolioImpact: string;
  }>;
  performanceMetrics?: {
    sharpeRatio: number;
    maximumDrawdown: number;
    calmarRatio: number;
    recoveryTime: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
  };
  metadata: {
    dataSource: string;
    fetchTime: string;
    calculationTime: number;
    dataQuality: string;
    recommendedActions: string[];
  };
}

interface VaRMethod {
  key: string;
  label: string;
  icon: string;
  description: string;
  isIndividual: boolean;
  color: string;
  gradient: string[];
}

// ===== COMPONENT PRINCIPAL =====
export default function CompleteVaRAnalyzer() {
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
  const [numSimulations, setNumSimulations] = useState(10000);
  
  // Advanced options
  const [includeStressTesting, setIncludeStressTesting] = useState(true);
  const [runBacktest, setRunBacktest] = useState(true);
  const [includePerformanceMetrics, setIncludePerformanceMetrics] = useState(true);
  const [backtestPeriod, setBacktestPeriod] = useState('1y');
  
  // State management
  const [loading, setLoading] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [results, setResults] = useState<VaRResults | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [dataHealth, setDataHealth] = useState<any>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('basic');

  // ===== CONFIGURATION DATA =====
  const varMethods: VaRMethod[] = [
    { 
      key: 'parametric_individual', 
      label: 'Parametric (Per Asset)', 
      icon: '📊', 
      description: 'Normal distribution per asset with Cornish-Fisher adjustment',
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
      description: 'Portfolio-level parametric VaR with correlations',
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
    { 
      name: 'Market Crash', 
      shock: -0.20, 
      description: '2008-style market crash (20% decline)', 
      icon: '💥',
      probability: 0.02,
      timeframe: 'Once every 50 years'
    },
    { 
      name: 'Interest Rate Shock', 
      shock: -0.10, 
      description: 'Sudden 200bp rate hike (10% decline)', 
      icon: '📈',
      probability: 0.05,
      timeframe: 'Once every 20 years'
    },
    { 
      name: 'Currency Crisis', 
      shock: -0.15, 
      description: 'Major currency devaluation (15% decline)', 
      icon: '💱',
      probability: 0.03,
      timeframe: 'Once every 33 years'
    },
    { 
      name: 'Black Swan Event', 
      shock: -0.30, 
      description: 'Extreme unexpected event (30% decline)', 
      icon: '🦢',
      probability: 0.01,
      timeframe: 'Once every 100 years'
    },
    { 
      name: 'Correlation Breakdown', 
      shock: -0.25, 
      description: 'Diversification failure (25% decline)', 
      icon: '🔗',
      probability: 0.02,
      timeframe: 'Once every 50 years'
    },
    {
      name: 'Tech Bubble Burst',
      shock: -0.35,
      description: 'Technology sector collapse (35% decline)',
      icon: '💻',
      probability: 0.015,
      timeframe: 'Once every 67 years'
    },
    {
      name: 'Pandemic Impact',
      shock: -0.18,
      description: 'Global pandemic economic impact (18% decline)',
      icon: '🦠',
      probability: 0.04,
      timeframe: 'Once every 25 years'
    }
  ];

  // ===== LIFECYCLE & ANIMATIONS =====
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

    // Continuous animations
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

    const rotateLoop = Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 20000,
      useNativeDriver: true,
    });
    Animated.loop(rotateLoop).start();

    // Initialize system
    checkSystemHealth();
    
    return () => {
      setResults(null);
      setAnalysisProgress(0);
      setLoading(false);
    };
  }, []);

  // ===== UTILITY FUNCTIONS =====
  const checkSystemHealth = async () => {
    try {
      const health = await realTimeDataFetcher.healthCheck();
      setDataHealth(health);
    } catch (error) {
      console.warn('Health check failed:', error);
    }
  };

  const animateProgress = (toValue: number) => {
    const clampedValue = Math.max(0, Math.min(1, toValue));
    Animated.timing(progressAnim, {
      toValue: clampedValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const updateProgress = (value: number) => {
    const clampedValue = Math.max(0, Math.min(100, value));
    setAnalysisProgress(clampedValue);
    animateProgress(clampedValue / 100);
  };

  const parseWeights = (weightsString: string, tickerCount: number): number[] => {
    try {
      if (!weightsString || weightsString.trim() === '') {
        return Array(tickerCount).fill(1 / tickerCount);
      }
      
      const weightArray = weightsString
        .split(',')
        .map(w => {
          const parsed = parseFloat(w.trim());
          if (isNaN(parsed) || parsed < 0) {
            throw new Error(`Invalid weight: "${w.trim()}". Weights must be positive numbers.`);
          }
          return parsed;
        });
      
      if (weightArray.length !== tickerCount) {
        throw new Error(`Number of weights (${weightArray.length}) must match number of tickers (${tickerCount})`);
      }
      
      const sum = weightArray.reduce((acc, w) => acc + w, 0);
      if (sum === 0) {
        throw new Error('Weight sum cannot be zero');
      }
      
      return weightArray.map(w => w / sum);
      
    } catch (error) {
      console.warn('Weight parsing error:', error.message);
      Alert.alert(
        '⚠️ Weight Parsing Error', 
        `${error.message}\n\nUsing equal weights instead.`,
        [{ text: 'OK', style: 'default' }]
      );
      return Array(tickerCount).fill(1 / tickerCount);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // ===== ENHANCED VaR CALCULATION FUNCTIONS =====
  const calculateIndividualVaR = async (
    returnsMatrix: number[][], 
    tickers: string[], 
    weights: number[], 
    method: string
  ): Promise<VaRResults> => {
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
          result = {
            ticker: ticker,
            var: varResult.var,
            expectedShortfall: varResult.expectedShortfall,
            volatility: varResult.volatility,
            mean: varResult.return,
            method: varResult.method,
            skewness: varResult.skewness,
            kurtosis: varResult.kurtosis,
            cornishFisherAdjustment: varResult.cornishFisherAdjustment,
            dataQuality: varResult.dataQuality
          };
        } else if (method === 'historical_individual') {
          const varResult = VaRCalculator.calculateIndividualHistoricalVaR(
            assetReturns, ticker, confidenceLevel, assetPositionSize
          );
          result = {
            ticker: ticker,
            var: varResult.var,
            expectedShortfall: varResult.expectedShortfall,
            volatility: varResult.volatility,
            mean: varResult.return,
            method: varResult.method,
            dataQuality: varResult.dataQuality
          };
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
        dataSource: 'real-time',
        fetchTime: new Date().toISOString(),
        calculationTime: 0,
        dataQuality: 'Good',
        recommendedActions: generateRecommendations(individualResults)
      }
    };
  };

  const calculatePortfolioVaR = async (
    returnsMatrix: number[][], 
    tickers: string[], 
    weights: number[], 
    method: string
  ): Promise<VaRResults> => {
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
        dataSource: 'real-time',
        fetchTime: new Date().toISOString(),
        calculationTime: 0,
        dataQuality: 'Good',
        recommendedActions: generatePortfolioRecommendations(portfolioResult)
      }
    };
  };

  // ENHANCED: Comprehensive stress testing
  const runAdvancedStressTests = async (
    returnsMatrix: number[][], 
    weights: number[], 
    positionSize: number,
    normalVaR: number
  ) => {
    const stressResults = [];
    
    console.log('💥 Running comprehensive stress tests...');
    
    for (const scenario of stressScenarios) {
      try {
        // Apply stress scenario to returns
        const stressedReturns = returnsMatrix.map(returns => 
          returns.map(r => r + scenario.shock)
        );
        
        // Calculate VaR under stress
        const stressVaR = VaRCalculator.calculatePortfolioVaR(
          stressedReturns, weights, 0.95, positionSize
        );
        
        // Calculate relative impact
        const relativeToNormalVaR = stressVaR.var / normalVaR;
        
        // Determine portfolio impact category
        let portfolioImpact: string;
        if (relativeToNormalVaR > 3) {
          portfolioImpact = 'Severe';
        } else if (relativeToNormalVaR > 2) {
          portfolioImpact = 'High';
        } else if (relativeToNormalVaR > 1.5) {
          portfolioImpact = 'Moderate';
        } else {
          portfolioImpact = 'Low';
        }
        
        stressResults.push({
          scenario: scenario.name,
          loss: stressVaR.var,
          probability: scenario.probability,
          description: scenario.description,
          icon: scenario.icon,
          relativeToNormalVaR: relativeToNormalVaR,
          portfolioImpact: portfolioImpact
        });
        
        console.log(`💥 ${scenario.name}: $${stressVaR.var.toLocaleString()} (${relativeToNormalVaR.toFixed(1)}x normal)`);
        
      } catch (error) {
        console.warn(`Stress test failed for ${scenario.name}:`, error.message);
      }
    }
    
    // Sort by severity
    stressResults.sort((a, b) => b.loss - a.loss);
    
    return stressResults;
  };

  // ENHANCED: Comprehensive backtesting with detailed analysis
  const performAdvancedBacktest = (
    returnsMatrix: number[][], 
    weights: number[], 
    varResults: VaRResults, 
    confidenceLevel: number, 
    positionSize: number
  ) => {
    try {
      console.log('📊 Running advanced VaR backtesting...');
      
      // Calculate VaR threshold
      let varThreshold = 0;
      if (varResults.individualResults) {
        varThreshold = varResults.individualResults.reduce((sum, r) => sum + r.var, 0);
      } else if (varResults.portfolioResult) {
        varThreshold = varResults.portfolioResult.var;
      }

      // Calculate portfolio returns
      const portfolioReturns = [];
      const minLength = Math.min(...returnsMatrix.map(r => r.length));
      const dates = [];
      
      for (let i = 0; i < minLength; i++) {
        const portfolioReturn = returnsMatrix.reduce((sum, returns, assetIndex) => 
          sum + weights[assetIndex] * returns[i], 0
        );
        const portfolioPnL = portfolioReturn * positionSize;
        portfolioReturns.push(portfolioPnL);
        
        // Generate dates (working backwards from today)
        const date = new Date();
        date.setDate(date.getDate() - (minLength - i));
        dates.push(date.toISOString().split('T')[0]);
      }
      
      // Find VaR breaches
      const varBreaches = [];
      const exceedanceDates = [];
      let exceedances = 0;
      
      for (let i = 0; i < portfolioReturns.length; i++) {
        const loss = -portfolioReturns[i]; // Convert to loss
        if (loss > varThreshold) {
          exceedances++;
          exceedanceDates.push(dates[i]);
          varBreaches.push({
            date: dates[i],
            portfolioReturn: portfolioReturns[i],
            varThreshold: varThreshold,
            loss: loss
          });
        }
      }
      
      const exceedanceRate = (exceedances / portfolioReturns.length) * 100;
      const expectedRate = (1 - confidenceLevel) * 100;
      
      // Kupiec test for model validation
      const kupiecTest = VaRCalculator.calculateKupiecTest(exceedances, portfolioReturns.length, 1 - confidenceLevel);
      const passedTest = Math.abs(exceedanceRate - expectedRate) < 2 && kupiecTest < 3.84; // 95% confidence chi-square critical value
      
      console.log(`📊 Backtest Results: ${exceedances} exceedances out of ${portfolioReturns.length} observations`);
      console.log(`📊 Exceedance rate: ${exceedanceRate.toFixed(2)}% (expected: ${expectedRate.toFixed(2)}%)`);
      console.log(`📊 Kupiec test: ${kupiecTest.toFixed(2)} (passed: ${passedTest})`);
      
      return {
        exceedances: exceedances,
        exceedanceRate: exceedanceRate,
        expectedRate: expectedRate,
        kupiecTest: kupiecTest,
        totalObservations: portfolioReturns.length,
        passedTest: passedTest,
        exceedanceDates: exceedanceDates,
        portfolioReturns: portfolioReturns,
        varBreaches: varBreaches
      };
      
    } catch (error) {
      console.warn('Advanced backtesting failed:', error.message);
      return {
        exceedances: 0,
        exceedanceRate: 0,
        expectedRate: (1 - confidenceLevel) * 100,
        kupiecTest: 0,
        totalObservations: 0,
        passedTest: false,
        exceedanceDates: [],
        portfolioReturns: [],
        varBreaches: []
      };
    }
  };

  // NEW: Performance metrics calculation
  const calculatePerformanceMetrics = (portfolioReturns: number[]) => {
    try {
      if (!portfolioReturns || portfolioReturns.length === 0) {
        return null;
      }

      const returns = portfolioReturns.filter(r => !isNaN(r) && isFinite(r));
      if (returns.length < 10) return null;

      // Calculate basic statistics
      const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1);
      const volatility = Math.sqrt(variance);

      // Sharpe Ratio (assuming risk-free rate of 2%)
      const riskFreeRate = 0.02 / 252; // Daily risk-free rate
      const sharpeRatio = volatility > 0 ? (meanReturn - riskFreeRate) / volatility : 0;

      // Maximum Drawdown
      let peak = returns[0];
      let maxDrawdown = 0;
      let currentDrawdown = 0;
      let drawdownStart = 0;
      let recoveryTime = 0;

      for (let i = 1; i < returns.length; i++) {
        if (returns[i] > peak) {
          peak = returns[i];
          if (currentDrawdown > 0) {
            recoveryTime = i - drawdownStart;
            currentDrawdown = 0;
          }
        } else {
          if (currentDrawdown === 0) {
            drawdownStart = i;
          }
          currentDrawdown = (peak - returns[i]) / peak;
          maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
        }
      }

      // Calmar Ratio
      const calmarRatio = maxDrawdown > 0 ? (meanReturn * 252) / maxDrawdown : 0;

      // Win/Loss Statistics
      const positiveReturns = returns.filter(r => r > 0);
      const negativeReturns = returns.filter(r => r < 0);
      const winRate = (positiveReturns.length / returns.length) * 100;
      const averageWin = positiveReturns.length > 0 ? positiveReturns.reduce((sum, r) => sum + r, 0) / positiveReturns.length : 0;
      const averageLoss = negativeReturns.length > 0 ? negativeReturns.reduce((sum, r) => sum + r, 0) / negativeReturns.length : 0;

      return {
        sharpeRatio: sharpeRatio * Math.sqrt(252), // Annualized
        maximumDrawdown: maxDrawdown * 100, // Percentage
        calmarRatio: calmarRatio,
        recoveryTime: recoveryTime,
        winRate: winRate,
        averageWin: averageWin,
        averageLoss: Math.abs(averageLoss)
      };
    } catch (error) {
      console.warn('Performance metrics calculation failed:', error);
      return null;
    }
  };

  // Helper functions for recommendations
  const generateRecommendations = (individualResults: IndividualVaRResult[]): string[] => {
    const recommendations = [];
    
    // Check for high VaR assets
    const totalVar = individualResults.reduce((sum, r) => sum + r.var, 0);
    const highVarAssets = individualResults.filter(r => r.var / totalVar > 0.4);
    
    if (highVarAssets.length > 0) {
      recommendations.push(`Consider reducing exposure to high-risk assets: ${highVarAssets.map(r => r.ticker).join(', ')}`);
    }
    
    // Check for skewness issues
    const negativeSkewAssets = individualResults.filter(r => r.skewness && r.skewness < -1);
    if (negativeSkewAssets.length > 0) {
      recommendations.push(`Assets with high tail risk: ${negativeSkewAssets.map(r => r.ticker).join(', ')}`);
    }
    
    // Data quality issues
    const lowQualityAssets = individualResults.filter(r => 
      r.dataQuality && r.dataQuality.outliersRemoved > r.dataQuality.originalObservations * 0.1
    );
    if (lowQualityAssets.length > 0) {
      recommendations.push(`Review data quality for: ${lowQualityAssets.map(r => r.ticker).join(', ')}`);
    }
    
    return recommendations;
  };

  const generatePortfolioRecommendations = (portfolioResult: PortfolioVaRResult): string[] => {
    const recommendations = [];
    
    if (portfolioResult.diversificationBenefit !== undefined) {
      if (portfolioResult.diversificationBenefit < 0.1) {
        recommendations.push('Low diversification benefit - consider more uncorrelated assets');
      } else if (portfolioResult.diversificationBenefit > 0.3) {
        recommendations.push('Good diversification - portfolio benefits from risk reduction');
      }
    }
    
    const varAsPercentage = (portfolioResult.var / positionSize) * 100;
    if (varAsPercentage > 5) {
      recommendations.push('High portfolio risk - consider risk reduction strategies');
    } else if (varAsPercentage < 1) {
      recommendations.push('Conservative portfolio - may consider slightly higher risk for returns');
    }
    
    return recommendations;
  };

  // ===== MAIN VaR ANALYSIS FUNCTION =====
  const runComprehensiveVaRAnalysis = async () => {
    setLoading(true);
    setAnalysisProgress(0);
    setResults(null);
    animateProgress(0);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Parse and validate inputs
      updateProgress(5);
      const tickerList = tickers.split(',')
        .map(t => t.trim().toUpperCase())
        .filter(t => t.length > 0 && /^[A-Z^]{1,6}$/.test(t));
      
      if (tickerList.length < 1) {
        throw new Error('Please enter at least 1 valid ticker symbol');
      }

      if (tickerList.length > 15) {
        throw new Error('Maximum 15 tickers allowed for mobile VaR analysis');
      }

      const selectedMethod = varMethods.find(m => m.key === varMethod);
      if (!selectedMethod) {
        throw new Error('Invalid VaR method selected');
      }

      console.log(`🚀 Starting ${selectedMethod.label} analysis for:`, tickerList);

      // Step 2: Parse and validate weights
      updateProgress(10);
      const portfolioWeights = parseWeights(weights, tickerList.length);

      // Step 3: Fetch market data with fallback
      updateProgress(20);
      let stockData;
      
      try {
        stockData = await realTimeDataFetcher.fetchMultipleStocks(tickerList, '2y', true);
      } catch (dataError) {
        console.warn('2-year data failed, trying 1-year fallback...', dataError.message);
        
        try {
          stockData = await realTimeDataFetcher.fetchMultipleStocks(tickerList, '1y', true);
          Alert.alert(
            'ℹ️ Data Limitation', 
            'Using 1-year data instead of 2-year due to data availability.',
            [{ text: 'OK', style: 'default' }]
          );
        } catch (fallbackError) {
          throw new Error(`Failed to fetch market data: ${fallbackError.message}`);
        }
      }
      
      updateProgress(40);

      // Step 4: Validate data quality
      if (!stockData?.metadata || !stockData?.returns) {
        throw new Error('Invalid data structure received from data source');
      }

      console.log(`✅ Data fetched: ${stockData.symbols.join(', ')}`);
      console.log(`📊 Data quality: ${stockData.metadata.successRate} success rate`);

      // Step 5: Prepare returns matrix
      updateProgress(50);
      const returnsMatrix = stockData.symbols.map(symbol => {
        const returns = stockData.returns[symbol] || [];
        if (returns.length < 50) {
          console.warn(`Warning: ${symbol} has only ${returns.length} observations`);
        }
        return returns;
      });
      
      const minObservations = Math.min(...returnsMatrix.map(r => r.length));
      if (minObservations < 30) {
        const shouldContinue = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '⚠️ Limited Data Warning', 
            `Only ${minObservations} observations available. VaR estimates may be less reliable with fewer than 100 observations.\n\nDo you want to continue?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Continue', style: 'default', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (!shouldContinue) {
          throw new Error('Analysis cancelled by user');
        }
      }

      updateProgress(60);
      console.log(`📊 Analyzing ${minObservations} observations per asset`);

      // Step 6: Calculate VaR
      updateProgress(70);
      console.log(`🎯 Running ${selectedMethod.label} with ${numSimulations.toLocaleString()} simulations...`);
      
      let varResults: VaRResults;
      
      try {
        if (selectedMethod.isIndividual) {
          varResults = await calculateIndividualVaR(
            returnsMatrix, 
            stockData.symbols, 
            portfolioWeights, 
            selectedMethod.key
          );
        } else {
          varResults = await calculatePortfolioVaR(
            returnsMatrix, 
            stockData.symbols, 
            portfolioWeights, 
            selectedMethod.key
          );
        }
      } catch (calcError) {
        throw new Error(`VaR calculation failed: ${calcError.message}`);
      }

      updateProgress(85);

      // Step 7: Validate results
      if (!varResults || (!varResults.individualResults && !varResults.portfolioResult)) {
        throw new Error('VaR calculation produced no valid results');
      }

      // Step 8: Additional comprehensive analysis
      const calculationTime = Date.now() - startTime;
      varResults.metadata.calculationTime = calculationTime;
      varResults.metadata.dataSource = stockData.metadata.dataSource;
      varResults.metadata.fetchTime = stockData.metadata.fetchTime;

      // Enhanced stress testing
      if (includeStressTesting) {
        console.log('💥 Running comprehensive stress tests...');
        try {
          const normalVaR = varResults.individualResults 
            ? varResults.individualResults.reduce((sum, r) => sum + r.var, 0)
            : varResults.portfolioResult?.var || 0;
            
          varResults.stressResults = await runAdvancedStressTests(
            returnsMatrix, 
            portfolioWeights, 
            positionSize,
            normalVaR
          );
        } catch (stressError) {
          console.warn('Stress testing failed:', stressError.message);
        }
      }

      // Enhanced backtesting
      if (runBacktest && minObservations > 100) {
        console.log('📊 Running comprehensive VaR backtesting...');
        try {
          varResults.backtestResults = performAdvancedBacktest(
            returnsMatrix, 
            portfolioWeights, 
            varResults, 
            confidenceLevel, 
            positionSize
          );
        } catch (backtestError) {
          console.warn('Backtesting failed:', backtestError.message);
        }
      }

      // Performance metrics
      if (includePerformanceMetrics && varResults.backtestResults) {
        console.log('📈 Calculating performance metrics...');
        try {
          varResults.performanceMetrics = calculatePerformanceMetrics(
            varResults.backtestResults.portfolioReturns
          );
        } catch (perfError) {
          console.warn('Performance metrics calculation failed:', perfError.message);
        }
      }

      // Step 9: Complete analysis
      updateProgress(100);
      setResults(varResults);
      setActiveTab('summary');

      const totalVar = varResults.individualResults 
        ? varResults.individualResults.reduce((sum, r) => sum + r.var, 0)
        : varResults.portfolioResult?.var || 0;

      let successMessage = `✅ VaR Analysis Complete!\n• Method: ${selectedMethod.label}\n• ${(confidenceLevel * 100).toFixed(0)}% VaR: $${totalVar.toLocaleString()}\n• Calculation time: ${calculationTime}ms\n• Data points: ${minObservations} per asset\n• Assets analyzed: ${stockData.symbols.length}`;
      
      if (varResults.backtestResults) {
        successMessage += `\n• Backtest: ${varResults.backtestResults.passedTest ? 'PASSED ✅' : 'FAILED ❌'}`;
      }
      
      if (varResults.stressResults) {
        const worstStress = Math.max(...varResults.stressResults.map(s => s.loss));
        successMessage += `\n• Worst stress scenario: $${worstStress.toLocaleString()}`;
      }
      
      Alert.alert('🎉 Analysis Complete!', successMessage);

    } catch (error) {
      console.error('❌ VaR analysis error:', error);
      
      let errorTitle = '❌ Analysis Failed';
      let errorMessage = 'VaR analysis encountered an error.';
      
      if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('data')) {
        errorTitle = '🌐 Data Connection Issue';
        errorMessage = 'Unable to fetch market data. Please check your internet connection and ticker symbols, then try again.';
      } else if (error.message.includes('Insufficient') || error.message.includes('observations')) {
        errorTitle = '📊 Data Quality Issue';
        errorMessage = error.message + '\n\nTry using fewer assets, a different time period, or check if the ticker symbols are correct.';
      } else if (error.message.includes('calculation') || error.message.includes('VaR calculation failed')) {
        errorTitle = '🧮 Calculation Error';
        errorMessage = 'The VaR calculation failed due to data issues. Please verify your inputs and try again with different parameters.';
      } else if (error.message.includes('cancelled')) {
        errorTitle = '⏹️ Analysis Cancelled';
        errorMessage = 'Analysis was cancelled by user.';
      } else if (error.message.includes('Invalid') || error.message.includes('method')) {
        errorTitle = '⚙️ Configuration Error';
        errorMessage = 'Invalid analysis configuration. Please check your settings and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(errorTitle, errorMessage);
    } finally {
      setLoading(false);
      setAnalysisProgress(0);
      animateProgress(0);
    }
  };

  // ===== HELPER FUNCTIONS FOR RESULTS =====
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
    if (varPercent > 0.05) return '#e74c3c';
    if (varPercent > 0.02) return '#f39c12';
    return '#27ae60';
  };

  const getStressColor = (impact: string): string => {
    switch (impact) {
      case 'Severe': return '#8b0000';
      case 'High': return '#e74c3c';
      case 'Moderate': return '#f39c12';
      case 'Low': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  // ===== RENDER FUNCTIONS =====
  const renderMethodCard = (method: VaRMethod) => (
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
          colors={expandedSection === sectionKey ? ['#e74c3c', '#c0392b'] : ['#f8f9fa', '#ffffff']}
          style={styles.sectionHeaderGradient}
        >
          <View style={styles.sectionHeaderLeft}>
            <Text style={[
              styles.sectionIcon,
              expandedSection === sectionKey && { fontSize: 28, color: '#ffffff' }
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
            color={expandedSection === sectionKey ? "#ffffff" : "#e74c3c"}
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

  // ===== MAIN RENDER =====
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Beautiful Header */}
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
            <Text style={styles.title}>⚠️ VaR Risk Analyzer</Text>
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
                  Data: {dataHealth.overall_status?.split(' ')[1] || 'OK'}
                </Text>
              </Animated.View>
            )}

            {/* Progress Bar */}
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

            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>📊 Performance Metrics</Text>
                <Text style={styles.subLabel}>Calculate Sharpe ratio, drawdown, and other metrics</Text>
              </View>
              <Switch
                value={includePerformanceMetrics}
                onValueChange={setIncludePerformanceMetrics}
                trackColor={{ false: '#ddd', true: '#27ae60' }}
                thumbColor={includePerformanceMetrics ? '#ffffff' : '#f4f3f4'}
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
            onPress={runComprehensiveVaRAnalysis}
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

        {/* ENHANCED Results Section */}
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

            {/* Enhanced Tab Navigation */}
            <View style={styles.tabContainer}>
              {[
                { key: 'summary', label: 'Summary', icon: 'analytics' },
                { key: 'backtest', label: 'Backtest', icon: 'trending-up', show: !!results.backtestResults },
                { key: 'stress', label: 'Stress', icon: 'warning', show: !!results.stressResults },
                { key: 'performance', label: 'Performance', icon: 'speedometer', show: !!results.performanceMetrics },
                { key: 'details', label: 'Details', icon: 'list' }
              ].filter(tab => tab.show !== false).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={activeTab === tab.key ? 
                      ['#e74c3c', '#c0392b'] : 
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
              
              {/* Backtest Status */}
              {results.backtestResults && (
                <View style={styles.backtestStatus}>
                  <View style={[
                    styles.backtestBadge,
                    { backgroundColor: results.backtestResults.passedTest ? '#27ae60' : '#e74c3c' }
                  ]}>
                    <Ionicons
                      name={results.backtestResults.passedTest ? "checkmark-circle" : "close-circle"}
                      size={16}
                      color="#ffffff"
                    />
                    <Text style={styles.backtestText}>
                      Backtest {results.backtestResults.passedTest ? 'PASSED' : 'FAILED'}
                    </Text>
                  </View>
                  <Text style={styles.backtestDetail}>
                    {results.backtestResults.exceedances} exceedances out of {results.backtestResults.totalObservations} observations
                  </Text>
                </View>
              )}

              {/* Portfolio diversification benefit */}
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

            {/* Tab Content */}
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.contentContainer}
            >
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <View style={styles.summaryContainer}>
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

                  {/* Risk Interpretation */}
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

                    {/* Recommendations */}
                    {results.metadata.recommendedActions && results.metadata.recommendedActions.length > 0 && (
                      <View style={styles.recommendationsContainer}>
                        <Text style={styles.recommendationsTitle}>💡 Recommendations</Text>
                        {results.metadata.recommendedActions.map((action, index) => (
                          <Text key={index} style={styles.recommendationItem}>• {action}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Backtest Tab */}
              {activeTab === 'backtest' && results.backtestResults && (
                <View style={styles.backtestContainer}>
                  <Text style={styles.chartTitle}>📈 VaR Model Backtesting</Text>
                  
                  <View style={styles.backtestMetrics}>
                    <View style={styles.backtestMetricCard}>
                      <Text style={styles.backtestMetricLabel}>Exceedances</Text>
                      <Text style={styles.backtestMetricValue}>
                        {results.backtestResults.exceedances} / {results.backtestResults.totalObservations}
                      </Text>
                    </View>
                    <View style={styles.backtestMetricCard}>
                      <Text style={styles.backtestMetricLabel}>Exceedance Rate</Text>
                      <Text style={styles.backtestMetricValue}>
                        {results.backtestResults.exceedanceRate.toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.backtestMetricCard}>
                      <Text style={styles.backtestMetricLabel}>Expected Rate</Text>
                      <Text style={styles.backtestMetricValue}>
                        {results.backtestResults.expectedRate.toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.backtestMetricCard}>
                      <Text style={styles.backtestMetricLabel}>Kupiec Test</Text>
                      <Text style={styles.backtestMetricValue}>
                        {results.backtestResults.kupiecTest.toFixed(2)}
                      </Text>
                    </View>
                  </View>

                  {/* VaR Breaches */}
                  {results.backtestResults.varBreaches && results.backtestResults.varBreaches.length > 0 && (
                    <View style={styles.breachesContainer}>
                      <Text style={styles.breachesTitle}>🚨 VaR Breaches</Text>
                      <Text style={styles.breachesSubtitle}>
                        Showing latest {Math.min(5, results.backtestResults.varBreaches.length)} breaches
                      </Text>
                      {results.backtestResults.varBreaches.slice(-5).map((breach, index) => (
                        <View key={index} style={styles.breachItem}>
                          <View style={styles.breachDate}>
                            <Text style={styles.breachDateText}>{breach.date}</Text>
                          </View>
                          <View style={styles.breachDetails}>
                            <Text style={styles.breachLoss}>
                              Loss: ${breach.loss.toLocaleString()}
                            </Text>
                            <Text style={styles.breachVsVar}>
                              vs VaR: ${breach.varThreshold.toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Backtest interpretation */}
                  <View style={styles.backtestInterpretation}>
                    <Text style={styles.interpretationTitle}>📊 Backtest Interpretation</Text>
                    <Text style={styles.interpretationText}>
                      The VaR model {results.backtestResults.passedTest ? 'passed' : 'failed'} the backtest with{' '}
                      <Text style={[styles.interpretationHighlight, { 
                        color: results.backtestResults.passedTest ? '#27ae60' : '#e74c3c' 
                      }]}>
                        {results.backtestResults.exceedanceRate.toFixed(1)}% exceedance rate
                      </Text>{' '}
                      vs {results.backtestResults.expectedRate.toFixed(1)}% expected.
                    </Text>
                    
                    {!results.backtestResults.passedTest && (
                      <Text style={styles.interpretationText}>
                        ⚠️ The model may be underestimating risk. Consider using a more conservative approach or different methodology.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Stress Testing Tab */}
              {activeTab === 'stress' && results.stressResults && (
                <View style={styles.stressContainer}>
                  <Text style={styles.chartTitle}>💥 Stress Testing Results</Text>
                  
                  <View style={styles.stressGrid}>
                    {results.stressResults.map((stress, index) => (
                      <View key={index} style={styles.stressCard}>
                        <LinearGradient
                          colors={[getStressColor(stress.portfolioImpact) + '20', getStressColor(stress.portfolioImpact) + '10']}
                          style={styles.stressCardGradient}
                        >
                          <View style={styles.stressHeader}>
                            <Text style={styles.stressIcon}>{stress.icon}</Text>
                            <Text style={[styles.stressImpact, { color: getStressColor(stress.portfolioImpact) }]}>
                              {stress.portfolioImpact}
                            </Text>
                          </View>
                          
                          <Text style={styles.stressTitle}>{stress.scenario}</Text>
                          <Text style={styles.stressDescription}>{stress.description}</Text>
                          
                          <View style={styles.stressMetrics}>
                            <Text style={styles.stressLoss}>
                              Loss: ${(stress.loss / 1000).toFixed(0)}k
                            </Text>
                            <Text style={styles.stressMultiple}>
                              {stress.relativeToNormalVaR.toFixed(1)}x normal VaR
                            </Text>
                          </View>
                        </LinearGradient>
                      </View>
                    ))}
                  </View>

                  {/* Stress interpretation */}
                  <View style={styles.stressInterpretation}>
                    <Text style={styles.interpretationTitle}>💭 Stress Test Interpretation</Text>
                    {results.stressResults.filter(s => s.portfolioImpact === 'Severe').length > 0 && (
                      <Text style={styles.interpretationText}>
                        🚨 Your portfolio shows high vulnerability to extreme scenarios. Consider hedging strategies.
                      </Text>
                    )}
                    {results.stressResults.filter(s => s.portfolioImpact === 'Low').length >= results.stressResults.length * 0.6 && (
                      <Text style={styles.interpretationText}>
                        ✅ Your portfolio demonstrates good resilience to stress scenarios.
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && results.performanceMetrics && (
                <View style={styles.performanceContainer}>
                  <Text style={styles.chartTitle}>📊 Performance Metrics</Text>
                  
                  <View style={styles.performanceGrid}>
                    <View style={styles.performanceCard}>
                      <Text style={styles.performanceLabel}>Sharpe Ratio</Text>
                      <Text style={[styles.performanceValue, { 
                        color: results.performanceMetrics.sharpeRatio > 1 ? '#27ae60' : 
                               results.performanceMetrics.sharpeRatio > 0.5 ? '#f39c12' : '#e74c3c' 
                      }]}>
                        {results.performanceMetrics.sharpeRatio.toFixed(3)}
                      </Text>
                    </View>
                    
                    <View style={styles.performanceCard}>
                      <Text style={styles.performanceLabel}>Max Drawdown</Text>
                      <Text style={[styles.performanceValue, { color: '#e74c3c' }]}>
                        {results.performanceMetrics.maximumDrawdown.toFixed(2)}%
                      </Text>
                    </View>
                    
                    <View style={styles.performanceCard}>
                      <Text style={styles.performanceLabel}>Calmar Ratio</Text>
                      <Text style={[styles.performanceValue, { 
                        color: results.performanceMetrics.calmarRatio > 1 ? '#27ae60' : '#f39c12' 
                      }]}>
                        {results.performanceMetrics.calmarRatio.toFixed(3)}
                      </Text>
                    </View>
                    
                    <View style={styles.performanceCard}>
                      <Text style={styles.performanceLabel}>Win Rate</Text>
                      <Text style={[styles.performanceValue, { 
                        color: results.performanceMetrics.winRate > 50 ? '#27ae60' : '#e74c3c' 
                      }]}>
                        {results.performanceMetrics.winRate.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  <View style={styles.performanceDetails}>
                    <View style={styles.performanceDetailRow}>
                      <Text style={styles.performanceDetailLabel}>Average Win:</Text>
                      <Text style={styles.performanceDetailValue}>
                        ${results.performanceMetrics.averageWin.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.performanceDetailRow}>
                      <Text style={styles.performanceDetailLabel}>Average Loss:</Text>
                      <Text style={styles.performanceDetailValue}>
                        ${results.performanceMetrics.averageLoss.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.performanceDetailRow}>
                      <Text style={styles.performanceDetailLabel}>Recovery Time:</Text>
                      <Text style={styles.performanceDetailValue}>
                        {results.performanceMetrics.recoveryTime} days
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.chartTitle}>📋 Detailed Analysis</Text>
                  
                  {/* Individual Results */}
                  {results.individualResults && (
                    <View style={styles.individualResults}>
                      <Text style={styles.sectionSubtitle}>Individual Asset VaR</Text>
                      {results.individualResults.map((result, index) => (
                        <View key={index} style={styles.individualCard}>
                          <View style={styles.individualHeader}>
                            <Text style={styles.individualTicker}>{result.ticker}</Text>
                            <Text style={[styles.individualVaR, { color: getVaRColor(result.var, results.positionSize) }]}>
                              ${(result.var / 1000).toFixed(0)}k
                            </Text>
                          </View>
                          <View style={styles.individualDetails}>
                            <Text style={styles.individualDetail}>
                              Expected Shortfall: ${(result.expectedShortfall / 1000).toFixed(0)}k
                            </Text>
                            {result.volatility && (
                              <Text style={styles.individualDetail}>
                                Volatility: {(result.volatility * 100).toFixed(2)}%
                              </Text>
                            )}
                            {result.skewness !== undefined && (
                              <Text style={styles.individualDetail}>
                                Skewness: {result.skewness.toFixed(3)}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Metadata */}
                  <View style={styles.metadataSection}>
                    <Text style={styles.sectionSubtitle}>Analysis Information</Text>
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
                        <Text style={styles.metadataLabel}>Data Quality:</Text>
                        <Text style={styles.metadataValue}>{results.metadata.dataQuality}</Text>
                      </View>
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Analysis Method:</Text>
                        <Text style={styles.metadataValue}>
                          {varMethods.find(m => m.key === results.method)?.description}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== ENHANCED STYLES =====
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
    padding: 10,
    gap: 4,
  },
  tabText: {
    fontSize: 10,
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
  backtestStatus: {
    alignItems: 'center',
    marginTop: 16,
  },
  backtestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  backtestText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  backtestDetail: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  contentContainer: {
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
  summaryContainer: {},
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
  recommendationsContainer: {
    marginTop: 16,
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
    paddingLeft: 8,
  },
  // Backtest styles
  backtestContainer: {},
  backtestMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  backtestMetricCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  backtestMetricLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  backtestMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  breachesContainer: {
    marginBottom: 20,
  },
  breachesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 4,
  },
  breachesSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  breachItem: {
    flexDirection: 'row',
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  breachDate: {
    marginRight: 12,
  },
  breachDateText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  breachDetails: {
    flex: 1,
  },
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
