# E2E Test Foundation

Run the approved authentication browser flow from the repository root with `pnpm test:e2e`.
It starts the API and web application using the isolated `unicom_test` database and local Redis;
start the Docker infrastructure first with `docker compose up -d`. Tests must never target production
resources or use production credentials.
