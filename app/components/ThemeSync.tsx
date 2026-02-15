"use client";

import { useEffect } from "react";

export function ThemeSync({ theme }: { theme: string }) {
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return null;
}
