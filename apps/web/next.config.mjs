/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@unicom/ui", "@unicom/config", "@unicom/types", "@unicom/validation"],
  images: {
    domains: ["localhost"],
  },
};

export default nextConfig;
