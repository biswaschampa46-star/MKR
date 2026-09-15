import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  {
    // The React Compiler-era hook rules below are still experimental and flag
    // idiomatic, correct code throughout this codebase: data-fetching effects
    // (`useEffect(() => { load(); }, [load])`), hydration flags
    // (`useEffect(() => setMounted(true), [])`), and async Server Components
    // (dashboard `Date.now()` / closure accumulators, which are not client
    // hooks at all). The codebase already suppresses these inline in several
    // files. Keep them visible as warnings without failing `npm run lint`;
    // genuine issues of these classes are fixed at the source instead
    // (see AiAssistant: ref synced in an effect, LogoMark hoisted).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".freebuff/**", "scripts/**"]),
]);
