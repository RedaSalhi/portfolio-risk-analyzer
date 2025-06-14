// src/utils/dataFetcher.js

// Configuration for different data sources
const DATA_SOURCES = {
    ALPHA_VANTAGE: 'https://www.alphavantage.co/query',
    YAHOO_FINANCE: 'https://query1.finance.yahoo.com/v7/finance/download',
    FRED: 'https://api.stlouisfed.org/fred/series/observations',
    FINNHUB: 'https://finnhub.io/api/v1',
    // Note: You'll need API keys for production use
  };
  
  export class DataFetcher {
    constructor(apiKeys = {}) {
      this.apiKeys = apiKeys;
    }
  
    // Fetch historical stock data (using Yahoo Finance public endpoints)
    async fetchStockData(symbol, period = '1y') {
      try {
        // Note: Yahoo Finance has CORS restrictions, so in production you'd need:
        // 1. A backend proxy server, or
        // 2. A financial data API service like Alpha Vantage, IEX Cloud, etc.
        
        // For development/demo, using Alpha Vantage free tier
        if (this.apiKeys.alphaVantage) {
          return await this.fetchFromAlphaVantage(symbol, period);
        }
        
        // Fallback to mock data for demo
        return this.generateMockStockData(symbol, period);
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        throw new Error(`Failed to fetch data for ${symbol}`);
      }
    }
  
    // Fetch bond/interest rate data (FRED API)
    async fetchBondData(series, startDate, endDate) {
      try {
        if (this.apiKeys.fred) {
          const url = `${DATA_SOURCES.FRED}?series_id=${series}&api_key=${this.apiKeys.fred}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          return data.observations.map(obs => ({
            date: new Date(obs.date),
            value: parseFloat(obs.value)
          })).filter(item => !isNaN(item.value));
        }
        
        // Fallback to mock data
        return this.generateMockBondData(series, startDate, endDate);
      } catch (error) {
        console.error(`Error fetching bond data for ${series}:`, error);
        throw new Error(`Failed to fetch bond data for ${series}`);
      }
    }
  
    // Alpha Vantage implementation
    async fetchFromAlphaVantage(symbol, period = '1y') {
      const function_type = period === '1d' ? 'TIME_SERIES_INTRADAY' : 'TIME_SERIES_DAILY';
      const interval = period === '1d' ? '&interval=60min' : '';
      
      const url = `${DATA_SOURCES.ALPHA_VANTAGE}?function=${function_type}&symbol=${symbol}${interval}&apikey=${this.apiKeys.alphaVantage}&outputsize=full`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
      }
      
      const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'));
      const timeSeries = data[timeSeriesKey];
      
      return Object.entries(timeSeries)
        .map(([date, values]) => ({
          date: new Date(date),
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        }))
        .sort((a, b) => a.date - b.date);
    }
  
    // Generate mock data for development/demo purposes
    generateMockStockData(symbol, period = '1y') {
      const days = this.periodToDays(period);
      const data = [];
      let price = 100 + Math.random() * 200; // Starting price between 100-300
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // Skip weekends for stock data
        if (date.getDay() === 0 || date.getDay() === 6) {
          continue;
        }
        
        // Generate realistic price movements
        const dailyReturn = (Math.random() - 0.5) * 0.06; // ±3% daily volatility
        price *= (1 + dailyReturn);
        
        const open = price * (1 + (Math.random() - 0.5) * 0.02);
        const close = price;
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);
        const volume = Math.floor(Math.random() * 10000000) + 1000000;
        
        data.push({
          date,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume
        });
      }
      
      return data;
    }
  
    generateMockBondData(series, startDate, endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const data = [];
      
      // Base yield depends on the series
      let baseYield = 2.5; // Default 2.5%
      if (series.includes('10')) baseYield = 2.8; // 10-year
      if (series.includes('30')) baseYield = 3.1; // 30-year
      if (series.includes('3MO') || series === '^IRX') baseYield = 1.5; // 3-month
      
      let currentYield = baseYield;
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        // Generate realistic yield movements
        const yieldChange = (Math.random() - 0.5) * 0.2; // ±10 bps daily
        currentYield += yieldChange;
        currentYield = Math.max(0.1, Math.min(10, currentYield)); // Keep within reasonable bounds
        
        data.push({
          date: new Date(currentDate),
          value: parseFloat(currentYield.toFixed(3))
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return data;
    }
  
    // Utility function to convert period strings to days
    periodToDays(period) {
      const periodMap = {
        '1d': 1,
        '5d': 5,
        '1mo': 30,
        '3mo': 90,
        '6mo': 180,
        '1y': 365,
        '2y': 730,
        '5y': 1825,
        '10y': 3650
      };
      
      return periodMap[period] || 365;
    }
  
    // Fetch multiple assets at once
    async fetchMultipleAssets(symbols, period = '1y') {
      const promises = symbols.map(symbol => 
        this.fetchStockData(symbol.trim().toUpperCase(), period)
      );
      
      try {
        const results = await Promise.allSettled(promises);
        const data = {};
        
        results.forEach((result, index) => {
          const symbol = symbols[index].trim().toUpperCase();
          if (result.status === 'fulfilled') {
            data[symbol] = result.value;
          } else {
            console.warn(`Failed to fetch data for ${symbol}:`, result.reason);
            data[symbol] = null;
          }
        });
        
        return data;
      } catch (error) {
        console.error('Error fetching multiple assets:', error);
        throw error;
      }
    }
  
    // Get real-time quote (simplified)
    async getRealTimeQuote(symbol) {
      try {
        // This would typically use a real-time data provider
        // For demo, we'll generate a realistic current price
        const historicalData = await this.fetchStockData(symbol, '5d');
        if (historicalData && historicalData.length > 0) {
          const lastPrice = historicalData[historicalData.length - 1].close;
          const change = (Math.random() - 0.5) * 0.02 * lastPrice; // ±1% intraday
          
          return {
            symbol,
            price: parseFloat((lastPrice + change).toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(((change / lastPrice) * 100).toFixed(2)),
            timestamp: new Date()
          };
        }
        
        throw new Error('No historical data available');
      } catch (error) {
        console.error(`Error getting real-time quote for ${symbol}:`, error);
        throw error;
      }
    }
  
    // Calculate returns from price data
    calculateReturns(priceData, returnType = 'log') {
      if (!priceData || priceData.length < 2) {
        return [];
      }
      
      const returns = [];
      for (let i = 1; i < priceData.length; i++) {
        const currentPrice = priceData[i].close;
        const previousPrice = priceData[i - 1].close;
        
        let returnValue;
        if (returnType === 'log') {
          returnValue = Math.log(currentPrice / previousPrice);
        } else {
          returnValue = (currentPrice - previousPrice) / previousPrice;
        }
        
        returns.push({
          date: priceData[i].date,
          return: returnValue,
          price: currentPrice
        });
      }
      
      return returns;
    }
  
    // Helper function to validate API response
    validateResponse(data, expectedFields = []) {
      if (!data) {
        throw new Error('No data received');
      }
      
      if (Array.isArray(data) && data.length === 0) {
        throw new Error('Empty data array');
      }
      
      if (expectedFields.length > 0 && data.length > 0) {
        const firstItem = data[0];
        const missingFields = expectedFields.filter(field => !(field in firstItem));
        if (missingFields.length > 0) {
          console.warn(`Missing expected fields: ${missingFields.join(', ')}`);
        }
      }
      
      return true;
    }
  }
  
  // Export a default instance with common configuration
  export const defaultDataFetcher = new DataFetcher({
    // Add your API keys here for production
    // alphaVantage: 'YOUR_ALPHA_VANTAGE_KEY',
    // fred: 'YOUR_FRED_API_KEY',
    // finnhub: 'YOUR_FINNHUB_KEY'
  });
  
  // Utility functions for data processing
  export const processStockData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return { prices: [], returns: [] };
    }
    
    const prices = rawData.map(item => item.close);
    const returns = defaultDataFetcher.calculateReturns(rawData, 'log');
    
    return {
      prices,
      returns: returns.map(r => r.return),
      dates: rawData.map(item => item.date),
      rawData
    };
  };
  
  export const processBondData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return { yields: [], yieldChanges: [] };
    }
    
    const yields = rawData.map(item => item.value);
    const yieldChanges = [];
    
    for (let i = 1; i < yields.length; i++) {
      yieldChanges.push(yields[i] - yields[i - 1]);
    }
    
    return {
      yields,
      yieldChanges,
      dates: rawData.map(item => item.date),
      rawData
    };
  };