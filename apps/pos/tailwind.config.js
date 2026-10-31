/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@bizbox/config/tailwind.preset.js')],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [],
};

