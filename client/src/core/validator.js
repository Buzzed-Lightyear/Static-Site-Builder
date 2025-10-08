import layoutSchema from "../../../contracts/layout.schema.json";
import siteLayout from "../../../site/layout.json";
import { renderers as defaultRenderers } from "./renderers.js";
import {
  createSiteValidator,
  buildPageSchema,
  describeValidationError,
} from "../../../src/core/siteValidator.js";

const componentModules = import.meta.glob("../../../contracts/components/*.schema.json", {
  eager: true,
});

const componentSchemas = Object.fromEntries(
  Object.entries(componentModules).map(([file, mod]) => {
    const schema = mod.default ?? mod;
    const id = schema?.$id || file.split("/").pop().replace(/\.schema\.json$/i, "");
    return [id, schema];
  }),
);

const validateSiteCore = createSiteValidator({
  layoutSchema,
  componentSchemas,
});

export const pageSchema = buildPageSchema({
  layout: siteLayout,
  componentSchemas,
});

export function validateSite({
  page,
  layout = siteLayout,
  renderers = defaultRenderers,
  renderSmoke = false,
} = {}) {
  return validateSiteCore({ page, layout, renderers, renderSmoke });
}

export { describeValidationError };
export { layoutSchema };
export { componentSchemas };
