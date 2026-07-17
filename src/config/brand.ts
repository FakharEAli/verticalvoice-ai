export const brand = {
  name: 'VerticalVoice AI',
  tagline: 'AI-Powered Calling Agents for Every Vertical',
  domain: 'verticalvoice.ai',
  logo: '/logo/full.svg',
  logoAlt: 'VerticalVoice AI Logo',

  colors: {
    primary: '#6366F1',
    primaryForeground: '#FFFFFF',
    secondary: '#0EA5E9',
    accent: '#8B5CF6',
    destructive: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
  },

  copy: {
    heroTitle: 'AI Calling Agents That Close',
    heroSubtitle:
      'Deploy intelligent voice agents for Healthcare, Restaurants, and Real Estate — in minutes.',
    ctaButton: 'Start Free Trial',
    footerText: `© ${new Date().getFullYear()} VerticalVoice AI. All rights reserved.`,
  },

  support: {
    email: 'support@verticalvoice.ai',
    docs: 'https://docs.verticalvoice.ai',
  },

  social: {
    twitter: 'https://twitter.com/verticalvoiceai',
    linkedin: 'https://linkedin.com/company/verticalvoice-ai',
  },
} as const;

export type Brand = typeof brand;
