"use client";

import { useEffect } from "react";

/** Registers the small service worker that stores the app's unchanging files for fast repeat visits. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const start = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    // After the page has finished loading, so it never competes with the first paint.
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);
  return null;
}
