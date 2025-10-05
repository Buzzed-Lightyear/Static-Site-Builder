import fs from "node:fs";
import path from "node:path";
import { renderers } from "./renderers.js";

export async function build({ pagePath, layoutPath, tokensPath, themePath, outDir }) {
  const page = JSON.parse(fs.readFileSync(pagePath, "utf8"));
  const layout = JSON.parse(fs.readFileSync(layoutPath, "utf8"));
  const tokens = fs.readFileSync(tokensPath, "utf8");
  const theme = fs.readFileSync(themePath, "utf8");

  const html = renderPage({ page, layout });
  const doc = wrapHtml({ html, css: tokens + "\n" + theme, title: page.title || "Site" });

  fs.writeFileSync(path.join(outDir, "index.html"), doc, "utf8");
  fs.writeFileSync(path.join(outDir, "styles.css"), tokens + "\n" + theme, "utf8");
}

function renderPage({ page, layout }) {
  const regions = ["header", "main", "footer"];
  return `
<header>${renderRegion("header", page, layout)}</header>
<main>${renderRegion("main", page, layout)}</main>
<footer>${renderRegion("footer", page, layout)}</footer>`;
}

function renderRegion(region, page, layout) {
  const slots = layout.regions?.[region]?.slots || [];
  const defs = page.regions?.[region] || {};
  return slots.map(slotName => {
    const def = defs[slotName];
    return def ? renderComponent(def) : "";
  }).join("\n");
}

function renderComponent(def) {
  // def: { type: "Text@v1", props: {...} } or array for multiples
  if (Array.isArray(def)) return def.map(renderComponent).join("");
  const { type, props = {} } = def || {};
  const fn = renderers[type];
  if (!fn) return `<!-- missing renderer ${type} -->`;
  return `<section class="slot"><div class="component ${cssSafe(type)}">${fn(props)}</div></section>`;
}

function wrapHtml({ html, css, title }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>
<style>/* critical minimal */ body{margin:0}</style>
</head>
<body>
${html}
</body>
</html>`;
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const cssSafe = s => String(s).replace(/[^a-zA-Z0-9_-]/g, "_");
