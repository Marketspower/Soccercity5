import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1200px" }
    },
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
          bright: "#2E74FF",
          deep: "#03287A"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        pitch: {
          DEFAULT: "#16C36A",
          dark: "#0E8A4B"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"]
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)"
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(3,87,243,.55)",
        "glow-sm": "0 0 18px -4px rgba(3,87,243,.45)",
        card: "0 8px 30px -12px rgba(0,0,0,.35)"
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(1200px 600px at 70% -10%, rgba(3,87,243,.28), transparent 60%), radial-gradient(800px 500px at 10% 110%, rgba(3,87,243,.18), transparent 55%)"
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" }
        },
        "pulse-glow": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(3,87,243,.45)" },
          "50%": { boxShadow: "0 0 0 10px rgba(3,87,243,0)" }
        },
        shine: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.25s ease-out",
        "accordion-up": "accordion-up 0.25s ease-out",
        marquee: "marquee 40s linear infinite",
        "pulse-glow": "pulse-glow 2.2s ease-in-out infinite",
        shine: "shine 6s linear infinite"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;