"use client";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="size-10" aria-hidden />;
  const dark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={dark ? "Activer le mode clair" : "Activer le mode sombre"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative overflow-hidden"
    >
      <Sun className={`absolute transition-all duration-500 ${dark ? "rotate-90 scale-0" : "rotate-0 scale-100"}`} />
      <Moon className={`absolute transition-all duration-500 ${dark ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`} />
    </Button>
  );
}
