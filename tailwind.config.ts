import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "gh-green": {
          DEFAULT: "var(--gh-green)",
          hover: "var(--gh-green-hover)",
          light: "var(--gh-green-light)",
          text: "var(--gh-green-text)",
        },
        "gh-gray": {
          0: "var(--gh-gray-0)",
          1: "var(--gh-gray-1)",
          2: "var(--gh-gray-2)",
          3: "var(--gh-gray-3)",
          4: "var(--gh-gray-4)",
          5: "var(--gh-gray-5)",
          6: "var(--gh-gray-6)",
          7: "var(--gh-gray-7)",
        },
        "gh-blue": {
          DEFAULT: "var(--gh-blue)",
          light: "var(--gh-blue-light)",
        },
        "gh-surface": {
          DEFAULT: "var(--gh-surface)",
          hover: "var(--gh-surface-hover)",
        },
        "gh-danger": {
          DEFAULT: "var(--gh-danger)",
          hover: "var(--gh-danger-hover)",
          active: "var(--gh-danger-active)",
        },
        canvas: {
          DEFAULT: "var(--color-canvas-default)",
          subtle: "var(--color-canvas-subtle)",
        },
        fg: {
          DEFAULT: "var(--color-fg-default)",
          muted: "var(--color-fg-muted)",
        },
        border: {
          DEFAULT: "var(--color-border-default)",
        },
      },
      fontFamily: {
        sans: ["var(--gh-font-sans)"],
        mono: ["var(--gh-font-mono)"],
      },
      borderRadius: {
        card: "6px",
        pill: "2em",
      },
      transitionDuration: {
        gh: "80ms",
      },
    },
  },
};

export default config;
