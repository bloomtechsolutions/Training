/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bml: { DEFAULT: '#B50928', 50: '#FFF1F3', 100: '#FFE0E5', 200: '#FDBFC9', 400: '#E2405C', 600: '#B50928', 700: '#920720', 800: '#6E0618', 900: '#4A0410' },
        ink: { DEFAULT: '#1B1530', 2: '#4A4560', 3: '#7A7590', 4: '#B4B0C4' },
        canvas: '#F7F5FB',
        lav: { 50: '#F5F2FF', 100: '#ECE6FF', 200: '#D9CEFF', 500: '#7C5CFA', 600: '#5B3FD9', 700: '#4A2FC0' },
        coral: { 50: '#FFF3EF', 100: '#FFE3DA', 500: '#FF6B4A', 600: '#E8502F' },
        teal: { 50: '#ECFBF8', 100: '#CFF5EE', 500: '#14B8A6', 600: '#0E9384', 700: '#0B7468' },
        amber: { 50: '#FFF8EB', 100: '#FFEDC7', 500: '#F5A524', 600: '#D98A0B', 700: '#A86A06' },
        sky2: { 50: '#EEF5FF', 100: '#DCEBFF', 500: '#3B82F6', 600: '#2563EB' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,21,48,.04), 0 8px 24px -12px rgba(27,21,48,.12)',
        pop: '0 20px 50px -20px rgba(91,63,217,.35)',
      },
      borderRadius: { xl2: '1.25rem' },
    },
  },
  plugins: [],
};
