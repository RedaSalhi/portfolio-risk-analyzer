// src/components/FinancialInputs.js
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Financial Text Input Component
export const FinancialInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  keyboardType = 'default',
  prefix = '',
  suffix = '',
  icon = null,
  error = null,
  required = false
}) => {
  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputHeader}>
        <Text style={styles.inputLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        {icon && <Ionicons name={icon} size={16} color="#666" />}
      </View>
      
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999"
          keyboardType={keyboardType}
        />
        {suffix && <Text style={styles.inputSuffix}>{suffix}</Text>}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

// Ticker Input Component (with validation)
export const TickerInput = ({ 
  label = "Stock Tickers", 
  value, 
  onChangeText, 
  onValidate = null,
  multiple = true 
}) => {
  const [isValid, setIsValid] = useState(true);
  
  const validateTickers = (text) => {
    if (!text.trim()) {
      setIsValid(false);
      return false;
    }
    
    if (multiple) {
      const tickers = text.split(',').map(t => t.trim().toUpperCase());
      const validPattern = /^[A-Z]{1,5}$/;
      const allValid = tickers.every(ticker => validPattern.test(ticker));
      setIsValid(allValid);
      if (onValidate) onValidate(allValid, tickers);
      return allValid;
    } else {
      const validPattern = /^[A-Z]{1,5}$/;
      const valid = validPattern.test(text.trim().toUpperCase());
      setIsValid(valid);
      if (onValidate) onValidate(valid, [text.trim().toUpperCase()]);
      return valid;
    }
  };
  
  const handleTextChange = (text) => {
    onChangeText(text);
    validateTickers(text);
  };
  
  return (
    <View style={styles.tickerContainer}>
      <FinancialInput
        label={label}
        value={value}
        onChangeText={handleTextChange}
        placeholder={multiple ? "AAPL, MSFT, GOOG" : "AAPL"}
        icon="trending-up"
        error={!isValid ? "Invalid ticker format" : null}
        required
      />
      
      {isValid && value && (
        <View style={styles.tickerPreview}>
          <Text style={styles.tickerPreviewLabel}>Tickers:</Text>
          <View style={styles.tickerTags}>
            {value.split(',').map((ticker, index) => (
              <View key={index} style={styles.tickerTag}>
                <Text style={styles.tickerTagText}>
                  {ticker.trim().toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

// Weight Input Component
export const WeightInput = ({ 
  weights, 
  setWeights, 
  assets, 
  total = 100 
}) => {
  const currentTotal = weights.reduce((sum, weight) => sum + parseFloat(weight || 0), 0);
  const isValid = Math.abs(currentTotal - total) < 0.01;
  
  const handleWeightChange = (index, value) => {
    const newWeights = [...weights];
    newWeights[index] = value;
    setWeights(newWeights);
  };
  
  const distributeEqually = () => {
    const equalWeight = (total / assets.length).toFixed(2);
    setWeights(assets.map(() => equalWeight));
  };
  
  return (
    <View style={styles.weightContainer}>
      <View style={styles.weightHeader}>
        <Text style={styles.weightTitle}>Portfolio Weights</Text>
        <TouchableOpacity 
          style={styles.equalButton}
          onPress={distributeEqually}
        >
          <Text style={styles.equalButtonText}>Equal</Text>
        </TouchableOpacity>
      </View>
      
      {assets.map((asset, index) => (
        <View key={index} style={styles.weightRow}>
          <Text style={styles.assetName}>{asset}</Text>
          <View style={styles.weightInputContainer}>
            <TextInput
              style={styles.weightInput}
              value={weights[index]}
              onChangeText={(value) => handleWeightChange(index, value)}
              keyboardType="numeric"
              placeholder="0.00"
            />
            <Text style={styles.percentSymbol}>%</Text>
          </View>
        </View>
      ))}
      
      <View style={[styles.totalRow, !isValid && styles.totalError]}>
        <Text style={styles.totalLabel}>Total:</Text>
        <Text style={[styles.totalValue, { color: isValid ? '#66BB6A' : '#FF6B6B' }]}>
          {currentTotal.toFixed(2)}%
        </Text>
      </View>
      
      {!isValid && (
        <Text style={styles.weightError}>
          Weights must sum to {total}%
        </Text>
      )}
    </View>
  );
};

// Slider Input with Labels
export const SliderInput = ({ 
  label, 
  value, 
  onValueChange, 
  minimumValue = 0, 
  maximumValue = 1, 
  step = 0.01,
  formatValue = (val) => `${(val * 100).toFixed(1)}%`,
  color = '#4B8BBE'
}) => {
  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={[styles.sliderValue, { color }]}>
          {formatValue(value)}
        </Text>
      </View>
      
      <Slider
        style={styles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        value={value}
        onValueChange={onValueChange}
        step={step}
        minimumTrackTintColor={color}
        maximumTrackTintColor="#d3d3d3"
        thumbStyle={{ backgroundColor: color }}
      />
      
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabelText}>
          {formatValue(minimumValue)}
        </Text>
        <Text style={styles.sliderLabelText}>
          {formatValue(maximumValue)}
        </Text>
      </View>
    </View>
  );
};

// Custom Button Components
export const FinancialButton = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  icon = null, 
  loading = false, 
  disabled = false,
  size = 'medium'
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return ['#4B8BBE', '#306998'];
      case 'success':
        return ['#66BB6A', '#4CAF50'];
      case 'danger':
        return ['#FF6B6B', '#F44336'];
      case 'warning':
        return ['#FFA726', '#FF9800'];
      default:
        return ['#4B8BBE', '#306998'];
    }
  };
  
  const buttonHeight = size === 'large' ? 56 : size === 'small' ? 40 : 48;
  const fontSize = size === 'large' ? 18 : size === 'small' ? 14 : 16;
  
  return (
    <TouchableOpacity
      style={[styles.buttonContainer, { height: buttonHeight }]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={disabled ? ['#ccc', '#999'] : getButtonStyle()}
        style={[styles.button, { height: buttonHeight }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {loading ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="white" size="small" />
            <Text style={[styles.buttonText, { fontSize, marginLeft: 8 }]}>
              Loading...
            </Text>
          </View>
        ) : (
          <View style={styles.buttonContent}>
            {icon && (
              <Ionicons 
                name={icon} 
                size={fontSize + 2} 
                color="white" 
                style={{ marginRight: 8 }} 
              />
            )}
            <Text style={[styles.buttonText, { fontSize }]}>{title}</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Risk Tolerance Selector
export const RiskToleranceSelector = ({ 
  value, 
  onValueChange 
}) => {
  const riskLevels = [
    { value: 1, label: 'Conservative', color: '#66BB6A', desc: 'Low risk, stable returns' },
    { value: 2, label: 'Moderate', color: '#FFA726', desc: 'Balanced risk/return' },
    { value: 3, label: 'Aggressive', color: '#FF6B6B', desc: 'High risk, high return' },
  ];
  
  return (
    <View style={styles.riskContainer}>
      <Text style={styles.riskTitle}>Risk Tolerance</Text>
      
      <View style={styles.riskOptions}>
        {riskLevels.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[
              styles.riskOption,
              value === level.value && styles.riskOptionSelected,
              { borderColor: level.color }
            ]}
            onPress={() => onValueChange(level.value)}
          >
            <View style={[styles.riskDot, { backgroundColor: level.color }]} />
            <View style={styles.riskContent}>
              <Text style={[
                styles.riskLabel,
                value === level.value && styles.riskLabelSelected
              ]}>
                {level.label}
              </Text>
              <Text style={styles.riskDesc}>{level.desc}</Text>
            </View>
            {value === level.value && (
              <Ionicons name="checkmark-circle" size={20} color={level.color} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Basic Input Styles
  inputContainer: {
    marginVertical: 8,
  },
  inputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  required: {
    color: '#FF6B6B',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  inputPrefix: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
  textInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputSuffix: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  
  // Ticker Input Styles
  tickerContainer: {
    marginVertical: 8,
  },
  tickerPreview: {
    marginTop: 8,
  },
  tickerPreviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  tickerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tickerTag: {
    backgroundColor: '#4B8BBE20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tickerTagText: {
    fontSize: 12,
    color: '#4B8BBE',
    fontWeight: '600',
  },
  
  // Weight Input Styles
  weightContainer: {
    marginVertical: 8,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  equalButton: {
    backgroundColor: '#4B8BBE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  equalButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  weightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  assetName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    width: 80,
    textAlign: 'right',
    fontSize: 14,
  },
  percentSymbol: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalError: {
    borderTopColor: '#FF6B6B',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weightError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Slider Styles
  sliderContainer: {
    marginVertical: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#666',
  },
  
  // Button Styles
  buttonContainer: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  
  // Risk Tolerance Styles
  riskContainer: {
    marginVertical: 16,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  riskOptions: {
    gap: 12,
  },
  riskOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  riskOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  riskDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  riskContent: {
    flex: 1,
  },
  riskLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  riskLabelSelected: {
    color: '#4B8BBE',
  },
  riskDesc: {
    fontSize: 12,
    color: '#666',
  },
});