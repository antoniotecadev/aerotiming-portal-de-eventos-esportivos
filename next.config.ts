import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    // Imagens carregadas no painel (Supabase Storage, bucket público "media")
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  // Cabeçalhos de segurança (12.4, M7). A CSP só fecha o que não parte o site (o Next usa scripts inline):
  // ninguém pode embeber o site num iframe (clickjacking), nem trocar a base dos links ou o destino dos formulários.
  async headers() {
    const security = [
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Câmara só no próprio site (leitura do QR no check-in)
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    ];
    return [{ source: "/:path*", headers: security }];
  },
  experimental: {
    // Uploads de cartazes/logótipos/PDF pelo painel (Server Actions; o padrão é 1 MB)
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
