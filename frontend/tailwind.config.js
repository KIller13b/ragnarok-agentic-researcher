/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic design tokens matching specification
        app: {
          bg: 'var(--color-page-bg)',
          card: 'var(--color-card-bg)',
          elevated: 'var(--color-elevated-bg)',
          primary: 'var(--color-primary-text)',
          secondary: 'var(--color-secondary-text)',
          border: 'var(--color-border)',
          blue: 'var(--color-primary-blue)',
          blueHover: 'var(--color-blue-hover)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
        },
        navy: {
          950: '#070C18',
          900: '#0A1124',
          850: '#0E172F',
          800: '#14203E',
          700: '#1E2F5B',
          600: '#2A437E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
};
