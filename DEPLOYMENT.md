# Deployment and template registration

This repository defines one Railway environment. It does not yet expose a
one-click deployment URL. Complete each gate below before advertising one.
No repository workflow creates Railway resources or automatically applies
infrastructure changes.

## 1. Pin a published OpenTag image

The [main OpenTag repository](https://github.com/amplifthq/opentag) owns image
builds, migrations, bootstraps, and the container entry point. Require a
successful main CI run, successful image upload and receipt retention, and
verified anonymous pull access before pinning a release.

Download `control-plane-image.json` from that publication run's receipt artifact.
The first GHCR package must be publicly pullable; do not add registry credentials
to this template. If a publication run failed only its anonymous-pull check
before the organization made the package public, retain that historical failure
and independently verify a full anonymous pull of its exact digest after the
visibility change. This does not waive any failed build, upload, receipt, or
identity check. The first pin in this repository was verified this way.

```sh
npm ci --ignore-scripts
npm run pin-image -- /absolute/path/to/control-plane-image.json
npm run check:release
npm run typecheck
npm test
```

`pin-image` validates the repository, full source SHA, release tag, digest, and
platform, then pulls the exact image and verifies its OCI source/revision labels,
architecture, and non-root runtime user. Only after verification does it write
`image.lock.json` and a one-line `Dockerfile`. Review and commit both files.
The receipt must come from the successful main publication workflow; labels
alone do not establish code-owner approval or a successful provider canary.

Both Railway application services build that same thin Dockerfile. Neither
rebuilds application source nor overrides the image's embedded release SHA.

## 2. Define a fresh Railway environment

`.railway/railway.ts` is the single service-topology definition, using Railway's
current IaC SDK. It defines `Postgres`, its `PostgresData` volume, `ControlPlane`,
and `Jobs`. It contains no concrete workspace, project, domain, or user IDs.
Do not use it against an unrelated existing project: in Railway IaC, removing
resources from the definition can mean deleting them.

An operator must explicitly authorize the target workspace and any metered
resources before creating this initial validation environment. The source
repository alone does not create a Railway template or grant that authority.

For a new authorized project, configure the protected variables described in
`.railway/inputs.ts` on `ControlPlane`, and `POSTGRES_PASSWORD` on `Postgres`.
That file contains descriptions and safe *template-editor defaults*, not live
credentials. Generate random values once using the platform's secret facility;
do not put literal `${{secret(...)}}` strings into live service variables and
do not use deterministic IaC naming helpers as cryptographic secret generators.
Use a 64-character hexadecimal database password so the internal connection
URL does not need password escaping.

The IaC definition preserves existing input values on upgrades. It does not
rotate them or invent defaults for Slack identifiers and credentials. Jobs
references runtime authority from `ControlPlane` and never receives the
bootstrap administrator password.

Generate a Railway HTTPS service domain for `ControlPlane`, targeting port
3000. Railway-generated domains are configured through Railway's networking
workflow, not hardcoded in the IaC file. No public domain or TCP proxy should
exist for `Jobs` or `Postgres`.

After linking the explicitly selected fresh project, preview the changes:

```sh
railway config plan
```

Review the redacted plan before applying it. Do not use `--show-values` in CI
logs, and do not enable automatic `config apply` on pull-request merge. Applying
this configuration creates/changes billable infrastructure; it is not a local
validation command.

## 3. Register a sanitized template

After the seed environment is verified, create an unpublished template through
Railway's template editor or `railway templates create --project <exact-id>`.
An unpublished template can still be shared by URL; marketplace publication is
a separate choice.

Before sharing, inspect the entire template configuration:

- Keep the two application sources on `amplifthq/opentag-railway`, branch `main`,
  with the pinned Dockerfile and the startup settings from the IaC definition.
- Retain PostgreSQL 17 and its mounted persistent volume. Do not copy an existing
  database's data into the template.
- Enable a generated HTTPS domain only for `ControlPlane`.
- Replace every actual secret with its template generator or a required user
  input. Use the generators/descriptions in `.railway/inputs.ts`; use a fresh
  64-character hexadecimal generator for `Postgres.POSTGRES_PASSWORD`.
- Remove the author's real Slack IDs, email, channel members, approver, and
  credentials. Require the deploying user to supply their own values.
- Retain service-to-service variable references. Generate shared internal
  authority once on `ControlPlane`, never independently on `Jobs`.
- Retain single replicas, disabled service sleeping, `/readyz`, and graceful
  shutdown settings. Do not add arbitrary command execution or hosted Runners.

This sanitation check is mandatory: converting a live project to a template
must not publish its credentials. Do not treat a template ID as acceptance.

## 4. Connect Slack and a local Runner

Use your own Slack App and private channel. Configure its event and interactivity
callbacks using the deployed public origin and the stable
`OPENTAG_SLACK_ROUTE_IDENTITY`, following the
[OpenTag deployment runbook](https://github.com/amplifthq/opentag/blob/main/docs/control-plane-deployment.md).
The approver must appear in the configured member list. Draft PR creation still
requires its own exact Effect approval.

Pair the local Runner using the existing `opentag pair --relay <https-origin>`
flow and private pairing authority. Keep the coding agent, repository worktrees,
and GitHub execution credentials on that machine, not in Railway.

## Acceptance before adding a deploy button

Deploy a second, empty environment from the actual registered template. Confirm:

1. `/readyz` succeeds, Console login works, and both roles report the pinned
   OpenTag source SHA; `Jobs` starts only after that revision is ready.
2. Restart/redeploy preserves database state, encryption keys, administrator,
   and Slack binding. No manual database repairs are needed.
3. A Slack request sent with the Runner offline remains waiting, then executes
   after reconnecting and rechecking current authorization/readiness.
4. One real code task produces a local commit and candidate; a separate approved
   Effect produces one Draft PR, with the final result in the original thread.
5. The template contains no author credentials or installation-specific IDs.

Only then add the verified template URL to the README. Record source SHA, image
digest, and template acceptance separately from package/source publication.

## Upgrades and recovery

Import a new verified receipt, review the resulting image pin, and validate in
a separate environment before applying to an existing installation. Preserve
all platform secret values. Bootstrap is not a password reset or Slack binding
repair tool.

Back up PostgreSQL together with the exact content KEK and its key version.
Rolling an image back does not reverse a database migration. The pre-reset
OpenTag schema is unsupported; preserve it as a recovery artifact and provision
a separate fresh database instead of clearing or upgrading it in place.

This is a single-instance profile, not an HA promise. Railway's deployment
healthcheck is not continuous runtime monitoring.
