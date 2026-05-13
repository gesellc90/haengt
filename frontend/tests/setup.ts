import '@testing-library/jest-dom/vitest';

// React Router v6 gibt Deprecation-Warnings zu v7-Future-Flags aus.
// Diese sind harmlos und werden hier unterdrückt, damit der Test-Output sauber bleibt.
const originalWarn = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('React Router Future Flag Warning')) return;
  originalWarn(...args);
};
