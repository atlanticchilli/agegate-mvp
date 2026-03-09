import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "../lib/auth/context";

export const metadata: Metadata = {
  title: "AgeGate Dashboard",
  description: "Operator dashboard for AgeGate MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
