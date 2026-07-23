import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ledger: {
          accent: "rgb(var(--ledger-accent) / <alpha-value>)",
          "accent-soft": "rgb(var(--ledger-accent-soft) / <alpha-value>)",
          "accent-strong": "rgb(var(--ledger-accent-strong) / <alpha-value>)",
          amber: "rgb(var(--ledger-warning) / <alpha-value>)",
          border: "rgb(var(--ledger-border-strong) / <alpha-value>)",
          code: "rgb(var(--ledger-code) / <alpha-value>)",
          danger: "rgb(var(--ledger-danger) / <alpha-value>)",
          "danger-soft": "rgb(var(--ledger-danger-soft) / <alpha-value>)",
          focus: "rgb(var(--ledger-focus) / <alpha-value>)",
          ink: "rgb(var(--ledger-ink) / <alpha-value>)",
          line: "rgb(var(--ledger-line) / <alpha-value>)",
          muted: "rgb(var(--ledger-muted) / <alpha-value>)",
          overlay: "rgb(var(--ledger-overlay) / <alpha-value>)",
          panel: "rgb(var(--ledger-panel) / <alpha-value>)",
          "panel-elevated": "rgb(var(--ledger-panel-elevated) / <alpha-value>)",
          skeleton: "rgb(var(--ledger-skeleton) / <alpha-value>)",
          subtle: "rgb(var(--ledger-subtle) / <alpha-value>)",
          success: "rgb(var(--ledger-success) / <alpha-value>)",
          "success-soft": "rgb(var(--ledger-success-soft) / <alpha-value>)",
          "text-secondary": "rgb(var(--ledger-text-secondary) / <alpha-value>)",
          warning: "rgb(var(--ledger-warning) / <alpha-value>)",
          "warning-soft": "rgb(var(--ledger-warning-soft) / <alpha-value>)",
          wash: "rgb(var(--ledger-wash) / <alpha-value>)"
        }
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        dialog: "var(--shadow-dialog)"
      }
    }
  },
  plugins: [forms]
};

export default config;
