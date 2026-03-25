import '@testing-library/jest-dom';

// jsdom does not implement scrollIntoView; stub it globally so components
// using ref.scrollIntoView() don't throw in tests.
window.HTMLElement.prototype.scrollIntoView = () => {};
