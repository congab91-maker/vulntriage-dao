import type { Metadata } from "next";
import "./globals.css";

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(
    productionHost
      ? `https://${productionHost}`
      : "https://vulntriage-dao.lovely-krill-7694.chatgpt.site",
  ),
  title: "VulnTriage DAO — Evidence-backed security adjudication",
  description:
    "A GenLayer-powered public evidence workflow for fair vulnerability bounty decisions.",
  openGraph: {
    title: "VulnTriage DAO — Evidence-backed security adjudication",
    description:
      "A GenLayer-powered public evidence workflow for fair vulnerability bounty decisions.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1600,
        height: 900,
        alt: "VulnTriage DAO — Security verdicts, backed by evidence.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "VulnTriage DAO — Evidence-backed security adjudication",
    description:
      "A GenLayer-powered public evidence workflow for fair vulnerability bounty decisions.",
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
