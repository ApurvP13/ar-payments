import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Reader - Payment",
  description: "Secure payment for AI Reader subscriptions",
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
