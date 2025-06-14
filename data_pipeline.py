# data_pipeline.py
# PRODUCTION-GRADE PYTHON DATA PIPELINE
# Real-time, accurate, validated financial data

import yfinance as yf
import pandas as pd
import numpy as np
from pandas_datareader import data as pdr
import requests
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class ProductionDataPipeline:
    """
    Production-grade financial data pipeline with multiple sources,
    validation, and real-time capabilities.
    """
    
    def __init__(self, fred_api_key=None, alpha_vantage_key=None):
        self.fred_api_key = fred_api_key
        self.alpha_vantage_key = alpha_vantage_key
        self.cache = {}
        self.cache_duration = 300  # 5 minutes
        self.data_sources = ['yfinance', 'fred', 'alpha_vantage']
        
        print("🚀 Production data pipeline initialized")
        
    def fetch_real_time_stock_data(self, tickers, period='1y', validate=True):
        """
        Fetch real-time stock data with validation and fallbacks.
        NO MOCK DATA - only real market data.
        """
        if isinstance(tickers, str):
            tickers = [tickers]
            
        print(f"📊 Fetching real-time data for: {', '.join(tickers)}")
        
        all_data = {}
        failed_tickers = []
        
        for ticker in tickers:
            try:
                # Primary: yfinance (most reliable for stocks)
                data = self._fetch_from_yfinance(ticker, period)
                
                if validate and not self._validate_data_quality(data, ticker):
                    raise ValueError(f"Data quality validation failed for {ticker}")
                    
                all_data[ticker] = data
                print(f"✅ Successfully fetched {ticker}: {len(data)} observations")
                
            except Exception as e:
                print(f"❌ Failed to fetch {ticker}: {str(e)}")
                failed_tickers.append(ticker)
                
        if not all_data:
            raise Exception("❌ CRITICAL: No data could be fetched for any ticker")
            
        if failed_tickers:
            print(f"⚠️  Warning: Failed to fetch {len(failed_tickers)} tickers: {failed_tickers}")
            
        return all_data
    
    def _fetch_from_yfinance(self, ticker, period):
        """Enhanced yfinance fetcher with error handling."""
        end_date = datetime.now()
        
        # Calculate start date based on period
        period_days = {
            '1mo': 30, '3mo': 90, '6mo': 180, 
            '1y': 365, '2y': 730, '5y': 1825
        }
        days = period_days.get(period, 365)
        start_date = end_date - timedelta(days=days)
        
        # Fetch data with retries
        max_retries = 3
        for attempt in range(max_retries):
            try:
                stock_data = yf.download(
                    ticker, 
                    start=start_date, 
                    end=end_date,
                    progress=False,
                    timeout=30
                )
                
                if stock_data.empty:
                    raise ValueError(f"No data returned for {ticker}")
                    
                # Clean and validate
                stock_data = stock_data.dropna()
                if len(stock_data) < 20:
                    raise ValueError(f"Insufficient data points for {ticker}: {len(stock_data)}")
                
                # Check data freshness (within last week)
                latest_date = stock_data.index[-1]
                days_old = (datetime.now() - latest_date.to_pydatetime()).days
                
                if days_old > 7:
                    print(f"⚠️  Warning: {ticker} data is {days_old} days old")
                
                return stock_data
                
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"⚠️  Retry {attempt + 1} for {ticker}: {str(e)}")
                    continue
                else:
                    raise e
    
    def get_real_time_risk_free_rate(self):
        """
        Fetch current risk-free rate from authoritative sources.
        NO HARDCODED VALUES - only real market data.
        """
        print("🔄 Fetching real-time risk-free rate...")
        
        # Method 1: FRED 3-Month Treasury (most authoritative)
        try:
            if self.fred_api_key:
                fred_rate = self._fetch_from_fred('DGS3MO')
                if fred_rate is not None:
                    print(f"✅ Risk-free rate from FRED: {fred_rate:.3f}%")
                    return fred_rate / 100
        except Exception as e:
            print(f"⚠️  FRED failed: {str(e)}")
        
        # Method 2: Yahoo Finance ^IRX (3-month Treasury)
        try:
            irx_data = yf.download('^IRX', period='5d', progress=False)
            if not irx_data.empty:
                latest_rate = irx_data['Close'].iloc[-1]
                if not np.isnan(latest_rate) and latest_rate > 0:
                    print(f"✅ Risk-free rate from Yahoo ^IRX: {latest_rate:.3f}%")
                    return latest_rate / 100
        except Exception as e:
            print(f"⚠️  Yahoo ^IRX failed: {str(e)}")
        
        # Method 3: FRED 1-Month Treasury (backup)
        try:
            if self.fred_api_key:
                fred_rate = self._fetch_from_fred('DGS1MO')
                if fred_rate is not None:
                    print(f"✅ Risk-free rate from FRED 1M: {fred_rate:.3f}%")
                    return fred_rate / 100
        except Exception as e:
            print(f"⚠️  FRED 1M failed: {str(e)}")
        
        # CRITICAL: If all methods fail, raise error - NO FALLBACK TO MOCK DATA
        raise Exception("❌ CRITICAL: Unable to fetch real-time risk-free rate from any source")
    
    def get_real_time_market_data(self, period='1y'):
        """
        Fetch real-time market benchmark data (S&P 500).
        """
        print("🔄 Fetching real-time market data (S&P 500)...")
        
        try:
            # Primary: S&P 500 from Yahoo Finance
            market_data = self._fetch_from_yfinance('^GSPC', period)
            
            if len(market_data) < 50:
                raise ValueError(f"Insufficient market data: {len(market_data)} observations")
            
            # Calculate returns
            returns = market_data['Close'].pct_change().dropna()
            
            print(f"✅ Market data fetched: {len(returns)} daily returns")
            return returns.values
            
        except Exception as e:
            print(f"❌ Market data fetch failed: {str(e)}")
            
            # Backup: Try VTI (Total Stock Market ETF)
            try:
                print("🔄 Trying backup market proxy (VTI)...")
                vti_data = self._fetch_from_yfinance('VTI', period)
                returns = vti_data['Close'].pct_change().dropna()
                print(f"✅ Backup market data (VTI): {len(returns)} returns")
                return returns.values
            except Exception as backup_error:
                raise Exception(f"❌ CRITICAL: All market data sources failed. Primary: {str(e)}, Backup: {str(backup_error)}")
    
    def _fetch_from_fred(self, series_id, limit=10):
        """Fetch data from FRED API."""
        if not self.fred_api_key:
            raise ValueError("FRED API key required")
            
        url = f"https://api.stlouisfed.org/fred/series/observations"
        params = {
            'series_id': series_id,
            'api_key': self.fred_api_key,
            'file_type': 'json',
            'limit': limit,
            'sort_order': 'desc'
        }
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        data = response.json()
        observations = data.get('observations', [])
        
        # Get most recent valid observation
        for obs in observations:
            if obs['value'] != '.':
                return float(obs['value'])
        
        return None
    
    def _validate_data_quality(self, data, ticker):
        """
        Comprehensive data quality validation.
        """
        if data is None or data.empty:
            print(f"❌ {ticker}: No data")
            return False
            
        # Check minimum data points
        if len(data) < 20:
            print(f"❌ {ticker}: Insufficient data points ({len(data)})")
            return False
        
        # Check for excessive missing values
        missing_pct = data.isnull().sum().sum() / (len(data) * len(data.columns))
        if missing_pct > 0.1:  # More than 10% missing
            print(f"❌ {ticker}: Too many missing values ({missing_pct:.1%})")
            return False
        
        # Check for price consistency
        if 'Close' in data.columns:
            closes = data['Close'].dropna()
            if len(closes) == 0:
                print(f"❌ {ticker}: No valid closing prices")
                return False
            
            # Check for zero or negative prices
            if (closes <= 0).any():
                print(f"❌ {ticker}: Invalid prices (zero or negative)")
                return False
            
            # Check for extreme price movements (>50% in one day)
            returns = closes.pct_change().dropna()
            extreme_moves = (abs(returns) > 0.5).sum()
            
            if extreme_moves > len(returns) * 0.02:  # More than 2% extreme moves
                print(f"⚠️  {ticker}: Suspicious data - many extreme price movements")
                return False
        
        # Check data freshness
        latest_date = data.index[-1]
        days_old = (datetime.now() - latest_date.to_pydatetime()).days
        
        if days_old > 10:  # More than 10 days old
            print(f"⚠️  {ticker}: Stale data ({days_old} days old)")
            # Don't fail validation, but warn
        
        print(f"✅ {ticker}: Data quality validated")
        return True
    
    def calculate_portfolio_returns(self, price_data, weights=None):
        """
        Calculate portfolio returns with validation.
        """
        tickers = list(price_data.keys())
        
        if weights is None:
            weights = np.ones(len(tickers)) / len(tickers)  # Equal weights
        
        if len(weights) != len(tickers):
            raise ValueError(f"Weights length ({len(weights)}) doesn't match tickers ({len(tickers)})")
        
        if abs(sum(weights) - 1.0) > 1e-6:
            raise ValueError(f"Weights don't sum to 1.0: {sum(weights)}")
        
        # Align all data to common dates
        all_prices = pd.DataFrame()
        for ticker in tickers:
            if 'Close' in price_data[ticker].columns:
                all_prices[ticker] = price_data[ticker]['Close']
            else:
                # Handle single column data
                all_prices[ticker] = price_data[ticker].iloc[:, 0]
        
        # Remove any remaining NaN values
        all_prices = all_prices.dropna()
        
        if len(all_prices) < 20:
            raise ValueError(f"Insufficient aligned data: {len(all_prices)} observations")
        
        # Calculate returns
        returns = all_prices.pct_change().dropna()
        
        # Calculate portfolio returns
        portfolio_returns = (returns * weights).sum(axis=1)
        
        print(f"✅ Portfolio returns calculated: {len(portfolio_returns)} observations")
        return returns, portfolio_returns
    
    def get_correlation_matrix(self, returns_data):
        """
        Calculate robust correlation matrix.
        """
        if isinstance(returns_data, dict):
            # Convert dict to DataFrame
            returns_df = pd.DataFrame()
            for ticker, data in returns_data.items():
                if hasattr(data, 'pct_change'):
                    returns_df[ticker] = data.pct_change()
                else:
                    returns_df[ticker] = data
        else:
            returns_df = returns_data
        
        # Remove NaN values
        returns_df = returns_df.dropna()
        
        if len(returns_df) < 30:
            print(f"⚠️  Warning: Limited data for correlation ({len(returns_df)} observations)")
        
        # Calculate correlation matrix
        corr_matrix = returns_df.corr()
        
        # Validate correlation matrix
        if corr_matrix.isnull().any().any():
            print("⚠️  Warning: NaN values in correlation matrix")
            corr_matrix = corr_matrix.fillna(0)
        
        # Check if correlation matrix is positive definite
        try:
            eigenvals = np.linalg.eigvals(corr_matrix.values)
            if (eigenvals < -1e-8).any():
                print("⚠️  Warning: Correlation matrix is not positive definite")
        except:
            print("⚠️  Warning: Could not validate correlation matrix eigenvalues")
        
        return corr_matrix
    
    def system_health_check(self):
        """
        Comprehensive system health check.
        """
        print("🏥 Running system health check...")
        
        health_report = {
            'timestamp': datetime.now().isoformat(),
            'data_sources': {},
            'sample_data_quality': {},
            'risk_free_rate': None,
            'market_data': None,
            'overall_status': 'UNKNOWN'
        }
        
        # Test yfinance
        try:
            test_data = yf.download('AAPL', period='5d', progress=False)
            if not test_data.empty:
                health_report['data_sources']['yfinance'] = 'HEALTHY ✅'
            else:
                health_report['data_sources']['yfinance'] = 'NO DATA ❌'
        except Exception as e:
            health_report['data_sources']['yfinance'] = f'ERROR: {str(e)} ❌'
        
        # Test FRED (if API key available)
        if self.fred_api_key:
            try:
                fred_test = self._fetch_from_fred('DGS3MO', limit=1)
                if fred_test is not None:
                    health_report['data_sources']['fred'] = 'HEALTHY ✅'
                else:
                    health_report['data_sources']['fred'] = 'NO DATA ❌'
            except Exception as e:
                health_report['data_sources']['fred'] = f'ERROR: {str(e)} ❌'
        else:
            health_report['data_sources']['fred'] = 'NO API KEY ⚠️'
        
        # Test risk-free rate
        try:
            rf_rate = self.get_real_time_risk_free_rate()
            health_report['risk_free_rate'] = f'{rf_rate:.4f} ({rf_rate*100:.2f}%) ✅'
        except Exception as e:
            health_report['risk_free_rate'] = f'ERROR: {str(e)} ❌'
        
        # Test market data
        try:
            market_returns = self.get_real_time_market_data(period='1mo')
            health_report['market_data'] = f'{len(market_returns)} returns ✅'
        except Exception as e:
            health_report['market_data'] = f'ERROR: {str(e)} ❌'
        
        # Test sample portfolio data
        try:
            sample_tickers = ['AAPL', 'MSFT', 'GOOGL']
            sample_data = self.fetch_real_time_stock_data(sample_tickers, period='1mo')
            
            for ticker in sample_tickers:
                if ticker in sample_data:
                    data_quality = 'HEALTHY ✅' if len(sample_data[ticker]) > 15 else 'LIMITED DATA ⚠️'
                    health_report['sample_data_quality'][ticker] = data_quality
                else:
                    health_report['sample_data_quality'][ticker] = 'FAILED ❌'
                    
        except Exception as e:
            health_report['sample_data_quality'] = f'ERROR: {str(e)} ❌'
        
        # Determine overall status
        healthy_sources = sum(1 for status in health_report['data_sources'].values() if 'HEALTHY' in status)
        total_sources = len(health_report['data_sources'])
        
        if healthy_sources == total_sources:
            health_report['overall_status'] = 'HEALTHY ✅'
        elif healthy_sources > 0:
            health_report['overall_status'] = 'DEGRADED ⚠️'
        else:
            health_report['overall_status'] = 'CRITICAL ❌'
        
        print("\n" + "="*50)
        print("SYSTEM HEALTH REPORT")
        print("="*50)
        for category, status in health_report.items():
            if isinstance(status, dict):
                print(f"\n{category.upper()}:")
                for item, item_status in status.items():
                    print(f"  {item}: {item_status}")
            else:
                print(f"{category.upper()}: {status}")
        print("="*50)
        
        return health_report

# Usage example and singleton
production_pipeline = ProductionDataPipeline()

def get_real_time_data(tickers, period='1y', validate=True):
    """Convenience function for real-time data fetching."""
    return production_pipeline.fetch_real_time_stock_data(tickers, period, validate)

def get_risk_free_rate():
    """Convenience function for risk-free rate."""
    return production_pipeline.get_real_time_risk_free_rate()

def get_market_data(period='1y'):
    """Convenience function for market data."""
    return production_pipeline.get_real_time_market_data(period)

def run_health_check():
    """Convenience function for health check."""
    return production_pipeline.system_health_check()

# Auto-run health check on import (optional)
if __name__ == "__main__":
    run_health_check()
