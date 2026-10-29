import type { NextConfig } from "next";

/**
 * Validator logos are served from the Supabase `validator-logos` bucket.
 * Allow exactly that public path — nothing else on the Supabase host, and no
 * other host — so on-chain/profile text can't point the image optimizer at
 * arbitrary URLs.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["governance.quarrychain.network"],
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/validator-logos/**`)]
      : [],
  },
};

export default nextConfig;
