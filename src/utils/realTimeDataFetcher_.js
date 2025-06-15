// src/utils/realTimeDataFetcher.js - FIXED VERSION
// Corrected CORS handling, better error management, and improved data validation

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
   * FIXED: Better error handling and data validation
   */
  async fetchStockData(symbol, period = '1y', forceRefresh = false) {
    const cacheKey = `${symbol}_${period}`;
    
    // Check cache first (mobile data conservation)
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      console.log(`📋 Using cached data for ${symbol}`);
      return this.cache.get(cacheKey).data;
    }

    console.log(`📱 Fetching real-time data for ${symbol}...`);

    let lastError = null;
    
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
          default:
            throw new Error(`Unknown data source: ${source.name}`);
        }

        if (data && this.validateDataQuality(data, symbol)) {
          console.log(`✅ Real-time data fetched from ${source.name} for ${symbol}`);
          this.cacheData(cacheKey, data);
          
          // Store in localStorage for offline access (if available)
          await this.storeOfflineData(symbol, data);
          
          return data;
        } else {
          throw new Error(`Invalid data received from ${source.name}`);
        }
      } catch (error) {
        console.warn(`⚠️ ${source.name} failed for ${symbol}:`, error.message);
        lastError = error;
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

    // If all sources fail, throw the last error with more context
    throw new Error(`❌ All data sources failed for ${symbol}. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * FIXED: Enhanced Yahoo Finance with better CORS handling
   */
  async fetchFromYahoo(symbol, period) {
    const now = Math.floor(Date.now() / 1000);
    const seconds = this.getPeriodSeconds(period);
    const start = now - seconds;
    
    // Multiple CORS proxy options for better reliability
    const proxyOptions = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
      // Add direct access as last resort for environments that support it
      ''
    ];
    
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${start}&period2=${now}&interval=1d&includePrePost=false&events=div,splits`;
    
    for (const proxy of proxyOptions) {
      const url = proxy ? proxy + encodeURIComponent(yahooUrl) : yahooUrl;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Mobile; rv:40.0) Gecko/40.0 Firefox/40.0',
            'Accept': 'application/json',
          },
          mode: proxy ? 'cors' : 'no-cors'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Yahoo API error: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        
        if (!result || !result.indicators?.quote?.[0]) {
          throw new Error('Invalid data structure from Yahoo Finance');
        }

        const formattedData = this.formatYahooData(symbol, result);
        
        // Additional validation
        if (!formattedData.prices || formattedData.prices.length < 10) {
          throw new Error('Insufficient price data from Yahoo Finance');
        }

        return formattedData;
        
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.warn(`Timeout with proxy: ${proxy || 'direct'}`);
          continue;
        }
        console.warn(`Error with proxy ${proxy || 'direct'}:`, error.message);
        continue;
      }
    }
    
    throw new Error('All Yahoo Finance proxy options failed');
  }

  /**
   * FIXED: Alpha Vantage with better error handling
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
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Enhanced error checking
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage Error: ${data['Error Message']}`);
      }
      
      if (data['Note']) {
        throw new Error(`Alpha Vantage Rate Limit: ${data['Note']}`);
      }
      
      if (data['Information']) {
        throw new Error(`Alpha Vantage Info: ${data['Information']}`);
      }

      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries || Object.keys(timeSeries).length === 0) {
        throw new Error('No time series data from Alpha Vantage');
      }

      return this.formatAlphaVantageData(symbol, timeSeries, period);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Alpha Vantage request timeout');
      }
      throw error;
    }
  }

  /**
   * FIXED: IEX Cloud with better validation
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
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Symbol ${symbol} not found on IEX`);
        }
        throw new Error(`IEX API error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format from IEX');
      }
      
      if (data.length === 0) {
        throw new Error(`No data available for ${symbol} on IEX`);
      }

      return this.formatIEXData(symbol, data);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('IEX request timeout');
      }
      throw error;
    }
  }

  /**
   * FIXED: Enhanced multiple stocks fetching with better error handling
   */
  async fetchMultipleStocks(symbols, period = '1y', forceRefresh = false) {
    console.log(`📱 Fetching portfolio data for: ${symbols.join(', ')}`);
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      throw new Error('Invalid symbols array provided');
    }
    
    // Validate symbol format
    const validSymbols = symbols.filter(symbol => {
      const isValid = typeof symbol === 'string' && /^[A-Z^]{1,5}$/.test(symbol.trim());
      if (!isValid) {
        console.warn(`Invalid symbol format: ${symbol}`);
      }
      return isValid;
    });
    
    if (validSymbols.length === 0) {
      throw new Error('No valid symbols provided');
    }
    
    // Batch requests with delays to respect rate limits
    const results = [];
    const successfulSymbols = [];
    const failedSymbols = [];
    
    for (let i = 0; i < validSymbols.length; i++) {
      const symbol = validSymbols[i].trim().toUpperCase();
      
      try {
        // Add delay between requests for mobile networks and rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const data = await this.fetchStockData(symbol, period, forceRefresh);
        
        // Additional validation for multi-stock data
        if (!data || !data.prices || data.prices.length < 10) {
          throw new Error(`Insufficient data for ${symbol}`);
        }
        
        results.push(data);
        successfulSymbols.push(symbol);
        
      } catch (error) {
        console.error(`❌ Failed to fetch ${symbol}:`, error.message);
        failedSymbols.push({ symbol, error: error.message });
        // Continue with other symbols instead of stopping
      }
    }
    
    // Require at least one successful result
    if (results.length === 0) {
      const errorDetails = failedSymbols.map(f => `${f.symbol}: ${f.error}`).join('; ');
      throw new Error(`❌ Failed to fetch data for any symbols. Errors: ${errorDetails}`);
    }
    
    if (failedSymbols.length > 0) {
      console.warn(`⚠️ Failed to fetch: ${failedSymbols.map(f => f.symbol).join(', ')}`);
    }

    // Combine data with improved mapping
    const combinedData = {};
    const allReturns = {};
    
    results.forEach((data, index) => {
      const symbol = successfulSymbols[index];
      combinedData[symbol] = data;
      allReturns[symbol] = data.returns.map(r => {
        // Validate return values
        const returnValue = r.return;
        if (isNaN(returnValue) || !isFinite(returnValue)) {
          console.warn(`Invalid return value for ${symbol}:`, returnValue);
          return 0; // Replace with 0 for safety
        }
        return returnValue;
      });
    });

    // Enhanced data synchronization validation
    this.validateDataSync(allReturns);

    console.log(`✅ Portfolio data fetched successfully: ${successfulSymbols.join(', ')}`);
    
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
        isMobile: true,
        successRate: (successfulSymbols.length / symbols.length * 100).toFixed(1) + '%'
      }
    };
  }

  /**
   * FIXED: Enhanced risk-free rate fetching with better fallbacks
   */
  async getRiskFreeRate() {
    console.log('📱 Fetching real-time risk-free rate...');
    
    // Try multiple sources with better error handling
    const sources = [
      { name: 'Yahoo ^IRX (3-Month Treasury)', symbol: '^IRX', divisor: 100 },
      { name: 'Yahoo ^TNX (10-Year Treasury)', symbol: '^TNX', divisor: 100 },
      { name: 'Yahoo ^FVX (5-Year Treasury)', symbol: '^FVX', divisor: 100 },
    ];
    
    for (const source of sources) {
      try {
        const data = await this.fetchStockData(source.symbol, '1mo');
        if (data && data.currentPrice > 0 && data.currentPrice < 20) { // Sanity check
          const rate = data.currentPrice / source.divisor;
          console.log(`✅ Risk-free rate from ${source.name}: ${(rate * 100).toFixed(3)}%`);
          
          // Cache the successful rate
          await this.cacheRiskFreeRate(rate);
          
          return rate;
        }
      } catch (error) {
        console.warn(`⚠️ ${source.name} failed:`, error.message);
        continue;
      }
    }

    // Fallback to cached rate if available
    try {
      const cachedRate = await this.getCachedRiskFreeRate();
      if (cachedRate !== null) {
        console.log(`📋 Using cached risk-free rate: ${(cachedRate * 100).toFixed(3)}%`);
        return cachedRate;
      }
    } catch (error) {
      console.warn('Failed to get cached risk-free rate:', error.message);
    }

    // Last resort: current approximate Fed rate with warning
    const fallbackRate = 0.0525; // 5.25% as of current Fed policy
    console.warn(`⚠️ Using fallback Fed rate: ${(fallbackRate * 100).toFixed(2)}% - Consider updating manually`);
    return fallbackRate;
  }

  /**
   * FIXED: Enhanced market data fetching
   */
  async getMarketData(period = '1y') {
    console.log('📱 Fetching real-time market data (S&P 500)...');
    
    const benchmarks = [
      { symbol: '^GSPC', name: 'S&P 500 Index' },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
      { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' }
    ];
    
    for (const benchmark of benchmarks) {
      try {
        const data = await this.fetchStockData(benchmark.symbol, period);
        if (data && data.returns && data.returns.length > 50) {
          const returns = data.returns.map(r => {
            // Validate return values
            if (isNaN(r.return) || !isFinite(r.return)) {
              console.warn(`Invalid market return:`, r.return);
              return 0;
            }
            return r.return;
          }).filter(r => Math.abs(r) < 0.5); // Filter extreme values (>50% daily moves)
          
          if (returns.length > 50) {
            console.log(`✅ Market data (${benchmark.name}): ${returns.length} valid returns`);
            return returns;
          }
        }
      } catch (error) {
        console.warn(`⚠️ ${benchmark.name} failed:`, error.message);
        continue;
      }
    }
    
    throw new Error('Unable to fetch market benchmark data from any source');
  }

  // ===== IMPROVED DATA VALIDATION & UTILITIES =====

  /**
   * FIXED: Enhanced data quality validation
   */
  validateDataQuality(data, symbol) {
    if (!data || typeof data !== 'object') {
      console.warn(`❌ ${symbol}: Data is not an object`);
      return false;
    }
    
    if (!data.prices || !Array.isArray(data.prices)) {
      console.warn(`❌ ${symbol}: Missing or invalid prices array`);
      return false;
    }
    
    if (!data.returns || !Array.isArray(data.returns)) {
      console.warn(`❌ ${symbol}: Missing or invalid returns array`);
      return false;
    }
    
    // Check minimum data points (relaxed for mobile)
    if (data.prices.length < 10) {
      console.warn(`❌ ${symbol}: Insufficient data points (${data.prices.length})`);
      return false;
    }
    
    // Validate price data structure
    const validPrices = data.prices.filter(p => 
      p && 
      p.date && 
      typeof p.close === 'number' && 
      !isNaN(p.close) && 
      p.close > 0
    );
    
    if (validPrices.length < data.prices.length * 0.8) {
      console.warn(`❌ ${symbol}: Too many invalid price entries`);
      return false;
    }
    
    // Validate return data
    const validReturns = data.returns.filter(r => 
      r && 
      typeof r.return === 'number' && 
      !isNaN(r.return) && 
      isFinite(r.return) &&
      Math.abs(r.return) < 1 // Filter out >100% daily returns
    );
    
    if (validReturns.length < data.returns.length * 0.8) {
      console.warn(`❌ ${symbol}: Too many invalid return entries`);
      return false;
    }
    
    // Check data freshness (more lenient for mobile)
    const latestDate = new Date(data.prices[data.prices.length - 1].date);
    const daysSinceLatest = (Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLatest > 30) {
      console.warn(`⚠️ ${symbol}: Data is ${daysSinceLatest.toFixed(1)} days old`);
      // Don't fail validation for mobile - warn but continue
    }
    
    // Additional sanity checks
    const prices = data.prices.map(p => p.close).filter(p => p > 0);
    if (prices.length === 0) {
      console.warn(`❌ ${symbol}: No valid prices`);
      return false;
    }
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    if (maxPrice / minPrice > 100) { // More than 100x price change is suspicious
      console.warn(`⚠️ ${symbol}: Extreme price range detected (${minPrice.toFixed(2)} to ${maxPrice.toFixed(2)})`);
      // Continue anyway for mobile but log warning
    }
    
    console.log(`✅ ${symbol}: Data quality validated (${validPrices.length} prices, ${validReturns.length} returns)`);
    return true;
  }

  /**
   * FIXED: Enhanced data synchronization
   */
  validateDataSync(allReturns) {
    const symbols = Object.keys(allReturns);
    if (symbols.length < 2) return true;
    
    const lengths = symbols.map(symbol => allReturns[symbol].length);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    
    // Allow up to 5% difference for mobile networks (was 10%)
    if ((maxLength - minLength) / maxLength > 0.05) {
      console.warn(`⚠️ Data sync issue: lengths vary from ${minLength} to ${maxLength}`);
      
      // Truncate all series to minimum length
      symbols.forEach(symbol => {
        const originalLength = allReturns[symbol].length;
        allReturns[symbol] = allReturns[symbol].slice(-minLength);
        if (originalLength > minLength) {
          console.log(`🔧 Truncated ${symbol} from ${originalLength} to ${minLength} observations`);
        }
      });
      
      console.log(`🔧 Synchronized all data to ${minLength} observations`);
    }
    
    return true;
  }

  // ===== ENHANCED CACHING AND STORAGE =====

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
    
    // Prevent cache from growing too large
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  async storeOfflineData(symbol, data) {
    try {
      if (typeof localStorage !== 'undefined') {
        const offlineData = {
          ...data,
          cachedAt: Date.now()
        };
        localStorage.setItem(`offline_${symbol}`, JSON.stringify(offlineData));
      }
    } catch (error) {
      console.warn('Failed to store offline data (localStorage not available):', error.message);
    }
  }

  async getOfflineData(symbol) {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(`offline_${symbol}`);
        if (stored) {
          const data = JSON.parse(stored);
          const age = Date.now() - data.cachedAt;
          
          // Use offline data if less than 7 days old
          if (age < 7 * 24 * 60 * 60 * 1000) {
            return data;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get offline data:', error.message);
    }
    return null;
  }

  async cacheRiskFreeRate(rate) {
    try {
      if (typeof localStorage !== 'undefined') {
        const cacheData = {
          rate: rate,
          timestamp: Date.now()
        };
        localStorage.setItem('cached_risk_free_rate', JSON.stringify(cacheData));
      }
    } catch (error) {
      console.warn('Failed to cache risk-free rate:', error.message);
    }
  }

  async getCachedRiskFreeRate() {
    try {
      if (typeof localStorage !== 'undefined') {
        const cached = localStorage.getItem('cached_risk_free_rate');
        if (cached) {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age < 24 * 60 * 60 * 1000) { // 24 hours
            return parsed.rate;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get cached risk-free rate:', error.message);
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

  // ===== IMPROVED DATA FORMATTERS =====

  formatYahooData(symbol, result) {
    const { timestamp } = result;
    const quote = result.indicators.quote[0];
    
    if (!timestamp || !quote) {
      throw new Error('Invalid Yahoo Finance data structure');
    }
    
    const prices = [];
    const returns = [];
    let prevClose = null;
    
    for (let i = 0; i < timestamp.length; i++) {
      const price = quote.close[i];
      if (price == null || isNaN(price) || price <= 0) continue;
      
      const date = new Date(timestamp[i] * 1000);
      if (isNaN(date.getTime())) continue; // Invalid date
      
      prices.push({
        date,
        open: quote.open[i] || price,
        high: quote.high[i] || price,
        low: quote.low[i] || price,
        close: price,
        volume: quote.volume[i] || 0
      });
      
      if (prevClose != null && prevClose > 0) {
        const returnValue = (price - prevClose) / prevClose;
        // Validate return value
        if (!isNaN(returnValue) && isFinite(returnValue) && Math.abs(returnValue) < 1) {
          returns.push({ 
            date, 
            return: returnValue 
          });
        }
      }
      prevClose = price;
    }

    if (prices.length === 0) {
      throw new Error('No valid price data found');
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
    
    if (filteredDates.length === 0) {
      throw new Error('No data in requested period');
    }
    
    const prices = filteredDates.map(date => {
      const dayData = timeSeries[date];
      return {
        date: new Date(date),
        open: parseFloat(dayData['1. open']),
        high: parseFloat(dayData['2. high']),
        low: parseFloat(dayData['3. low']),
        close: parseFloat(dayData['4. close']),
        volume: parseInt(dayData['5. volume']) || 0
      };
    }).filter(p => !isNaN(p.close) && p.close > 0);

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i].close - prices[i-1].close) / prices[i-1].close;
      if (!isNaN(returnValue) && isFinite(returnValue) && Math.abs(returnValue) < 1) {
        returns.push({
          date: prices[i].date,
          return: returnValue
        });
      }
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
    const validData = data.filter(item => 
      item && 
      item.close && 
      !isNaN(item.close) && 
      item.close > 0 &&
      item.date
    );
    
    if (validData.length === 0) {
      throw new Error('No valid IEX data');
    }
    
    const prices = validData.map(item => ({
      date: new Date(item.date),
      open: item.open || item.close,
      high: item.high || item.close,
      low: item.low || item.close,
      close: item.close,
      volume: item.volume || 0
    }));

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      const returnValue = (prices[i].close - prices[i-1].close) / prices[i-1].close;
      if (!isNaN(returnValue) && isFinite(returnValue) && Math.abs(returnValue) < 1) {
        returns.push({
          date: prices[i].date,
          return: returnValue
        });
      }
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
   * FIXED: Enhanced mobile health check
   */
  async healthCheck() {
    console.log('📱 Running comprehensive mobile system health check...');
    
    const results = {
      dataSources: {},
      riskFreeRate: null,
      marketData: null,
      offlineCapability: null,
      cacheStatus: this.cache.size,
      networkStatus: typeof navigator !== 'undefined' ? navigator.onLine : true,
      timestamp: new Date().toISOString(),
      overall_status: 'UNKNOWN'
    };
    
    let healthyCount = 0;
    let totalTests = 0;
    
    // Test data sources
    for (const source of this.dataSources) {
      totalTests++;
      try {
        if (source.name === 'yahoo') {
          // Quick test with minimal data
          await this.fetchFromYahoo('AAPL', '1mo');
          results.dataSources[source.name] = '✅ HEALTHY';
          healthyCount++;
        } else {
          results.dataSources[source.name] = '⚠️ REQUIRES API KEY';
        }
      } catch (error) {
        results.dataSources[source.name] = `❌ ERROR: ${error.message}`;
      }
    }
    
    // Test risk-free rate
    totalTests++;
    try {
      const rate = await this.getRiskFreeRate();
      if (rate > 0 && rate < 0.2) { // Reasonable range
        results.riskFreeRate = `✅ HEALTHY (${(rate * 100).toFixed(3)}%)`;
        healthyCount++;
      } else {
        results.riskFreeRate = `⚠️ UNUSUAL RATE (${(rate * 100).toFixed(3)}%)`;
      }
    } catch (error) {
      results.riskFreeRate = `❌ ERROR: ${error.message}`;
    }
    
    // Test market data
    totalTests++;
    try {
      const marketData = await this.getMarketData('1mo');
      if (marketData && marketData.length > 10) {
        results.marketData = `✅ HEALTHY (${marketData.length} observations)`;
        healthyCount++;
      } else {
        results.marketData = '⚠️ INSUFFICIENT DATA';
      }
    } catch (error) {
      results.marketData = `❌ ERROR: ${error.message}`;
    }
    
    // Test offline capability
    totalTests++;
    try {
      await this.storeOfflineData('HEALTH_TEST', { test: true, timestamp: Date.now() });
      const retrieved = await this.getOfflineData('HEALTH_TEST');
      if (retrieved && retrieved.test) {
        results.offlineCapability = '✅ HEALTHY';
        healthyCount++;
      } else {
        results.offlineCapability = '⚠️ PARTIAL';
      }
    } catch (error) {
      results.offlineCapability = `❌ ERROR: ${error.message}`;
    }
    
    // Determine overall status
    const healthPercent = (healthyCount / totalTests) * 100;
    if (healthPercent >= 75) {
      results.overall_status = 'HEALTHY ✅';
    } else if (healthPercent >= 50) {
      results.overall_status = 'DEGRADED ⚠️';
    } else {
      results.overall_status = 'CRITICAL ❌';
    }
    
    results.healthScore = `${healthyCount}/${totalTests} (${healthPercent.toFixed(0)}%)`;
    
    console.log('📱 Mobile health check completed:', results);
    return results;
  }
}

// Export singleton instance
export const realTimeDataFetcher = new MobileRealTimeDataFetcher();
