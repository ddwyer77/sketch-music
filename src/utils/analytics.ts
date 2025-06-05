// Declare gtag as a global function
declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config',
      action: string,
      params?: {
        [key: string]: any;
      }
    ) => void;
  }
}

export const trackEvent = (action: string, params?: { [key: string]: any }) => {
  // Only track in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Analytics Event (dev):', action, params);
    return;
  }

  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
};