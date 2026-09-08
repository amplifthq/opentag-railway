import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

export function validateImageReceipt(value: unknown) {
  assert(value && typeof value === "object" && !Array.isArray(value), "image_receipt_invalid");
  const raw = value as Record<string, unknown>;
  assert.equal(raw.schemaVersion, 1, "image_receipt_schema_invalid");
  assert.equal(raw.image, "ghcr.io/amplifthq/opentag-control-plane", "image_repository_invalid");
  assert.equal(raw.platform, "linux/amd64", "image_platform_invalid");
  assert(typeof raw.sourceSha === "string" && /^[a-f0-9]{40}$/u.test(raw.sourceSha), "image_source_sha_invalid");
  assert(typeof raw.digest === "string" && /^sha256:[a-f0-9]{64}$/u.test(raw.digest), "image_digest_missing_or_invalid");
  assert(typeof raw.tag === "string"
    && new RegExp(`^sha-${raw.sourceSha}-[0-9]+-[0-9]+$`, "u").test(raw.tag), "image_release_tag_invalid");
  return { schemaVersion: 1, image: "ghcr.io/amplifthq/opentag-control-plane",
    sourceSha: raw.sourceSha, digest: raw.digest, tag: raw.tag, platform: "linux/amd64" };
}

export function readPinnedImage() {
  const value: unknown = JSON.parse(readFileSync(new URL("../image.lock.json", import.meta.url), "utf8"));
  const receipt = validateImageReceipt(value);
  const reference = `${receipt.image}:${receipt.tag}@${receipt.digest}`;
  const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
  assert.equal(dockerfile.trim(), `FROM ${reference}`, "dockerfile_image_pin_mismatch");
  return receipt;
}
