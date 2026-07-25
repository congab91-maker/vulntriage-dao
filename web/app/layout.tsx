import type { Metadata } from "next";
import "./globals.css";

const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: productionHost ? new URL(`https://${productionHost}`) : undefined,
  title: "VulnTriage DAO | Evidence-backed security adjudication",
  description:
    "A GenLayer Studionet application for consensus-based vulnerability bounty decisions grounded in public reports and official evidence.",
  openGraph: {
    title: "VulnTriage DAO | Evidence-backed security adjudication",
    description:
      "Consensus-based vulnerability bounty decisions grounded in public reports and official evidence.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "VulnTriage DAO | Evidence-backed security adjudication",
    description:
      "Consensus-based vulnerability bounty decisions grounded in public reports and official evidence.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
