import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GapFinder AI | Your study health",
  description:
    "Find your learning gaps, understand why, and follow a revision plan that adapts as you improve.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
