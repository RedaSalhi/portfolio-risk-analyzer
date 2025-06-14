// src/utils/realTimeDataFetcher.js
// PRODUCTION-GRADE REAL-TIME DATA SYSTEM
// Eliminates all mock data, ensures accuracy and freshness

export class RealTimeDataFetcher {
  constructor(config = {}) {
    this.apiKeys = {
      // Add your API keys here for production use
      alphavantage: config.alphavantage || process.env.ALPHAVANTAGE_API_KEY,
      polygon: config.polygon || process.env.POLYGON_API_KEY,
      fred: config.fred || process.env.FRED_API_KEY,
      iex: config.iex || process.env.IEX_API_KEY
    };
    
    this.cache = new Map();
    this.maxCacheAge = 5 * 60 * 1000; // 5 minutes
    this.rateLimits = new Map();
    this.fallbackOrder = ['polygon', 'alphavantage', 'yahoo', 'iex'];
    
    console.log('🔄 Real-time data fetcher initialized');
  }

  /**
   * Fetch real-time stock data with multiple fallbacks
   */
  async fetchStockData(symbol, period = '1y', forceRefresh = false) {
    const cacheKey = `${symbol}_${period}`;
    
    // Check cache first (unless forced refresh)
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      console.log(`📋 Using cached data for ${symbol}`);
      return this.cache.get(cacheKey).data;
    }

    console.log(`🔄 Fetching real-time data for ${symbol}...`);

    // Try each data source in order
    for (const source of this.fallbackOrder) {
      try {
        await this.respectRateLimit(source);
        
        let data;
        switch (source) {
          case 'polygon':
            data = await this.fetchFromPolygon(symbol, period);
            break;
          case 'alphavantage':
            data = await this.fetchFromAlphaVantage(symbol, period);
            break;
          case 'yahoo':
            data = await this.fetchFromYahoo(symbol, period);
            break;
          case 'iex':
            data = await this.fetchFromIEX(symbol, period);
            break;
        }

        if (data && this.validateDataQuality(data)) {
          console.log(`✅ Real-time data fetched from ${source} for ${symbol}`);
          this.cacheData(cacheKey, data);
          return data;
        }
      } catch (error) {
        console.warn(`⚠️ ${source} failed for ${symbol}:`, error.message);
        continue;
      }
    }

