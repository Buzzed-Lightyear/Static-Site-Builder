#!/usr/bin/env node
import { build } from "../src/build.js";
import fs from "node:fs";
import path from "node:path";
import { validateSite } from "../src/core/validator.js";
import { renderers } from "../src/core/renderers.js";

const [,, cmd, pagePath, ...rest] = process.argv;
const outIdx = rest.indexOf("--out");
const outDir = outIdx >= 0 ? rest[outIdx + 1] : "./dist";

if (cmd !== "build" && cmd !== "check") {
  console.error("Usage: ssb build <page.json> --out <dir> | ssb check <page.json>");
  process.exit(1);
}

if (cmd === "check") {
  const pageAbs = path.resolve(pagePath);
  const layoutAbs = path.resolve("./site/layout.json");
  const page = JSON.parse(fs.readFileSync(pageAbs, "utf8"));
  const layout = JSON.parse(fs.readFileSync(layoutAbs, "utf8"));
  
  // validateSite({ page, layout, renderers });
  // run without or with render smoke: add --smoke to enable
  const renderSmoke = process.argv.includes("--smoke");
  validateSite({ page, layout, renderers, renderSmoke });
  console.log("OK");
  process.exit(0);
} else { 
  fs.mkdirSync(outDir, { recursive: true });
  await build({
    pagePath: path.resolve(pagePath),
    layoutPath: path.resolve("./site/layout.json"),
    tokensPath: path.resolve("./theme/tokens.css"),
    themePath: path.resolve("./theme/theme.css"),
    outDir: path.resolve(outDir)
  });
  console.log(`Built ${outDir}/index.html`);
}

