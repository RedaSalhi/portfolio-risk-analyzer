// app/about.tsx - BEAUTIFUL RESEARCH & ABOUT SCREEN
// Enhanced with stunning animations, interactive elements, and modern academic design

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import React, { useRef, useEffect, useState } from 'react';
import {
    Linking,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Reference {
  title: string;
  author: string;
  journal: string;
  year: string;
  doi?: string;
  url?: string;
  importance: 'high' | 'medium' | 'low';
}

interface Concept {
  name: string;
  description: string;
  icon: string;
  color: string;
  applications: string[];
}

interface Tool {
  name: string;
  category: 'framework' | 'library' | 'api' | 'language';
  description: string;
  icon: string;
  color: string;
}

export default function BeautifulAboutScreen() {
  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const parallaxAnim = useRef(new Animated.Value(0)).current;

  // State
  const [activeSection, setActiveSection] = useState<string | null>('concepts');
  const [expandedReference, setExpandedReference] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  const references: Reference[] = [
    {
      title: "Portfolio Selection",
      author: "Markowitz, H.",
      journal: "Journal of Finance",
      year: "1952",
      importance: 'high',
      doi: "10.1111/j.1540-6261.1952.tb01525.x",
      url: "https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1540-6261.1952.tb01525.x"
    },
    {
      title: "Capital Asset Prices: A Theory of Market Equilibrium",
      author: "Sharpe, W. F.",
      journal: "Journal of Finance",
      year: "1964",
      importance: 'high',
      doi: "10.1111/j.1540-6261.1964.tb02865.x",
      url: "https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1540-6261.1964.tb02865.x"
    },
    {
      title: "Value at Risk: The New Benchmark for Managing Financial Risk",
      author: "Jorion, P.",
      journal: "McGraw-Hill",
      year: "2006",
      importance: 'high',
      url: "https://www.mheducation.com/highered/product/value-risk-jorion/M9780071464956.html"
    },
    {
      title: "Risk Management and Financial Institutions",
      author: "Hull, J. C.",
      journal: "Wiley Finance",
      year: "2018",
      importance: 'medium',
      url: "https://www.wiley.com/en-us/Risk+Management+and+Financial+Institutions%2C+5th+Edition-p-9781119448112"
    },
    {
      title: "Coherent Measures of Risk",
      author: "Artzner, P., Delbaen, F., Eber, J. M., Heath, D.",
      journal: "Mathematical Finance",
      year: "1999",
      importance: 'medium',
      doi: "10.1111/1467-9965.00068"
    }
  ];

  const concepts: Concept[] = [
    {
      name: "Modern Portfolio Theory",
      description: "Mathematical framework for assembling portfolios to maximize expected return for a given level of risk",
      icon: "📊",
      color: "#3498db",
      applications: ["Portfolio Optimization", "Risk-Return Analysis", "Efficient Frontier"]
    },
    {
      name: "Value-at-Risk (VaR)",
      description: "Statistical measure quantifying the potential loss in value of a portfolio over a defined period",
      icon: "⚠️",
      color: "#e74c3c",
      applications: ["Risk Management", "Regulatory Capital", "Stress Testing"]
    },
    {
      name: "Capital Asset Pricing Model",
      description: "Model describing the relationship between systematic risk and expected return for assets",
      icon: "📈",
      color: "#27ae60",
      applications: ["Asset Pricing", "Beta Estimation", "Cost of Capital"]
    },
    {
      name: "Monte Carlo Simulation",
      description: "Computational algorithm using repeated random sampling to obtain numerical results",
      icon: "🎲",
      color: "#9b59b6",
      applications: ["Risk Simulation", "Option Pricing", "Stress Testing"]
    },
    {
      name: "Risk Parity",
      description: "Portfolio allocation strategy based on equal risk contribution from each asset",
      icon: "⚖️",
      color: "#f39c12",
      applications: ["Alternative Beta", "Risk Budgeting", "Diversification"]
    },
    {
      name: "Backtesting",
      description: "Technique for evaluating risk models by testing on historical data",
      icon: "🔍",
      color: "#34495e",
      applications: ["Model Validation", "Kupiec Testing", "Performance Analysis"]
    }
  ];

  const tools: Tool[] = [
    {
      name: "React Native",
      category: "framework",
      description: "Cross-platform mobile development framework",
      icon: "📱",
      color: "#61dafb"
    },
    {
      name: "TypeScript",
      category: "language",
      description: "Typed superset of JavaScript for better development",
      icon: "🔷",
      color: "#3178c6"
    },
    {
      name: "Expo",
      category: "framework",
      description: "Platform for universal React applications",
      icon: "⚡",
      color: "#000020"
    },
    {
      name: "Victory Native",
      category: "library",
      description: "Modular charting library for React Native",
      icon: "📊",
      color: "#c43a31"
    },
    {
      name: "Yahoo Finance API",
      category: "api",
      description: "Real-time financial market data",
      icon: "💹",
      color: "#410093"
    },
    {
      name: "MathJS",
      category: "library",
      description: "Extensive math library for JavaScript",
      icon: "🧮",
      color: "#ff6b35"
    }
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
  }, []);

  const handleScroll = (event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    setScrollY(currentScrollY);
    
    parallaxAnim.setValue(currentScrollY * 0.5);
  };

  const openURL = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const openEmail = () => {
    Linking.openURL('mailto:salhi.reda47@gmail.com?subject=Financial Analytics App');
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const toggleReference = (referenceTitle: string) => {
    setExpandedReference(expandedReference === referenceTitle ? null : referenceTitle);
  };

  const renderProfileHeader = () => (
    <Animated.View
      style={[
        styles.profileSection,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { translateY: parallaxAnim }
          ]
        }
      ]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileGradient}
      >
        <View style={styles.profileContainer}>
          {/* Animated Avatar */}
          <Animated.View 
            style={[
              styles.avatar,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>RS</Text>
            </LinearGradient>
          </Animated.View>

          {/* Profile Info */}
          <Text style={styles.name}>SALHI Reda</Text>
          <Text style={styles.title}>Financial Engineering Student</Text>
          <Text style={styles.subtitle}>École Centrale Méditerranée</Text>
          <Text style={styles.subtitle}>Quantitative Researcher & Developer</Text>

          {/* Rotating Badge */}
          <Animated.View
            style={[
              styles.badge,
              {
                transform: [{
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })
                }]
              }
            ]}
          >
            <Text style={styles.badgeText}>🎓</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderContactSection = () => (
    <Animated.View
      style={[
        styles.section,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.sectionGradient}
      >
        <Text style={styles.sectionTitle}>📬 Contact & Links</Text>
        
        <View style={styles.contactGrid}>
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={openEmail}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ea4335', '#dd2c00']}
              style={styles.contactCardGradient}
            >
              <Ionicons name="mail" size={24} color="white" />
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>salhi.reda47@gmail.com</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => openURL('https://www.linkedin.com/in/reda-salhi-195297290/')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#0077b5', '#005885']}
              style={styles.contactCardGradient}
            >
              <Ionicons name="logo-linkedin" size={24} color="white" />
              <Text style={styles.contactLabel}>LinkedIn</Text>
              <Text style={styles.contactValue}>Professional Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => openURL('https://github.com/RedaSalhi')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#333', '#24292e']}
              style={styles.contactCardGradient}
            >
              <Ionicons name="logo-github" size={24} color="white" />
              <Text style={styles.contactLabel}>GitHub</Text>
              <Text style={styles.contactValue}>Code Repository</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactCard}
            onPress={() => openURL('https://centrale-med.fr')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.contactCardGradient}
            >
              <Ionicons name="school" size={24} color="white" />
              <Text style={styles.contactLabel}>Institution</Text>
              <Text style={styles.contactValue}>Centrale Méditerranée</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderConceptsSection = () => (
    <Animated.View
      style={[
        styles.section,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('concepts')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={activeSection === 'concepts' ? ['#667eea', '#764ba2'] : ['#f8f9fa', '#ffffff']}
          style={styles.sectionHeaderGradient}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={[
              styles.sectionHeaderTitle,
              activeSection === 'concepts' && { color: '#ffffff' }
            ]}>
              🧠 Financial Concepts
            </Text>
            <Ionicons
              name={activeSection === 'concepts' ? "chevron-up" : "chevron-down"}
              size={24}
              color={activeSection === 'concepts' ? "#ffffff" : "#667eea"}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {activeSection === 'concepts' && (
        <Animated.View style={styles.sectionContent}>
          <View style={styles.conceptsGrid}>
            {concepts.map((concept, index) => (
              <Animated.View
                key={concept.name}
                style={[
                  styles.conceptCard,
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, 20 + index * 10],
                      })
                    }]
                  }
                ]}
              >
                <LinearGradient
                  colors={[concept.color + '20', concept.color + '10']}
                  style={styles.conceptCardGradient}
                >
                  <View style={styles.conceptHeader}>
                    <Text style={styles.conceptIcon}>{concept.icon}</Text>
                    <Text style={[styles.conceptTitle, { color: concept.color }]}>
                      {concept.name}
                    </Text>
                  </View>
                  
                  <Text style={styles.conceptDescription}>
                    {concept.description}
                  </Text>
                  
                  <View style={styles.applicationsContainer}>
                    <Text style={styles.applicationsTitle}>Applications:</Text>
                    {concept.applications.map((app, idx) => (
                      <View key={idx} style={[styles.applicationTag, { borderColor: concept.color }]}>
                        <Text style={[styles.applicationText, { color: concept.color }]}>
                          {app}
                        </Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderToolsSection = () => (
    <Animated.View
      style={[
        styles.section,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('tools')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={activeSection === 'tools' ? ['#f093fb', '#f5576c'] : ['#f8f9fa', '#ffffff']}
          style={styles.sectionHeaderGradient}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={[
              styles.sectionHeaderTitle,
              activeSection === 'tools' && { color: '#ffffff' }
            ]}>
              🛠️ Technology Stack
            </Text>
            <Ionicons
              name={activeSection === 'tools' ? "chevron-up" : "chevron-down"}
              size={24}
              color={activeSection === 'tools' ? "#ffffff" : "#f093fb"}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {activeSection === 'tools' && (
        <Animated.View style={styles.sectionContent}>
          <View style={styles.toolsGrid}>
            {tools.map((tool, index) => (
              <Animated.View
                key={tool.name}
                style={[
                  styles.toolCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.toolCardGradient}
                >
                  <View style={[styles.toolIconContainer, { backgroundColor: tool.color + '20' }]}>
                    <Text style={styles.toolIcon}>{tool.icon}</Text>
                  </View>
                  
                  <Text style={styles.toolName}>{tool.name}</Text>
                  <Text style={[styles.toolCategory, { color: tool.color }]}>
                    {tool.category.toUpperCase()}
                  </Text>
                  <Text style={styles.toolDescription}>{tool.description}</Text>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderReferencesSection = () => (
    <Animated.View
      style={[
        styles.section,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('references')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={activeSection === 'references' ? ['#4facfe', '#00f2fe'] : ['#f8f9fa', '#ffffff']}
          style={styles.sectionHeaderGradient}
        >
          <View style={styles.sectionHeaderContent}>
            <Text style={[
              styles.sectionHeaderTitle,
              activeSection === 'references' && { color: '#ffffff' }
            ]}>
              📚 Academic References
            </Text>
            <Ionicons
              name={activeSection === 'references' ? "chevron-up" : "chevron-down"}
              size={24}
              color={activeSection === 'references' ? "#ffffff" : "#4facfe"}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {activeSection === 'references' && (
        <Animated.View style={styles.sectionContent}>
          {references.map((ref, index) => (
            <TouchableOpacity
              key={ref.title}
              style={styles.referenceCard}
              onPress={() => toggleReference(ref.title)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.referenceCardGradient}
              >
                <View style={styles.referenceHeader}>
                  <View style={styles.referenceImportance}>
                    <View style={[
                      styles.importanceBadge,
                      { 
                        backgroundColor: ref.importance === 'high' ? '#e74c3c' : 
                                        ref.importance === 'medium' ? '#f39c12' : '#95a5a6'
                      }
                    ]}>
                      <Text style={styles.importanceText}>
                        {ref.importance.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  
                  <Ionicons
                    name={expandedReference === ref.title ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#666"
                  />
                </View>
                
                <Text style={styles.referenceTitle}>{ref.title}</Text>
                <Text style={styles.referenceAuthor}>{ref.author} ({ref.year})</Text>
                <Text style={styles.referenceJournal}>{ref.journal}</Text>
                
                {expandedReference === ref.title && (
                  <Animated.View style={styles.referenceExpanded}>
                    {ref.doi && (
                      <TouchableOpacity
                        style={styles.referenceButton}
                        onPress={() => openURL(`https://doi.org/${ref.doi}`)}
                      >
                        <Text style={styles.referenceButtonText}>View DOI</Text>
                      </TouchableOpacity>
                    )}
                    {ref.url && (
                      <TouchableOpacity
                        style={styles.referenceButton}
                        onPress={() => openURL(ref.url)}
                      >
                        <Text style={styles.referenceButtonText}>Read Online</Text>
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderDataSourcesSection = () => (
    <Animated.View
      style={[
        styles.section,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.sectionGradient}
      >
        <Text style={styles.sectionTitle}>🔗 Data Sources</Text>
        
        <View style={styles.dataSourcesGrid}>
          <View style={styles.dataSourceCard}>
            <LinearGradient
              colors={['#410093', '#5a4fcf']}
              style={styles.dataSourceGradient}
            >
              <Ionicons name="trending-up" size={32} color="white" />
              <Text style={styles.dataSourceTitle}>Yahoo Finance API</Text>
              <Text style={styles.dataSourceDescription}>
                Real-time equity & ETF price data with historical returns
              </Text>
            </LinearGradient>
          </View>
          
          <View style={styles.dataSourceCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.dataSourceGradient}
            >
              <Ionicons name="bar-chart" size={32} color="white" />
              <Text style={styles.dataSourceTitle}>FRED Economic Data</Text>
              <Text style={styles.dataSourceDescription}>
                Federal Reserve economic indicators & risk-free rates
              </Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {renderProfileHeader()}
        {renderContactSection()}
        {renderConceptsSection()}
        {renderToolsSection()}
        {renderReferencesSection()}
        {renderDataSourcesSection()}
        
        {/* Enhanced Footer */}
        <Animated.View
          style={[
            styles.footer,
            { opacity: fadeAnim }
          ]}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.footerGradient}
          >
            <Animated.View
              style={[
                styles.footerContent,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Text style={styles.footerText}>© 2025 SALHI Reda</Text>
              <Text style={styles.footerSubtext}>Financial Engineering Research</Text>
              <Text style={styles.footerSubtext}>École Centrale Méditerranée</Text>
              
              <View style={styles.footerBadges}>
                <View style={styles.footerBadge}>
                  <Text style={styles.footerBadgeText}>React Native</Text>
                </View>
                <View style={styles.footerBadge}>
                  <Text style={styles.footerBadgeText}>TypeScript</Text>
                </View>
                <View style={styles.footerBadge}>
                  <Text style={styles.footerBadgeText}>Financial Mathematics</Text>
                </View>
              </View>
            </Animated.View>
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
  profileSection: {
    marginBottom: 20,
  },
  profileGradient: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  profileContainer: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#667eea',
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 2,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 30,
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionGradient: {
    padding: 20,
  },
  sectionHeader: {
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeaderGradient: {
    padding: 20,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionContent: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  contactCard: {
    width: (width - 64) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactCardGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 16,
  },
  conceptsGrid: {
    gap: 16,
  },
  conceptCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  conceptCardGradient: {
    padding: 20,
  },
  conceptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  conceptIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  conceptTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  conceptDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  applicationsContainer: {
    gap: 8,
  },
  applicationsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  applicationTag: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  applicationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    width: (width - 64) / 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toolCardGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 140,
  },
  toolIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolIcon: {
    fontSize: 24,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  toolCategory: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  toolDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  referenceCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  referenceCardGradient: {
    padding: 16,
  },
  referenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  referenceImportance: {},
  importanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  importanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  referenceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  referenceAuthor: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 2,
  },
  referenceJournal: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  referenceExpanded: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  referenceButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  referenceButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  dataSourcesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dataSourceCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dataSourceGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  dataSourceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  dataSourceDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    marginTop: 30,
    overflow: 'hidden',
  },
  footerGradient: {
    padding: 30,
    alignItems: 'center',
  },
  footerContent: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
    textAlign: 'center',
  },
  footerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  footerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  footerBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
});
