import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

// Design tokens sourced from WIREFRAMES.md and ARCHITECTURE.md
// Primary palette: deep slate backgrounds, teal/cyan accents
const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface layers — dark command-center palette
        surface: {
          primary: '#0E1117',   // deepest background
          sidebar: '#0D1117',   // sidebar background
          topbar: '#161B22',    // top bar background
          card: '#1C2128',      // card / panel background
          elevated: '#1C2128',  // elevated panels (same tier as card)
          column: '#131920',    // kanban column body
          hover: '#21262D',     // hover state overlay
        },
        // Border tokens
        border: {
          DEFAULT: '#30363D',   // color-border-default
          hover: '#484F58',     // color-border-hover
        },
        // Text tokens
        text: {
          default: '#E6EDF3',   // primary readable text
          muted: '#8B949E',     // secondary / labels / captions
        },
        // Accent — teal/cyan primary action color
        accent: {
          teal: {
            400: '#2DD4BF',
            500: '#14B8A6',
            600: '#0D9488',
          },
        },
        // Semantic states
        status: {
          inprogress: '#1F6FEB',
          inreview: '#D29922',
          done: '#2EA043',
          blocked: '#DA3633',
        },
        // Semantic feedback colors
        error: {
          400: '#F85149',
          500: '#DA3633',
        },
        warning: {
          500: '#D29922',
        },
        success: {
          500: '#2EA043',
        },
        // Neutral scale (used for empty state icons, drag handles, etc.)
        neutral: {
          500: '#6E7681',
          600: '#484F58',
          700: '#30363D',
          800: '#21262D',
          900: '#161B22',
        },
      },
      fontFamily: {
        // Display + headings: DM Mono (engineered feel, precise number alignment)
        mono: ['"DM Mono"', 'ui-monospace', 'monospace'],
        // Body + UI copy: DM Sans (clean, legible at small sizes)
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Typography scale
        'heading-1': ['2rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        'heading-2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'heading-3': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        small: ['0.75rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        caption: ['0.6875rem', { lineHeight: '1rem', fontWeight: '400' }],
        label: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      },
      spacing: {
        // Spacing scale (4px base unit)
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        card: '8px',
        'task-card': '6px',
        badge: '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        shimmer: 'shimmer 1.5s linear infinite',
        'spin-slow': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      // Sidebar widths
      width: {
        sidebar: '240px',
        'sidebar-collapsed': '64px',
        'sidebar-drawer': '280px',
      },
      // Top bar and bottom nav heights
      height: {
        topbar: '56px',
        'bottom-nav': '56px',
      },
      // Kanban column
      minWidth: {
        'kanban-column': '280px',
      },
    },
  },
  plugins: [forms],
};

export default config;
