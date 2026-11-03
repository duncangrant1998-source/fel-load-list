/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // pdfkit loads its standard-font .afm files from a path relative to its
  // own module at runtime. If webpack bundles it into the route's compiled
  // output, that relative path breaks (ENOENT for Helvetica.afm). Keeping
  // it external makes Next require() it straight from node_modules instead.
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

export default nextConfig;
