import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 5173,
    strictPort: false,
    host: "127.0.0.1",
    warmup: {
      // Pre-compile all source files at startup so browser never waits
      clientFiles: ["./src/**/*.tsx", "./src/**/*.ts"],
    },
  },
  optimizeDeps: {
    // Don't block file serving while scanning for new deps
    holdUntilCrawlEnd: false,

    // CRITICAL: Exclude @tanstack/react-start and its server-core.
    // These are SSR-only packages with internal imports
    // (#tanstack-router-entry, #tanstack-start-entry) that esbuild
    // cannot resolve in a plain Vite SPA context.
    // Including them (or anything that pulls them in transitively)
    // crashes the entire optimizeDeps esbuild run → all deps get 504.
    exclude: [
      "@tanstack/react-start",
      "@tanstack/start-server-core",
      "@tanstack/start-client-core",
      "@tanstack/react-router-server",
    ],

    // Only include packages that are pure client-side CJS/ESM.
    // Do NOT include @tanstack/react-router or @tanstack/react-query
    // here — they pull in @tanstack/start-server-core transitively.
    include: [
      // Core React
      "react",
      "react-dom",
      "react-dom/client",
      // Map
      "react-leaflet",
      "leaflet",
      // Charts
      "recharts",
      // Icons
      "lucide-react",
      // UI utilities
      "clsx",
      "tailwind-merge",
      "class-variance-authority",
      "sonner",
      "date-fns",
      "cmdk",
      "vaul",
      "embla-carousel-react",
      "input-otp",
      "react-hook-form",
      "@hookform/resolvers",
      "zod",
      // Radix UI
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-aspect-ratio",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-context-menu",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-navigation-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toggle",
      "@radix-ui/react-toggle-group",
      "@radix-ui/react-tooltip",
    ],
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-map": ["react-leaflet", "leaflet"],
          "vendor-charts": ["recharts"],
          "vendor-icons": ["lucide-react"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-accordion",
          ],
        },
      },
    },
  },
});
