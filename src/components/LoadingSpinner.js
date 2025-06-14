// src/components/LoadingSpinner.js
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export const LoadingSpinner = ({ visible = false, message = 'Loading...', overlay = true }) => {
  if (overlay) {
    return (
      <Modal
        transparent={true}
        animationType="fade"
        visible={visible}
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#4B8BBE" />
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (!visible) return null;

  return (
    <View style={styles.inline}>
      <ActivityIndicator size="large" color="#4B8BBE" />
      <Text style={styles.inlineMessage}>{message}</Text>
    </View>
  );
};

export const CalculationLoader = ({ visible, stage = 'Calculating...', progress = 0 }) => {
  const stages = [
    'Fetching market data...',
    'Processing returns...',
    'Running optimization...',
    'Calculating metrics...',
    'Finalizing results...'
  ];

  const currentStage = stages[Math.floor(progress * stages.length)] || stage;

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.calculationContainer}>
          <Ionicons name="analytics" size={40} color="#4B8BBE" style={styles.icon} />
          <ActivityIndicator size="large" color="#4B8BBE" style={styles.spinner} />
          <Text style={styles.calculationTitle}>Financial Analysis</Text>
          <Text style={styles.calculationStage}>{currentStage}</Text>
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
          </View>
          
          <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 150,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  message: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  inline: {
    alignItems: 'center',
    padding: 20,
  },
  inlineMessage: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  calculationContainer: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 280,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  icon: {
    marginBottom: 10,
  },
  spinner: {
    marginVertical: 15,
  },
  calculationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f4e79',
    marginBottom: 8,
  },
  calculationStage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4B8BBE',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
  },
});