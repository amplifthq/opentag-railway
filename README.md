# OpenTag on Railway

Railway deployment template for OpenTag's always-on Slack teammate.

This repository is the deployment entry point for
[OpenTag](https://github.com/amplifthq/opentag) on Railway. The Control Plane
stays online while the coding agent, repository worktrees, and GitHub execution
credentials remain on your own Runner.

## Status

**Scaffold only — the one-click Railway template is not available yet.**

This repository does not currently contain a deployable configuration or a
published image reference. A deployment link will be added after the pinned
OpenTag image and template have been validated in a fresh Railway environment.

For the existing self-hosted deployment path, see the
[OpenTag deployment runbook](https://github.com/amplifthq/opentag/blob/main/docs/control-plane-deployment.md).

## Deployment scope

The intended template contains three long-running services:

| Service | Responsibility |
| --- | --- |
| `control-plane` | Slack ingress, Console, Runner coordination, approvals, and evidence |
| `jobs` | Durable background work, recovery, reconciliation, and retention |
| `postgres` | Persistent Control Plane state |

The two application services will use the same pinned OpenTag image with
different start commands. Only the Control Plane will have a public HTTPS
endpoint. Slack authorization and local Runner pairing remain explicit setup
steps.

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
