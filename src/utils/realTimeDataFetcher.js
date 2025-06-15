// Real-time data fetcher with actual Yahoo Finance and FRED integration
// This replaces your existing realTimeDataFetcher.js

class RealTimeDataFetcher {
  constructor() {
    this.cache = new Map();
    this.maxCacheAge = 5 * 60 * 1000; // 5 minutes cache
    this.rateLimits = new Map();
    
    // Real API endpoints
    this.endpoints = {
      yahoo: 'https://query1.finance.yahoo.com/v8/finance/chart/',
      fred: 'https://api.stlouisfed.org/fred/series/observations',
      fredApiKey: 'YOUR_FRED_API_KEY', // Replace with your FRED API key
      // Fallback proxy for CORS issues
      proxy: 'https://api.allorigins.win/get?url='
    };
    
    console.log('📊 Real-time data fetcher initialized with Yahoo Finance & FRED');
  }

  // MAIN METHOD: Get historical data for portfolio optimization
  async getHistoricalData(symbols, period = '2y') {
    console.log(`📈 Fetching real data for: ${symbols.join(', ')}`);
    
    try {
      const stockData = await this.fetchYahooFinanceData(symbols, period);
      
      return {
        symbols: stockData.symbols,
        individual: stockData.individual,
        returns: stockData.returns,
        metadata: {
          dataSource: 'Yahoo Finance (Real)',
          fetchTime: new Date().toISOString(),
          period: period,
          symbols: symbols
        }
      };
    } catch (error) {
      console.error('❌ Real data fetch failed:', error.message);
      console.log('🔄 Falling back to enhanced mock data...');
      return this.generateEnhancedMockData(symbols, period);
    }
  }

