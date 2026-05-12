/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Icon-inspired color scheme
        'sats-cyan': '#00D9FF',
        'sats-cyan-dark': '#00A8CC',
        'sats-blue': '#0066FF',
        'sats-blue-light': '#3399FF',
        'sats-dark': '#001A4D',
        'sats-darker': '#000D26',
        'sats-accent': '#00E5FF',
        
        // Legacy colors (for backward compatibility)
        primary: '#0066FF',
        secondary: '#00D9FF',
        success: '#00D97D',
        warning: '#FFB84D',
        error: '#FF4D7D',
        info: '#00D9FF',
      },
      backgroundImage: {
        'sats-gradient': 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)',
        'sats-gradient-accent': 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
        'sats-card-gradient': 'linear-gradient(135deg, rgba(0, 102, 255, 0.1) 0%, rgba(0, 217, 255, 0.1) 100%)',
      },
      boxShadow: {
        'sats-glow': '0 0 20px rgba(0, 217, 255, 0.3)',
        'sats-glow-sm': '0 0 10px rgba(0, 102, 255, 0.2)',
      },
      borderRadius: {
        'sats-lg': '16px',
        'sats-xl': '24px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
