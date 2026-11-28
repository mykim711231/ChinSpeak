export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#b45309', 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 700: '#92400e' }, paper: '#faf8f5' },
      fontFamily: {
        sans: ['var(--font-sans)'],
        hanzi: ['var(--font-hanzi)'],
        pinyin: ['var(--font-pinyin)'],
      },
    },
  },
  plugins: [],
};
