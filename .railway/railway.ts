import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const api = service("unicom-university", {
    build: "npm install && npm run build --workspace=@unicom/types && npm run build --workspace=@unicom/config && npm run build --workspace=@unicom/validation && npm run build --workspace=@unicom/api",
    start: "node apps/api/dist/main.js",
    healthcheck: "/api/v1/health",
    healthcheckTimeout: 30,
  });

  return project("unicom-university", {
    resources: [api],
  });
});
