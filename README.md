# OpenTag on Railway

Railway deployment template for OpenTag's always-on Slack teammate.

This repository is the deployment entry point for
[OpenTag](https://github.com/amplifthq/opentag) on Railway. The Control Plane
stays online while the coding agent, repository worktrees, and GitHub execution
credentials remain on your own Runner.

## Status

**Public image pinned — Railway deployment validation is still pending.**

The Railway service definition, protected-variable contract, image-pinning
command, and tests are implemented. [image.lock.json](image.lock.json) records
the exact public image digest and OpenTag source revision; the one-line
[Dockerfile](Dockerfile) consumes that same immutable reference. CI requires a
valid pin on every change.

The initial image comes from OpenTag source revision
[`c389d85c`](https://github.com/amplifthq/opentag/commit/c389d85c2ea74d9f9375b2343ea072ff80dfe8c2).
Its [main CI](https://github.com/amplifthq/opentag/actions/runs/34223766082) passed.
The [publication run](https://github.com/amplifthq/opentag/actions/runs/34224536100)
uploaded the image and retained its receipt, but its final anonymous-pull check
failed before the package was made public. Public access was subsequently
verified independently against that same digest; the historical workflow
failure is not rewritten as a successful run.

See [Deployment and template registration](DEPLOYMENT.md) for the release gates,
required Slack inputs, and the first-install procedure. A deployment link will
be added only after the registered template passes fresh-environment validation.

For the existing self-hosted deployment path, see the
[OpenTag deployment runbook](https://github.com/amplifthq/opentag/blob/main/docs/control-plane-deployment.md).

## Deployment scope

The service definition contains three long-running services:

| Service | Responsibility |
| --- | --- |
| `ControlPlane` | Slack ingress, Console, Runner coordination, approvals, and evidence |
| `Jobs` | Durable background work, recovery, reconciliation, and retention |
| `Postgres` | Persistent Control Plane state, backed by `PostgresData` |

The two application services use the same pinned OpenTag image with
different start commands. Only the Control Plane will have a public HTTPS
endpoint. Slack authorization and local Runner pairing remain explicit setup
steps.

## Development checks

Use Node.js 22.14 or newer and the Railway CLI. The Railway SDK is development
tooling only; it is not added to the OpenTag runtime image.

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run check:release
```

`check:release` validates the required image receipt and its exact Dockerfile
reference. These checks do not create Railway resources or certify a running
installation.

## Repository boundary

- Keep Railway configuration, image references, deployment instructions, and
  template upgrade notes here.
- Keep application code, database migrations, initialization logic, and image
  builds in the [main OpenTag repository](https://github.com/amplifthq/opentag).
- Reference a reviewed image version and digest; do not track a floating
  `latest` image or copy application source into this repository.
- Never commit deployment credentials, local environment files, or instance
  state. A template must not embed the credentials of its author.

## License

[MIT](LICENSE), matching the main OpenTag project.
