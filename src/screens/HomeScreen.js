// src/screens/HomeScreen.js
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Dimensions,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const menuItems = [
    {
      title: 'Portfolio Optimizer',
      subtitle: 'Markowitz & CAPM Analysis',
      icon: 'pie-chart',
      color: ['#4B8BBE', '#306998'],
      onPress: () => navigation.navigate('Portfolio'),
    },
    {
      title: 'Value-at-Risk',
      subtitle: 'Risk Assessment Tools',
      icon: 'analytics',
      color: ['#FF6B6B', '#EE5A52'],
      onPress: () => navigation.navigate('VaR'),
    },
    {
      title: 'Monte Carlo VaR',
      subtitle: 'Simulation-Based Risk',
      icon: 'trending-up',
      color: ['#4ECDC4', '#44A08D'],
      onPress: () => navigation.navigate('VaR'),
    },
    {
      title: 'Fixed Income VaR',
      subtitle: 'Bond Risk Analysis',
      icon: 'bar-chart',
      color: ['#45B7D1', '#096DD9'],
      onPress: () => navigation.navigate('VaR'),
    },
  ];

  const renderMenuItem = (item, index) => (
    <TouchableOpacity
      key={index}
      style={styles.menuItemContainer}
      onPress={item.onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={item.color}
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
              <Text style={styles.statNumber}>CAPM</Text>
              <Text style={styles.statLabel}>Asset Pricing</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>MPT</Text>
              <Text style={styles.statLabel}>Optimization</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 | SALHI Reda</Text>
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
    alignItems: 'center',
    marginTop: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  menuContainer: {
    padding: 20,
    paddingTop: 30,
  },
  menuItemContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
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
});