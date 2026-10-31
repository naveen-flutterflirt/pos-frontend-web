/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        bizbox: {
          navy: {
            DEFAULT: '#0B1F4B',
            dark: '#071533',
            light: '#132C66',
          },
          indigo: {
            DEFAULT: '#3B4FE0',
            hover: '#2E3FC6',
            light: '#EBF0FF',
          },
          pink: {
            DEFAULT: '#E91E7B',
            hover: '#D0156B',
            light: '#FDEBF3',
          },
          teal: {
            DEFAULT: '#12B39A',
            hover: '#0E937E',
            light: '#E7F7F4',
          },
          amber: {
            DEFAULT: '#F59E0B',
            light: '#FEF3C7',
          },
          surface: {
            DEFAULT: '#F8FAFC',
            subtle: '#F1F5F9',
            card: '#FFFFFF',
            border: '#E2E8F0',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      }
    },
  },
  plugins: [],
};

