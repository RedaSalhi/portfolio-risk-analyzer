# Portfolio Risk Analyzer

This mobile app combines modern portfolio theory with Value-at-Risk analysis. It is built with **React Native** and [Expo](https://expo.dev).

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and fill in your API keys.
3. Start the development server:
   ```bash
   npx expo start
   ```

### Environment variables

The app relies on the following environment variables:

- `USE_REAL_DATA` – set to `true` to download the last year of prices from Yahoo Finance instead of using mock data.
- `ALPHAVANTAGE_API_KEY` – API key for [Alpha Vantage](https://www.alphavantage.co/). Required for real-time data fetching.
- `IEX_API_KEY` – API key for [IEX Cloud](https://iexcloud.io/) used by the data fetcher.

Variables can be defined in an `.env.local` file or exported in your shell before running Expo.

### Example `.env.local`

```bash
USE_REAL_DATA=true
ALPHAVANTAGE_API_KEY=your_alpha_vantage_key
IEX_API_KEY=your_iex_cloud_key
```

## Python data pipeline

The repository also contains `data_pipeline.py` for fetching and analyzing
financial data. Create a virtual environment and install the Python
dependencies with:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

After activating the environment you can run the pipeline or related scripts.
Deactivate the environment with `deactivate` when finished.

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo community Discord](https://chat.expo.dev)
