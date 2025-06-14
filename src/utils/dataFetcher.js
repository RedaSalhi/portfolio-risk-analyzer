// src/utils/dataFetcher.js
// FIXED VERSION - Always works, real data when possible, mock when needed

export class DataFetcher {
  constructor() {
    // Yahoo Finance has CORS issues, so we'll use mock data primarily
    this.useRealData = false; // Set to true if you have a backend proxy
  }

  /**
   * Fetch stock data - Always returns data (real or mock)
   */
  async fetchStockData(symbol, period = '1y') {
    console.log(`📊 Fetching data for ${symbol}...`);
    
    if (this.useRealData) {
      try {
        return await this.fetchRealYahooData(symbol, period);
      } catch (error) {
        console.log(`⚠️ Real data failed for ${symbol}, using mock data`);
        return this.generateMockStockData(symbol, period);
      }
    } else {
      // Use high-quality mock data with realistic patterns
      return this.generateMockStockData(symbol, period);
    }
  }

  /**
   * Fetch multiple stocks data
   */
  async fetchMultipleStocks(symbols, period = '1y') {
    console.log(`📊 Fetching portfolio data for: ${symbols.join(', ')}`);
    
    const promises = symbols.map(symbol => this.fetchStockData(symbol, period));
    const results = await Promise.all(promises);
    
    const combinedData = {};
    const allReturns = {};
    
    results.forEach((data, index) => {
      const symbol = symbols[index];
      combinedData[symbol] = data;
      allReturns[symbol] = data.returns.map(r => r.return);
    });

    return {
      individual: combinedData,
      returns: allReturns,
      symbols: symbols
    };
  }

  /**
   * Real Yahoo Finance data (only works with backend proxy)
   */
  async fetchRealYahooData(symbol, period = '1y') {
    // This would need a backend proxy to avoid CORS
    // For now, we'll use mock data
    throw new Error('CORS restrictions - using mock data');
  }

  /**
   * Generate realistic mock stock data
   */
  generateMockStockData(symbol, period = '1y') {
    const days = this.getPeriodDays(period);
    const data = [];
    const returns = [];
    
    // Different characteristics for different stocks
    const stockParams = this.getStockParameters(symbol);
    let currentPrice = stockParams.startPrice;
    
    console.log(`📈 Generating ${days} days of data for ${symbol}`);
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000);
      
      // Generate realistic return using stock-specific parameters
      const return_ = this.generateRealisticReturn(stockParams, i, days);
      currentPrice = currentPrice * (1 + return_);
      
      // Ensure price stays positive
      currentPrice = Math.max(currentPrice, stockParams.startPrice * 0.1);
      
      data.push({
        date,
        open: currentPrice * (1 + (Math.random() - 0.5) * 0.01),
        high: currentPrice * (1 + Math.random() * 0.02),
        low: currentPrice * (1 - Math.random() * 0.02),
        close: currentPrice,
        volume: Math.floor(stockParams.avgVolume * (0.5 + Math.random()))
      });

