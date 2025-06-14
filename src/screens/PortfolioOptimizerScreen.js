// src/screens/PortfolioOptimizerScreen.js
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PortfolioOptimizerScreen() {
  const [tickers, setTickers] = useState('AAPL, MSFT, GOOG');
  const [targetOption, setTargetOption] = useState('None');
  const [targetReturn, setTargetReturn] = useState(0.2);
  const [targetVolatility, setTargetVolatility] = useState(0.2);
  const [includeRiskFree, setIncludeRiskFree] = useState(true);
  const [useSP500, setUseSP500] = useState(true);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const targetOptions = ['None', 'Target Return', 'Target Volatility'];

  const runOptimization = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual optimization logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock results for demonstration
      const mockResults = {
        weights: [0.4, 0.35, 0.25],
        expectedReturn: 0.18,
        volatility: 0.15,
        sharpeRatio: 1.2,
        capmReturns: {
          'AAPL': 0.16,
          'MSFT': 0.14,
          'GOOG': 0.19
        },
        betas: {
          'AAPL': 1.1,
          'MSFT': 0.9,
          'GOOG': 1.3
        }
      };
      
      setResults(mockResults);
    } catch (error) {
      Alert.alert('Error', 'Failed to optimize portfolio');
    } finally {
      setLoading(false);
    }
  };

  const renderTargetSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Optimization Target</Text>
      <View style={styles.buttonGroup}>
        {targetOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              targetOption === option && styles.selectedOption
            ]}
            onPress={() => setTargetOption(option)}
          >
            <Text style={[
              styles.optionText,
              targetOption === option && styles.selectedOptionText
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {targetOption === 'Target Return' && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Target Return: {(targetReturn * 100).toFixed(1)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={targetReturn}
            onValueChange={setTargetReturn}
            minimumTrackTintColor="#4B8BBE"
            maximumTrackTintColor="#d3d3d3"
            thumbStyle={{ backgroundColor: '#4B8BBE' }}
          />
        </View>
      )}

      {targetOption === 'Target Volatility' && (
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>
            Target Volatility: {(targetVolatility * 100).toFixed(1)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={targetVolatility}
            onValueChange={setTargetVolatility}
            minimumTrackTintColor="#4B8BBE"
            maximumTrackTintColor="#d3d3d3"
            thumbStyle={{ backgroundColor: '#4B8BBE' }}
          />
        </View>
      )}
    </View>
  );

  const renderResults = () => {
    if (!results) return null;

    const tickerArray = tickers.split(',').map(t => t.trim().toUpperCase());

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Optimization Results</Text>
        
        {/* Portfolio Metrics */}
        <View style={styles.resultsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(results.expectedReturn * 100).toFixed(2)}%
            </Text>
            <Text style={styles.metricLabel}>Expected Return</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {(results.volatility * 100).toFixed(2)}%
            </Text>
            <Text style={styles.metricLabel}>Volatility</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {results.sharpeRatio.toFixed(2)}
            </Text>
            <Text style={styles.metricLabel}>Sharpe Ratio</Text>
          </View>
        </View>

        {/* Asset Weights */}
        <View style={styles.weightsContainer}>
          <Text style={styles.subsectionTitle}>Optimal Weights</Text>
          {tickerArray.map((ticker, index) => (
            <View key={ticker} style={styles.weightRow}>
              <Text style={styles.tickerText}>{ticker}</Text>
              <View style={styles.weightBar}>
                <View 
                  style={[
                    styles.weightFill,
                    { width: `${(results.weights[index] * 100)}%` }
                  ]}
                />
                <Text style={styles.weightText}>
                  {(results.weights[index] * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* CAPM Results */}
        <View style={styles.caamContainer}>
          <Text style={styles.subsectionTitle}>CAPM Analysis</Text>
          {tickerArray.map((ticker) => (
            <View key={ticker} style={styles.capmRow}>
              <Text style={styles.tickerText}>{ticker}</Text>
              <View style={styles.capmValues}>
                <Text style={styles.capmText}>
                  Return: {(results.capmReturns[ticker] * 100).toFixed(2)}%
                </Text>
                <Text style={styles.capmText}>
                  Beta: {results.betas[ticker].toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Input Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Configuration</Text>
          
          <Text style={styles.inputLabel}>Asset Tickers (comma-separated)</Text>
          <TextInput
            style={styles.textInput}
            value={tickers}
            onChangeText={setTickers}
            placeholder="AAPL, MSFT, GOOG"
            placeholderTextColor="#999"
          />

          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Include Risk-Free Asset (^IRX)</Text>
              <Switch
                value={includeRiskFree}
                onValueChange={setIncludeRiskFree}
                trackColor={{ false: "#767577", true: "#4B8BBE" }}
                thumbColor={includeRiskFree ? "#306998" : "#f4f3f4"}
              />
            </View>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Use S&P 500 as Market Proxy</Text>
              <Switch
                value={useSP500}
                onValueChange={setUseSP500}
                trackColor={{ false: "#767577", true: "#4B8BBE" }}
                thumbColor={useSP500 ? "#306998" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        {renderTargetSelector()}

        {/* Run Button */}
        <TouchableOpacity
          style={[styles.runButton, loading && styles.runButtonDisabled]}
          onPress={runOptimization}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="analytics" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.runButtonText}>Run Optimization</Text>
            </>
          )}
        </TouchableOpacity>

        {renderResults()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttonGroup: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  optionButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  selectedOption: {
    backgroundColor: '#4B8BBE',
    borderColor: '#4B8BBE',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  switchContainer: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  runButton: {
    margin: 16,
    backgroundColor: '#4B8BBE',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  runButtonDisabled: {
    backgroundColor: '#ccc',
  },
  runButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B8BBE',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  weightsContainer: {
    marginBottom: 20,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 60,
  },
  weightBar: {
    flex: 1,
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginLeft: 12,
    justifyContent: 'center',
    position: 'relative',
  },
  weightFill: {
    height: '100%',
    backgroundColor: '#4B8BBE',
    borderRadius: 10,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  weightText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  caamContainer: {
    marginTop: 8,
  },
  capmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  capmValues: {
    alignItems: 'flex-end',
  },
  capmText: {
    fontSize: 12,
    color: '#666',
  },
});