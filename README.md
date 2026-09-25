# pi-project

Project registry for pi agents — list/use/register/forget projects via the host mailbox.

## Compatibility

Peer dependencies are pinned to tested ranges:

- `@earendil-works/pi-coding-agent`: `^0.87.0` (tested against `0.87.1`; Pi is pre-1.0, so the range is locked to the `0.87.x` minor)
- `typebox`: `^1.3.0` (tested against `1.3.34`; any `1.x` ≥ `1.3.0`)

Installing with an unsupported major (e.g. Pi `1.x` or typebox `2.x`) will produce an npm peer-dependency warning/error in consumers.
