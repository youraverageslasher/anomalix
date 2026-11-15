import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0D1015",
        card: "#161A21",
        highlight: "#262E3A",
        "highlight-border": "#3B4656",
        field: "#1B2028",
        track: "#222831",
        rule: "#2B323C",
        text: "#ECEEF1",
        body: "#B3BBC7",
        muted: "#8D97A6",
        signal: "#EF5A4C",
        "dot-dark": "#323A46",
        ramp: {
          0: "#2D5FD6",
          12: "#5C97EA",
          22: "#A9CBF2",
          375: "#E9E7E1",
          52: "#F6C79B",
          60: "#EE8A55",
          68: "#D44A33",
          76: "#9B1C24",
        },
        bin: {
          0: "#3c71dc",
          1: "#5994e9",
          2: "#90baef",
          3: "#bbd3ed",
          4: "#dae0e5",
          5: "#ecdfcf",
          6: "#f3ceab",
          7: "#f2a776",
          8: "#e26c45",
          9: "#bd372d",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["92px", { lineHeight: "1", letterSpacing: "-0.03em", fontWeight: "500" }],
        "hero-sm": ["52px", { lineHeight: "1.02", letterSpacing: "-0.03em", fontWeight: "500" }],
        section: ["48px", { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "500" }],
        figure: ["20px", { lineHeight: "1.3" }],
        bodyl: ["17px", { lineHeight: "1.6" }],
        label: ["12px", { lineHeight: "1.3", letterSpacing: "0.12em", fontWeight: "600" }],
        stat: ["76px", { lineHeight: "1", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        card: "18px",
        "card-sm": "14px",
      },
      boxShadow: {
        card: "0 12px 32px rgba(0,0,0,.35)",
        float: "0 14px 34px rgba(0,0,0,.6)",
      },
      spacing: {
        side: "80px",
        "side-map": "64px",
      },
      maxWidth: {
        canvas: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
