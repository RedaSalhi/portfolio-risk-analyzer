import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import {
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function AboutScreen() {
  const references = [
    {
      title: "Portfolio Selection",
      author: "Markowitz, H. (1952)",
      journal: "Journal of Finance, 7(1), 77–91",
    },
    {
      title: "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk",
      author: "Sharpe, W. F. (1964)",
      journal: "Journal of Finance, 19(3), 425–442",
    }
  ];

  const concepts = [
    "Modern Portfolio Theory (MPT)",
    "Value-at-Risk (VaR): Parametric, Monte Carlo, and Fixed-Income (PV01)",
    "Capital Asset Pricing Model (CAPM)",
    "Risk budgeting and efficient frontier analysis",
    "Correlation analysis and exceedance backtesting"
  ];

  const tools = [
    "React Native & Expo",
    "TypeScript",
    "Financial Mathematics",
    "Statistical Analysis",
    "Yahoo Finance API",
    "FRED Economic Data"
  ];

  const openURL = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const openEmail = () => {
    Linking.openURL('mailto:salhi.reda47@gmail.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Profile Section */}
        <View style={styles.headerSection}>
          <View style={styles.profileContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>RS</Text>
            </View>
            <Text style={styles.name}>SALHI Reda</Text>
            <Text style={styles.title}>Financial Engineering Student</Text>
            <Text style={styles.subtitle}>Centrale Méditerranée • Quant Researcher</Text>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <Text style={styles.aboutText}>
            Engineering student passionate about mathematics, financial markets, and economic research. 
            I develop quantitative tools for portfolio optimization and risk management.
          </Text>
          <Text style={styles.aboutText}>
            I also enjoy international backpacking across Europe: France, Germany, Switzerland, 
            Czech Republic, Spain, Malta, Portugal, United Kingdom, and more.
          </Text>
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Links</Text>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={openEmail}
          >
            <Ionicons name="mail" size={20} color="#4B8BBE" />
            <Text style={styles.contactText}>salhi.reda47@gmail.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openURL('https://www.linkedin.com/in/reda-salhi-195297290/')}
          >
            <Ionicons name="logo-linkedin" size={20} color="#4B8BBE" />
            <Text style={styles.contactText}>LinkedIn Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openURL('https://github.com/RedaSalhi')}
          >
            <Ionicons name="logo-github" size={20} color="#4B8BBE" />
            <Text style={styles.contactText}>GitHub Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Concepts Covered */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Concepts Covered</Text>
          {concepts.map((concept, index) => (
            <View key={index} style={styles.conceptItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4B8BBE" />
              <Text style={styles.conceptText}>{concept}</Text>
            </View>
          ))}
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

        {/* Data Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sources</Text>
          <View style={styles.dataSourceItem}>
            <Ionicons name="trending-up" size={16} color="#4B8BBE" />
            <View style={styles.dataSourceInfo}>
              <Text style={styles.dataSourceTitle}>Yahoo Finance API</Text>
              <Text style={styles.dataSourceDescription}>Equity & ETF price data</Text>
            </View>
          </View>
          <View style={styles.dataSourceItem}>
            <Ionicons name="bar-chart" size={16} color="#4B8BBE" />
            <View style={styles.dataSourceInfo}>
              <Text style={styles.dataSourceTitle}>FRED Economic Data</Text>
              <Text style={styles.dataSourceDescription}>Federal Reserve bond yields & rates</Text>
            </View>
          </View>
        </View>

        {/* Tools & Libraries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Built With</Text>
          <View style={styles.toolsGrid}>
            {tools.map((tool, index) => (
              <View key={index} style={styles.toolChip}>
                <Text style={styles.toolText}>{tool}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Research Paper Download */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📄 Research Document</Text>
          <Text style={styles.paperDescription}>
            Complete breakdown of VaR estimation methods, empirical analysis, 
            and backtesting results for equity, fixed income, and diversified portfolios.
          </Text>
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={() => {
              // In a real app, this would download or open the PDF
              alert('PDF download functionality would be implemented here with expo-document-picker or similar');
            }}
          >
            <Ionicons name="download" size={20} color="white" />
            <Text style={styles.downloadButtonText}>Download Value_at_Risk.pdf</Text>
          </TouchableOpacity>
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
  aboutText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  conceptItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conceptText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  referenceItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  referenceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
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
  dataSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataSourceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  dataSourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dataSourceDescription: {
    fontSize: 12,
    color: '#666',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolChip: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  toolText: {
    fontSize: 12,
    color: '#4B8BBE',
    fontWeight: '500',
  },
  paperDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 16,
  },
  downloadButton: {
    backgroundColor: '#4B8BBE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  downloadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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