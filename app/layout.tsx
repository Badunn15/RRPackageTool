import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Package Cost Calculator",
  description: "Raynor Realty per-door cost-to-serve model",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@400;700&family=Lato:wght@400;700;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