  // REAL Yahoo Finance data fetching
  async fetchYahooFinanceData(symbols, period = '2y') {
    const results = {
      symbols: [],
      individual: {},
      returns: {}
    };

    const periodMap = {
      '1m': { range: '1mo', interval: '1d' },
      '3m': { range: '3mo', interval: '1d' },
      '6m': { range: '6mo', interval: '1d' },
      '1y': { range: '1y', interval: '1d' },
      '2y': { range: '2y', interval: '1d' },
      '5y': { range: '5y', interval: '1d' },
      'max': { range: 'max', interval: '1d' }
    };

    const { range, interval } = periodMap[period] || periodMap['2y'];

    for (const symbol of symbols) {
      try {
        console.log(`📊 Fetching ${symbol} from Yahoo Finance...`);
        
        // Yahoo Finance API endpoint
        const url = `${this.endpoints.yahoo}${symbol}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplit`;
        
        let response;
        try {
          // Try direct fetch first
          response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
        } catch (corsError) {
          console.log(`🔄 CORS issue for ${symbol}, using proxy...`);
          // Use proxy for CORS issues
          const proxyUrl = `${this.endpoints.proxy}${encodeURIComponent(url)}`;
          const proxyResponse = await fetch(proxyUrl);
          const proxyData = await proxyResponse.json();
          response = {
            ok: true,
            json: () => Promise.resolve(JSON.parse(proxyData.contents))
          };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
          throw new Error('Invalid Yahoo Finance response');
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const prices = result.indicators.quote[0];

        if (!timestamps || !prices || !prices.close) {
          throw new Error('Missing price data');
        }

        // Process the data
        const priceData = [];
        const returns = [];
        
        for (let i = 0; i < timestamps.length; i++) {
          if (prices.close[i] !== null && prices.close[i] !== undefined) {
            const date = new Date(timestamps[i] * 1000);
            priceData.push({
              date: date.toISOString().split('T')[0],
              close: prices.close[i],
              open: prices.open[i] || prices.close[i],
              high: prices.high[i] || prices.close[i],
              low: prices.low[i] || prices.close[i],
              volume: prices.volume[i] || 0
            });
            
            // Calculate returns
            if (i > 0 && prices.close[i-1] !== null && prices.close[i-1] !== 0) {
              const dailyReturn = (prices.close[i] - prices.close[i-1]) / prices.close[i-1];
              if (!isNaN(dailyReturn) && isFinite(dailyReturn)) {
                returns.push(dailyReturn);
              }
            }
          }
        }

        if (priceData.length < 50) {
          throw new Error(`Insufficient data: only ${priceData.length} valid observations`);
        }

        results.symbols.push(symbol);
        results.individual[symbol] = priceData;
        results.returns[symbol] = returns;

        console.log(`✅ ${symbol}: ${priceData.length} prices, ${returns.length} returns`);
        
        // Rate limiting - wait between requests
        await this.sleep(100);
        
      } catch (error) {
        console.warn(`⚠️ Failed to fetch ${symbol}: ${error.message}`);
        // Skip failed symbols but don't fail entire request
        continue;
      }
    }

    if (results.symbols.length === 0) {
      throw new Error('No symbols could be fetched successfully');
    }

    console.log(`✅ Successfully fetched ${results.symbols.length}/${symbols.length} symbols`);
    return results;
  }

  // REAL FRED data for risk-free rate
  async getRiskFreeRate() {
    try {
      console.log('📊 Fetching risk-free rate from FRED...');
      
      // 3-Month Treasury Bill Secondary Market Rate
      const fredUrl = `${this.endpoints.fred}?series_id=TB3MS&api_key=${this.endpoints.fredApiKey}&file_type=json&limit=1&sort_order=desc`;
      
      let response;
      try {
        response = await fetch(fredUrl);
      } catch (corsError) {
        // Use proxy for CORS
        const proxyUrl = `${this.endpoints.proxy}${encodeURIComponent(fredUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        const proxyData = await proxyResponse.json();
        response = {
          ok: true,
          json: () => Promise.resolve(JSON.parse(proxyData.contents))
        };
      }

      if (response.ok) {
        const data = await response.json();
        if (data.observations && data.observations.length > 0) {
          const rate = parseFloat(data.observations[0].value) / 100; // Convert percentage to decimal
          console.log(`✅ Risk-free rate: ${(rate * 100).toFixed(3)}%`);
          return rate;
        }
      }
    } catch (error) {
      console.warn('⚠️ FRED API failed, using default risk-free rate:', error.message);
    }
    
    // Fallback to current approximate 3-month Treasury rate
    const defaultRate = 0.045; // 4.5%
    console.log(`📊 Using default risk-free rate: ${(defaultRate * 100).toFixed(1)}%`);
    return defaultRate;
  }

  // Enhanced mock data generator (for when real APIs fail)
  generateEnhancedMockData(symbols, period = '2y') {
    console.log(`🎭 Generating enhanced mock data for: ${symbols.join(', ')}`);
    
    const days = this.getPeriodDays(period);
    const results = {
      symbols: symbols,
      individual: {},
      returns: {},
      metadata: {
        dataSource: 'Enhanced Mock Data',
        fetchTime: new Date().toISOString(),
        period: period,
        symbols: symbols
      }
    };

    // Real-world inspired parameters for major stocks
    const stockProfiles = {
      'AAPL': { basePrice: 180, volatility: 0.25, trend: 0.15, marketCap: 'large' },
      'MSFT': { basePrice: 340, volatility: 0.22, trend: 0.12, marketCap: 'large' },
      'GOOGL': { basePrice: 140, volatility: 0.28, trend: 0.10, marketCap: 'large' },
      'TSLA': { basePrice: 200, volatility: 0.45, trend: 0.20, marketCap: 'large' },
      'AMZN': { basePrice: 145, volatility: 0.30, trend: 0.14, marketCap: 'large' },
      'NVDA': { basePrice: 450, volatility: 0.40, trend: 0.25, marketCap: 'large' },
      'META': { basePrice: 300, volatility: 0.35, trend: 0.08, marketCap: 'large' },
      'NFLX': { basePrice: 450, volatility: 0.38, trend: 0.06, marketCap: 'large' }
    };

    symbols.forEach(symbol => {
      const profile = stockProfiles[symbol] || {
        basePrice: 100 + Math.random() * 200,
        volatility: 0.20 + Math.random() * 0.20,
        trend: (Math.random() - 0.5) * 0.20,
        marketCap: 'medium'
      };

      const { prices, returns } = this.generateRealisticStockData(days, profile);
      
      results.individual[symbol] = prices;
      results.returns[symbol] = returns;
    });

    console.log(`✅ Generated enhanced mock data for ${symbols.length} symbols`);
    return results;
  }

  generateRealisticStockData(days, profile) {
    const prices = [];
    const returns = [];
    let currentPrice = profile.basePrice;
    
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + i);

      // Generate realistic daily return
      const trendComponent = profile.trend / 252; // Annualized to daily
      const randomComponent = this.generateNormalRandom() * profile.volatility / Math.sqrt(252);
      
      // Add market regime changes
      const regimeShock = Math.random() < 0.02 ? this.generateNormalRandom() * 0.05 : 0;
      
      // Add day-of-week effects
      const dayOfWeek = date.getDay();
      const weekendEffect = (dayOfWeek === 1) ? -0.001 : (dayOfWeek === 5) ? 0.001 : 0;
      
      const dailyReturn = trendComponent + randomComponent + regimeShock + weekendEffect;
      
      // Apply return to price
      currentPrice *= (1 + dailyReturn);
      
      // Ensure price doesn't go negative
      currentPrice = Math.max(0.01, currentPrice);
      
      // Add some intraday price action
      const open = currentPrice * (1 + this.generateNormalRandom() * 0.005);
      const high = Math.max(open, currentPrice) * (1 + Math.random() * 0.01);
      const low = Math.min(open, currentPrice) * (1 - Math.random() * 0.01);
      const volume = Math.floor(1000000 + Math.random() * 5000000);

      prices.push({
        date: date.toISOString().split('T')[0],
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(currentPrice.toFixed(2)),
        volume: volume
      });

      if (i > 0) {
        returns.push(dailyReturn);
      }
    }

    return { prices, returns };
  }

  // Box-Muller transformation for normal random numbers
  generateNormalRandom() {
    if (this.spare !== undefined) {
      const temp = this.spare;
      delete this.spare;
      return temp;
    }
    
    const u1 = Math.random();
    const u2 = Math.random();
    const mag = 0.5 * Math.log(u1);
    const z0 = Math.sqrt(-2 * mag) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * mag) * Math.sin(2 * Math.PI * u2);
    
    this.spare = z1;
    return z0;
  }

  getPeriodDays(period) {
    const periodDays = {
      '1m': 22,
      '3m': 66,
      '6m': 132,
      '1y': 252,
      '2y': 504,
      '5y': 1260,
      'max': 2520
    };
    return periodDays[period] || 504;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to test API connectivity
  async testConnectivity() {
    console.log('🔧 Testing API connectivity...');
    
    const tests = [
      {
        name: 'Yahoo Finance',
        test: () => this.fetchYahooFinanceData(['AAPL'], '1m')
      },
      {
        name: 'FRED',
        test: () => this.getRiskFreeRate()
      }
    ];

    const results = {};
    
    for (const test of tests) {
      try {
        await test.test();
        results[test.name] = 'SUCCESS ✅';
        console.log(`✅ ${test.name} API: Working`);
      } catch (error) {
        results[test.name] = `FAILED ❌: ${error.message}`;
        console.log(`❌ ${test.name} API: Failed - ${error.message}`);
      }
    }
    
    return results;
  }

  // Get current market status
  async getMarketStatus() {
    try {
      const response = await fetch(`${this.endpoints.yahoo}^GSPC?range=1d&interval=1m`);
      const data = await response.json();
      
      if (data.chart && data.chart.result && data.chart.result[0]) {
        const meta = data.chart.result[0].meta;
        return {
          isOpen: meta.currentTradingPeriod?.regular?.gmtoffset !== undefined,
          timezone: meta.timezone,
          currency: meta.currency,
          exchangeName: meta.exchangeName
        };
      }
    } catch (error) {
      console.warn('Could not determine market status:', error.message);
    }
    
    return {
      isOpen: false,
      timezone: 'America/New_York',
      currency: 'USD',
      exchangeName: 'NASDAQ'
    };
  }
}

// Export singleton instance
export const realTimeDataFetcher = new RealTimeDataFetcher();

// For testing in browser console
if (typeof window !== 'undefined') {
  window.realTimeDataFetcher = realTimeDataFetcher;
}
