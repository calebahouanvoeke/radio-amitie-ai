export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"DM Sans"', 'sans-serif'], mono: ['"DM Mono"', 'monospace'] },
      colors: {
        zinc: { 950: '#09090b' },
        green: { 550: '#22c55e' }
      }
    }
  },
  plugins: []
}
