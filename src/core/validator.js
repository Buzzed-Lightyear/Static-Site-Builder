import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv";

const ajv = new Ajv({ strict: true, allErrors: true });

/**
 * Resolve a schema file by convention:
 *  - components: contracts/components/<Type>.schema.json  OR ./<Type>.schema.json
 *  - layout:     contracts/layout.schema.json             OR ./layout.schema.json
 */
function readJSON(maybe1, maybe2) {
  const p1 = path.resolve(maybe1);
  if (fs.existsSync(p1)) return JSON.parse(fs.readFileSync(p1, "utf8"));
  const p2 = maybe2 ? path.resolve(maybe2) : null;
  if (p2 && fs.existsSync(p2)) return JSON.parse(fs.readFileSync(p2, "utf8"));
  return null;
}

function loadLayoutSchema() {
  return (
    readJSON("contracts/layout.schema.json", "layout.schema.json") || {
      // fallback: minimal guard if schema file is absent
      $id: "Layout@v1",
      type: "object",
      required: ["regions"],
      properties: {
        regions: {
          type: "object",
          additionalProperties: {
            type: "object",
            required: ["slots"],
            properties: { slots: { type: "array", items: { type: "string" } } }
          }
        }
      },
      additionalProperties: true
    }
  );
}

function loadComponentSchema(typeId) {
  // typeId like "Text@v1"
  const fname = `${typeId}.schema.json`;
  return (
    readJSON(path.join("contracts/components", fname), fname) // fallback at repo root
  );
}

function addSchemaIfAny(schema) {
  if (!schema || !schema.$id) return;
  if (!ajv.getSchema(schema.$id)) ajv.addSchema(schema);
}

function ensure(ok, message, details) {
  if (!ok) {
    const err = new Error(message);
    err.details = details || {};
    throw err;
  }
}

function validateWithAjv(schemaId, data, where) {
  const v = ajv.getSchema(schemaId);
  ensure(v, `Unknown JSON schema '${schemaId}'`, { where });
  const ok = v(data);
  if (!ok) {
    const errors = (v.errors || []).map(e => `${e.instancePath || '/'} ${e.message}`).join("; ");
    const err = new Error(`Schema validation failed for ${schemaId} at ${where}: ${errors}`);
    err.errors = v.errors || [];
    throw err;
  }
}

function* iterPageComponents(page) {
  const regions = page?.regions || {};
  for (const [regionName, regionObj] of Object.entries(regions)) {
    if (!regionObj || typeof regionObj !== "object") continue;
    for (const [slotName, list] of Object.entries(regionObj)) {
      if (!Array.isArray(list)) continue;
      for (let i = 0; i < list.length; i++) {
        const inst = list[i];
        yield { regionName, slotName, index: i, inst };
      }
    }
  }
}

/**
 * Core entry.
 * Validates:
 *  1) layout against layout schema (if available)
 *  2) every used slot exists in layout
 *  3) every component type has a renderer
 *  4) every component props validate against its schema
 */
export function validateSite({ page, layout, renderers, renderSmoke = false }) {
  // 1) load and apply layout schema
  const layoutSchema = loadLayoutSchema();
  addSchemaIfAny(layoutSchema);
  validateWithAjv(layoutSchema.$id || "Layout@v1", layout, "layout");

  // 2–4) per-instance checks
  for (const { regionName, slotName, index, inst } of iterPageComponents(page)) {
    // 2) slot exists in layout
    const region = layout?.regions?.[regionName];
    ensure(region, `Region '${regionName}' is not declared in layout`, { regionName });
    const slots = region?.slots || [];
    ensure(
      slots.includes(slotName),
      `Slot '${regionName}.${slotName}' is not declared in layout`,
      { regionName, slotName, declaredSlots: slots }
    );

    // basic shape
    ensure(inst && typeof inst === "object", `Component at ${regionName}.${slotName}[${index}] is not an object`);
    const { type, props } = inst;
    ensure(typeof type === "string" && type.length > 0, `Missing 'type' at ${regionName}.${slotName}[${index}]`);
    ensure(props && typeof props === "object", `Missing 'props' for ${type} at ${regionName}.${slotName}[${index}]`);

    // 3) renderer existence
    ensure(
      Object.prototype.hasOwnProperty.call(renderers, type),
      `No renderer for component type '${type}'`,
      { type, at: `${regionName}.${slotName}[${index}]` }
    );

    // 4) props schema validation
    const compSchema = loadComponentSchema(type);
    ensure(
      compSchema && compSchema.$id === type,
      `Schema file not found or $id mismatch for '${type}'`,
      { expectedId: type }
    );
    addSchemaIfAny(compSchema);
    validateWithAjv(type, props, `${regionName}.${slotName}[${index}].props`);

    // 5) optional: renderer smoke test
    if (renderSmoke) {
      const render = renderers[type];
      try {
        // deterministic, no DOM, no I/O context
        render({ type, props }, { resolveAsset: x => x, scope: {} });
      } catch (e) {
        const err = new Error(
          `Renderer threw for ${type} at ${regionName}.${slotName}[${index}]: ${e.message || e}`
        );
        err.cause = e;
        throw err;
      }
    }
  }

  return true;
}