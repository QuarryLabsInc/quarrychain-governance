import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { AppHeader } from "@/components/layout/AppHeader";
import { WalletProviders } from "@/components/wallet/WalletProviders";
import { THEME_INIT_SCRIPT } from "@/hooks/useTheme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/** Mono is reserved for block heights, addresses, token amounts, and hashes. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuarryChain — DPoS Governance",
  description:
    "Delegated Proof of Stake governance, validator onboarding, and network telemetry for the QuarryChain testnet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The theme script mutates <html> before hydration, so the server-rendered
      // class list intentionally won't match the client's.
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Runs before first paint to avoid a flash of the wrong theme.
            next/script (not a raw <script>) so client-side re-renders —
            e.g. router.refresh() from the explorer's live feed — don't
            re-encounter it as an unexecuted script tag. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="flex min-h-full flex-col bg-surface font-sans">
        <WalletProviders>
          <AppHeader />
          <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-8 p-6 lg:p-8">
            {children}
          </main>
        </WalletProviders>
      </body>
    </html>
  );
}
