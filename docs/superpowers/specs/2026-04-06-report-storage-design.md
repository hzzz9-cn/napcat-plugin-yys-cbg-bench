# Report Storage and TTL Cleanup Design

## Goal
Add a report storage helper that builds safe public image URLs, manages on-disk report paths, and filters expired reports based on a retention window.

## Requirements
- `createReportStorageService({ dataPath, pluginStaticBase, retentionHours, maxRecentReports, now? })` returns helpers used by state/services.
- `createReportPaths(groupId)` returns a public `imageUrl` that never exposes local disk paths.
- `filterExpiredReports(reports)` removes reports older than the retention window; missing/invalid `generatedAt` is treated as expired.
- `ensureDirs()` creates necessary report directories.
- Integrate minimally with `PluginState` so `cleanupExpiredReports()` and persistence work as before.

## Architecture
Add a small storage service in `src/services/report-storage-service.ts` that centralizes report paths and TTL filtering. `PluginState` continues to own persistence; it delegates expiry filtering to the injected storage service.

## Data Flow
1. State loads report index on init.
2. Storage service (when injected) filters expired reports via `cleanupExpiredReports()`.
3. New report creation uses `createReportPaths(groupId)` to get disk and public URLs.

## Error Handling
- Invalid dates in `generatedAt` are treated as expired to avoid leaking stale or malformed entries.
- Directory creation is idempotent (`recursive: true`).

## Testing
- Unit tests for `createReportPaths` to ensure `imageUrl` is safe and does not contain local filesystem paths.
- Unit tests for `filterExpiredReports` to ensure retention window is enforced and invalid timestamps are filtered.
