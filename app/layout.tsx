import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pick One — Make the group decision",
  description: "Create a quick poll, share one link, and decide together. Free, simple, no account needed.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}