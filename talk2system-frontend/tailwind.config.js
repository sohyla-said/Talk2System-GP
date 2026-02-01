// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Define custom colors used in your components
        primary: {
          DEFAULT: '#6366f1',  // Indigo-500
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        'primary-accent': '#60a5fa',  // Blue-400
        'secondary-accent': '#a78bfa', // Purple-400
        'background-light': '#f9fafb', // Gray-50
        'background-dark': '#111827',  // Gray-900
        'surface-light': '#ffffff',
        'text-dark': '#1f2937',        // Gray-800
        'text-light': '#f9fafb',       // Gray-50
        'border-light': '#e5e7eb',     // Gray-200
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.05)',
        'xl-soft': '0 10px 25px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
  darkMode: 'class', // Enable dark mode with class strategy
}