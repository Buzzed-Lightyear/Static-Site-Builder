import Ajv from "ajv";

export const DEFAULT_LAYOUT_SCHEMA = {
  $id: "Layout@v1",
  type: "object",
  required: ["regions"],
  properties: {
    regions: {
      type: "object",
      additionalProperties: {
        type: "object",
        required: ["slots"],
        properties: {
          slots: { type: "array", items: { type: "string" } },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
};

function ensure(ok, message, details) {
  if (!ok) {
    const err = new Error(message);
    if (details) err.details = details;
    throw err;
  }
}

export function normalizeComponentSchemas(componentSchemas = {}) {
  const entries = Array.isArray(componentSchemas)
    ? componentSchemas
    : componentSchemas instanceof Map
      ? Array.from(componentSchemas.entries())
      : Object.entries(componentSchemas);

  const map = new Map();
  for (const [key, value] of entries) {
    if (!value || typeof value !== "object") continue;
    const schemaId = value.$id || key;
    ensure(typeof schemaId === "string" && schemaId.length > 0, `Invalid schema id for component '${key}'`);
    const schema = value.$id ? value : { ...value, $id: schemaId };
    map.set(key, schema);
  }
  return map;
}

function addSchemaIfAny(ajv, schema) {
  if (!schema || !schema.$id) return;
  if (!ajv.getSchema(schema.$id)) ajv.addSchema(schema);
}

function validateWithAjv(ajv, schemaId, data, where) {
  const validator = schemaId ? ajv.getSchema(schemaId) : null;
  ensure(validator, `Unknown JSON schema '${schemaId}'`, { where });
  const ok = validator(data);
  if (!ok) {
    const errors = validator.errors || [];
    const msg = errors.map(e => `${e.instancePath || "/"} ${e.message}`).join("; ");
    const err = new Error(`Schema validation failed for ${schemaId} at ${where}: ${msg}`);
    err.errors = errors;
    throw err;
  }
}

function* iterPageComponents(page) {
  const regions = page?.regions || {};
  for (const [regionName, regionObj] of Object.entries(regions)) {
    if (!regionObj || typeof regionObj !== "object") continue;
    for (const [slotName, def] of Object.entries(regionObj)) {
      if (slotName === "_tw") continue;
      if (Array.isArray(def)) {
        for (let index = 0; index < def.length; index += 1) {
          yield { regionName, slotName, index, inst: def[index] };
        }
      } else {
        yield { regionName, slotName, index: null, inst: def };
      }
    }
  }
}

export function createSiteValidator({ layoutSchema, componentSchemas } = {}) {
  const ajv = new Ajv({ strict: true, allErrors: true });

  const effectiveLayoutSchema =
    layoutSchema && typeof layoutSchema === "object" ? layoutSchema : DEFAULT_LAYOUT_SCHEMA;
  const layoutSchemaId = effectiveLayoutSchema.$id || DEFAULT_LAYOUT_SCHEMA.$id;
  if (!effectiveLayoutSchema.$id) {
    effectiveLayoutSchema.$id = layoutSchemaId;
  }
  addSchemaIfAny(ajv, effectiveLayoutSchema);

  const normalizedComponents = normalizeComponentSchemas(componentSchemas);
  const componentIndex = new Map();
  for (const [type, schema] of normalizedComponents.entries()) {
    addSchemaIfAny(ajv, schema);
    componentIndex.set(type, schema);
  }

  return function validateSite({ page, layout, renderers = {}, renderSmoke = false } = {}) {
    validateWithAjv(ajv, layoutSchemaId, layout, "layout");

    for (const { regionName, slotName, index, inst } of iterPageComponents(page)) {
      const region = layout?.regions?.[regionName];
      ensure(region, `Region '${regionName}' is not declared in layout`, { regionName });
      const slots = region?.slots || [];
      ensure(
        slots.includes(slotName),
        `Slot '${regionName}.${slotName}' is not declared in layout`,
        { regionName, slotName, declaredSlots: slots },
      );

      ensure(inst && typeof inst === "object", `Component at ${regionName}.${slotName}${index !== null ? `[${index}]` : ""} is not an object`);
      const { type, props } = inst;
      const at = `${regionName}.${slotName}${index !== null ? `[${index}]` : ""}`;
      ensure(typeof type === "string" && type.length > 0, `Missing 'type' at ${at}`);
      ensure(props && typeof props === "object", `Missing 'props' for ${type} at ${at}`);

      ensure(
        Object.prototype.hasOwnProperty.call(renderers, type),
        `No renderer for component type '${type}'`,
        { type, at },
      );

      const schema = componentIndex.get(type);
      ensure(schema, `Schema file not found for '${type}'`, { type });
      validateWithAjv(ajv, schema.$id, props, `${at}.props`);

      if (renderSmoke) {
        const render = renderers[type];
        try {
          render({ type, props }, { resolveAsset: x => x, scope: {} });
        } catch (cause) {
          const err = new Error(`Renderer threw for ${type} at ${at}: ${cause?.message || cause}`);
          err.cause = cause;
          throw err;
        }
      }
    }

    return true;
  };
}

function sanitizeDefName(id) {
  return id.replace(/[^a-zA-Z0-9_$]/g, "_");
}

export function buildPageSchema({ layout, componentSchemas } = {}) {
  const normalizedComponents = normalizeComponentSchemas(componentSchemas);
  const componentTypes = Array.from(normalizedComponents.keys()).sort();
  const defs = {};
  const allOf = [];

  for (const [type, schema] of normalizedComponents.entries()) {
    const defName = sanitizeDefName(schema.$id || type);
    defs[defName] = schema;
    allOf.push({
      if: {
        type: "object",
        properties: { type: { const: type } },
        required: ["type"],
      },
      then: {
        properties: { props: { $ref: `#/$defs/${defName}` } },
      },
    });
  }

  const componentInstance = {
    type: "object",
    required: ["type", "props"],
    properties: {
      type: componentTypes.length ? { enum: componentTypes } : { type: "string" },
      props: { type: "object" },
      _wrapTw: { type: "string" },
    },
    additionalProperties: true,
    allOf,
  };

  const slotSchema = {
    anyOf: [
      componentInstance,
      {
        type: "array",
        items: componentInstance,
      },
    ],
  };

  const regions = layout?.regions || {};
  const regionSchemas = {};
  for (const [regionName, regionDef] of Object.entries(regions)) {
    const slots = regionDef?.slots || [];
    const slotEntries = Object.fromEntries(slots.map(slot => [slot, slotSchema]));
    regionSchemas[regionName] = {
      type: "object",
      properties: {
        _tw: { type: "string" },
        ...slotEntries,
      },
      additionalProperties: false,
    };
  }

  return {
    $id: "SitePage@v1",
    type: "object",
    required: ["regions"],
    properties: {
      title: { type: "string" },
      regions: {
        type: "object",
        properties: regionSchemas,
        additionalProperties: false,
      },
    },
    additionalProperties: true,
    $defs: defs,
  };
}

export function describeValidationError(err) {
  if (!err) return "Validation failed";
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    const first = err.errors[0];
    const path = first.instancePath || "/";
    return `${path || "/"} ${first.message}`;
  }
  if (err.details?.where) {
    return `${err.details.where}: ${err.message}`;
  }
  return err.message || "Validation failed";
}
