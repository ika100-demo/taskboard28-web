# Environment variables

Configuration is read exclusively from environment variables. Defaults below are the application defaults. The deployed values are set per environment in the system's gitops-app repo (`system.yaml`: a component's `env`, and `replicas`, `resources` under `instances.<env>`).

## Core

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the server listens on. |
| `NODE_ENV` | `production` (in the image) | Node environment. |

## Observability

| Variable | Default | Description |
|---|---|---|
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset — tracing disabled)_ | OTLP endpoint; when set, `instrumentation.ts` enables OpenTelemetry tracing. |
| `OTEL_SERVICE_NAME` | `taskboard28-web` | Service name reported in traces. |

## taskboard28-api

| Variable | Default | Description |
|---|---|---|
| `TASKBOARD28_API_URL` | _(unset)_ | Base URL of taskboard28-api, read on the server per call (a trailing `/` is ignored). Set by the gitops entry (dev: `http://taskboard28-api`). When unset the page shows its error texts and logs a `warn` with `reason: "config"`. |

## Public (browser-exposed)

Variables prefixed `NEXT_PUBLIC_` are inlined into the client bundle at build time. Never put secrets in them.
