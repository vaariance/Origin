const { hairlineWidth } = require("nativewind/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        "poppins-regular": ["poppins-regular"],
        "poppins-medium": ["poppins-medium"],
        "poppins-semibold": ["poppins-semibold"],
        "poppins-bold": ["poppins-bold"],
        "poppins-light": ["poppins-light"],
        "poppins-thin": ["poppins-thin"],
        "poppins-extralight": ["poppins-extralight"],
        "poppins-black": ["poppins-black"],
        "poppins-extra-bold": ["poppins-extra-bold"],
        "poppins-regular-italic": ["poppins-regular-italic"],
        "poppins-medium-italic": ["poppins-medium-italic"],
        "poppins-semibold-italic": ["poppins-semibold-italic"],
        "poppins-bold-italic": ["poppins-bold-italic"],
        "poppins-light-italic": ["poppins-light-italic"],
        "poppins-thin-italic": ["poppins-thin-italic"],
        "poppins-extralight-italic": ["poppins-extralight-italic"],
        "poppins-black-italic": ["poppins-black-italic"],
        "poppins-extra-bold-italic": ["poppins-extra-bold-italic"],
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
  },
  plugins: [],
};
