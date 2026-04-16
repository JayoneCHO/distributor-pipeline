import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "RUIKD Overseas Sales Follow-up Manager",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
