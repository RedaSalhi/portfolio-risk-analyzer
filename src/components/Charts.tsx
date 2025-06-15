// src/components/Charts.tsx
// Composants de graphiques financiers robustes et interactifs

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const chartWidth = width - 40;

// Interface pour les données de performance
interface PerformanceData {
  dates: string[];
  returns: number[];
  cumulative: number[];
  benchmark?: number[];
}

// Interface pour les résultats VaR
interface VaRData {
  var95: number;
  var99: number;
  expectedShortfall: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  distribution: number[];
}

// Interface pour la frontière efficiente
interface EfficientFrontierData {
  points: Array<{ x: number; y: number; sharpe: number }>;
  optimal: { x: number; y: number; sharpe: number };
}

// Interface pour les poids du portefeuille
interface PortfolioWeightsData {
  tickers: string[];
  weights: number[];
  colors: string[];
}

// Interface pour l'allocation de capital
interface CapitalAllocationData {
  riskyWeight: number;
  riskFreeWeight: number;
  expectedReturn: number;
  volatility: number;
}

// Interface pour l'analyse CAPM
interface CAPMData {
  tickers: string[];
  betas: number[];
  alphas: number[];
  expectedReturns: number[];
}

// Interface pour la matrice de corrélation
interface CorrelationData {
  tickers: string[];
  matrix: number[][];
}

