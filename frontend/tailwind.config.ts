import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ledger: {
          ink: "#111815",
          muted: "#66736b",
          line: "#dfe8e1",
          wash: "#f7faf7",
          panel: "#ffffff",
          accent: "#24764a",
          "accent-strong": "#185a37",
          "accent-soft": "#e7f3ec",
          amber: "#b7791f"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(17, 24, 21, 0.06)",
        dialog: "0 24px 70px rgba(17, 24, 21, 0.18)"
      }
    }
  },
  plugins: [forms]
};

export default config;
