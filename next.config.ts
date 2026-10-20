import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Imagens carregadas no painel (Supabase Storage, bucket público "media")
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  experimental: {
    // Uploads de cartazes/logótipos/PDF pelo painel (Server Actions; o padrão é 1 MB)
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
