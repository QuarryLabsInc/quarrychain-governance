"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Validator avatar with a graceful fallback.
 *
 * The initials are ALWAYS rendered, and the logo is layered on top of them
 * rather than swapped in for them. This matters: an earlier version rendered
 * the <img> instead of the initials and only fell back once onError fired,
 * which flashed an empty square on every page load for any validator whose
 * asset was missing. Layering means the worst case is "initials stay visible"
 * instead of "empty box until the 404 resolves".
 *
 * The image carries its own background so a logo with transparency doesn't
 * let the initials show through behind it — which means it would also mask the
 * initials while still loading. So it stays at opacity-0 until onLoad fires.
 * That is deliberately fail-closed: if a logo never loads we show initials
 * forever, which is the right outcome given assets are currently missing.
 * Verified against the dev server: present assets return 200 through the image
 * optimizer, missing ones return 400 and trip onError.
 *
 * Brand assets have not been delivered yet — drop files into public/assets
 * (see the README there) and they light up with no code change.
 *
 * `asset` is either a filename under /public/assets or an absolute https URL
 * (validator logos from the Supabase bucket — allowed in next.config.ts).
 */

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function ValidatorIcon({
  name,
  asset,
  size = 24,
}: {
  name: string;
  asset: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-strong bg-well"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span
        className="font-bold text-body"
        style={{ fontSize: Math.max(8, Math.round(size * 0.36)) }}
      >
        {initialsFor(name)}
      </span>

      {asset && !failed && (
        <Image
          src={/^https:\/\//.test(asset) ? asset : `/assets/${asset}`}
          alt=""
          width={size}
          height={size}
          className={`absolute inset-0 h-full w-full bg-well object-contain transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
