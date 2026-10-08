import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fodan Christian Global Bible School",
    short_name: "FCGBS",
    description: "Rightly dividing the Word. Raising Kingdom ministers.",
    start_url: "/student",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b2a5b",
    icons: [
      { src: "/brand/logo-mark-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/logo-mark-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
