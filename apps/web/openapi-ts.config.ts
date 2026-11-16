import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../openapi/openapi.yaml",
  output: "src/client",
  plugins: [
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "./src/hey-api.ts",
    },
  ],
});
