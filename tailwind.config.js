/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        swiggy: {
          orange: '#fc8019',
          orangeHover: '#e06f13',
          dark: '#02060c',
          textHover: '#ff5200',
          bgBase: '#ffffff',
          bgHover: '#f0f0f5',
          grayText: '#686b78',
          borderLight: '#e9ecee',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'sans-serif'], // Swiggy uses clean sans-serif like Proxima Nova
      },
      boxShadow: {
        'swiggy': '0 15px 40px -20px rgba(40,44,63,.15)',
        'swiggyHover': '0 2px 8px rgba(28,28,28,0.08)',
        'cardBase': '0 2px 14px rgba(0, 0, 0, 0.08)'
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
};
