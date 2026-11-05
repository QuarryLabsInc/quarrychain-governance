import Link from "next/link";

/**
 * Branded entrance for the governance landing page.
 *
 * Sits on the dark accent panel (dark in both themes), which is where the
 * QRY coin's tones read best. The coin is decorative — a plain <img>, marked
 * aria-hidden, so it carries no meaning a screen reader needs. The float is
 * CSS-only and neutralised by the global reduced-motion rule.
 *
 * Copy note: the headline is Alec's, chosen 2026-07-22. An earlier draft used
 * "The sustainable bedrock for global finance", lifted from the spec's *Vibe*
 * section — which is tone guidance, not a headline, and read as a company
 * slogan. The sub-line carries the functional message for both audiences
 * (delegators and prospective miners), so the headline can stay brand-led.
 */
export function GovernanceHero() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-panel px-6 py-8 text-panel-ink shadow-md sm:px-10">
      {/* Soft brand glow + dot grid, behind everything */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(120% 120% at 85% 30%, rgba(0,123,255,0.28) 0%, transparent 55%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-panel-ink/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-panel-ink/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            QuarryChain Testnet · Live
          </span>

          <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
            The Digital Quarry, secured by 21 Miners.
          </h1>
          <p className="mt-2 max-w-md text-sm text-panel-ink/70">
            Freeze QRY to vote for the Quarry Miners who produce blocks — or
            stake 10,000 QRY and campaign for a seat of your own.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/voting"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
            >
              Start delegating
            </Link>
            <Link
              href="/onboarding"
              className="rounded-lg border border-panel-ink/20 px-5 py-2.5 text-sm font-bold text-panel-ink transition-colors hover:bg-panel-ink/10"
            >
              Become a Miner
            </Link>
          </div>
        </div>

        {/*
          The white token, matching the variant used on quarrychain-web — the
          canonical treatment across the ecosystem. A dark variant is kept at
          quarry-token-dark.svg for use on light surfaces if ever needed.

          Two nested elements on purpose: the outer carries the perspective and
          the vertical bob, the inner does the rotateY rock. Combining both on a
          single element would make the transforms fight each other.
        */}
        <div
          className="animate-qry-bob hidden shrink-0 sm:block"
          style={{ perspective: "1000px" }}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative same-origin SVG; next/image would need dangerouslyAllowSVG */}
          <img
            src="/assets/quarry-token-white.svg"
            alt=""
            className="animate-qry-rock h-44 w-44 drop-shadow-2xl lg:h-52 lg:w-52"
          />
        </div>
      </div>
    </section>
  );
}
