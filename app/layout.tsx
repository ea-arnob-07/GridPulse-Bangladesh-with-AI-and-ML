import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GridPulse BD",
  description:
    "An explainable AI platform for grid stress, rural–urban energy equity and renewable energy planning in Bangladesh.",
  metadataBase: new URL("https://shoktimap.ai"),
  openGraph: {
    title: "GridPulse BD",
    description: "Bangladesh Energy Intelligence for grid stress, energy equity and renewable planning.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "GridPulse BD — Bangladesh Energy Intelligence" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GridPulse BD",
    description: "Bangladesh Energy Intelligence for grid stress, energy equity and renewable planning.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
