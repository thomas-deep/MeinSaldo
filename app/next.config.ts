import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Erzeugt unter .next/standalone einen self-contained Server-Tree, der
  // ohne node_modules-Komplettkopie ins Docker-Image passt (~150 MB statt
  // ~600 MB). Im Dockerfile wird .next/standalone + .next/static + public
  // ins runner-Image kopiert; Start dann via `node server.js`.
  output: "standalone",
};

export default nextConfig;
