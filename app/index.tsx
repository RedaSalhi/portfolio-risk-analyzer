// app/index.tsx - BEAUTIFUL INTERACTIVE HOME SCREEN
// Enhanced with stunning animations, live data, and modern design

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { realTimeDataFetcher } from '../src/utils/realTimeDataFetcher';

const { width, height } = Dimensions.get('window');

interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
}

interface SystemStatus {
  dataHealth: string;
  apis: number;
  lastUpdate: string;
  performance: 'excellent' | 'good' | 'fair' | 'poor';
}

export default function BeautifulHomeScreen() {
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // State
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  // Market indices to display
  const marketIndices = [
    { symbol: '^GSPC', name: 'S&P 500', icon: '📈' },
    { symbol: '^DJI', name: 'Dow Jones', icon: '📊' },
    { symbol: '^IXIC', name: 'NASDAQ', icon: '💻' },
    { symbol: '^VIX', name: 'VIX', icon: '⚡' },
  ];

  // Beautiful menu items with enhanced design
  const menuItems = [
    {
      title: 'Portfolio Optimizer',
      subtitle: 'Modern Portfolio Theory & CAPM Analysis',
      description: 'Optimize your portfolio using advanced Markowitz theory with real-time market data',
      icon: 'pie-chart' as const,
      gradient: ['#667eea', '#764ba2'],
      features: ['Efficient Frontier', 'Sharpe Ratio Optimization', 'Risk Parity'],
      route: '/portfolio',
      color: '#667eea'
    },
    {
      title: 'Value-at-Risk Analysis',
      subtitle: 'Advanced Risk Management Suite',
      description: 'Comprehensive VaR calculations with Monte Carlo simulations and stress testing',
      icon: 'analytics' as const,
      gradient: ['#f093fb', '#f5576c'],
      features: ['Monte Carlo VaR', 'Stress Testing', 'Backtesting'],
      route: '/var',
      color: '#f093fb'
    },
    {
      title: 'Research Hub',
      subtitle: 'Academic Resources & Documentation',
      description: 'Explore the mathematical foundations and academic references behind the models',
      icon: 'library' as const,
      gradient: ['#4facfe', '#00f2fe'],
      features: ['Academic Papers', 'Model Documentation', 'Developer Info'],
      route: '/about',
      color: '#4facfe'
    }
  ];

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous animations
    const pulseLoop = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.05,
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

    // Load data
    loadInitialData();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const loadInitialData = async () => {
    try {
      console.log('🚀 Loading home screen data...');
      
      // Load system health
      const health = await realTimeDataFetcher.healthCheck();
      setSystemStatus({
        dataHealth: health.overall_status || 'UNKNOWN',
        apis: Object.keys(health.dataSources || {}).length,
        lastUpdate: new Date().toLocaleTimeString(),
        performance: health.overall_status?.includes('HEALTHY') ? 'excellent' : 
                    health.overall_status?.includes('DEGRADED') ? 'good' : 'fair'
      });

      // Load market data
      const marketPromises = marketIndices.map(async (index) => {
        try {
          const data = await realTimeDataFetcher.fetchStockData(index.symbol, '1mo');
          if (data && data.currentPrice && data.returns && data.returns.length > 0) {
            const latestReturn = data.returns[data.returns.length - 1]?.return || 0;
            return {
              symbol: index.symbol,
              price: data.currentPrice,
              change: latestReturn * data.currentPrice,
              changePercent: latestReturn * 100,
              volume: 0
            };
          }
          return null;
        } catch (error: any) {
          console.warn(`Failed to fetch ${index.symbol}:`, error.message);
          return null;
        }
      });

      const marketResults = await Promise.all(marketPromises);
      const validMarketData = marketResults.filter(Boolean) as MarketData[];
      setMarketData(validMarketData);

      console.log(`✅ Loaded ${validMarketData.length} market indices`);
      
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeaturePress = (route: string, title: string) => {
    setActiveFeature(title);
    
    // Brief animation before navigation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveFeature(null);
      router.push(route);
    });
  };

  const getMarketStatusColor = (change: number): string => {
    if (change > 1) return '#27ae60';
    if (change > 0) return '#2ecc71';
    if (change > -1) return '#f39c12';
    return '#e74c3c';
  };

  const getSystemStatusColor = (performance: string): string => {
    switch (performance) {
      case 'excellent': return '#27ae60';
      case 'good': return '#2ecc71';
      case 'fair': return '#f39c12';
      default: return '#e74c3c';
    }
  };

  const renderMenuItem = (item: typeof menuItems[0], index: number) => (
    <Animated.View
      key={index}
      style={[
        styles.menuItemContainer,
        {
          opacity: fadeAnim,
          transform: [
            { 
              translateY: slideAnim.interpolate({
                inputRange: [0, 50],
                outputRange: [0, 50 + index * 20],
              })
            },
            { scale: activeFeature === item.title ? 0.95 : 1 }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => handleFeaturePress(item.route, item.title)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={item.gradient as [string, string]}
          style={styles.menuItemGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Icon Container */}
          <Animated.View 
            style={[
              styles.iconContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <View style={styles.iconBackground}>
              <Ionicons name={item.icon} size={28} color="white" />
            </View>
          </Animated.View>

          {/* Content */}
          <View style={styles.menuItemContent}>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
            
            {/* Features */}
            <View style={styles.featuresContainer}>
              {item.features.map((feature, idx) => (
                <View key={idx} style={styles.featureTag}>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Arrow */}
          <Animated.View
            style={[
              styles.arrowContainer,
              {
                transform: [{
                  translateX: pulseAnim.interpolate({
                    inputRange: [1, 1.05],
                    outputRange: [0, 5],
                  })
                }]
              }
            ]}
          >
            <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.8)" />
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderMarketIndex = (data: MarketData, index: number) => {
    const marketIndex = marketIndices.find(m => m.symbol === data.symbol);
    const statusColor = getMarketStatusColor(data.changePercent);
    
    return (
      <Animated.View
        key={data.symbol}
        style={[
          styles.marketCard,
          {
            opacity: fadeAnim,
            transform: [
              { 
                translateY: slideAnim.interpolate({
                  inputRange: [0, 50],
                  outputRange: [0, 30 + index * 10],
                })
              },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          style={styles.marketCardGradient}
        >
          <View style={styles.marketHeader}>
            <Text style={styles.marketIcon}>{marketIndex?.icon}</Text>
            <View style={styles.marketInfo}>
              <Text style={styles.marketName}>{marketIndex?.name}</Text>
              <Text style={styles.marketSymbol}>{data.symbol}</Text>
            </View>
          </View>
          
          <View style={styles.marketPrice}>
            <Text style={styles.priceValue}>
              {data.symbol === '^VIX' ? 
                data.price.toFixed(2) : 
                data.price.toLocaleString(undefined, { minimumFractionDigits: 2 })
              }
            </Text>
          </View>
          
          <View style={styles.marketChange}>
            <Text style={[styles.changeValue, { color: statusColor }]}>
              {data.changePercent >= 0 ? '+' : ''}{data.changePercent.toFixed(2)}%
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Beautiful Header */}
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
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
            {/* Time Display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.dateText}>
                {currentTime.toLocaleDateString([], { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>

            {/* Main Title */}
            <Animated.View
              style={[
                styles.titleContainer,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Text style={styles.mainTitle}>Financial Analytics</Text>
              <Text style={styles.mainSubtitle}>Advanced Portfolio & Risk Management</Text>
            </Animated.View>

            {/* System Status */}
            {systemStatus && (
              <Animated.View
                style={[
                  styles.statusContainer,
                  { transform: [{ scale: scaleAnim }] }
                ]}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.statusCard}
                >
                  <View style={styles.statusRow}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: getSystemStatusColor(systemStatus.performance) }
                    ]} />
                    <Text style={styles.statusText}>
                      System: {systemStatus.dataHealth.split(' ')[0]}
                    </Text>
                  </View>
                  <Text style={styles.statusDetail}>
                    {systemStatus.apis} APIs • Updated {systemStatus.lastUpdate}
                  </Text>
                </LinearGradient>
              </Animated.View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* Market Data Section */}
        {marketData.length > 0 && (
          <View style={styles.marketSection}>
            <Animated.View
              style={[
                styles.sectionHeader,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}
            >
              <Text style={styles.sectionTitle}>📈 Live Market Data</Text>
              <Text style={styles.sectionSubtitle}>Real-time financial indices</Text>
            </Animated.View>
            
            <View style={styles.marketGrid}>
              {marketData.map((data, index) => renderMarketIndex(data, index))}
            </View>
          </View>
        )}

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Animated.View
            style={[
              styles.sectionHeader,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <Text style={styles.sectionTitle}>🚀 Analytics Suite</Text>
            <Text style={styles.sectionSubtitle}>Professional financial analysis tools</Text>
          </Animated.View>

          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => renderMenuItem(item, index))}
          </View>
        </View>

        {/* Quick Stats Section */}
        <Animated.View
          style={[
            styles.statsSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            style={styles.statsContainer}
          >
            <Text style={styles.statsTitle}>🎯 Capabilities</Text>
            <View style={styles.statsGrid}>
              <Animated.View style={[styles.statItem, { transform: [{ scale: scaleAnim }] }]}>
                <Animated.View style={{
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }}>
                  <Text style={styles.statIcon}>⚡</Text>
                </Animated.View>
                <Text style={styles.statNumber}>5+</Text>
                <Text style={styles.statLabel}>VaR Methods</Text>
              </Animated.View>
              
              <Animated.View style={[styles.statItem, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.statIcon}>🎯</Text>
                <Text style={styles.statNumber}>6</Text>
                <Text style={styles.statLabel}>Optimization Types</Text>
              </Animated.View>
              
              <Animated.View style={[styles.statItem, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.statIcon}>📊</Text>
                <Text style={styles.statNumber}>∞</Text>
                <Text style={styles.statLabel}>Asset Classes</Text>
              </Animated.View>
              
              <Animated.View style={[styles.statItem, { transform: [{ scale: scaleAnim }] }]}>
                <Text style={styles.statIcon}>🔬</Text>
                <Text style={styles.statNumber}>Real-time</Text>
                <Text style={styles.statLabel}>Market Data</Text>
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          style={[
            styles.footer,
            { opacity: fadeAnim }
          ]}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.05)']}
            style={styles.footerGradient}
          >
            <Text style={styles.footerText}>SALHI Reda</Text>
            <Text style={styles.footerSubtext}>Financial Engineering Research</Text>
            <Text style={styles.footerSubtext}>Centrale Méditerranée • 2025</Text>
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-UltraLight' : 'sans-serif-thin',
  },
  dateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  mainSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '300',
  },
  statusContainer: {
    width: '100%',
  },
  statusCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusDetail: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  marketSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  marketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  marketCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marketCardGradient: {
    padding: 16,
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  marketIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  marketInfo: {
    flex: 1,
  },
  marketName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  marketSymbol: {
    fontSize: 12,
    color: '#666',
  },
  marketPrice: {
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  marketChange: {},
  changeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  menuContainer: {
    gap: 16,
  },
  menuItemContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuItem: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    minHeight: 140,
  },
  iconContainer: {
    marginRight: 20,
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  menuItemContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 8,
  },
  menuDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 12,
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  featureTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  arrowContainer: {
    marginLeft: 16,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 30,
  },
  statsContainer: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
    marginBottom: 16,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  footer: {
    marginTop: 40,
    marginBottom: 20,
  },
  footerGradient: {
    padding: 24,
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 20,
  },
  footerText: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '700',
  },
  footerSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
});
