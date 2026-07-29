/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#5B5CEB',
        secondary: '#7C83FD',
        background: {
          DEFAULT: '#FAFAFC',
          dark: '#0F1117',
        },
        card: {
          DEFAULT: '#FFFFFF',
          dark: '#1A1D27',
        },
        text: {
          DEFAULT: '#111827',
          dark: '#F1F5F9',
        },
        textSecondary: {
          DEFAULT: '#6B7280',
          dark: '#94A3B8',
        },
        success: '#22C55E',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};