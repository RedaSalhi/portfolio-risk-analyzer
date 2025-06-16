// src/polyfills.ts
// Polyfills pour assurer la compatibilité entre React Native et Web

import { Platform } from 'react-native';

// Declare global types
declare global {
  interface Window {
    __DEV__?: boolean;
  }
  
  namespace NodeJS {
    interface Global {
      TextEncoder: {
        new(): TextEncoder;
        prototype: TextEncoder;
      };
      TextDecoder: {
        new(label?: string, options?: TextDecoderOptions): TextDecoder;
        prototype: TextDecoder;
      };
      crypto: Crypto;
      performance: Performance;
      URL: {
        new(url: string | URL, base?: string | URL): URL;
        prototype: URL;
        canParse(url: string | URL, base?: string | URL): boolean;
        createObjectURL(obj: Blob | MediaSource): string;
        parse(url: string | URL, base?: string | URL): URL | null;
        revokeObjectURL(url: string): void;
      };
      URLSearchParams: {
        new(init?: string | URLSearchParams | string[][] | Record<string, string>): URLSearchParams;
        prototype: URLSearchParams;
      };
      fetch: typeof fetch;
      ErrorUtils: {
        setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
        getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
      };
      __DEV__?: boolean;
      Symbol: {
        iterator: symbol;
        asyncIterator: symbol;
        toStringTag: symbol;
      };
    }
  }
}

// Use globalThis for the global object
const globalObject = (globalThis as unknown) as NodeJS.Global;

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
  if (typeof globalObject.TextEncoder === 'undefined') {
    class TextEncoderPolyfill implements TextEncoder {
      readonly encoding = 'utf-8';
      
      encode(input: string): Uint8Array {
        const utf8: number[] = [];
        for (let i = 0; i < input.length; i++) {
          let charcode = input.charCodeAt(i);
          if (charcode < 0x80) {
            utf8.push(charcode);
          } else if (charcode < 0x800) {
            utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
          } else if (charcode < 0xd800 || charcode >= 0xe000) {
            utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
          } else {
            i++;
            charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
            utf8.push(0xf0 | (charcode >> 18), 0x80 | ((charcode >> 12) & 0x3f), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
          }
        }
        return new Uint8Array(utf8);
      }

      encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
        const encoded = this.encode(source);
        const written = Math.min(encoded.length, destination.length);
        destination.set(encoded.subarray(0, written));
        return { read: source.length, written };
      }
    }

    globalObject.TextEncoder = TextEncoderPolyfill as any;
  }

  // TextDecoder polyfill
  if (typeof globalObject.TextDecoder === 'undefined') {
    class TextDecoderPolyfill implements TextDecoder {
      readonly encoding = 'utf-8';
      readonly fatal = false;
      readonly ignoreBOM = false;

      constructor(label?: string, options?: TextDecoderOptions) {
        // Implementation ignores label and options for simplicity
      }

      decode(bytes: Uint8Array): string {
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
    }

    globalObject.TextDecoder = TextDecoderPolyfill as any;
  }
}

// Polyfill pour crypto.getRandomValues
if (typeof globalObject.crypto === 'undefined') {
  globalObject.crypto = {} as Crypto;
}

