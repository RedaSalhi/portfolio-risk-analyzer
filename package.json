{
  "name": "financial-risk-analyzer",
  "version": "1.0.0",
  "description": "Application d'analyse de risque financier avec optimisation de portefeuille et calculs VaR",
  "main": "node_modules/expo/AppEntry.js",
  "keywords": [
    "finance",
    "portfolio",
    "risk",
    "var",
    "optimization",
    "react-native",
    "expo"
  ],
  "author": "SALHI Reda <reda.salhi@centrale-med.fr>",
  "license": "MIT",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "build": "expo build",
    "build:android": "expo build:android",
    "build:ios": "expo build:ios",
    "publish": "expo publish",
    "eject": "expo eject",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "clean": "node cleanup.cjs",
    "clean:cache": "expo r -c",
    "clean:node": "rm -rf node_modules && npm install",
    "reset": "npm run clean && npm run clean:cache && npm run clean:node",
    "dev": "expo start --dev-client",
    "prebuild": "expo prebuild",
    "doctor": "expo doctor"
  },
  "dependencies": {
    "@expo/vector-icons": "^14.1.0",
    "@react-native-async-storage/async-storage": "1.25.0",
    "@react-native-community/slider": "4.5.6",
    "@react-navigation/bottom-tabs": "^6.6.1",
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/stack": "^6.4.1",
    "expo": "~53.0.11",
    "expo-constants": "~17.1.6",
    "expo-font": "~13.3.1",
    "expo-linear-gradient": "~14.1.5",
    "expo-linking": "~7.1.5",
    "expo-router": "~5.1.0",
    "expo-splash-screen": "~0.30.9",
    "expo-status-bar": "~2.2.3",
    "expo-web-browser": "~14.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "react-native": "0.79.3",
    "react-native-chart-kit": "^6.12.0",
    "react-native-gesture-handler": "~2.24.0",
    "react-native-reanimated": "~3.17.4",
    "react-native-safe-area-context": "5.4.0",
    "react-native-screens": "~4.11.1",
    "react-native-svg": "^15.9.0",
    "react-native-web": "~0.20.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@babel/preset-env": "^7.25.3",
    "@babel/preset-react": "^7.24.7",
    "@babel/preset-typescript": "^7.24.7",
    "@types/jest": "^29.5.13",
    "@types/react": "~19.0.10",
    "@types/react-native": "^0.73.0",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "eslint": "^9.25.0",
    "eslint-config-expo": "~9.2.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-prettier": "^5.2.1",
    "eslint-plugin-react": "^7.35.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "jest": "^29.7.0",
    "jest-expo": "^51.0.4",
    "prettier": "^3.3.3",
    "typescript": "~5.8.3"
  },
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ],
    "collectCoverageFrom": [
      "src/**/*.{js,jsx,ts,tsx}",
      "!src/**/*.d.ts",
      "!src/**/*.test.{js,jsx,ts,tsx}",
      "!src/**/index.{js,jsx,ts,tsx}"
    ],
    "coverageDirectory": "coverage",
    "coverageReporters": [
      "text",
      "lcov",
      "html"
    ]
  },
  "eslintConfig": {
    "extends": [
      "expo",
      "@typescript-eslint/recommended",
      "prettier"
    ],
    "plugins": [
      "@typescript-eslint",
      "react",
      "react-hooks",
      "prettier"
    ],
    "rules": {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "off"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
      "ecmaVersion": 2021,
      "sourceType": "module",
      "ecmaFeatures": {
        "jsx": true
      }
    }
  },
  "prettier": {
    "semi": true,
    "trailingComma": "es5",
    "singleQuote": true,
    "printWidth": 80,
    "tabWidth": 2,
    "useTabs": false,
    "bracketSpacing": true,
    "arrowParens": "avoid"
  },
  "expo": {
    "name": "Financial Risk Analyzer",
    "slug": "financial-risk-analyzer",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#667eea"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.redasalhi.financialriskanalyzer",
      "buildNumber": "1.0.0"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#667eea"
      },
      "package": "com.redasalhi.financialriskanalyzer",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/username/financial-risk-analyzer.git"
  },
  "bugs": {
    "url": "https://github.com/username/financial-risk-analyzer/issues"
  },
  "homepage": "https://github.com/username/financial-risk-analyzer#readme",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "private": true
}
