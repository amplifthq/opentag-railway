import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRailwayContext, project } from "railway/iac";
import program, { definition } from "../.railway/railway.ts";
import { validateImageReceipt, readPinnedImage } from "../.railway/image.ts";
import { templateInputs } from "../.railway/inputs.ts";

const receipt = { schemaVersion: 1, image: "ghcr.io/amplifthq/opentag-control-plane",
  sourceSha: "a".repeat(40), tag: `sha-${"a".repeat(40)}-123-1`,
  digest: `sha256:${"b".repeat(64)}`, platform: "linux/amd64" };
test("requires an exact release identity and digest", () => {
  assert.deepEqual(validateImageReceipt(receipt), receipt);
  for (const change of [{ digest: "latest" }, { image: "ghcr.io/other/image" },
    { sourceSha: "main" }, { tag: "latest" }, { platform: "linux/arm64" }, { schemaVersion: 2 }]) {
    assert.throws(() => validateImageReceipt({ ...receipt, ...change }));
  }
});
test("unreleased configuration fails closed without a fake Dockerfile", () => {
  const pin = JSON.parse(readFileSync(new URL("../image.lock.json", import.meta.url), "utf8"));
  if (pin.status === "awaiting_first_verified_release") {
    assert.throws(() => program(createRailwayContext(), project), /image_release_not_pinned/u);
  } else {
    assert.deepEqual(readPinnedImage(), validateImageReceipt(pin));
  }
});
test("uses three services, one persistent database volume and one shared image build", () => {
  assert.equal(definition.resources.length, 4);
  const [postgres, api, jobs, volume] = definition.resources;
  assert.equal(postgres.source.image, "postgres:17-alpine");
  assert.equal(volume.type, "volume");
  assert.deepEqual(postgres.volumeAttachments.PostgresData, {
    volume: "volume.PostgresData", mountPath: "/var/lib/postgresql/data", volumeConfig: { sizeMB: 1024 },
  });
  for (const service of [api, jobs]) {
    assert.equal(service.source.repo, "amplifthq/opentag-railway");
    assert.equal(service.source.branch, "main");
    assert.equal(service.build.dockerfilePath, "Dockerfile");
    assert.equal(service.deploy.sleepApplication, false);
    assert.equal(service.deploy.numReplicas, 1);
  }
  assert.equal(api.deploy.startCommand, "node apps/control-plane/dist/index.js container serve");
  assert.equal(jobs.deploy.startCommand, "node apps/control-plane/dist/index.js container jobs");
  assert.equal(api.deploy.healthcheckPath, "/readyz");
  assert.equal(jobs.networking, undefined);
  assert.equal(postgres.networking, undefined);
});
test("preserves secrets on upgrade and shares runtime authority without owner credentials", () => {
  const [, api, jobs] = definition.resources;
  for (const name of Object.keys(templateInputs)) {
    assert.equal(api.variables[name].value.preserveExisting, true);
  }
  for (const name of ["OPENTAG_CONTAINER_RELAY_CONTENT_KEK", "OPENTAG_FENCING_TOKEN_SECRET",
    "OPENTAG_CONTAINER_SLACK_BOT_TOKEN", "OPENTAG_LOGIN_THROTTLE_SECRET"]) {
    assert.equal(jobs.variables[name].type, "reference");
    assert.equal(jobs.variables[name].resource, "service.ControlPlane");
  }
  assert.equal(jobs.variables.OPENTAG_BOOTSTRAP_ADMIN_PASSWORD, undefined);
  assert.equal(api.variables.OPENTAG_RELEASE_SHA, undefined);
  assert.equal(jobs.variables.OPENTAG_RELEASE_SHA, undefined);
  assert.equal(templateInputs.OPENTAG_CONTAINER_SLACK_BOT_TOKEN.defaultValue, undefined);
});
