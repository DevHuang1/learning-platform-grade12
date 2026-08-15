import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextCoreWebVitals,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "supabase/seed.js",
    ],
  },
  {
    rules: {
      // These existing patterns are valid for this client-side app and are
      // better addressed incrementally rather than blocking the whole repo.
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default config;
