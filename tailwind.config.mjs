/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        storm: {
          950: '#070A11', // Obsidian Canvas (Base background)
          900: '#0E131F', // Deep Editorial Card Surface
          850: '#121826', // Elevated Card Hover
          800: '#1A2234', // Subtle Grid Divider
          700: '#25314C', // Active Border & Focus Rings
          600: '#34425E', // Muted Lead Text
        },
        electric: {
          brand: '#0055FF', // Primary Editorial Blue
          hover: '#0043CC', // High-contrast interactive hover
          glow: '#0066FF',
          400: '#38BDF8',
          500: '#0055FF',
          600: '#0047D4',
          700: '#003BB0',
        },
        ion: {
          400: '#00D2FF', // Catatumbo Flash & Telemetry
          300: '#67E8F9',
        },
        editorial: {
          ink: '#F8FAFC',        // Pure White Headline Ink
          parchment: '#F5F2EB',  // Warm Editorial Paper Tint (Softens optical glare)
          sandstone: '#E2DACE',  // Humanized Editorial Neutral
          paper: '#E2E8F0',      // Soft Lead Body Copy
          muted: '#94A3B8',      // Metadata & Bylines
          caption: '#64748B',    // Timestamps & Categories
          amber: '#F59E0B',      // Warm Humanized Editorial Glow
          surface: '#0B101D',    // Deep Calm Editorial Slate
        },
        alert: {
          500: '#E11D48', // Breaking news pulse
          600: '#BE123C',
        }
      },
      boxShadow: {
        'editorial-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'editorial-nav': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 8px 24px -6px rgba(0, 0, 0, 0.6)',
        'editorial-glow': '0 0 20px -4px rgba(0, 85, 255, 0.25)',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'Cambria', 'serif'],
        sans: ['Geist', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      }
    },
  },
  plugins: [],
};
