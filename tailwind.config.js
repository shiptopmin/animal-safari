/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        cute: ['Nunito', 'Comic Neue', 'cursive'],
      },
      animation: {
        twinkle: 'twinkle 1.5s ease-in-out infinite alternate',
        float: 'float 3s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 1s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
      keyframes: {
        twinkle: {
          '0%': { opacity: '0.2', transform: 'scale(0.7)' },
          '100%': { opacity: '1', transform: 'scale(1.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.08)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
