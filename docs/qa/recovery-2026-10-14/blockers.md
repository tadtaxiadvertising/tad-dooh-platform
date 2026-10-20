# Recovery Blockers & Environment Restrictions

## 1. Docker Build Execution in Sandbox Container
- **Status**: BLOCKED
- **Description**: The Docker daemon running inside the agent sandbox container environment rejects layer assembly with `mount source: "overlay", target: ... err: invalid argument`.
- **Impact**: Container image builds cannot complete locally inside this unprivileged sandbox.
- **Next Safe Action**: Run Docker builds in an external CI runner (e.g. GitHub Actions `ubuntu-24.04` runner with native overlayfs support).
