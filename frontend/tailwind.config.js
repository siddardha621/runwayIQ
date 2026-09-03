/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fintech: {
          dark: "#090d16",
          card: "#0f172a",
          border: "#1e293b",
        }
      }
    },
  },
  plugins: [],
}
