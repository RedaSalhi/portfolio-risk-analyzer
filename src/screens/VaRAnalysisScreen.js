// src/screens/VaRAnalysisScreen.js
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function VaRAnalysisScreen() {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // Common parameters
  const [positionSize, setPositionSize] = useState('100000');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);
  
  // Asset-specific parameters
  const [tickers, setTickers] = useState('');
  const [weights, setWeights] = useState('');
  
  // Fixed income parameters
  const [maturity, setMaturity] = useState(10);
  
  // Monte Carlo parameters
  const [numSimulations, setNumSimulations] = useState(10000);

  const varMethods = [
    {
      id: 'parametric',
      title: 'Parametric VaR',
      subtitle: 'Single Asset Analysis',
      icon: 'trending-down',
      color: '#4B8BBE',
    },
    {
      id: 'monte_carlo',
      title: 'Monte Carlo VaR',
      subtitle: 'Portfolio Simulation',
      icon: 'shuffle',
      color: '#4ECDC4',
    },
    {
      id: 'fixed_income',
      title: 'Fixed Income VaR',
      subtitle: 'Bond Risk (PV01)',
      icon: 'bar-chart',
      color: '#45B7D1',
    },
    {
      id: 'portfolio',
      title: 'Portfolio VaR',
      subtitle: 'Mixed Assets',
      icon: 'pie-chart',
      color: '#FF6B6B',
    },
  ];

  const runVaRAnalysis = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a VaR method');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call - replace with actual VaR calculation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results based on method
      const mockResults = {
        parametric: {
          var: 8547.32,
          volatility: 0.0234,
          exceedances: 12,
          exceedanceRate: 4.8,
        },
        monte_carlo: {
          var: 9123.45,
          var_pct: 0.0912,
          exceedances: 15,
          exceedanceRate: 5.2,
          simulations: numSimulations,
        },
        fixed_income: {
          var: 6789.12,
          pv01: 0.0045,
          yieldVolatility: 12.34,
          exceedances: 8,
          exceedanceRate: 3.6,
        },
        portfolio: {
          var: 12456.78,
          weightedVar: 13200.45,
          correlationBenefit: 743.67,
          exceedances: 18,
          exceedanceRate: 6.1,
        }
      };
      
      setResults(mockResults[selectedMethod]);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate VaR');
    } finally {
      setLoading(false);
    }
  };

  const renderMethodSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select VaR Method</Text>
      <View style={styles.methodGrid}>
        {varMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod === method.id && styles.selectedMethod,
              { borderLeftColor: method.color }
            ]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <View style={[styles.methodIcon, { backgroundColor: method.color }]}>
              <Ionicons name={method.icon} size={24} color="white" />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
            </View>
            {selectedMethod === method.id && (
              <Ionicons name="checkmark-circle" size={24} color={method.color} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderParameterInputs = () => {
    if (!selectedMethod) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parameters</Text>
        
        {/* Common Parameters */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Position Size ($)</Text>
          <TextInput
            style={styles.textInput}
            value={positionSize}
            onChangeText={setPositionSize}
            keyboardType="numeric"
            placeholder="100000"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            Confidence Level: {(confidenceLevel * 100).toFixed(0)}%
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0.90}
            maximumValue={0.99}
            value={confidenceLevel}
            onValueChange={setConfidenceLevel}
            minimumTrackTintColor="#4B8BBE"
            maximumTrackTintColor="#d3d3d3"
          />
        </View>

        {/* Method-specific parameters */}
        {(selectedMethod === 'parametric' || selectedMethod === 'monte_carlo' || selectedMethod === 'portfolio') && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Asset Tickers {selectedMethod !== 'parametric' && '(comma-separated)'}
            </Text>
            <TextInput
              style={styles.textInput}
              value={tickers}
              onChangeText={setTickers}
              placeholder={selectedMethod === 'parametric' ? 'AAPL' : 'AAPL, MSFT, GOOG'}
            />
          </View>
        )}

        {selectedMethod === 'fixed_income' && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bond Tickers (FRED codes)</Text>
              <TextInput
                style={styles.textInput}
                value={tickers}
                onChangeText={setTickers}
                placeholder="DGS10, ^IRX"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Maturity: {maturity} years
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={30}
                value={maturity}
                onValueChange={setMaturity}
                step={1}
                minimumTrackTintColor="#4B8BBE"
                maximumTrackTintColor="#d3d3d3"
              />
            </View>
          </>
        )}

        {(selectedMethod === 'monte_carlo' || selectedMethod === 'portfolio') && selectedMethod !== 'parametric' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Portfolio Weights (comma-separated)</Text>
            <TextInput
              style={styles.textInput}
              value={weights}
              onChangeText={setWeights}
              placeholder="0.4, 0.35, 0.25"
            />
          </View>
        )}

        {selectedMethod === 'monte_carlo' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              Simulations: {numSimulations.toLocaleString()}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={100000}
              value={numSimulations}
              onValueChange={setNumSimulations}
              step={1000}
              minimumTrackTintColor="#4B8BBE"
              maximumTrackTintColor="#d3d3d3"
            />
          </View>
        )}
      </View>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const confidence = (confidenceLevel * 100).toFixed(0);

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VaR Analysis Results</Text>
        
        {/* Main VaR Result */}
        <View style={styles.mainResult}>
          <Text style={styles.varLabel}>1-Day VaR ({confidence}%)</Text>
          <Text style={styles.varValue}>
            ${results.var?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Additional Metrics */}
        <View style={styles.metricsGrid}>
          {results.volatility && (
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {(results.volatility * 100).toFixed(2)}%
              </Text>
              <Text style={styles.metricLabel}>Daily Volatility</Text>
            </View>
          )}
          
          {results.pv01 && (
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {results.pv01.toFixed(4)}
              </Text>
              <Text style={styles.metricLabel}>PV01</Text>
            </View>
          )}
          
          {results.yieldVolatility && (
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                {results.yieldVolatility.toFixed(1)} bps
              </Text>
              <Text style={styles.metricLabel}>Yield Volatility</Text>
            </View>
          )}
          
          {results.correlationBenefit && (
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>
                ${results.correlationBenefit.toFixed(0)}
              </Text>
              <Text style={styles.metricLabel}>Diversification Benefit</Text>
            </View>
          )}
        </View>

        {/* Backtesting Results */}
        <View style={styles.backtestSection}>
          <Text style={styles.subsectionTitle}>Backtesting Results</Text>
          <View style={styles.backtestRow}>
            <Text style={styles.backtestLabel}>VaR Exceedances:</Text>
            <Text style={styles.backtestValue}>
              {results.exceedances} ({results.exceedanceRate.toFixed(1)}%)
            </Text>
          </View>
          <View style={styles.backtestRow}>
            <Text style={styles.backtestLabel}>Expected:</Text>
            <Text style={styles.backtestValue}>
              {((1 - confidenceLevel) * 100).toFixed(0)}%
            </Text>
          </View>
          
          {results.exceedanceRate > ((1 - confidenceLevel) * 100 + 2) && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={16} color="#FF6B6B" />
              <Text style={styles.warningText}>
                Exceedance rate is higher than expected. Model may underestimate risk.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderMethodSelector()}
        {renderParameterInputs()}
        
        {selectedMethod && (
          <TouchableOpacity
            style={[styles.runButton, loading && styles.runButtonDisabled]}
            onPress={runVaRAnalysis}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="calculator" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.runButtonText}>Calculate VaR</Text>
              </>
            )}
          </TouchableOpacity>
        )}

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
  methodGrid: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    borderLeftWidth: 4,
    backgroundColor: '#fafafa',
  },
  selectedMethod: {
    borderColor: '#4B8BBE',
    backgroundColor: '#f8f9fa',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  inputGroup: {
    marginBottom: 20,
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
  },
  slider: {
    width: '100%',
    height: 40,
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
  mainResult: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
  },
  varLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  varValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
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
  backtestSection: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  backtestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backtestLabel: {
    fontSize: 14,
    color: '#666',
  },
  backtestValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    marginTop: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 8,
    flex: 1,
  },
});