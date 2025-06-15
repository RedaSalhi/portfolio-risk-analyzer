// app/_layout.tsx - ENHANCED WITH BEAUTIFUL DESIGN & ANIMATIONS
// Modern tab layout with gradients, animations, and improved UX
// Polyfills for web compatibility
import '../src/polyfills';

import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useEffect } from 'react';
import { Animated, Platform, View, Text, StyleSheet } from 'react-native';

// Custom Tab Bar Icon Component with animations
const AnimatedTabIcon = ({ 
  name, 
  color, 
  size, 
  focused 
}: { 
  name: string; 
  color: string; 
  size: number; 
  focused: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Scale animation when focused
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.1 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();

    // Pulse animation for active tab
    if (focused) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
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
        <View style={[styles.iconBackground, { backgroundColor: color + '20' }]} />
      )}
      <Ionicons 
        name={name as any} 
        size={size} 
        color={color}
        style={styles.icon}
      />
    </Animated.View>
  );
};

// Custom Tab Bar Label with animations
const AnimatedTabLabel = ({ 
  label, 
  color, 
  focused 
}: { 
  label: string; 
  color: string; 
  focused: boolean; 
}) => {
  const fadeAnim = useRef(new Animated.Value(focused ? 1 : 0.7)).current;
  const slideAnim = useRef(new Animated.Value(focused ? 0 : 5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: focused ? 0 : 3,
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
          color,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          fontWeight: focused ? '700' : '500',
        },
      ]}
    >
      {label}
    </Animated.Text>
  );
};

export default function EnhancedTabLayout() {
  const tabBarBackground = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Subtle breathing animation for the tab bar
    const breathe = Animated.sequence([
      Animated.timing(tabBarBackground, {
        toValue: 0.98,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.timing(tabBarBackground, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      }),
    ]);
    Animated.loop(breathe).start();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1f4e79',
        tabBarInactiveTintColor: '#8e8e93',
        headerShown: false, // We'll use custom headers in each screen
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          paddingTop: 10,
        },
        tabBarBackground: () => (
          <Animated.View
            style={[
              styles.tabBarBackground,
              {
                transform: [{ scale: tabBarBackground }]
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(248,249,250,0.98)']}
              style={styles.tabBarGradient}
            />
            <View style={styles.tabBarBorder} />
          </Animated.View>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel
              label="Home"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name={focused ? "pie-chart" : "pie-chart-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel
              label="Portfolio"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="var"
        options={{
          title: 'Risk Analysis',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name={focused ? "analytics" : "analytics-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel
              label="VaR Analysis"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'Research',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon
              name={focused ? "library" : "library-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
          tabBarLabel: ({ color, focused }) => (
            <AnimatedTabLabel
              label="Research"
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tabBarGradient: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tabBarBorder: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  iconBackground: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    top: 2,
    left: 2,
  },
  icon: {
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
});
