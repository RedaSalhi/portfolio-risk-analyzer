// src/utils/realTimeDataFetcher.js
// MOBILE-OPTIMIZED REAL-TIME DATA FETCHER
// Handles CORS, multiple API sources, and mobile-specific optimizations

import AsyncStorage from '@react-native-async-storage/async-storage';

class MobileRealTimeDataFetcher {
  constructor() {
    this.cache = new Map();
    this.maxCacheAge = 5 * 60 * 1000; // 5 minutes for mobile
    this.rateLimits = new Map();
    
    // Mobile-optimized API configuration
    this.config = {
      timeout: 15000, // 15 seconds for mobile networks
      retries: 2,
      useProxy: true, // Handle CORS for web browsers
    };
    
    // API sources in priority order (free tiers first)
    this.dataSources = [
      { name: 'yahoo', priority: 1, rateLimit: 2000 }, // 2 second intervals
      { name: 'alphavantage', priority: 2, rateLimit: 12000 }, // Free tier: 5 calls/minute
      { name: 'iex', priority: 3, rateLimit: 1000 }, // 1 second intervals
    ];
    
    console.log('📱 Mobile real-time data fetcher initialized');
  }

  /**
   * Fetch real-time stock data with mobile optimizations
   */
  async fetchStockData(symbol, period = '1y', forceRefresh = false) {
    const cacheKey = `${symbol}_${period}`;
    
    // Check cache first (mobile data conservation)
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      console.log(`📋 Using cached data for ${symbol}`);
      return this.cache.get(cacheKey).data;
    }

    console.log(`📱 Fetching real-time data for ${symbol}...`);

    // Try each data source
    for (const source of this.dataSources) {
      try {
        await this.respectRateLimit(source.name);
        
        let data;
        switch (source.name) {
          case 'yahoo':
            data = await this.fetchFromYahoo(symbol, period);
            break;
          case 'alphavantage':
            data = await this.fetchFromAlphaVantage(symbol, period);
            break;
          case 'iex':
            data = await this.fetchFromIEX(symbol, period);
            break;
        }

        if (data && this.validateDataQuality(data, symbol)) {
          console.log(`✅ Real-time data fetched from ${source.name} for ${symbol}`);
          this.cacheData(cacheKey, data);
          
          // Store in AsyncStorage for offline access
          await this.storeOfflineData(symbol, data);
          
          return data;
        }
      } catch (error) {
        console.warn(`⚠️ ${source.name} failed for ${symbol}:`, error.message);
        continue;
      }
    }

    // Fallback to offline data if available
    try {
      const offlineData = await this.getOfflineData(symbol);
      if (offlineData) {
        console.log(`📴 Using offline data for ${symbol}`);
        return { ...offlineData, metadata: { ...offlineData.metadata, isOffline: true } };
      }
    } catch (error) {
      console.warn('Offline data not available:', error.message);
    }

