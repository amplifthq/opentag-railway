import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { validateImageReceipt } from "../.railway/image.ts";

assert(process.argv.length === 3, "Usage: npm run pin-image -- /path/to/control-plane-image.json");
const receipt = validateImageReceipt(JSON.parse(readFileSync(process.argv[2], "utf8")));
const reference = `${receipt.image}:${receipt.tag}@${receipt.digest}`;
execFileSync("docker", ["pull", "--platform", receipt.platform, reference], { stdio: "inherit" });
const [image] = JSON.parse(execFileSync("docker", ["image", "inspect", reference], { encoding: "utf8" }));
assert.equal(image.Config.Labels["org.opencontainers.image.source"], "https://github.com/amplifthq/opentag");
assert.equal(image.Config.Labels["org.opencontainers.image.revision"], receipt.sourceSha);
assert.equal(image.Config.User, "opentag");
assert.equal(`${image.Os}/${image.Architecture}`, receipt.platform);
writeFileSync(new URL("../image.lock.json", import.meta.url), JSON.stringify(receipt, null, 2) + "\n");
writeFileSync(new URL("../Dockerfile", import.meta.url), `FROM ${reference}\n`);
console.log(`Pinned verified image ${receipt.sourceSha} at ${receipt.digest}. Review and commit both files.`);
