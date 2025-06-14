// src/screens/AboutScreen.js
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function AboutScreen() {
  const openURL = async (url) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const socialLinks = [
    {
      platform: 'LinkedIn',
      icon: 'logo-linkedin',
      url: 'https://www.linkedin.com/in/reda-salhi-195297290/',
      color: '#0077B5',
    },
    {
      platform: 'GitHub',
      icon: 'logo-github',
      url: 'https://github.com/RedaSalhi',
      color: '#333',
    },
    {
      platform: 'Email',
      icon: 'mail',
      url: 'mailto:salhi.reda47@gmail.com',
      color: '#EA4335',
    },
  ];

  const references = [
    {
      title: 'Modern Portfolio Theory',
      author: 'Markowitz, H. (1952)',
      journal: 'Journal of Finance, 7(1), 77–91',
    },
    {
      title: 'Capital Asset Pricing Model',
      author: 'Sharpe, W. F. (1964)',
      journal: 'Journal of Finance, 19(3), 425–442',
    },
    {
      title: 'Value at Risk: The New Benchmark',
      author: 'Jorion, P. (2006)',
      journal: 'McGraw-Hill Professional',
    },
  ];

  const features = [
    'Modern Portfolio Theory (MPT)',
    'Value-at-Risk (VaR): Parametric, Monte Carlo, Fixed-Income',
    'Capital Asset Pricing Model (CAPM)',
    'Risk budgeting & efficient frontier',
    'Correlation analysis',
    'Exceedance backtesting',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.profileContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>RS</Text>
            </View>
            <Text style={styles.name}>SALHI Reda</Text>
            <Text style={styles.title}>Financial Engineering Student</Text>
            <Text style={styles.subtitle}>Quant Researcher | Centrale Méditerranée</Text>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>
            Engineering student at Centrale Méditerranée with a passion for mathematics, 
            financial markets, and economic research. I enjoy developing quantitative models 
            and exploring the intersection of technology and finance.
          </Text>
          <Text style={styles.bioText}>
            When not working on financial models, I love international backpacking across 
            Europe including France, Germany, Switzerland, Czech Republic, Spain, Malta, 
            Portugal, and the United Kingdom.
          </Text>
        </View>

        {/* App Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Features</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4B8BBE" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connect With Me</Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.socialButton, { backgroundColor: link.color }]}
                onPress={() => openURL(link.url)}
              >
                <Ionicons name={link.icon} size={24} color="white" />
                <Text style={styles.socialButtonText}>{link.platform}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Data Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sources</Text>
          <View style={styles.dataSourceItem}>
            <Ionicons name="trending-up" size={20} color="#4B8BBE" />
            <View style={styles.dataSourceText}>
              <Text style={styles.dataSourceName}>Yahoo Finance API</Text>
              <Text style={styles.dataSourceDesc}>Equity & ETF price data</Text>
            </View>
          </View>
          <View style={styles.dataSourceItem}>
            <Ionicons name="bar-chart" size={20} color="#4B8BBE" />
            <View style={styles.dataSourceText}>
              <Text style={styles.dataSourceName}>FRED (Federal Reserve)</Text>
              <Text style={styles.dataSourceDesc}>Bond yields & economic data</Text>
            </View>
          </View>
        </View>

        {/* Academic References */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key References</Text>
          {references.map((ref, index) => (
            <View key={index} style={styles.referenceItem}>
              <Text style={styles.referenceTitle}>{ref.title}</Text>
              <Text style={styles.referenceAuthor}>{ref.author}</Text>
              <Text style={styles.referenceJournal}>{ref.journal}</Text>
            </View>
          ))}
        </View>

        {/* Tools & Libraries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Built With</Text>
          <Text style={styles.toolsText}>
            React Native • Expo • JavaScript • Financial APIs • 
            Mathematical Libraries • Mobile-First Design
          </Text>
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
  headerSection: {
    backgroundColor: '#1f4e79',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4B8BBE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
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
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  socialContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  socialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dataSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataSourceText: {
    marginLeft: 12,
    flex: 1,
  },
  dataSourceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  dataSourceDesc: {
    fontSize: 12,
    color: '#666',
  },
  referenceItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  referenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  referenceAuthor: {
    fontSize: 13,
    color: '#4B8BBE',
    marginBottom: 2,
  },
  referenceJournal: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  toolsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
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