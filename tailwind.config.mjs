import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f8f8f6",
          100: "#f2f1ed",
          200: "#e8e4db",
          300: "#d6d0c4",
          400: "#aaa08f",
          500: "#7d7366",
          600: "#5c554b",
          700: "#403a34",
          800: "#2a2521",
          900: "#171412"
        },
        accent: {
          400: "#4d8b7c",
          500: "#326c61",
          600: "#28574f"
        }
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "'Noto Sans SC'", "system-ui", "sans-serif"],
        serif: ["'Source Serif 4'", "'Noto Serif SC'", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"]
      },
      boxShadow: {
        paper: "0 12px 40px rgba(0, 0, 0, 0.08)"
      },
      maxWidth: {
        reading: "72ch"
      }
    }
  },
  plugins: [typography]
};
