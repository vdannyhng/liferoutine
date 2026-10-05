import type { MetadataRoute } from "next";
import { de } from "@/lib/i18n/de";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: de.appName,
    short_name: de.appName,
    description: "Haushalt, Sport und Alltag im Blick.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f6f3",
    theme_color: "#2e6b5a",
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
