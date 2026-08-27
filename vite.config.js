import { defineConfig } from "vite";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const pageEntries = {
  index: "index.html",
  events: "events/index.html",
  admin: "admin/index.html",
};

// Events and admin are added as soon as their page entry points exist. This
// keeps the public home page buildable while those independently-owned pages
// are still being assembled.
const input = Object.fromEntries(
  Object.entries(pageEntries)
    .filter(([, page]) => existsSync(resolve(projectRoot, page)))
    .map(([name, page]) => [name, resolve(projectRoot, page)]),
);

export default defineConfig({
  build: {
    rollupOptions: { input },
  },
});
sed: --: No such file or directory
