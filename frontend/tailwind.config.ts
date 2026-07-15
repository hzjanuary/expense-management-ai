import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ledger: {
          ink: "#17201b",
          muted: "#637067",
          line: "#dbe5dc",
          wash: "#f5f8f4",
          panel: "#ffffff",
          accent: "#2f7d50",
          amber: "#b7791f"
        }
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 32, 27, 0.08)"
      }
    }
  },
  plugins: [forms]
};

export default config;
