import { app } from "../src/app";

const response = await app.handle(new Request("http://localhost/openapi/json"));
if (!response.ok) throw new Error(`OpenAPI endpoint returned ${response.status}`);

const spec = (await response.json()) as Record<string, unknown>;
if (typeof spec.openapi !== "string") throw new Error("OpenAPI spec has no version");
if (!spec.info || typeof spec.info !== "object") {
  throw new Error("OpenAPI spec has no info object");
}
if (!spec.paths || typeof spec.paths !== "object" || Object.keys(spec.paths).length === 0) {
  throw new Error("OpenAPI spec has no paths");
}

const components = spec.components as { securitySchemes?: Record<string, unknown> } | undefined;
if (!components?.securitySchemes?.bearerAuth) {
  throw new Error("OpenAPI bearerAuth scheme is missing");
}

console.log(`OpenAPI valid: ${Object.keys(spec.paths).length} documented paths`);
