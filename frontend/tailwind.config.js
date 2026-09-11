/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0c10",
          900: "#111319",
          800: "#181b23",
          700: "#232732",
          600: "#2f3542",
        },
        whisper: {
          50: "#fbf7ff",
          100: "#f2e8ff",
          200: "#e3ccff",
          300: "#cea3ff",
          400: "#b170ff",
          500: "#9645f5",
          600: "#7f2fdb",
          700: "#6a24b3",
          800: "#571f8f",
          900: "#481c73",
        },
        accent: {
          DEFAULT: "#ff5b7a",
          light: "#ff8aa1",
        },
      },
      fontFamily: {
        display: ["'Sora'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,17,22,0.06), 0 8px 24px rgba(16,17,22,0.06)",
        cardHover: "0 4px 10px rgba(16,17,22,0.08), 0 16px 40px rgba(16,17,22,0.10)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