// Composant de graphique de performance
export const PerformanceChart: React.FC<{ data: PerformanceData }> = ({ data }) => {
  const chartData = {
    labels: data.dates.slice(-12), // Derniers 12 points
    datasets: [
      {
        data: data.cumulative.slice(-12),
        color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
        strokeWidth: 3,
      },
      ...(data.benchmark ? [{
        data: data.benchmark.slice(-12),
        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
        strokeWidth: 2,
      }] : []),
    ],
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient
        colors={['#e8f5e8', '#ffffff']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>📈 Performance du Portefeuille</Text>
        <Text style={styles.chartSubtitle}>Rendements cumulés au fil du temps</Text>
        
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#2e7d32',
            },
          }}
          bezier
          style={styles.chart}
        />

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rendement Total</Text>
            <Text style={[styles.statValue, { color: data.cumulative[data.cumulative.length - 1] >= 0 ? '#2e7d32' : '#d32f2f' }]}>
              {((data.cumulative[data.cumulative.length - 1] || 0) * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Volatilité</Text>
            <Text style={styles.statValue}>
              {(Math.sqrt(data.returns.reduce((acc, r) => acc + r * r, 0) / data.returns.length) * Math.sqrt(252) * 100).toFixed(2)}%
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Composant de visualisation VaR
export const VaRVisualizationChart: React.FC<{ data: VaRData }> = ({ data }) => {
  const distributionData = {
    labels: data.distribution.map((_, i) => (i - 50).toString()),
    datasets: [{
      data: data.distribution,
      color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
    }],
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient
        colors={['#ffebee', '#ffffff']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>⚠️ Analyse Value-at-Risk</Text>
        <Text style={styles.chartSubtitle}>Distribution des rendements et métriques de risque</Text>

        <LineChart
          data={distributionData}
          width={chartWidth}
          height={200}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 3,
            color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
        />

        <View style={styles.varStatsContainer}>
          <View style={[styles.varStatItem, { borderLeftColor: '#e74c3c' }]}>
            <Text style={styles.varStatLabel}>VaR 95%</Text>
            <Text style={[styles.varStatValue, { color: '#e74c3c' }]}>
              {(data.var95 * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={[styles.varStatItem, { borderLeftColor: '#c0392b' }]}>
            <Text style={styles.varStatLabel}>VaR 99%</Text>
            <Text style={[styles.varStatValue, { color: '#c0392b' }]}>
              {(data.var99 * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={[styles.varStatItem, { borderLeftColor: '#8e44ad' }]}>
            <Text style={styles.varStatLabel}>Expected Shortfall</Text>
            <Text style={[styles.varStatValue, { color: '#8e44ad' }]}>
              {(data.expectedShortfall * 100).toFixed(2)}%
            </Text>
          </View>
        </View>

        <View style={styles.riskInterpretation}>
          <Text style={styles.interpretationTitle}>💡 Interprétation du Risque</Text>
          <Text style={styles.interpretationText}>
            {getRiskInterpretation(data.var95 * 100, data.volatility * 100, data.sharpeRatio)}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// Composant Dashboard des métriques de risque
export const RiskMetricsDashboard: React.FC<{ data: VaRData }> = ({ data }) => {
  const metrics = [
    {
      label: 'VaR 95%',
      value: `${(data.var95 * 100).toFixed(2)}%`,
      icon: '📉',
      color: '#e74c3c',
      description: 'Perte maximale avec 95% de confiance',
      riskLevel: Math.min(Math.abs(data.var95) * 100 / 10, 1),
    },
    {
      label: 'Volatilité',
      value: `${(data.volatility * 100).toFixed(2)}%`,
      icon: '📊',
      color: '#f39c12',
      description: 'Écart-type des rendements annualisé',
      riskLevel: Math.min(data.volatility * 100 / 30, 1),
    },
    {
      label: 'Ratio de Sharpe',
      value: data.sharpeRatio.toFixed(3),
      icon: '⚖️',
      color: data.sharpeRatio > 1 ? '#27ae60' : data.sharpeRatio > 0.5 ? '#f39c12' : '#e74c3c',
      description: 'Rendement ajusté du risque',
      riskLevel: Math.max(1 - Math.max(data.sharpeRatio, 0) / 2, 0),
    },
    {
      label: 'Drawdown Max',
      value: `${(data.maxDrawdown * 100).toFixed(2)}%`,
      icon: '📉',
      color: '#9b59b6',
      description: 'Perte maximale depuis un pic',
      riskLevel: Math.min(Math.abs(data.maxDrawdown) * 100 / 20, 1),
    },
  ];

  return (
    <View style={styles.dashboardContainer}>
      <LinearGradient
        colors={['#f8f9fa', '#ffffff']}
        style={styles.dashboardGradient}
      >
        <Text style={styles.dashboardTitle}>🎯 Métriques de Risque</Text>
        <Text style={styles.dashboardSubtitle}>Tableau de bord des indicateurs clés</Text>

        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <View key={index} style={[styles.metricCard, { borderLeftColor: metric.color }]}>
              <View style={styles.metricContent}>
                <View style={styles.metricHeader}>
                  <Text style={[styles.metricIcon, { color: metric.color }]}>{metric.icon}</Text>
                  <Text style={styles.metricLabel}>{metric.label}</Text>
                </View>
                <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
                <Text style={styles.metricDescription}>{metric.description}</Text>
                <View style={styles.riskIndicator}>
                  <View
                    style={[
                      styles.riskBar,
                      {
                        width: `${metric.riskLevel * 100}%`,
                        backgroundColor: metric.color,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.riskSummary}>
          <Text style={styles.riskSummaryTitle}>📋 Résumé du Risque</Text>
          <Text style={styles.riskSummaryText}>
            {getRiskInterpretation(data.var95 * 100, data.volatility * 100, data.sharpeRatio)}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

// Composant Frontière Efficiente
export const EfficientFrontierChart: React.FC<{ data: EfficientFrontierData }> = ({ data }) => {
  const chartData = {
    labels: data.points.map(p => p.x.toFixed(2)),
    datasets: [{
      data: data.points.map(p => p.y),
      color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    }],
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient
        colors={['#e3f2fd', '#ffffff']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>📈 Frontière Efficiente</Text>
        <Text style={styles.chartSubtitle}>Optimisation Risque-Rendement selon Markowitz</Text>
        
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 3,
            color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
        />

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Portefeuille Optimal</Text>
            <Text style={styles.statValue}>
              Sharpe: {data.optimal.sharpe.toFixed(3)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rendement</Text>
            <Text style={styles.statValue}>
              {(data.optimal.y * 100).toFixed(2)}%
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Composant Poids du Portefeuille
export const PortfolioWeightsChart: React.FC<{ data: PortfolioWeightsData }> = ({ data }) => {
  const pieData = data.tickers.map((ticker, index) => ({
    name: ticker,
    population: data.weights[index] * 100,
    color: data.colors[index] || `#${Math.floor(Math.random()*16777215).toString(16)}`,
    legendFontColor: '#2c3e50',
    legendFontSize: 12,
  }));

  return (
    <View style={styles.chartContainer}>
      <LinearGradient
        colors={['#f0f8ff', '#ffffff']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>🥧 Allocation du Portefeuille</Text>
        <Text style={styles.chartSubtitle}>Répartition optimale des actifs</Text>
        
        <PieChart
          data={pieData}
          width={chartWidth}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </LinearGradient>
    </View>
  );
};

// Composant Allocation de Capital
export const CapitalAllocationChart: React.FC<{ data: CapitalAllocationData }> = ({ data }) => {
  const allocationData = {
    labels: ['Actifs Risqués', 'Actifs Sans Risque'],
    datasets: [{
      data: [data.riskyWeight * 100, data.riskFreeWeight * 100],
    }],
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient
        colors={['#fff3e0', '#ffffff']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>⚖️ Allocation de Capital</Text>
        <Text style={styles.chartSubtitle}>Répartition optimale selon la théorie moderne du portefeuille</Text>
        
        <BarChart
          data={allocationData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
        />

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rendement Attendu</Text>
            <Text style={styles.statValue}>
              {(data.expectedReturn * 100).toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Volatilité</Text>
            <Text style={styles.statValue}>
              {(data.volatility * 100).toFixed(2)}%
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

// Composant Analyse CAPM
export const CAPMAnalysisChart: React.FC<{ data: CAPMData }> = ({ data }) => {
  const betaData = {
    labels: data.tickers,
    datasets: [{
      data: data.betas,
      color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
    }],
  };

  return (
    <View style={styles.chartContainer}>
      <LinearGradient
        colors={['#f3e5f5', '#ffffff']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>📊 Analyse CAPM</Text>
        <Text style={styles.chartSubtitle}>Betas et rendements attendus selon le modèle CAPM</Text>
        
        <BarChart
          data={betaData}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(155, 89, 182, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: { borderRadius: 16 },
          }}
          style={styles.chart}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          <View style={styles.legend}>
            {data.tickers.map((ticker, index) => (
              <View key={ticker} style={styles.legendRow}>
                <View style={[styles.legendColor, { backgroundColor: '#9b59b6' }]} />
                <Text style={styles.legendText}>
                  {ticker}: β={data.betas[index].toFixed(2)}, α={data.alphas[index].toFixed(3)}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

// Composant Matrice de Corrélation
export const CorrelationMatrixChart: React.FC<{ data: CorrelationData }> = ({ data }) => {
  return (
    <View style={styles.chartContainer}>
      <LinearGradient
        colors={['#e8f5e8', '#ffffff']}
        style={styles.chartGradient}
      >
        <Text style={styles.chartTitle}>🔗 Matrice de Corrélation</Text>
        <Text style={styles.chartSubtitle}>Corrélations entre les actifs du portefeuille</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ padding: 16 }}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: 80 }} />
              {data.tickers.map(ticker => (
                <View key={ticker} style={{ width: 60, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2c3e50' }}>
                    {ticker}
                  </Text>
                </View>
              ))}
            </View>
            
            {data.matrix.map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 80, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2c3e50' }}>
                    {data.tickers[i]}
                  </Text>
                </View>
                {row.map((corr, j) => (
                  <View
                    key={j}
                    style={{
                      width: 60,
                      height: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: getCorrelationColor(corr),
                      margin: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text style={{
                      fontSize: 10,
                      color: Math.abs(corr) > 0.5 ? '#ffffff' : '#2c3e50',
                      fontWeight: 'bold',
                    }}>
                      {corr.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

// Fonctions utilitaires
function getCorrelationColor(corr: number): string {
  const intensity = Math.abs(corr);
  if (corr > 0) {
    return `rgba(46, 125, 50, ${intensity})`;
  } else {
    return `rgba(211, 47, 47, ${intensity})`;
  }
}

function getRiskInterpretation(var95: number, volatility: number, sharpe: number): string {
  if (var95 < 2 && volatility < 15 && sharpe > 1) {
    return "✅ Faible Risque: Profil conservateur avec un excellent ratio risque-rendement. Idéal pour les investisseurs prudents.";
  } else if (var95 < 5 && volatility < 25 && sharpe > 0.5) {
    return "⚠️ Risque Modéré: Profil équilibré adapté à la plupart des investisseurs. Surveillance recommandée.";
  } else if (var95 < 10 && volatility < 40) {
    return "🔶 Risque Élevé: Niveaux de risque élevés nécessitant une surveillance attentive et une gestion des risques.";
  } else {
    return "🚨 Risque Très Élevé: Niveaux de risque extrêmes. Considérez un rééquilibrage du portefeuille ou des stratégies de réduction des risques.";
  }
}

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  chartGradient: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  chart: {
    borderRadius: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c3e50',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 16,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    marginRight: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: '500',
  },
  varStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  varStatItem: {
    alignItems: 'center',
    borderLeftWidth: 4,
    paddingLeft: 12,
    flex: 1,
  },
  varStatLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginBottom: 4,
    textAlign: 'center',
  },
  varStatValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  riskInterpretation: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e74c3c',
    marginBottom: 8,
  },
  interpretationText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
    marginBottom: 8,
  },
  dashboardContainer: {
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dashboardGradient: {
    padding: 20,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1f4e79',
    textAlign: 'center',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricContent: {
    padding: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 10,
    color: '#7f8c8d',
    lineHeight: 12,
    marginBottom: 8,
  },
  riskIndicator: {
    height: 4,
    backgroundColor: '#ecf0f1',
    borderRadius: 2,
    overflow: 'hidden',
  },
  riskBar: {
    height: '100%',
    borderRadius: 2,
  },
  riskSummary: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  riskSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3498db',
    marginBottom: 8,
  },
  riskSummaryText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
});