if (typeof globalObject.crypto.getRandomValues === 'undefined') {
  globalObject.crypto.getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
    if (array === null) return null as T;
    for (let i = 0; i < array.byteLength; i++) {
      (array as Uint8Array)[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };
}

// Polyfill pour performance.now()
if (typeof globalObject.performance === 'undefined') {
  globalObject.performance = {} as Performance;
}

if (typeof globalObject.performance.now === 'undefined') {
  const startTime = Date.now();
  globalObject.performance.now = () => {
    return Date.now() - startTime;
  };
}

// Polyfill pour URL sur React Native
if (typeof globalObject.URL === 'undefined' && Platform.OS !== 'web') {
  class URLPolyfill implements URL {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    searchParams: URLSearchParams;
    hash: string;
    username: string;
    password: string;
    origin: string;

    constructor(url: string, base?: string) {
      if (base) {
        this.href = base.endsWith('/') ? base + url : base + '/' + url;
      } else {
        this.href = url;
      }
      
      const parts = this.href.match(/^(https?:)\/\/([^\/]+)(\/.*)?$/);
      if (parts) {
        this.protocol = parts[1];
        this.host = parts[2];
        this.pathname = parts[3] || '/';
        
        const hostParts = this.host.split(':');
        this.hostname = hostParts[0];
        this.port = hostParts[1] || '';
      } else {
        throw new Error('Invalid URL');
      }

      // Initialize other required properties
      this.search = '';
      this.searchParams = new URLSearchParams();
      this.hash = '';
      this.username = '';
      this.password = '';
      this.origin = this.protocol + '//' + this.host;
    }
    
    toString(): string {
      return this.href;
    }

    toJSON(): string {
      return this.href;
    }
  }

  // Add static methods
  (URLPolyfill as any).createObjectURL = (obj: Blob | MediaSource): string => {
    throw new Error('createObjectURL not supported in polyfill');
  };

  (URLPolyfill as any).revokeObjectURL = (url: string): void => {
    throw new Error('revokeObjectURL not supported in polyfill');
  };

  (URLPolyfill as any).canParse = (url: string | URL, base?: string | URL): boolean => {
    try {
      new URLPolyfill(url.toString(), base?.toString());
      return true;
    } catch {
      return false;
    }
  };

  (URLPolyfill as any).parse = (url: string | URL, base?: string | URL): URL | null => {
    try {
      return new URLPolyfill(url.toString(), base?.toString());
    } catch {
      return null;
    }
  };

  globalObject.URL = URLPolyfill as any;
}

// Polyfill pour URLSearchParams sur React Native
if (typeof globalObject.URLSearchParams === 'undefined' && Platform.OS !== 'web') {
  class URLSearchParamsPolyfill implements URLSearchParams {
    private params: Map<string, string[]>;

    constructor(init?: string | URLSearchParams | string[][] | Record<string, string>) {
      this.params = new Map();
      
      if (init) {
        if (typeof init === 'string') {
          const pairs = init.replace(/^\?/, '').split('&');
          for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key) {
              this.append(
                decodeURIComponent(key),
                decodeURIComponent(value || '')
              );
            }
          }
        } else if (init instanceof URLSearchParams) {
          init.forEach((value, key) => this.append(key, value));
        } else if (Array.isArray(init)) {
          for (const [key, value] of init) {
            this.append(key, value);
          }
        } else {
          for (const [key, value] of Object.entries(init)) {
            this.append(key, value);
          }
        }
      }
    }
    
    get(key: string): string | null {
      const values = this.params.get(key);
      return values ? values[0] : null;
    }
    
    getAll(key: string): string[] {
      return this.params.get(key) || [];
    }
    
    has(key: string): boolean {
      return this.params.has(key);
    }
    
    set(key: string, value: string): void {
      this.params.set(key, [value]);
    }
    
    append(key: string, value: string): void {
      const values = this.params.get(key) || [];
      values.push(value);
      this.params.set(key, values);
    }
    
    delete(key: string): void {
      this.params.delete(key);
    }
    
    toString(): string {
      const pairs: string[] = [];
      for (const [key, values] of this.params) {
        for (const value of values) {
          pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
      }
      return pairs.join('&');
    }

    forEach(callback: (value: string, key: string, parent: URLSearchParams) => void): void {
      for (const [key, values] of this.params) {
        for (const value of values) {
          callback(value, key, this as unknown as URLSearchParams);
        }
      }
    }

    get size(): number {
      return this.params.size;
    }

    sort(): void {
      // Sort is not implemented in the polyfill
    }

    [Symbol.iterator](): IterableIterator<[string, string]> {
      const entries: [string, string][] = [];
      for (const [key, values] of this.params) {
        for (const value of values) {
          entries.push([key, value]);
        }
      }
      return entries[Symbol.iterator]();
    }
  }

  globalObject.URLSearchParams = URLSearchParamsPolyfill as any;
}

// Polyfill pour fetch timeout sur React Native
if (Platform.OS !== 'web' && typeof globalObject.fetch !== 'undefined') {
  const originalFetch = globalObject.fetch;
  
  globalObject.fetch = (input: RequestInfo | URL, init?: RequestInit & { timeout?: number }): Promise<Response> => {
    const { timeout = 10000, ...restOptions } = init || {};
    
    return Promise.race([
      originalFetch(input, restOptions),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  };
}

// Polyfill pour ErrorUtils sur le web
if (Platform.OS === 'web' && typeof globalObject.ErrorUtils === 'undefined') {
  globalObject.ErrorUtils = {
    setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => {
      window.onerror = (message: string | Event, filename?: string, lineno?: number, colno?: number, error?: Error) => {
        handler(error || new Error(message.toString()), false);
      };
      
      window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        handler(event.reason, false);
      });
    },
    
    getGlobalHandler: () => {
      return window.onerror as ((error: Error, isFatal?: boolean) => void) | null;
    }
  };
}

// Configuration des variables d'environnement pour le développement
if (__DEV__) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      (window as any).__DEV__ = true;
    }
  }
  
  if (typeof globalObject !== 'undefined') {
    globalObject.__DEV__ = true;
  }
}

// Support pour les Symbols si non disponible
if (typeof Symbol === 'undefined') {
  (globalObject as any).Symbol = {
    iterator: '@@iterator',
    asyncIterator: '@@asyncIterator',
    toStringTag: '@@toStringTag'
  };
}

// Polyfill pour Object.fromEntries (ES2019)
if (!(Object as any).fromEntries) {
  (Object as any).fromEntries = function<T>(iterable: Iterable<readonly [PropertyKey, T]>) {
    return [...iterable].reduce((obj, [key, val]) => {
      (obj as any)[key] = val;
      return obj;
    }, {} as Record<any, T>);
  };
}

// Polyfill pour Array.flat et Array.flatMap (ES2019)
if (!(Array.prototype as any).flat) {
  (Array.prototype as any).flat = function<T>(this: T[], depth = 1): T[] {
    const flatten = (arr: any[], d: number): any[] => {
      return d > 0
        ? arr.reduce((acc: any[], val: any) => acc.concat(Array.isArray(val) ? flatten(val, d - 1) : val), [])
        : arr.slice();
    };
    return flatten(this, depth);
  };
}

if (!(Array.prototype as any).flatMap) {
  (Array.prototype as any).flatMap = function<T, U>(this: T[], callback: (value: T, index: number, array: T[]) => U | U[], thisArg?: any): U[] {
    return ((this as T[]).map(callback, thisArg) as any).flat();
  };
}

// Polyfill pour String.prototype.replaceAll (ES2021)
if (!(String.prototype as any).replaceAll) {
  (String.prototype as any).replaceAll = function(this: string, searchValue: string | RegExp, replaceValue: string): string {
    return this.split(searchValue).join(replaceValue);
  };
}

console.log('✅ Polyfills loaded successfully for', Platform.OS);
