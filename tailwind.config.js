/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  // hover: styles only on devices that hover; on a phone a tapped row kept its hover colour
  future: { hoverOnlyWhenSupported: true },
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Outfit Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
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
        // Macro colours (protein is primary); set per theme.
        carbs: 'hsl(var(--carbs))',
        fat: 'hsl(var(--fat))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 6px)',
        sm: 'calc(var(--radius) - 10px)',
      },
      keyframes: {
        // Something just ticked off: it lands a touch too big, then settles
        pop: { '0%': { transform: 'scale(0.6)' }, '60%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } },
        // Opacity only: unlike tailwindcss-animate's `animate-in`, no transform, so fixed bars inside stay pinned
        'fade-in': { from: { opacity: '0' } },
      },
      animation: {
        pop: 'pop 0.35s ease-out',
        'fade-in': 'fade-in 0.22s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
