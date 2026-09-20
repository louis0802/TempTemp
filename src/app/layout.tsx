import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Around — good deals, close by",
  description:
    "Find ongoing food and drink promotions around Singapore. Verified outlets, clear conditions, and original sources.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
