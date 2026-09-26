/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: '#FFFFFF',
        foreground: '#111111',
        muted: '#6B6B6B',
        'muted-foreground': '#71717A',
        border: '#E5E5E5',
        'border-strong': '#D4D4D8',
        surface: '#FAFAFA',
        'surface-hover': '#F4F4F5',
        'surface-active': '#E4E4E7',
        'dark-surface': '#111111',
        'dark-border': '#27272A',
        'dark-muted': '#A1A1AA',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'marquee-up': {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(-50%)' },
        },
        'marquee-down': {
          '0%': { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(0%)' },
        },
      },
      animation: {
        marquee: 'marquee 35s linear infinite',
        'marquee-up': 'marquee-up 28s linear infinite',
        'marquee-down': 'marquee-down 28s linear infinite',
      },
    },
  },
  plugins: [],
}