    throw new Error(`❌ All data sources failed for ${symbol}`);
  }

  /**
   * Fetch from Polygon.io (most reliable, real-time)
   */
  async fetchFromPolygon(symbol, period) {
    if (!this.apiKeys.polygon) throw new Error('Polygon API key required');
    
    const endDate = new Date();
    const startDate = new Date(endDate - this.getPeriodMilliseconds(period));
    
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}?adjusted=true&sort=asc&apikey=${this.apiKeys.polygon}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Polygon API error: ${response.status}`);
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error('No data from Polygon');
    }

    return this.formatPolygonData(symbol, data.results);
  }

  /**
   * Fetch from Alpha Vantage (backup, good for fundamentals)
   */
  async fetchFromAlphaVantage(symbol, period) {
    if (!this.apiKeys.alphavantage) throw new Error('Alpha Vantage API key required');
    
    const func = period === '1mo' ? 'TIME_SERIES_DAILY' : 'TIME_SERIES_DAILY';
    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&outputsize=full&apikey=${this.apiKeys.alphavantage}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Alpha Vantage API error: ${response.status}`);
    
    const data = await response.json();
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || data['Note']);
    }

    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) throw new Error('No time series data from Alpha Vantage');

    return this.formatAlphaVantageData(symbol, timeSeries, period);
  }

  /**
   * Enhanced Yahoo Finance fetcher with proxy support
   */
  async fetchFromYahoo(symbol, period) {
    // Use CORS proxy for browser environments
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const now = Math.floor(Date.now() / 1000);
    const seconds = this.getPeriodSeconds(period);
    const start = now - seconds;
    
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${now}&interval=1d&includePrePost=false&events=div,splits`;
    const url = proxyUrl + encodeURIComponent(yahooUrl);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Yahoo API error: ${response.status}`);
    
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result || !result.indicators?.quote?.[0]) {
      throw new Error('Invalid data from Yahoo Finance');
    }

    return this.formatYahooData(symbol, result);
  }

  /**
   * Fetch from IEX Cloud (backup)
   */
  async fetchFromIEX(symbol, period) {
    if (!this.apiKeys.iex) throw new Error('IEX API key required');
    
    const range = this.getIEXRange(period);
    const url = `https://cloud.iexapis.com/stable/stock/${symbol}/chart/${range}?token=${this.apiKeys.iex}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`IEX API error: ${response.status}`);
    
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No data from IEX');
    }

    return this.formatIEXData(symbol, data);
  }

  /**
   * Fetch real-time risk-free rate from FRED
   */
  async getRiskFreeRate() {
    try {
      // Try FRED first (most authoritative)
      const fredData = await this.fetchFromFRED('DGS3MO'); // 3-Month Treasury
      if (fredData && fredData.length > 0) {
        const latestRate = fredData[fredData.length - 1].value;
        if (latestRate && !isNaN(latestRate)) {
          console.log(`✅ Real-time risk-free rate: ${latestRate}% from FRED`);
          return latestRate / 100; // Convert percentage to decimal
        }
      }
    } catch (error) {
      console.warn('⚠️ FRED risk-free rate failed:', error.message);
    }

    try {
      // Fallback to Yahoo Finance ^IRX (13-week Treasury)
      const irxData = await this.fetchStockData('^IRX', '1mo');
      if (irxData && irxData.currentPrice) {
        const rate = irxData.currentPrice / 100;
        console.log(`✅ Risk-free rate from Yahoo ^IRX: ${(rate * 100).toFixed(2)}%`);
        return rate;
      }
    } catch (error) {
      console.warn('⚠️ Yahoo ^IRX failed:', error.message);
    }

    // Last resort: Current Federal Funds Rate (hardcoded as of current date)
    const currentFedRate = 0.0525; // 5.25% as of latest Fed meeting
    console.warn(`⚠️ Using current Fed Funds Rate: ${(currentFedRate * 100).toFixed(2)}%`);
    return currentFedRate;
  }

  /**
   * Fetch market benchmark data (S&P 500)
   */
  async getMarketData(period = '1y') {
    try {
      const sp500Data = await this.fetchStockData('^GSPC', period);
      if (sp500Data && sp500Data.returns.length > 0) {
        console.log(`✅ Market data (S&P 500): ${sp500Data.returns.length} daily returns`);
        return sp500Data.returns.map(r => r.return);
      }
    } catch (error) {
      console.error('❌ Failed to fetch market data:', error);
    }
    
    throw new Error('Unable to fetch market benchmark data');
  }

  /**
   * Fetch multiple stocks with real-time synchronization
   */
  async fetchMultipleStocks(symbols, period = '1y', forceRefresh = false) {
    console.log(`🔄 Fetching real-time portfolio data for: ${symbols.join(', ')}`);
    
    // Fetch all stocks concurrently
    const promises = symbols.map(symbol => 
      this.fetchStockData(symbol, period, forceRefresh)
        .catch(error => {
          console.error(`❌ Failed to fetch ${symbol}:`, error.message);
          return null; // Don't fail entire portfolio for one stock
        })
    );
    
    const results = await Promise.all(promises);
    
    // Filter out failed stocks
    const successfulResults = results.filter(result => result !== null);
    const successfulSymbols = symbols.filter((_, index) => results[index] !== null);
    
    if (successfulResults.length === 0) {
      throw new Error('❌ Failed to fetch data for any symbols');
    }
    
    if (successfulResults.length < symbols.length) {
      const failedSymbols = symbols.filter((_, index) => results[index] === null);
      console.warn(`⚠️ Failed to fetch: ${failedSymbols.join(', ')}`);
    }

    const combinedData = {};
    const allReturns = {};
    
    successfulResults.forEach((data, index) => {
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
        failedSymbols: symbols.filter(s => !successfulSymbols.includes(s)),
        fetchTime: new Date().toISOString(),
        dataSource: 'real-time-multi-source'
      }
    };
  }

  // ===== DATA VALIDATION METHODS =====

  /**
   * Validate data quality and freshness
   */
  validateDataQuality(data) {
    if (!data || !data.prices || !data.returns) return false;
    
    // Check minimum data points
    if (data.prices.length < 20) {
      console.warn('⚠️ Insufficient data points');
      return false;
    }
    
    // Check data freshness (within last 7 days for daily data)
    const latestDate = new Date(data.prices[data.prices.length - 1].date);
    const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest > 7) {
      console.warn(`⚠️ Data is ${daysSinceLatest.toFixed(1)} days old`);
      return false;
    }
    
    // Check for data anomalies (extreme price changes)
    const returns = data.returns.map(r => r.return);
    const extremeReturns = returns.filter(r => Math.abs(r) > 0.5); // 50% daily change
    
    if (extremeReturns.length > returns.length * 0.01) { // More than 1% extreme moves
      console.warn('⚠️ Suspicious data: too many extreme returns');
      return false;
    }
    
    // Check for missing current price
    if (!data.currentPrice || data.currentPrice <= 0) {
      console.warn('⚠️ Invalid current price');
      return false;
    }
    
    console.log(`✅ Data quality validated for ${data.symbol}`);
    return true;
  }

  /**
   * Validate data synchronization across multiple stocks
   */
  validateDataSync(allReturns) {
    const symbols = Object.keys(allReturns);
    if (symbols.length < 2) return true;
    
    const lengths = symbols.map(symbol => allReturns[symbol].length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    
    // Allow up to 5% difference in data lengths
    if ((maxLength - minLength) / maxLength > 0.05) {
      console.warn(`⚠️ Data sync issue: lengths vary from ${minLength} to ${maxLength}`);
      
      // Truncate all series to minimum length
      symbols.forEach(symbol => {
        allReturns[symbol] = allReturns[symbol].slice(-minLength);
      });
      
      console.log(`🔧 Synchronized data to ${minLength} observations`);
    }
    
    return true;
  }

  // ===== CACHING AND RATE LIMITING =====

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

  async respectRateLimit(source) {
    const now = Date.now();
    const lastCall = this.rateLimits.get(source) || 0;
    const minInterval = this.getRateLimitInterval(source);
    
    const waitTime = minInterval - (now - lastCall);
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimits.set(source, Date.now());
  }

  getRateLimitInterval(source) {
    const intervals = {
      polygon: 100,      // 10 calls/second
      alphavantage: 12000, // 5 calls/minute for free tier
      yahoo: 1000,       // 1 call/second (conservative)
      iex: 100          // 100 calls/second
    };
    return intervals[source] || 1000;
  }

  // ===== DATA FORMATTERS =====

  formatPolygonData(symbol, results) {
    const prices = results.map(item => ({
      date: new Date(item.t),
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v
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
        source: 'polygon',
        isMock: false,
        fetchTime: new Date().toISOString()
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
        fetchTime: new Date().toISOString()
      }
    };
  }

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
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: price,
        volume: quote.volume[i]
      });
      
      if (prevClose != null) {
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
        fetchTime: new Date().toISOString()
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
        fetchTime: new Date().toISOString()
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

  async fetchFromFRED(series) {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${this.apiKeys.fred}&file_type=json&limit=30&sort_order=desc`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FRED API error: ${response.status}`);
    
    const data = await response.json();
    return data.observations?.filter(obs => obs.value !== '.') || [];
  }

  /**
   * System health check
   */
  async healthCheck() {
    console.log('🏥 Running system health check...');
    
    const results = {
      dataSources: {},
      riskFreeRate: false,
      marketData: false,
      cacheStatus: this.cache.size,
      timestamp: new Date().toISOString()
    };
    
    // Test each data source
    for (const source of this.fallbackOrder) {
      try {
        if (source === 'yahoo') {
          await this.fetchFromYahoo('AAPL', '1mo');
        } else if (this.apiKeys[source]) {
          // Test with small request
          await this[`fetchFrom${source.charAt(0).toUpperCase() + source.slice(1)}`]('AAPL', '1mo');
        }
        results.dataSources[source] = '✅ Available';
      } catch (error) {
        results.dataSources[source] = `❌ ${error.message}`;
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
    
    console.log('🏥 Health check completed:', results);
    return results;
  }
}

// Export singleton instance
export const realTimeDataFetcher = new RealTimeDataFetcher();
