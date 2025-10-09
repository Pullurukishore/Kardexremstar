import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Optimize for production builds
  future: {
    hoverOnlyWhenSupported: true,
  },
  // Production CSS purging configuration
  safelist: [
    // Animation classes that might be added dynamically
    'animate-pulse',
    'animate-spin',
    'animate-bounce',
    // Dynamic color classes for badges and status indicators
    {
      pattern: /bg-(blue|green|red|yellow|purple|orange)-(50|100|500|600|700)/,
    },
    {
      pattern: /text-(blue|green|red|yellow|purple|orange)-(600|700|800|900)/,
    },
    {
      pattern: /border-(blue|green|red|yellow|purple|orange)-(200|300)/,
    },
    // Grid classes that might be used dynamically
    {
      pattern: /grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)/,
    },
    // Responsive display classes
    'sm:flex', 'md:flex', 'lg:flex', 'xl:flex', '2xl:flex',
    'sm:hidden', 'md:hidden', 'lg:hidden', 'xl:hidden', '2xl:hidden',
    'sm:block', 'md:block', 'lg:block', 'xl:block', '2xl:block',
    'sm:flex-row', 'sm:flex-col', 'md:flex-row', 'md:flex-col',
    'lg:flex-row', 'lg:flex-col', 'xl:flex-row', 'xl:flex-col',
    // Responsive grid classes
    'sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3', 'sm:grid-cols-4',
    'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4',
    'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4', 'lg:grid-cols-5', 'lg:grid-cols-6',
    'xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4', 'xl:grid-cols-5', 'xl:grid-cols-6',
  ],
  // Disable unused features for smaller CSS bundle (~3KB reduction)
  corePlugins: {
    // Re-enable backdrop blur for mobile modals
    backdropBlur: true,
    backdropOpacity: true,
    // Disable other unused backdrop filters
    backdropBrightness: false,
    backdropContrast: false,
    backdropGrayscale: false,
    backdropHueRotate: false,
    backdropInvert: false,
    backdropSaturate: false,
    backdropSepia: false,
    // Re-enable blur for mobile effects
    blur: true,
    // Disable other unused filters
    brightness: false,
    contrast: false,
    dropShadow: false,
    grayscale: false,
    hueRotate: false,
    invert: false,
    saturate: false,
    sepia: false,
    // Disable unused layout features  
    isolation: false,
    mixBlendMode: false,
    objectFit: false,
    objectPosition: false,
    // Re-enable overscroll for mobile
    overscrollBehavior: true,
    // Disable unused text features
    textDecorationColor: false,
    textDecorationStyle: false,
    textDecorationThickness: false,
    textIndent: false,
    textUnderlineOffset: false,
    // Disable unused transforms (keep scale for hover effects)
    rotate: false,
    skew: false,
    transformOrigin: false,
  },
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-fira-code)', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
