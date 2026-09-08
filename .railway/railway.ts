import { defineRailway, github, image, project, service, volume } from "railway/iac";
import type { VariableConfig } from "railway/iac";
import { readPinnedImage } from "./image.ts";
import { templateInputs } from "./inputs.ts";

const data = volume("PostgresData", { sizeMB: 1024 });
const resourceLimits = { containers: { cpu: 1, memoryBytes: 512 * 1024 * 1024 } };
const postgres = service("Postgres", {
  source: image("postgres:17-alpine", { autoUpdates: { type: "disabled" } }),
  replicas: 1,
  env: {
    POSTGRES_USER: "opentag", POSTGRES_DB: "opentag", PGDATA: "/var/lib/postgresql/data/pgdata",
    POSTGRES_PASSWORD: { preserveExisting: true, description: "Database password; generate once in the template, retain on upgrade." },
    DATABASE_URL: "postgresql://${{Postgres.POSTGRES_USER}}:${{Postgres.POSTGRES_PASSWORD}}@${{Postgres.RAILWAY_PRIVATE_DOMAIN}}:5432/${{Postgres.POSTGRES_DB}}",
  },
  volumeMounts: { "/var/lib/postgresql/data": data },
  deploy: { sleepApplication: false, restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10,
    limitOverride: resourceLimits },
});

const inputs = Object.fromEntries(
  Object.entries(templateInputs).map(([name, definition]) => [name,
    { preserveExisting: true, description: definition.description }]),
) as Record<keyof typeof templateInputs, VariableConfig>;
const common = {
  DATABASE_URL: postgres.env.DATABASE_URL,
  OPENTAG_ENVIRONMENT: "production",
  OPENTAG_BOOTSTRAP_ORGANIZATION_ID: "org_railway",
  OPENTAG_BOOTSTRAP_ORGANIZATION_NAME: "OpenTag",
  OPENTAG_PUBLIC_URL: "https://${{ControlPlane.RAILWAY_PUBLIC_DOMAIN}}",
  OPENTAG_PORT: "3000", PORT: "3000", OPENTAG_HOST: "0.0.0.0",
  OPENTAG_RELAY_CONTENT_KEY_VERSION: "v1", OPENTAG_DB_POOL_MAX: "5",
  // Keep the conservative peer-based policy. Do not trust forwarded IP headers
  // without a separately verified edge-attestation boundary.
  OPENTAG_LOGIN_NETWORK_THROTTLE_MODE: "direct-peer",
};
const deploy = { sleepApplication: false, restartPolicyType: "ON_FAILURE" as const,
  restartPolicyMaxRetries: 10, drainingSeconds: 30, overlapSeconds: 0,
  limitOverride: resourceLimits };
const controlPlane = service("ControlPlane", {
  source: github("amplifthq/opentag-railway", { branch: "main" }),
  build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
  start: "node apps/control-plane/dist/index.js container serve",
  healthcheck: "/readyz", healthcheckTimeout: 600, replicas: 1,
  env: { ...common, ...inputs,
    OPENTAG_BOOTSTRAP_ADMIN_NAME: "OpenTag Owner",
    OPENTAG_SLACK_INSTALLATION_ID: "slack_primary",
    OPENTAG_SLACK_BINDING_ID: "slack_primary_binding",
    OPENTAG_SLACK_PROJECT_TARGET_ID: "github_primary",
    OPENTAG_SLACK_PUBLICATION_MODE: "pull_request",
  },
  deploy,
});
const runtimeInputs = [
  "OPENTAG_BOOTSTRAP_PAIRING_TOKEN", "OPENTAG_RECOVERY_PAIRING_TOKEN",
  "OPENTAG_FENCING_TOKEN_SECRET", "OPENTAG_LOGIN_THROTTLE_SECRET",
  "OPENTAG_CONTAINER_RELAY_CONTENT_KEK", "OPENTAG_CONTAINER_SLACK_SIGNING_SECRET",
  "OPENTAG_CONTAINER_SLACK_BOT_TOKEN",
] as const;
const jobs = service("Jobs", {
  source: github("amplifthq/opentag-railway", { branch: "main" }),
  build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
  start: "node apps/control-plane/dist/index.js container jobs",
  replicas: 1,
  env: { ...common,
    ...Object.fromEntries(runtimeInputs.map((name) => [name, controlPlane.env[name]])),
    OPENTAG_CONTAINER_CONTROL_PLANE_URL: "http://${{ControlPlane.RAILWAY_PRIVATE_DOMAIN}}:3000",
  },
  deploy,
});

export const definition = project("OpenTag", { resources: [postgres, controlPlane, jobs, data] });

export default defineRailway(() => {
  // No guessed image digest or implicit build from the main application repo.
  readPinnedImage();
  return definition;
});
