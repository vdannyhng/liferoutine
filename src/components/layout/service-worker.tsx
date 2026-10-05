"use client";

import { useEffect } from "react";

/** Registers the offline fallback service worker in production builds only. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // The app works without the service worker; nothing to do.
    });
  }, []);
  return null;
}
