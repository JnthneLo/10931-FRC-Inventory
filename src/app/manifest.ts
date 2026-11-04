import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wrangler Robotics Inventory",
    short_name: "Inventory",
    description: "FRC 10913 parts & inventory tracker",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1526",
    theme_color: "#13294b",
    icons: [
      { src: "/logo.png", sizes: "375x375", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
