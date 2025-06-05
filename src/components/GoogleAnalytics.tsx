import { GoogleAnalytics as GA } from '@next/third-parties/google'

export default function GoogleAnalytics() {
  // Only track in production
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }
  
  return <GA gaId="G-PRWYF808QF" />
} 