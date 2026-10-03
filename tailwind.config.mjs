/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        storm: {
          950: '#070A11', // Obsidian Abyss
          900: '#0E131F', // Deep surface
          800: '#161D2E', // Elevated cards
          700: '#232D42', // Borders
          600: '#34425E', // Muted text
        },
        electric: {
          400: '#3B82F6',
          500: '#0066FF',
          600: '#0055FF',
          700: '#0043CC',
        },
        ion: {
          400: '#00D2FF', // Catatumbo Flash
          300: '#38DDF8',
        },
        alert: {
          500: '#FF2A4B', // Breaking news
          600: '#E01637',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
