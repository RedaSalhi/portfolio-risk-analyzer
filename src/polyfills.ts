// src/polyfills.js
// Polyfills pour assurer la compatibilité entre React Native et Web

import { Platform } from 'react-native';

// Polyfill pour console.debug sur certaines plateformes
if (typeof console.debug === 'undefined') {
  console.debug = console.log;
}

// Polyfill pour requestAnimationFrame sur le web
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback) => {
      return setTimeout(callback, 16); // ~60fps
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id) => {
      clearTimeout(id);
    };
  }
}

// Polyfill pour TextEncoder/TextDecoder sur React Native
if (Platform.OS !== 'web') {
  // TextEncoder polyfill
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = class TextEncoder {
      encode(string) {
        const utf8 = [];
        for (let i = 0; i < string.length; i++) {
          let charcode = string.charCodeAt(i);
          if (charcode < 0x80) {
            utf8.push(charcode);
          } else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
          } else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
          } else {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (string.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
          }
        }
        return new Uint8Array(utf8);
      }
    };
  }

  // TextDecoder polyfill
  if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = class TextDecoder {
      decode(bytes) {
        let string = '';
        let i = 0;
        while (i < bytes.length) {
          let byte1 = bytes[i++];
          if (byte1 < 0x80) {
            string += String.fromCharCode(byte1);
          } else if (byte1 < 0xe0) {
            let byte2 = bytes[i++];
            string += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
          } else if (byte1 < 0xf0) {
            let byte2 = bytes[i++];
            let byte3 = bytes[i++];
            string += String.fromCharCode(((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f));
          } else {
            let byte2 = bytes[i++];
            let byte3 = bytes[i++];
            let byte4 = bytes[i++];
            let codepoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3f) << 12) | ((byte3 & 0x3f) << 6) | (byte4 & 0x3f);
            codepoint -= 0x10000;
            string += String.fromCharCode((codepoint >> 10) + 0xd800, (codepoint & 0x3ff) + 0xdc00);
          }
        }
        return string;
      }
    };
  }
}

// Polyfill pour crypto.getRandomValues (pour générateurs de nombres aléatoires sécurisés)
if (typeof global.crypto === 'undefined') {
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues === 'undefined') {
  global.crypto.getRandomValues = (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Polyfill pour performance.now() sur React Native
if (typeof global.performance === 'undefined') {
  global.performance = {};
}

if (typeof global.performance.now === 'undefined') {
  const startTime = Date.now();
  global.performance.now = () => {
    return Date.now() - startTime;
  };
}

// Polyfill pour URL sur React Native
if (typeof global.URL === 'undefined' && Platform.OS !== 'web') {
  global.URL = class URL {
    constructor(url, base) {
      if (base) {
        // Simple concatenation pour les cas de base
        this.href = base.endsWith('/') ? base + url : base + '/' + url;
      } else {
        this.href = url;
      }
      
      // Parse basique de l'URL
      const parts = this.href.match(/^(https?:)\/\/([^\/]+)(\/.*)?$/);
      if (parts) {
        this.protocol = parts[1];
        this.host = parts[2];
        this.pathname = parts[3] || '/';
        
        const hostParts = this.host.split(':');
        this.hostname = hostParts[0];
        this.port = hostParts[1] || '';
      }
    }
    
    toString() {
      return this.href;
    }
  };
}

// Polyfill pour URLSearchParams sur React Native
if (typeof global.URLSearchParams === 'undefined' && Platform.OS !== 'web') {
  global.URLSearchParams = class URLSearchParams {
    constructor(search) {
      this.params = new Map();
      
      if (search) {
        const pairs = search.replace(/^\?/, '').split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key) {
            this.params.set(
              decodeURIComponent(key),
              decodeURIComponent(value || '')
            );
          }
        }
      }
    }
    
    get(key) {
      return this.params.get(key);
    }
    
    set(key, value) {
      this.params.set(key, value);
    }
    
    toString() {
      const pairs = [];
      for (const [key, value] of this.params) {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
      return pairs.join('&');
    }
  };
}

// Polyfill pour fetch timeout sur React Native (amélioration)
if (Platform.OS !== 'web' && typeof global.fetch !== 'undefined') {
  const originalFetch = global.fetch;
  
  global.fetch = (url, options = {}) => {
    const { timeout = 10000, ...restOptions } = options;
    
    return Promise.race([
      originalFetch(url, restOptions),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  };
}

// Polyfill pour ErrorUtils sur le web
if (Platform.OS === 'web' && typeof global.ErrorUtils === 'undefined') {
  global.ErrorUtils = {
    setGlobalHandler: (handler) => {
      window.onerror = (message, filename, lineno, colno, error) => {
        handler(error || new Error(message), false);
      };
      
      window.addEventListener('unhandledrejection', (event) => {
        handler(event.reason, false);
      });
    },
    
    getGlobalHandler: () => {
      return window.onerror;
    }
  };
}

// Configuration des variables d'environnement pour le développement
if (__DEV__) {
  // Activation des warnings React en développement
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.__DEV__ = true;
    }
  }
  
  // Configuration du debugging pour les outils de développement
  if (typeof global !== 'undefined') {
    global.__DEV__ = true;
  }
}

// Support pour les Symbols si non disponible
if (typeof Symbol === 'undefined') {
  global.Symbol = {};
  global.Symbol.iterator = '@@iterator';
  global.Symbol.asyncIterator = '@@asyncIterator';
  global.Symbol.toStringTag = '@@toStringTag';
}

// Polyfill pour Object.fromEntries (ES2019)
if (!Object.fromEntries) {
  Object.fromEntries = (iterable) => {
    return [...iterable].reduce((obj, [key, val]) => {
      obj[key] = val;
      return obj;
    }, {});
  };
}

// Polyfill pour Array.flat et Array.flatMap (ES2019)
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth = 1) {
    const flatten = (arr, d) => {
      return d > 0
        ? arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val, d - 1) : val), [])
        : arr.slice();
    };
    return flatten(this, depth);
  };
}

if (!Array.prototype.flatMap) {
  Array.prototype.flatMap = function(callback, thisArg) {
    return this.map(callback, thisArg).flat();
  };
}

// Polyfill pour String.prototype.replaceAll (ES2021)
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function(searchValue, replaceValue) {
    return this.split(searchValue).join(replaceValue);
  };
}

console.log('✅ Polyfills loaded successfully for', Platform.OS);
