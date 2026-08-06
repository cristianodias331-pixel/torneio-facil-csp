import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function readBuildVersion() {
  try {
    return JSON.parse(readFileSync(new URL("./public/app-version.json", import.meta.url), "utf8")).version;
  } catch {
    return "development";
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_BUILD_VERSION__: JSON.stringify(readBuildVersion()),
  },
});
