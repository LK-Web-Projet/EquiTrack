import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Requis par infra/Dockerfile : le build Docker copie .next/standalone.
  output: "standalone",

  // Un package-lock.json orphelin dans le dossier parent (C:\Users\HP\Desktop\Dev)
  // faisait que Next.js inférait le mauvais workspace root. On le fixe explicitement.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Le tracer de Next.js ne détecte pas le fichier WASM du query compiler Prisma 7
  // (chargé dynamiquement, pas via require() statique) et le laisse hors de
  // .next/standalone/node_modules. Le "**" avant node_modules/@prisma/client couvre
  // le dossier pnpm à hash variable (@prisma+client@x.y.z_prisma@x.y.z_...).
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.pnpm/**/node_modules/@prisma/client/runtime/**/*",
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
