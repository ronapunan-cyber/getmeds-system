/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        // Brand Names
        'getmeds-blue': {
          DEFAULT: '#1D9FDA',
          hover: '#1583B5',
          light: '#E0F3FB',
          dark: '#116890',
          50: '#F0F9FD',
          100: '#E0F3FB',
          200: '#BAE3F7',
          500: '#1D9FDA',
          600: '#1583B5',
          700: '#116890',
          800: '#0E5473',
          900: '#0B415A',
        },
        'pharmacy-green': {
          DEFAULT: '#61A644',
          hover: '#4C8535',
          light: '#E4F4DC',
          dark: '#3A6729',
          50: '#F3FAF0',
          100: '#E4F4DC',
          200: '#C7E9B8',
          500: '#61A644',
          600: '#4C8535',
          700: '#3A6729',
          800: '#2B4D1F',
          900: '#1F3716',
        },
        brand: {
          blue: '#1D9FDA',
          green: '#61A644',
        },
        // Surfaces & Backgrounds
        surface: '#F4F8FB',
        'app-surface': '#F4F8FB',
        card: '#FFFFFF',
        'card-white': '#FFFFFF',
        // Typography
        ink: {
          DEFAULT: '#1E293B',
          primary: '#1E293B',
          secondary: '#64748B',
        },
        'ink-primary': '#1E293B',
        'ink-secondary': '#64748B',
        // Semantic Workflow States
        'state-warning': '#F59E0B',
        'state-warning-light': '#FEF3C7',
        'state-error': '#EF4444',
        'state-error-light': '#FEE2E2',
        'state-neutral': '#94A3B8',
        'state-neutral-light': '#F1F5F9',
        'state-success': '#61A644',
        'state-success-light': '#E4F4DC',
        // Primary alias
        primary: {
          DEFAULT: '#1D9FDA',
          hover: '#1583B5',
          light: '#BAE3F7',
          dark: '#116890',
        },
      }
    },
  },
  plugins: [],
}
