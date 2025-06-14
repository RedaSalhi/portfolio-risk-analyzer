import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

// Import screens (we'll create these next)
import AboutScreen from './src/screens/AboutScreen';
import HomeScreen from './src/screens/HomeScreen';
import PortfolioOptimizerScreen from './src/screens/PortfolioOptimizerScreen';
import VaRAnalysisScreen from './src/screens/VaRAnalysisScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Portfolio') {
              iconName = focused ? 'pie-chart' : 'pie-chart-outline';
            } else if (route.name === 'VaR') {
              iconName = focused ? 'analytics' : 'analytics-outline';
            } else if (route.name === 'About') {
              iconName = focused ? 'person' : 'person-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#1f4e79',
          tabBarInactiveTintColor: 'gray',
          headerStyle: { backgroundColor: '#1f4e79' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'MPT & VaR' }} />
        <Tab.Screen name="Portfolio" component={PortfolioOptimizerScreen} options={{ title: 'Optimizer' }} />
        <Tab.Screen name="VaR" component={VaRAnalysisScreen} options={{ title: 'Risk Analysis' }} />
        <Tab.Screen name="About" component={AboutScreen} options={{ title: 'About Me' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}