# Security

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository (Security tab, "Report a
vulnerability"). Do not open a public issue for anything exploitable. Include the affected
route or file, steps to reproduce, and the impact you believe it has. You will get an
acknowledgement within seven days and a fix or a written decision within thirty.

If private reporting is not enabled on the repository yet, open a public issue titled
"Security contact request" with no details, and the maintainer will provide a private channel.

## Supported versions

Only the `main` branch is supported. The hosted instance runs the latest deployment of
`main`. There are no release tags and no backports.

## Security posture

The protections in place, and the known gaps, are described in
[`docs/security.md`](docs/security.md), in two parts:

- **Hosted posture**: the instance run by the project on a serverless platform with a
  managed Postgres database.
- **Self-hosted posture**: what changes when you run the code yourself, and what becomes
  your responsibility.

Schema changes follow [`docs/migrations.md`](docs/migrations.md).
