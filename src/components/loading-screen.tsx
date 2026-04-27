"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => setVisible(false), 500);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/8gh3xbp-gif.gif"
          alt="Loading..."
          width={120}
          height={120}
          className="rounded-2xl"
          priority
          unoptimized
        />
        <p className="text-sm text-muted-foreground font-medium tracking-wide animate-pulse">
          Loading...
        </p>
      </div>
    </div>
  );
}
