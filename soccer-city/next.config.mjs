/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Les images locales (SVG de démonstration + logo) sont servies depuis /public.
  // Remplacer par le loader distant (Supabase Storage) en production réelle.
  images: { dangerouslyAllowSVG: true, contentSecurityPolicy: "default-src 'self'; sandbox;" },
};
export default nextConfig;
