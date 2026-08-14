import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta Publi Legal — inspirada em BLL (verde esmeralda + preto + branco)
        ink: {
          50: '#F8FAFB',
          100: '#EEF1F4',
          200: '#D6DCE3',
          300: '#A9B3C0',
          400: '#6B7A8C',
          500: '#4A5867',
          600: '#34404E',
          700: '#222C39',
          800: '#15202C',
          900: '#0B1620',
          950: '#061018',
        },
        // Primary verde esmeralda (BLL style)
        brand: {
          50: '#E6F4F1',
          100: '#BFE0D6',
          200: '#80C2AD',
          300: '#4DA48C',
          400: '#1BAB6C',
          500: '#009B81',  // PRIMARY BLL
          600: '#00786C',  // SECONDARY BLL
          700: '#024638',  // DARK GREEN BLL
          800: '#003A30',
          900: '#002A2A',
        },
        // Accent verde lima (CTAs / destaques)
        accent: {
          50: '#F0FDE8',
          100: '#D8FAB9',
          200: '#B0F47A',
          300: '#84E642',
          400: '#5BD224',
          500: '#02C549',  // LIME BLL
          600: '#019C39',
          700: '#017328',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Helvetica Neue"',
          'Inter', 'Segoe UI', 'Roboto', 'system-ui', 'sans-serif',
        ],
        serif: ['"Sora"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgb(2 70 56 / 0.08), 0 4px 16px -4px rgb(2 70 56 / 0.10)',
        'lift': '0 8px 24px -8px rgb(2 70 56 / 0.18), 0 4px 12px -4px rgb(2 70 56 / 0.12)',
        'brand': '0 6px 20px -6px rgb(0 155 129 / 0.40)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(180deg, #004242 0%, #000000 100%)',
        'hero-gradient-2': 'linear-gradient(135deg, #024638 0%, #00786C 50%, #009B81 100%)',
        'brand-gradient': 'linear-gradient(135deg, #009B81 0%, #00786C 100%)',
        'lime-gradient': 'linear-gradient(135deg, #02C549 0%, #1BAB6C 100%)',
        'soft-gradient': 'linear-gradient(180deg, #F7F7F7 0%, #FFFFFF 100%)',
      },
      borderRadius: {
        'pill': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-up': 'fadeUp 0.7s ease-out',
        'slide-in': 'slideIn 0.5s ease-out',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideIn: { '0%': { transform: 'translateX(-20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
    },
  },
  plugins: [],
};

export default config;
