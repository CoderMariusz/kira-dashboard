import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../_shared/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
