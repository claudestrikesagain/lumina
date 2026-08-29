import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Deliberately replaces (not extends) the default palette and radii:
    // no slate/indigo, no rounded corners anywhere.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      paper: "#F4F1EA",
      paperDeep: "#EAE6DA",
      paperEdge: "#FBFAF6",
      ink: "#14171F",
      inkSoft: "#3A404E",
      inkFaint: "#767C8B",
      rule: "#C7C1B1",
      ruleFaint: "#DBD6C8",
      oxblood: "#6E1F2A",
      oxbloodFaint: "#F0E4E2",
    },
    borderRadius: { none: "0" },
    boxShadow: { none: "none" },
    fontFamily: {
      display: ['"Instrument Serif"', "Georgia", "serif"],
      sans: ['"Inter"', "Helvetica Neue", "Arial", "sans-serif"],
      mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
    },
    extend: {
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.14em" }],
      },
      maxWidth: { report: "78rem" },
      keyframes: {
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        fade: "fade 220ms ease-out both",
        "fade-in": "fade-in 200ms ease-out both",
        "slide-up": "slide-up 260ms ease-out both",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;