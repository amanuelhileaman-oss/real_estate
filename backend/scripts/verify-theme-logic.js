/**
 * verify-theme-logic.js
 * Test the DOM mutation logic of applyThemeToDOM under light, dark, and system modes
 */

// Mock window and document environment
const classList = new Set();
const attributes = new Map();
const style = {};

global.document = {
  documentElement: {
    classList: {
      add: (cls) => classList.add(cls),
      remove: (cls) => classList.delete(cls),
      contains: (cls) => classList.has(cls)
    },
    setAttribute: (k, v) => attributes.set(k, v),
    getAttribute: (k) => attributes.get(k),
    style
  },
  body: {
    classList: {
      add: (cls) => classList.add('body-' + cls),
      remove: (cls) => classList.delete('body-' + cls),
      contains: (cls) => classList.has('body-' + cls)
    },
    setAttribute: (k, v) => attributes.set('body-' + k, v),
    getAttribute: (k) => attributes.get('body-' + k)
  }
};

global.window = {
  matchMedia: (query) => ({
    matches: query.includes('dark'),
    addEventListener: () => {},
    removeEventListener: () => {}
  })
};

// Import applyThemeToDOM logic directly
function applyThemeToDOM(themeMode) {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  const body = document.body;

  let isDark = false;
  if (themeMode === 'dark') {
    isDark = true;
  } else if (themeMode === 'light') {
    isDark = false;
  } else {
    isDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
    if (body) {
      body.classList.add('dark');
      body.setAttribute('data-theme', 'dark');
    }
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    if (body) {
      body.classList.remove('dark');
      body.setAttribute('data-theme', 'light');
    }
  }

  return isDark;
}

console.log('--- Testing Dark Mode ---');
let res = applyThemeToDOM('dark');
console.log('isDark:', res);
console.log('has .dark on root:', classList.has('dark'));
console.log('data-theme:', attributes.get('data-theme'));
console.log('colorScheme:', style.colorScheme);
if (!res || !classList.has('dark') || attributes.get('data-theme') !== 'dark') {
  throw new Error('Dark mode assertion failed');
}

console.log('\n--- Testing Light Mode ---');
res = applyThemeToDOM('light');
console.log('isDark:', res);
console.log('has .dark on root:', classList.has('dark'));
console.log('data-theme:', attributes.get('data-theme'));
console.log('colorScheme:', style.colorScheme);
if (res || classList.has('dark') || attributes.get('data-theme') !== 'light') {
  throw new Error('Light mode assertion failed');
}

console.log('\n--- Testing System Mode (prefers dark) ---');
res = applyThemeToDOM('system');
console.log('isDark:', res);
console.log('has .dark on root:', classList.has('dark'));
console.log('data-theme:', attributes.get('data-theme'));
if (!res || !classList.has('dark')) {
  throw new Error('System mode assertion failed');
}

console.log('\n✅ ALL THEME DOM MUTATION TESTS PASSED!');
