import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secret Santa",
  description: "Organisez votre Secret Santa facilement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
