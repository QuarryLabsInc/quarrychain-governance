"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { WalletConnectButton } from "@/components/wallet/WalletConnectButton";

/**
 * Sticky global header.
 *
 * Brand lockup is spec-mandated: "Quarry" in #007BFF, "Chain" in true black.
 * The logo asset is optional — if /public/assets/quarrychain-logo.png is
 * absent the wordmark stands on its own rather than showing a broken image.
 */

/*
 * The spec's nav is two tabs. Explorer was added later at the project owner's
 * request — it is a primary surface, not a sub-page, so it belongs in the tab
 * group rather than tucked away.
 */
const NAV = [
  { label: "Governance", href: "/governance" },
  { label: "Voting", href: "/voting" },
  { label: "Wallet", href: "/wallet" },
  { label: "Explorer", href: "/explorer" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card px-4 py-3 shadow-sm sm:px-6">
      {/*
        Wrapping layout: on narrow screens the nav drops to its own full-width
        row below the logo/controls, so three tabs plus the toggle never push
        the page sideways. `mr-auto` on the logo keeps everything right-aligned
        on one row at sm+.
      */}
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2">
        <Link href="/governance" className="mr-auto flex items-center gap-3">
          {!logoFailed && (
            <Image
              src="/assets/quarrychain-logo.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-auto object-contain"
              onError={() => setLogoFailed(true)}
              priority
            />
          )}
          <span className="text-xl font-bold tracking-tight">
            <span className="text-brand">Quarry</span>
            <span className="text-ink">Chain</span>
          </span>
        </Link>

        <nav className="order-last w-full overflow-x-auto sm:order-none sm:w-auto">
          <div className="flex w-fit gap-1 rounded-lg bg-well p-1">
            {NAV.map(({ label, href }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
                    active
                      ? "bg-card text-brand shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/*
          Onboarding sits outside the tab group as a distinct CTA. Hidden on the
          smallest screens where the topology cards and dashboard already link
          into it.
        */}
        <Link
          href="/onboarding"
          className="hidden whitespace-nowrap rounded-lg bg-brand px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover sm:inline-block"
        >
          Become a Miner
        </Link>

        <WalletConnectButton />

        <ThemeToggle />
      </div>
    </header>
  );
}
