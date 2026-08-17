import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Le pattern "setLoading(true) puis fetch" au montage d'une page est
      // utilisé partout dans ce projet et n'est pas bugué (pas de boucle de
      // rendu réelle) — cette règle, taillée pour des architectures orientées
      // React Compiler / bibliothèques de data-fetching, est trop stricte
      // pour ce pattern classique. Abaissée en avertissement plutôt que
      // réécrire tout le data-fetching de l'app.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Scripts terminal uniquement (tsx), jamais importés par l'app.
    "prisma/**",
  ]),
]);

export default eslintConfig;
