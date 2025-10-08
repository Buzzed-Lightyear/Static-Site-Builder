import fs from "node:fs";
import path from "node:path";
import { createSiteValidator, DEFAULT_LAYOUT_SCHEMA } from "./siteValidator.js";

function readJSON(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = path.resolve(candidate);
    if (fs.existsSync(resolved)) {
      return JSON.parse(fs.readFileSync(resolved, "utf8"));
    }
  }
  return null;
}

function loadLayoutSchema() {
  return (
    readJSON("contracts/layout.schema.json", "layout.schema.json") || { ...DEFAULT_LAYOUT_SCHEMA }
  );
}

function readComponentSchemaFiles(dir) {
  const results = new Map();
  if (!dir || !fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.endsWith(".schema.json")) continue;
    if (entry === "layout.schema.json") continue;
    const filePath = path.join(dir, entry);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;
    try {
      const schema = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const key = schema?.$id || entry.replace(/\.schema\.json$/i, "");
      if (!results.has(key)) {
        results.set(key, schema);
      }
    } catch (err) {
      const error = new Error(`Unable to read schema at ${filePath}: ${err.message || err}`);
      error.cause = err;
      throw error;
    }
  }
  return results;
}

function loadComponentSchemas() {
  const fromContracts = readComponentSchemaFiles(path.resolve("contracts/components"));
  const fromRoot = readComponentSchemaFiles(process.cwd());
  const merged = new Map([...fromRoot, ...fromContracts]);
  // prefer contract versions by overwriting root entries with contract entries
  for (const [key, schema] of fromContracts.entries()) {
    merged.set(key, schema);
  }
  return Object.fromEntries(merged.entries());
}

let cachedValidator = null;

function getValidator() {
  if (!cachedValidator) {
    const layoutSchema = loadLayoutSchema();
    const componentSchemas = loadComponentSchemas();
    cachedValidator = createSiteValidator({ layoutSchema, componentSchemas });
  }
  return cachedValidator;
}

export function validateSite(args) {
  const validator = getValidator();
  return validator(args);
}
