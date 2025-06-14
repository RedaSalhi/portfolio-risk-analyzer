import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { realTimeDataFetcher } from '../src/utils/realTimeDataFetcher';

export default function HomeScreen() {
  const [marketData, setMarketData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMarketData();
  }, []);

  const loadMarketData = async () => {
    try {
      // Fetch some key market indicators
      const spyData = await realTimeDataFetcher.fetchStockData('^GSPC', '1mo');
      const vixData = await realTimeDataFetcher.fetchStockData('^VIX', '1mo');
      
      setMarketData({
        spy: {
          price: spyData.currentPrice,
          change: spyData.returns[spyData.returns.length - 1]?.return || 0
        },
        vix: {
          price: vixData.currentPrice,
          change: vixData.returns[vixData.returns.length - 1]?.return || 0
        }
      });
    } catch (error) {
      console.log('Error loading market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: 'Portfolio Optimizer',
      subtitle: 'Modern Portfolio Theory & CAPM Analysis',
      icon: 'pie-chart' as const,
      gradient: ['#4B8BBE', '#306998'],
      onPress: () => router.push('/portfolio')
    },
    {
      title: 'Value-at-Risk Analysis',
      subtitle: 'Parametric, Monte Carlo & Portfolio VaR',
      icon: 'analytics' as const,
      gradient: ['#FF6B6B', '#E55656'],
      onPress: () => router.push('/var')
    },
    {
      title: 'Research & Bibliography',
      subtitle: 'Academic papers and references',
      icon: 'library' as const,
      gradient: ['#4ECDC4', '#44A08D'],
      onPress: () => router.push('/about')
    }
  ];

  const renderMenuItem = (item: typeof menuItems[0], index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItemContainer}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={item.gradient}
        style={styles.menuItem}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={32} color="white" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.mainTitle}>Modern Portfolio Theory</Text>
          <Text style={styles.subtitle}>& Value-at-Risk Analysis</Text>
          <Text style={styles.description}>
            Professional financial risk assessment and portfolio optimization tools
          </Text>
        </View>

        {/* Market Data Section */}
        {!loading && marketData && (
          <View style={styles.marketDataContainer}>
            <Text style={styles.marketDataTitle}>Live Market Data</Text>
            <View style={styles.marketDataGrid}>
              <View style={styles.marketDataItem}>
                <Text style={styles.marketDataLabel}>S&P 500</Text>
                <Text style={styles.marketDataPrice}>
                  {marketData.spy.price?.toFixed(2) || 'N/A'}
                </Text>
                <Text style={[
                  styles.marketDataChange,
                  { color: marketData.spy.change >= 0 ? '#2ECC71' : '#E74C3C' }
                ]}>
                  {marketData.spy.change >= 0 ? '+' : ''}{(marketData.spy.change * 100).toFixed(2)}%
                </Text>
              </View>
              <View style={styles.marketDataItem}>
                <Text style={styles.marketDataLabel}>VIX</Text>
                <Text style={styles.marketDataPrice}>
                  {marketData.vix.price?.toFixed(2) || 'N/A'}
                </Text>
                <Text style={[
                  styles.marketDataChange,
                  { color: marketData.vix.change >= 0 ? '#E74C3C' : '#2ECC71' }
                ]}>
                  {marketData.vix.change >= 0 ? '+' : ''}{(marketData.vix.change * 100).toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => renderMenuItem(item, index))}
        </View>

        {/* Quick Stats Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Available Models</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>4+</Text>
              <Text style={styles.statLabel}>VaR Methods</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Optimization Targets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>∞</Text>
              <Text style={styles.statLabel}>Asset Classes</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>SALHI Reda</Text>
          <Text style={styles.footerSubtext}>Financial Engineering Research</Text>
        </View>
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
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B8BBE',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  menuContainer: {
    padding: 20,
    paddingTop: 10,
  },
  menuItemContainer: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 80,
    borderRadius: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  statsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B8BBE',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  marketDataContainer: {
    margin: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  marketDataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 12,
  },
  marketDataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  marketDataItem: {
    alignItems: 'center',
  },
  marketDataLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  marketDataPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  marketDataChange: {
    fontSize: 14,
    fontWeight: '600',
  },
});