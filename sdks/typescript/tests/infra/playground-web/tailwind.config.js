/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "rgba(255, 255, 255, 0.08)",
        input: "rgba(255, 255, 255, 0.05)",
        ring: "hsl(199, 89%, 48%)",
        background: "#07070a",
        foreground: "#f4f4f5",
        primary: {
          DEFAULT: "hsl(199, 89%, 48%)", // Cyan
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          foreground: "#f4f4f5",
        },
        destructive: {
          DEFAULT: "hsl(346, 84%, 50%)", // Rose
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "hsl(142, 76%, 36%)", // Emerald
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "hsl(38, 92%, 50%)", // Amber
          foreground: "#000000",
        },
        muted: {
          DEFAULT: "rgba(255, 255, 255, 0.4)",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "rgba(56, 189, 248, 0.15)",
          foreground: "#38bdf8",
        },
        card: {
          DEFAULT: "#0d0e14",
          foreground: "#f4f4f5",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 0.25s ease-out forwards"
      }
    },
  },
  plugins: [],
}
