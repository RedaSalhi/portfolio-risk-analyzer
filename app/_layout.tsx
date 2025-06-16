// app/_layout.tsx
// Layout principal pour Expo Router avec navigation par onglets moderne

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import {
  Animated,
  Platform,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { AppError, ErrorBoundary, errorManager, ErrorSeverity, ErrorType } from '../src/utils/errorManagement';

// Define types for tab configuration
interface TabConfig {
  name: string;
  title: string;
  iconName: string;
  iconNameFocused: string;
  color: string;
  gradientColors: string[];
}

// Define types for tab icon props
interface TabIconProps {
  name: string;
  color: string;
  size: number;
  focused: boolean;
}

// Define types for tab label props
interface TabLabelProps {
  label: string;
  color: string;
  focused: boolean;
}

// Composant d'icône d'onglet animé
const AnimatedTabIcon = ({ 
  name, 
  color, 
  size, 
  focused 
}: TabIconProps): ReactElement => {
  const scaleAnim = React.useRef(new Animated.Value(focused ? 1.1 : 1)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    // Animation d'échelle au focus
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.2 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

    // Animation de pulsation pour l'onglet actif
    if (focused) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]);
      Animated.loop(pulse).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [focused]);

  return (
    <Animated.View
      style={[
        styles.iconContainer,
        {
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim }
          ]
        }
      ]}
    >
      {focused && (
        <LinearGradient
          colors={[color + '40', color + '20']}
          style={styles.iconBackground}
        />
      )}
      <Ionicons 
        name={name as any} 
        size={size} 
        color={focused ? '#ffffff' : color}
        style={styles.icon}
      />
    </Animated.View>
  );
};

// Composant de label d'onglet animé
const AnimatedTabLabel = ({ 
  label, 
  color, 
  focused 
}: TabLabelProps): ReactElement => {
  const fadeAnim = React.useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  const slideAnim = React.useRef(new Animated.Value(focused ? 0 : 3)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: focused ? 0 : 2,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.Text
      style={[
        styles.tabLabel,
        {
          color: focused ? color : '#8e8e93',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          fontWeight: focused ? '700' : '500',
        }
      ]}
    >
      {label}
    </Animated.Text>
  );
};

// Composant d'erreur personnalisé pour le layout
function LayoutErrorFallback(error: AppError, retry: () => void): ReactNode {
  return (
    <View style={styles.errorContainer}>
      <LinearGradient
        colors={['#ff6b6b', '#ee5a24']}
        style={styles.errorGradient}
      >
        <Ionicons name="warning" size={64} color="#ffffff" />
        <Text style={styles.errorTitle}>Erreur de Navigation</Text>
        <Text style={styles.errorMessage}>
          {error.userMessage || 'Un problème est survenu avec la navigation. L\'application va redémarrer.'}
        </Text>
        <View style={styles.errorButton}>
          <Text style={styles.errorButtonText} onPress={retry}>
            Redémarrer
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// Configuration des onglets avec leurs propriétés
const tabsConfig = [
  {
    name: 'index',
    title: 'Accueil',
    iconName: 'home',
    iconNameFocused: 'home',
    color: '#667eea',
    gradientColors: ['#667eea', '#764ba2'],
  },
  {
    name: 'portfolio',
    title: 'Portefeuille',
    iconName: 'pie-chart-outline',
    iconNameFocused: 'pie-chart',
    color: '#f093fb',
    gradientColors: ['#f093fb', '#f5576c'],
  },
  {
    name: 'var',
    title: 'Analyse VaR',
    iconName: 'analytics-outline',
    iconNameFocused: 'analytics',
    color: '#4facfe',
    gradientColors: ['#4facfe', '#00f2fe'],
  },
  {
    name: 'about',
    title: 'À propos',
    iconName: 'person-outline',
    iconNameFocused: 'person',
    color: '#43e97b',
    gradientColors: ['#43e97b', '#38f9d7'],
  },
];

// Layout principal avec navigation par onglets
export default function RootLayout() {
  React.useEffect(() => {
    // Initialisation du layout
    console.log('🚀 Initializing Expo Router Layout');
    
    // Gestion des erreurs globales
    const handleError = (error: Error, isFatal?: boolean) => {
      console.error('Layout Error:', error);
      errorManager.createError(
        ErrorType.RENDER,
        error.message || 'Layout error',
        'Erreur dans la navigation de l\'application',
        isFatal ? ErrorSeverity.CRITICAL : ErrorSeverity.HIGH,
        { error: error.toString(), isFatal },
        !isFatal
      );
    };

    // Configuration de la barre de statut
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#667eea', true);
      RNStatusBar.setBarStyle('light-content', true);
    }

    return () => {
      console.log('🧹 Cleaning up layout');
    };
  }, []);

  return (
    <ErrorBoundary
      fallback={LayoutErrorFallback}
      onError={(error: AppError) => {
        console.error('Root Layout Error Boundary:', error);
      }}
    >
      <StatusBar style="light" backgroundColor="#667eea" />
      <Tabs
        screenOptions={({ route }: { route: { name: string } }) => {
          const tabConfig = tabsConfig.find(tab => tab.name === route.name);
          
          return {
            headerShown: false,
            tabBarActiveTintColor: tabConfig?.color || '#667eea',
            tabBarInactiveTintColor: '#8e8e93',
            tabBarStyle: {
              ...styles.tabBar,
              backgroundColor: '#ffffff',
              borderTopWidth: 0,
              elevation: 20,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            },
            tabBarItemStyle: {
              paddingVertical: 8,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
            },
            tabBarIcon: ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
              if (!tabConfig) return null;
              
              const iconName = focused 
                ? tabConfig.iconNameFocused 
                : tabConfig.iconName;

              return (
                <AnimatedTabIcon
                  name={iconName}
                  color={tabConfig.color}
                  size={size}
                  focused={focused}
                />
              );
            },
            tabBarLabel: ({ focused, color }: { focused: boolean; color: string }) => {
              if (!tabConfig) return null;
              
              return (
                <AnimatedTabLabel
                  label={tabConfig.title}
                  color={tabConfig.color}
                  focused={focused}
                />
              );
            },
            tabBarHideOnKeyboard: Platform.OS === 'android',
            tabBarAllowFontScaling: false,
          };
        }}
      >
        {tabsConfig.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: tab.name === 'index' ? '/' : `/${tab.name}`,
            }}
          />
        ))}
      </Tabs>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: 'absolute',
    marginHorizontal: 0,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  iconBackground: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  icon: {
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
