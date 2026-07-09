import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Devscope — Your software intelligence workspace",
  description:
    "A focused daily brief and personal knowledge library for software professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
