import { findNodeHandle } from 'react-native';
import * as ReactDOM from 'react-dom';

// Polyfill for libraries that still use ReactDOM.findDOMNode
if (typeof (ReactDOM as any).findDOMNode !== 'function') {
  (ReactDOM as any).findDOMNode = findNodeHandle as any;
}

export {};
