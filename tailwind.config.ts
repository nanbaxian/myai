// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ================================================
      // 色彩系统（纸墨美学）
      // ================================================
      colors: {
        // 墨色（文字）
        ink: {
          DEFAULT: '#1a1410',
          soft:    '#4a3f35',
          mute:    '#9a8a7a',
        },
        // 纸色（背景）
        paper: {
          DEFAULT: '#f5f0e8',
          warm:    '#ede6d6',
          deep:    '#e0d5c0',
        },
        // 朱砂红（主色调）
        accent: {
          DEFAULT: '#c4432a',
          soft:    '#e8a090',
        },
        // 金色（中期记忆）
        gold: '#b8860b',
      },

      // ================================================
      // 字体
      // ================================================
      fontFamily: {
        sans:    ['Noto Sans SC', 'sans-serif'],
        serif:   ['Noto Serif SC', 'serif'],
        display: ['DM Serif Display', 'serif'],
      },

      // ================================================
      // 阴影
      // ================================================
      boxShadow: {
        glow: '0 2px 8px rgba(196, 67, 42, 0.18)',
        card: '0 2px 12px rgba(26, 20, 16, 0.08)',
        modal: '0 20px 60px rgba(26, 20, 16, 0.25)',
      },

      // ================================================
      // 动画
      // ================================================
      animation: {
        'fade-up':      'fadeUp 0.35s ease both',
        'fade-in':      'fadeIn 0.25s ease both',
        'slide-up':     'slideUp 0.25s ease both',
        'typing':       'typing 1.2s infinite',
        'blink':        'blink 1s step-end infinite',
        'float':        'float 3s ease-in-out infinite',
        'record-pulse': 'recordPulse 1s infinite',
      },

      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        typing: {
          '0%, 100%': { transform: 'translateY(0)',    opacity: '0.5' },
          '50%':       { transform: 'translateY(-5px)', opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        recordPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(196, 67, 42, 0.3)' },
          '50%':       { boxShadow: '0 0 0 6px rgba(196, 67, 42, 0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