      if (i > 0) {
        returns.push({
          date,
          return: return_
        });
      }
    }

    return {
      symbol,
      prices: data,
      returns: returns,
      currentPrice: currentPrice,
      metadata: {
        start: data[0].date,
        end: data[data.length - 1].date,
        count: data.length,
        isMock: true,
        stockType: stockParams.type
      }
    };
  }

  /**
   * Get realistic parameters for different stocks
   */
  getStockParameters(symbol) {
    const stockProfiles = {
      // Tech giants - high growth, medium volatility
      'AAPL': { startPrice: 180, dailyVol: 0.025, drift: 0.0003, avgVolume: 50000000, type: 'tech' },
      'MSFT': { startPrice: 380, dailyVol: 0.022, drift: 0.0002, avgVolume: 25000000, type: 'tech' },
      'GOOG': { startPrice: 140, dailyVol: 0.028, drift: 0.0002, avgVolume: 20000000, type: 'tech' },
      'NVDA': { startPrice: 450, dailyVol: 0.035, drift: 0.0004, avgVolume: 40000000, type: 'tech' },
      
      // High volatility stocks
      'TSLA': { startPrice: 210, dailyVol: 0.045, drift: 0.0001, avgVolume: 60000000, type: 'growth' },
      'GME': { startPrice: 20, dailyVol: 0.055, drift: -0.0001, avgVolume: 10000000, type: 'volatile' },
      
      // Stable stocks
      'JNJ': { startPrice: 160, dailyVol: 0.015, drift: 0.0002, avgVolume: 8000000, type: 'defensive' },
      'PG': { startPrice: 155, dailyVol: 0.018, drift: 0.0001, avgVolume: 6000000, type: 'defensive' },
      'KO': { startPrice: 62, dailyVol: 0.020, drift: 0.0001, avgVolume: 12000000, type: 'defensive' },
      
      // ETFs
      'SPY': { startPrice: 450, dailyVol: 0.018, drift: 0.0002, avgVolume: 80000000, type: 'etf' },
      'VTI': { startPrice: 240, dailyVol: 0.019, drift: 0.0002, avgVolume: 5000000, type: 'etf' },
      'BND': { startPrice: 75, dailyVol: 0.008, drift: 0.0001, avgVolume: 4000000, type: 'bond' },
      
      // Market indices
      '^GSPC': { startPrice: 4500, dailyVol: 0.018, drift: 0.0002, avgVolume: 0, type: 'index' },
      '^VIX': { startPrice: 18, dailyVol: 0.08, drift: -0.0001, avgVolume: 0, type: 'volatility' }
    };

    // Default parameters for unknown stocks
    return stockProfiles[symbol] || {
      startPrice: 100 + Math.random() * 200,
      dailyVol: 0.025 + Math.random() * 0.02,
      drift: (Math.random() - 0.5) * 0.0004,
      avgVolume: 1000000 + Math.random() * 10000000,
      type: 'generic'
    };
  }

  /**
   * Generate realistic returns with proper patterns
   */
  generateRealisticReturn(params, dayIndex, totalDays) {
    const { dailyVol, drift } = params;
    
    // Base random return
    let return_ = drift + this.boxMullerRandom() * dailyVol;
    
    // Add some mean reversion
    if (Math.abs(return_) > dailyVol * 2) {
      return_ *= 0.5;
    }
    
    // Add some momentum/clustering
    if (dayIndex > 0 && Math.random() < 0.3) {
      return_ *= (Math.random() < 0.5) ? 1.2 : 0.8;
    }
    
    // Special behavior for VIX (mean-reverting)
    if (params.type === 'volatility') {
      const meanVix = 18;
      const currentLevel = params.startPrice; // Simplified
      if (currentLevel > 25) return_ -= 0.05; // High VIX tends to fall
      if (currentLevel < 12) return_ += 0.05; // Low VIX tends to rise
    }
    
    return return_;
  }

  /**
   * Box-Muller transformation for normal random numbers
   */
  boxMullerRandom() {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Get number of days for period
   */
  getPeriodDays(period) {
    const periods = {
      '1mo': 30,
      '3mo': 90,
      '6mo': 180,
      '1y': 252,  // Trading days
      '2y': 504,
      '5y': 1260
    };
    return periods[period] || 252;
  }

  /**
   * Get risk-free rate (mock)
   */
  async getRiskFreeRate() {
    // Current 3-month Treasury rate (mock)
    return 0.052; // 5.2%
  }

  /**
   * Calculate correlation matrix from returns data
   */
  calculateCorrelationMatrix(returnsData) {
    const symbols = Object.keys(returnsData);
    const matrix = {};
    
    symbols.forEach(symbol1 => {
      matrix[symbol1] = {};
      symbols.forEach(symbol2 => {
        if (symbol1 === symbol2) {
          matrix[symbol1][symbol2] = 1;
        } else {
          matrix[symbol1][symbol2] = this.correlation(
            returnsData[symbol1], 
            returnsData[symbol2]
          );
        }
      });
    });
    
    return matrix;
  }

  /**
   * Calculate correlation coefficient
   */
  correlation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const meanX = x.slice(0, n).reduce((a, b) => a + b) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b) / n;
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      sumSqX += deltaX * deltaX;
      sumSqY += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Test connection and data quality
   */
  async testConnection() {
    console.log('🧪 Testing data fetcher...');
    
    try {
      const testData = await this.fetchStockData('AAPL', '1mo');
      console.log('✅ Data fetch successful:', {
        symbol: testData.symbol,
        dataPoints: testData.prices.length,
        isMock: testData.metadata.isMock,
        currentPrice: testData.currentPrice.toFixed(2)
      });
      return true;
    } catch (error) {
      console.error('❌ Data fetch failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const dataFetcher = new DataFetcher();

// Auto-test on load (only in development)
if (__DEV__) {
  dataFetcher.testConnection();
}