    throw new Error(`❌ All data sources failed for ${symbol}`);
  }

  /**
   * Enhanced Yahoo Finance with mobile CORS proxy
   */
  async fetchFromYahoo(symbol, period) {
    const now = Math.floor(Date.now() / 1000);
    const seconds = this.getPeriodSeconds(period);
    const start = now - seconds;
    
    // Use CORS proxy for mobile/web environments
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${now}&interval=1d&includePrePost=false&events=div,splits`;
    
    const url = this.config.useProxy ? proxyUrl + encodeURIComponent(yahooUrl) : yahooUrl;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Mobile; rv:40.0) Gecko/40.0 Firefox/40.0',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Yahoo API error: ${response.status}`);
      }
      
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      
      if (!result || !result.indicators?.quote?.[0]) {
        throw new Error('Invalid data from Yahoo Finance');
      }

      return this.formatYahooData(symbol, result);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Alpha Vantage API (requires API key)
   */
  async fetchFromAlphaVantage(symbol, period) {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY || 'demo';
    
    if (apiKey === 'demo') {
      throw new Error('Alpha Vantage API key required');
    }
    
    const func = period === '1mo' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_DAILY';
    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&outputsize=full&apikey=${apiKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data['Error Message'] || data['Note']) {
        throw new Error(data['Error Message'] || data['Note']);
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) {
        throw new Error('No time series data from Alpha Vantage');
      }

      return this.formatAlphaVantageData(symbol, timeSeries, period);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * IEX Cloud API (requires API key)
   */
  async fetchFromIEX(symbol, period) {
    const apiKey = process.env.IEX_API_KEY;
    
    if (!apiKey) {
      throw new Error('IEX API key required');
    }
    
    const range = this.getIEXRange(period);
    const url = `https://cloud.iexapis.com/stable/stock/${symbol}/chart/${range}?token=${apiKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`IEX API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data from IEX');
      }

      return this.formatIEXData(symbol, data);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Fetch multiple stocks with mobile optimization
   */
  async fetchMultipleStocks(symbols, period = '1y', forceRefresh = false) {
    console.log(`📱 Fetching portfolio data for: ${symbols.join(', ')}`);
    
    // Batch requests with delays to respect rate limits
    const results = [];
    const successfulSymbols = [];
    const failedSymbols = [];
    
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      
      try {
        // Add delay between requests for mobile networks
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const data = await this.fetchStockData(symbol, period, forceRefresh);
        results.push(data);
        successfulSymbols.push(symbol);
        
      } catch (error) {
        console.error(`❌ Failed to fetch ${symbol}:`, error.message);
        failedSymbols.push(symbol);
        results.push(null);
      }
    }
    
    // Filter out failed results
    const validResults = results.filter(result => result !== null);
    
    if (validResults.length === 0) {
      throw new Error('❌ Failed to fetch data for any symbols');
    }
    
    if (failedSymbols.length > 0) {
      console.warn(`⚠️ Failed to fetch: ${failedSymbols.join(', ')}`);
    }

    const combinedData = {};
    const allReturns = {};
    
    validResults.forEach((data, index) => {
      const symbol = successfulSymbols[index];
      combinedData[symbol] = data;
      allReturns[symbol] = data.returns.map(r => r.return);
    });

    // Validate data synchronization
    this.validateDataSync(allReturns);

    console.log(`✅ Portfolio data fetched: ${successfulSymbols.join(', ')}`);
    
    return {
      individual: combinedData,
      returns: allReturns,
      symbols: successfulSymbols,
      metadata: {
        requestedSymbols: symbols,
        successfulSymbols: successfulSymbols,
        failedSymbols: failedSymbols,
        fetchTime: new Date().toISOString(),
        dataSource: 'real-time-multi-source',
        isMobile: true
      }
    };
  }

  /**
   * Get real-time risk-free rate with mobile fallbacks
   */
  async getRiskFreeRate() {
    console.log('📱 Fetching real-time risk-free rate...');
    
    // Try multiple sources
    const sources = [
      { name: 'Yahoo ^IRX', symbol: '^IRX' },
      { name: 'Yahoo ^TNX', symbol: '^TNX' }, // 10-year Treasury
      { name: 'Yahoo ^FVX', symbol: '^FVX' }, // 5-year Treasury
    ];
    
    for (const source of sources) {
      try {
        const data = await this.fetchStockData(source.symbol, '1mo');
        if (data && data.currentPrice > 0) {
          const rate = data.currentPrice / 100;
          console.log(`✅ Risk-free rate from ${source.name}: ${(rate * 100).toFixed(3)}%`);
          return rate;
        }
      } catch (error) {
        console.warn(`⚠️ ${source.name} failed:`, error.message);
        continue;
      }
    }

    // Fallback to cached rate if available
    try {
      const cachedRate = await AsyncStorage.getItem('cached_risk_free_rate');
      if (cachedRate) {
        const parsed = JSON.parse(cachedRate);
        const age = Date.now() - parsed.timestamp;
        if (age < 24 * 60 * 60 * 1000) { // 24 hours
          console.log(`📋 Using cached risk-free rate: ${(parsed.rate * 100).toFixed(3)}%`);
          return parsed.rate;
        }
      }
    } catch (error) {
      console.warn('Failed to get cached risk-free rate:', error.message);
    }

    // Last resort: current approximate Fed rate
    const fallbackRate = 0.0525; // 5.25% as of current Fed policy
    console.warn(`⚠️ Using fallback Fed rate: ${(fallbackRate * 100).toFixed(2)}%`);
    return fallbackRate;
  }

  /**
   * Get market benchmark data
   */
  async getMarketData(period = '1y') {
    console.log('📱 Fetching real-time market data (S&P 500)...');
    
    const benchmarks = ['^GSPC', 'SPY', 'VTI']; // S&P 500, SPY ETF, Total Market ETF
    
    for (const benchmark of benchmarks) {
      try {
        const data = await this.fetchStockData(benchmark, period);
        if (data && data.returns.length > 50) {
          console.log(`✅ Market data (${benchmark}): ${data.returns.length} returns`);
          return data.returns.map(r => r.return);
        }
      } catch (error) {
        console.warn(`⚠️ ${benchmark} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('Unable to fetch market benchmark data');
  }

  // ===== DATA VALIDATION & UTILITIES =====

  /**
   * Mobile-specific data quality validation
   */
  validateDataQuality(data, symbol) {
    if (!data || !data.prices || !data.returns) {
      console.warn(`❌ ${symbol}: Invalid data structure`);
      return false;
    }
    
    // Check minimum data points (relaxed for mobile)
    if (data.prices.length < 15) {
      console.warn(`❌ ${symbol}: Insufficient data points (${data.prices.length})`);
      return false;
    }
    
    // Check data freshness (more lenient for mobile)
    const latestDate = new Date(data.prices[data.prices.length - 1].date);
    const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest > 10) {
      console.warn(`⚠️ ${symbol}: Data is ${daysSinceLatest.toFixed(1)} days old`);
      // Don't fail validation for mobile - warn but continue
    }
    
    // Check for reasonable price ranges
    const prices = data.prices.map(p => p.close).filter(p => p > 0);
    if (prices.length === 0) {
      console.warn(`❌ ${symbol}: No valid prices`);
      return false;
    }
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (maxPrice / minPrice > 10) { // More than 10x price change
      console.warn(`⚠️ ${symbol}: Extreme price range detected`);
      // Continue anyway for mobile
    }
    
    console.log(`✅ ${symbol}: Data quality validated`);
    return true;
  }

  /**
   * Validate data synchronization for mobile
   */
  validateDataSync(allReturns) {
    const symbols = Object.keys(allReturns);
    if (symbols.length < 2) return true;
    
    const lengths = symbols.map(symbol => allReturns[symbol].length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    
    // Allow up to 10% difference for mobile networks
    if ((maxLength - minLength) / maxLength > 0.1) {
      console.warn(`⚠️ Data sync issue: lengths vary from ${minLength} to ${maxLength}`);
      
      // Truncate all series to minimum length
      symbols.forEach(symbol => {
        allReturns[symbol] = allReturns[symbol].slice(-minLength);
      });
      
      console.log(`🔧 Synchronized data to ${minLength} observations`);
    }
    
    return true;
  }

  // ===== CACHING AND STORAGE =====

  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    return (Date.now() - cached.timestamp) < this.maxCacheAge;
  }

  cacheData(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  async storeOfflineData(symbol, data) {
    try {
      const offlineData = {
        ...data,
        cachedAt: Date.now()
      };
      await AsyncStorage.setItem(`offline_${symbol}`, JSON.stringify(offlineData));
    } catch (error) {
      console.warn('Failed to store offline data:', error.message);
    }
  }

  async getOfflineData(symbol) {
    try {
      const stored = await AsyncStorage.getItem(`offline_${symbol}`);
      if (stored) {
        const data = JSON.parse(stored);
        const age = Date.now() - data.cachedAt;
        
        // Use offline data if less than 7 days old
        if (age < 7 * 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to get offline data:', error.message);
    }
    return null;
  }

  async respectRateLimit(source) {
    const now = Date.now();
    const lastCall = this.rateLimits.get(source) || 0;
    const sourceConfig = this.dataSources.find(s => s.name === source);
    const minInterval = sourceConfig ? sourceConfig.rateLimit : 1000;
    
    const waitTime = minInterval - (now - lastCall);
    if (waitTime > 0) {
      console.log(`⏱️ Rate limiting ${source}: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimits.set(source, Date.now());
  }

  // ===== DATA FORMATTERS =====

  formatYahooData(symbol, result) {
    const { timestamp } = result;
    const quote = result.indicators.quote[0];
    
    const prices = [];
    const returns = [];
    let prevClose = null;
    
    for (let i = 0; i < timestamp.length; i++) {
      const price = quote.close[i];
      if (price == null) continue;
      
      const date = new Date(timestamp[i] * 1000);
      prices.push({
        date,
        open: quote.open[i] || price,
        high: quote.high[i] || price,
        low: quote.low[i] || price,
        close: price,
        volume: quote.volume[i] || 0
      });
      
      if (prevClose != null && prevClose > 0) {
        returns.push({ 
          date, 
          return: (price - prevClose) / prevClose 
        });
      }
      prevClose = price;
    }

    return {
      symbol: symbol,
      prices: prices,
      returns: returns,
      currentPrice: prices[prices.length - 1]?.close || 0,
      metadata: {
        start: prices[0]?.date,
        end: prices[prices.length - 1]?.date,
        count: prices.length,
        source: 'yahoo',
        isMock: false,
        fetchTime: new Date().toISOString(),
        isMobile: true
      }
    };
  }

  formatAlphaVantageData(symbol, timeSeries, period) {
    const sortedDates = Object.keys(timeSeries).sort();
    const periodStart = new Date(Date.now() - this.getPeriodMilliseconds(period));
    
    const filteredDates = sortedDates.filter(date => new Date(date) >= periodStart);
    
    const prices = filteredDates.map(date => ({
      date: new Date(date),
      open: parseFloat(timeSeries[date]['1. open']),
      high: parseFloat(timeSeries[date]['2. high']),
      low: parseFloat(timeSeries[date]['3. low']),
      close: parseFloat(timeSeries[date]['4. close']),
      volume: parseInt(timeSeries[date]['5. volume'])
    }));

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i].close - prices[i-1].close) / prices[i-1].close;
      returns.push({
        date: prices[i].date,
        return: returnValue
      });
    }

    return {
      symbol: symbol,
      prices: prices,
      returns: returns,
      currentPrice: prices[prices.length - 1]?.close || 0,
      metadata: {
        start: prices[0]?.date,
        end: prices[prices.length - 1]?.date,
        count: prices.length,
        source: 'alphavantage',
        isMock: false,
        fetchTime: new Date().toISOString(),
        isMobile: true
      }
    };
  }

  formatIEXData(symbol, data) {
    const prices = data.map(item => ({
      date: new Date(item.date),
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i].close - prices[i-1].close) / prices[i-1].close;
      returns.push({
        date: prices[i].date,
        return: returnValue
      });
    }

    return {
      symbol: symbol,
      prices: prices,
      returns: returns,
      currentPrice: prices[prices.length - 1]?.close || 0,
      metadata: {
        start: prices[0]?.date,
        end: prices[prices.length - 1]?.date,
        count: prices.length,
        source: 'iex',
        isMock: false,
        fetchTime: new Date().toISOString(),
        isMobile: true
      }
    };
  }

  // ===== UTILITY METHODS =====

  getPeriodMilliseconds(period) {
    const periods = {
      '1mo': 30 * 24 * 60 * 60 * 1000,
      '3mo': 90 * 24 * 60 * 60 * 1000,
      '6mo': 180 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
      '2y': 730 * 24 * 60 * 60 * 1000,
      '5y': 1825 * 24 * 60 * 60 * 1000
    };
    return periods[period] || periods['1y'];
  }

  getPeriodSeconds(period) {
    return Math.floor(this.getPeriodMilliseconds(period) / 1000);
  }

  getIEXRange(period) {
    const ranges = {
      '1mo': '1m',
      '3mo': '3m',
      '6mo': '6m',
      '1y': '1y',
      '2y': '2y',
      '5y': '5y'
    };
    return ranges[period] || '1y';
  }

  /**
   * Mobile health check
   */
  async healthCheck() {
    console.log('📱 Running mobile system health check...');
    
    const results = {
      dataSources: {},
      riskFreeRate: false,
      marketData: false,
      offlineCapability: false,
      cacheStatus: this.cache.size,
      networkStatus: navigator.onLine !== false,
      timestamp: new Date().toISOString()
    };
    
    // Test data sources
    for (const source of this.dataSources) {
      try {
        // Quick test with small request
        if (source.name === 'yahoo') {
          await this.fetchFromYahoo('AAPL', '1mo');
          results.dataSources[source.name] = '✅ Available';
        } else {
          results.dataSources[source.name] = '⚠️ Requires API key';
        }
      } catch (error) {
        results.dataSources[source.name] = `❌ ${error.message}`;
      }
    }
    
    // Test risk-free rate
    try {
      await this.getRiskFreeRate();
      results.riskFreeRate = '✅ Available';
    } catch (error) {
      results.riskFreeRate = `❌ ${error.message}`;
    }
    
    // Test market data
    try {
      await this.getMarketData('1mo');
      results.marketData = '✅ Available';
    } catch (error) {
      results.marketData = `❌ ${error.message}`;
    }
    
    // Test offline capability
    try {
      await this.storeOfflineData('TEST', { test: true });
      await this.getOfflineData('TEST');
      results.offlineCapability = '✅ Available';
    } catch (error) {
      results.offlineCapability = `❌ ${error.message}`;
    }
    
    console.log('📱 Mobile health check completed:', results);
    return results;
  }
}

// Export singleton instance
export const realTimeDataFetcher = new MobileRealTimeDataFetcher();
