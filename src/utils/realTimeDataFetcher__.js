// src/utils/realTimeDataFetcher.js
// Fetcher de données financières en temps réel avec gestion d'erreurs robuste

import { financialErrorHandler } from './errorManagement';

/**
 * Classe pour récupérer des données financières en temps réel
 * Supporte plusieurs sources de données avec fallback automatique
 */
class RealTimeDataFetcher {
  constructor() {
    this.cache = new Map();
    this.config = {
      timeout: 10000, // 10 secondes
      retryAttempts: 3,
      retryDelay: 1000, // 1 seconde
      cacheDuration: 5 * 60 * 1000, // 5 minutes
    };
    
    // Sources de données par ordre de priorité
    this.dataSources = [
      'yahoo',
      'alpha_vantage',
      'mock', // Fallback avec données simulées
    ];
  }

  /**
   * Récupère les données d'un symbole avec période spécifiée
   * @param {string} symbol - Symbole du titre (ex: 'AAPL')
   * @param {string} period - Période ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
   * @returns {Promise<Object>} Données historiques du titre
   */
  async fetchStockData(symbol, period = '1y') {
    const cacheKey = `${symbol}_${period}`;
    
    // Vérifier le cache d'abord
    if (this.isCacheValid(cacheKey)) {
      console.log(`📋 Cache hit for ${symbol}`);
      return this.cache.get(cacheKey).data;
    }

    console.log(`🔄 Fetching data for ${symbol} (${period})`);

    // Essayer chaque source de données
    for (const source of this.dataSources) {
      try {
        const data = await this.fetchFromSource(source, symbol, period);
        if (data && data.prices && data.prices.length > 0) {
          this.cacheData(cacheKey, data);
          return data;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch from ${source}:`, error.message);
        continue;
      }
    }

    // Si toutes les sources échouent, utiliser des données mock
    console.log(`🎭 Using mock data for ${symbol}`);
    const mockData = this.generateMockStockData(symbol, this.getPeriodDays(period));
    this.cacheData(cacheKey, mockData);
    return mockData;
  }

  /**
   * Récupère les données de plusieurs symboles
   * @param {string[]} symbols - Array de symboles
   * @param {string} period - Période
   * @returns {Promise<Object[]>} Array des données pour chaque symbole
   */
  async fetchMultipleStocks(symbols, period = '1y') {
    const promises = symbols.map(symbol => 
      this.fetchStockData(symbol.toUpperCase(), period)
        .catch(error => {
          console.error(`❌ Failed to fetch ${symbol}:`, error);
          return this.generateMockStockData(symbol, this.getPeriodDays(period));
        })
    );

    return Promise.all(promises);
  }

  /**
   * Récupère des données depuis une source spécifique
   * @param {string} source - Source de données
   * @param {string} symbol - Symbole
   * @param {string} period - Période
   * @returns {Promise<Object>} Données du titre
   */
  async fetchFromSource(source, symbol, period) {
    switch (source) {
      case 'yahoo':
        return this.fetchFromYahoo(symbol, period);
      case 'alpha_vantage':
        return this.fetchFromAlphaVantage(symbol, period);
      case 'mock':
        return this.generateMockStockData(symbol, this.getPeriodDays(period));
      default:
        throw new Error(`Unknown data source: ${source}`);
    }
  }

  /**
   * Récupère des données depuis Yahoo Finance
   * @param {string} symbol - Symbole
   * @param {string} period - Période
   * @returns {Promise<Object>} Données du titre
   */
  async fetchFromYahoo(symbol, period) {
    const now = Math.floor(Date.now() / 1000);
    const seconds = this.getPeriodSeconds(period);
    const start = now - seconds;
    
    // Utilisation de l'API Yahoo Finance avec différentes approches pour CORS
    const approaches = [
      // Approche directe (fonctionne en React Native)
      () => this.directYahooFetch(symbol, start, now),
      // Approche proxy (fonctionne dans les navigateurs web)
      () => this.proxyYahooFetch(symbol, start, now),
      // Endpoint alternatif Yahoo
      () => this.alternativeYahooFetch(symbol, period)
    ];
    
    for (const approach of approaches) {
      try {
        const data = await approach();
        if (data) return data;
      } catch (error) {
        console.warn('Yahoo approach failed:', error.message);
        continue;
      }
    }
    
    throw new Error('All Yahoo Finance approaches failed');
  }

  /**
   * Fetch direct depuis Yahoo Finance
   */
  async directYahooFetch(symbol, start, now) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${now}&interval=1d`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FinanceApp/1.0)',
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Yahoo API error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatYahooData(symbol, data?.chart?.result?.[0]);
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Fetch via proxy pour contourner CORS
   */
  async proxyYahooFetch(symbol, start, now) {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${now}&interval=1d`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Proxy error: ${response.status}`);
      }
      
      const data = await response.json();
      return this.formatYahooData(symbol, data?.chart?.result?.[0]);
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Endpoint alternatif Yahoo Finance
   */
  async alternativeYahooFetch(symbol, period) {
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price,summaryDetail,defaultKeyStatistics`;
    
    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Alternative Yahoo API error: ${response.status}`);
      }
      
      const data = await response.json();
      // Cette API donne des données limitées, donc on génère des données mock basées sur le prix actuel
      const currentPrice = data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice?.raw;
      if (currentPrice) {
        return this.generateMockStockDataWithPrice(symbol, this.getPeriodDays(period), currentPrice);
      }
      
      throw new Error('No price data in alternative Yahoo response');
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère des données depuis Alpha Vantage
   * @param {string} symbol - Symbole
   * @param {string} period - Période
   * @returns {Promise<Object>} Données du titre
   */
  async fetchFromAlphaVantage(symbol, period) {
    // API Key gratuite limitée - remplacer par votre clé
    const API_KEY = 'demo'; // Utiliser 'demo' pour des tests limités
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}&outputsize=full`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }
      
      if (data['Note']) {
        throw new Error('Alpha Vantage API call frequency limit reached');
      }
      
      return this.formatAlphaVantageData(symbol, data);
      
    } catch (error) {
      throw financialErrorHandler.handleApiError('Alpha Vantage', 500, error.message);
    }
  }

  /**
   * Formate les données Yahoo Finance
   * @param {string} symbol - Symbole
   * @param {Object} rawData - Données brutes Yahoo
   * @returns {Object} Données formatées
   */
  formatYahooData(symbol, rawData) {
    if (!rawData || !rawData.timestamp || !rawData.indicators?.quote?.[0]) {
      throw new Error('Invalid Yahoo Finance data structure');
    }

    const timestamps = rawData.timestamp;
    const quotes = rawData.indicators.quote[0];
    const adjClose = rawData.indicators.adjclose?.[0]?.adjclose || quotes.close;

    const prices = [];
    const dates = [];
    const volumes = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (adjClose[i] != null) { // Vérifier null et undefined
        prices.push(parseFloat(adjClose[i]));
        dates.push(new Date(timestamps[i] * 1000).toISOString().split('T')[0]);
        volumes.push(quotes.volume?.[i] || 0);
      }
    }

    if (prices.length === 0) {
      throw new Error('No valid price data found');
    }

    return {
      symbol: symbol.toUpperCase(),
      prices,
      dates,
      volumes,
      currency: rawData.meta?.currency || 'USD',
      exchange: rawData.meta?.exchangeName || 'Unknown',
      dataSource: 'Yahoo Finance',
      fetchTime: new Date().toISOString(),
      metadata: {
        regularMarketPrice: rawData.meta?.regularMarketPrice,
        previousClose: rawData.meta?.previousClose,
        timezone: rawData.meta?.timezone,
      }
    };
  }

  /**
   * Formate les données Alpha Vantage
   * @param {string} symbol - Symbole
   * @param {Object} rawData - Données brutes Alpha Vantage
   * @returns {Object} Données formatées
   */
  formatAlphaVantageData(symbol, rawData) {
    const timeSeries = rawData['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No time series data in Alpha Vantage response');
    }

    const sortedDates = Object.keys(timeSeries).sort();
    const prices = [];
    const dates = [];
    const volumes = [];

    for (const date of sortedDates) {
      const dayData = timeSeries[date];
      prices.push(parseFloat(dayData['4. close']));
      dates.push(date);
      volumes.push(parseInt(dayData['5. volume']));
    }

    return {
      symbol: symbol.toUpperCase(),
      prices,
      dates,
      volumes,
      currency: 'USD',
      exchange: 'Unknown',
      dataSource: 'Alpha Vantage',
      fetchTime: new Date().toISOString(),
      metadata: rawData['Meta Data'] || {}
    };
  }

  /**
   * Génère des données mock réalistes pour les tests
   * @param {string} symbol - Symbole
   * @param {number} days - Nombre de jours
   * @param {number} startPrice - Prix de départ (optionnel)
   * @returns {Object} Données mock
   */
  generateMockStockData(symbol, days, startPrice = null) {
    const basePrice = startPrice || this.getSymbolBasePrice(symbol);
    const volatility = this.getSymbolVolatility(symbol);
    
    const prices = [];
    const dates = [];
    const volumes = [];
    
    let currentPrice = basePrice;
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Génération de prix avec marche aléatoire et tendance
      const drift = 0.0002; // Légère tendance haussière
      const randomFactor = (Math.random() - 0.5) * 2 * volatility;
      const change = drift + randomFactor;
      
      currentPrice *= (1 + change);
      
      // Éviter les prix négatifs
      currentPrice = Math.max(currentPrice, 0.01);
      
      prices.push(parseFloat(currentPrice.toFixed(2)));
      dates.push(date.toISOString().split('T')[0]);
      
      // Volume aléatoire basé sur le symbole
      const baseVolume = this.getSymbolBaseVolume(symbol);
      const volumeVariation = 0.5 + Math.random();
      volumes.push(Math.floor(baseVolume * volumeVariation));
    }

    return {
      symbol: symbol.toUpperCase(),
      prices,
      dates,
      volumes,
      currency: 'USD',
      exchange: 'MOCK',
      dataSource: 'Mock Data Generator',
      fetchTime: new Date().toISOString(),
      metadata: {
        note: 'This is simulated data for demonstration purposes',
        volatility: volatility,
        basePrice: basePrice,
      }
    };
  }

  /**
   * Génère des données mock avec prix actuel fourni
   */
  generateMockStockDataWithPrice(symbol, days, currentPrice) {
    return this.generateMockStockData(symbol, days, currentPrice);
  }

  /**
   * Obtient le prix de base pour un symbole
   */
  getSymbolBasePrice(symbol) {
    const prices = {
      'AAPL': 150,
      'MSFT': 300,
      'GOOGL': 2500,
      'AMZN': 3200,
      'TSLA': 800,
      'META': 200,
      'NVDA': 500,
      'BRK.B': 300,
      'V': 250,
      'JNJ': 160,
      'WMT': 140,
      'PG': 150,
      'JPM': 150,
      'UNH': 400,
      'HD': 320,
    };
    
    return prices[symbol.toUpperCase()] || (50 + Math.random() * 200);
  }

  /**
   * Obtient la volatilité typique pour un symbole
   */
  getSymbolVolatility(symbol) {
    const volatilities = {
      'AAPL': 0.02,
      'MSFT': 0.018,
      'GOOGL': 0.025,
      'AMZN': 0.03,
      'TSLA': 0.045, // Plus volatile
      'META': 0.035,
      'NVDA': 0.04,
      'BRK.B': 0.015, // Moins volatile
      'V': 0.02,
      'JNJ': 0.012, // Très stable
      'WMT': 0.015,
      'PG': 0.012,
      'JPM': 0.025,
      'UNH': 0.02,
      'HD': 0.022,
    };
    
    return volatilities[symbol.toUpperCase()] || 0.025;
  }

  /**
   * Obtient le volume de base pour un symbole
   */
  getSymbolBaseVolume(symbol) {
    const volumes = {
      'AAPL': 50000000,
      'MSFT': 30000000,
      'GOOGL': 25000000,
      'AMZN': 35000000,
      'TSLA': 40000000,
      'META': 25000000,
      'NVDA': 45000000,
      'BRK.B': 5000000,
      'V': 8000000,
      'JNJ': 10000000,
      'WMT': 12000000,
      'PG': 7000000,
      'JPM': 15000000,
      'UNH': 6000000,
      'HD': 8000000,
    };
    
    return volumes[symbol.toUpperCase()] || (1000000 + Math.random() * 10000000);
  }

  /**
   * Convertit une période en nombre de jours
   */
  getPeriodDays(period) {
    const periods = {
      '1d': 1,
      '5d': 5,
      '1mo': 30,
      '3mo': 90,
      '6mo': 180,
      '1y': 365,
      '2y': 730,
      '5y': 1825,
      '10y': 3650,
      'ytd': Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24)),
      'max': 3650, // 10 ans max pour mock data
    };
    
    return periods[period] || 365;
  }

  /**
   * Convertit une période en secondes (pour timestamps Unix)
   */
  getPeriodSeconds(period) {
    return this.getPeriodDays(period) * 24 * 60 * 60;
  }

  /**
   * Vérifie si les données en cache sont encore valides
   */
  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    return (Date.now() - cached.timestamp) < this.config.cacheDuration;
  }

  /**
   * Met en cache les données
   */
  cacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    
    // Nettoyage du cache si trop gros
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Vide le cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Récupère les métadonnées sur l'état du fetcher
   */
  getStatus() {
    return {
      cacheSize: this.cache.size,
      availableSources: this.dataSources,
      config: this.config,
    };
  }
}

// Export d'une instance singleton
export const realTimeDataFetcher = new RealTimeDataFetcher();

// Export de la classe pour les tests
export { RealTimeDataFetcher };

// Export par défaut
export default realTimeDataFetcher;
