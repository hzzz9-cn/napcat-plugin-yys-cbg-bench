# Report Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add report storage utilities for safe report URLs and retention cleanup, with minimal state integration.

**Architecture:** Create a small `report-storage-service` that owns report paths and TTL filtering. `PluginState` keeps persistence and delegates expiry filtering to the injected service.

**Tech Stack:** TypeScript, Vitest, Node `fs/path`

---

## File Map
- Create: `src/services/report-storage-service.ts` for report path and TTL filtering helpers.
- Create: `tests/services/report-storage-service.test.ts` for TDD coverage.
- Modify: `src/core/state.ts` to align the reportStorage type with the new service.

### Task 1: Report Storage Tests

**Files:**
- Create: `tests/services/report-storage-service.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import type { ReportListItem } from '../../src/types'
import { createReportStorageService } from '../../src/services/report-storage-service'

const createReport = (overrides: Partial<ReportListItem>): ReportListItem => ({
    reportId: overrides.reportId ?? 'r-1',
    sourceUrl: overrides.sourceUrl ?? 'https://example.com',
    groupId: overrides.groupId ?? '123',
    imageUrl: overrides.imageUrl ?? 'https://example.com/img.png',
    generatedAt: overrides.generatedAt ?? new Date().toISOString(),
    status: overrides.status ?? 'success',
    summary: overrides.summary ?? 'ok',
})

describe('report-storage-service', () => {
    it('createReportPaths builds safe imageUrl without leaking local paths', () => {
        const dataPath = path.join(os.tmpdir(), 'napcat-report-tests', 'data')
        const service = createReportStorageService({
            dataPath,
            pluginStaticBase: '/plugin/test/files/reports',
            retentionHours: 24,
            maxRecentReports: 20,
            now: () => 1712400000000,
        })

        const paths = service.createReportPaths('123')

        expect(paths.imageUrl).toBe('/plugin/test/files/reports/123/r-1712400000000.png')
        expect(paths.imageUrl).not.toContain(dataPath)
        expect(paths.imageUrl).not.toMatch(/[A-Za-z]:\\/)
    })

    it('filterExpiredReports removes expired and invalid reports', () => {
        const nowMs = Date.parse('2026-04-06T12:00:00.000Z')
        const service = createReportStorageService({
            dataPath: '/tmp',
            pluginStaticBase: '/plugin/test/files/reports',
            retentionHours: 24,
            maxRecentReports: 20,
            now: () => nowMs,
        })

        const recent = createReport({
            reportId: 'r-recent',
            generatedAt: new Date(nowMs - 23 * 60 * 60 * 1000).toISOString(),
        })
        const expired = createReport({
            reportId: 'r-expired',
            generatedAt: new Date(nowMs - 25 * 60 * 60 * 1000).toISOString(),
        })
        const invalid = createReport({ reportId: 'r-invalid', generatedAt: 'not-a-date' })
        const missing = createReport({ reportId: 'r-missing', generatedAt: '' })

        const filtered = service.filterExpiredReports([recent, expired, invalid, missing])

        expect(filtered).toEqual([recent])
    })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/services/report-storage-service.test.ts`  
Expected: FAIL with module not found or missing export for `report-storage-service`.

### Task 2: Report Storage Service + State Wiring

**Files:**
- Create: `src/services/report-storage-service.ts`
- Modify: `src/core/state.ts`

- [ ] **Step 1: Implement report storage service**

```typescript
import fs from 'fs'
import path from 'path'
import type { ReportListItem } from '../types'

export interface ReportPaths {
    reportId: string
    groupId: string
    reportDir: string
    imagePath: string
    imageUrl: string
}

export interface ReportStorageService {
    ensureDirs: () => void
    createReportPaths: (groupId: string) => ReportPaths
    filterExpiredReports: (reports: ReportListItem[]) => ReportListItem[]
}

export interface ReportStorageServiceOptions {
    dataPath: string
    pluginStaticBase: string
    retentionHours: number
    maxRecentReports: number
    now?: () => number
}

const MILLIS_PER_HOUR = 60 * 60 * 1000

function normalizeStaticBase(value: string): string {
    const normalized = value.replace(/\\/g, '/').replace(/\/+$/, '')
    return normalized || ''
}

function sanitizeSegment(value: string): string {
    const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '_')
    return cleaned || 'unknown'
}

export function createReportStorageService({
    dataPath,
    pluginStaticBase,
    retentionHours,
    maxRecentReports,
    now = () => Date.now(),
}: ReportStorageServiceOptions): ReportStorageService {
    const baseDir = path.join(dataPath, 'reports')
    const staticBase = normalizeStaticBase(pluginStaticBase)

    const ensureDirs = (): void => {
        fs.mkdirSync(baseDir, { recursive: true })
    }

    const createReportPaths = (groupId: string): ReportPaths => {
        const safeGroupId = sanitizeSegment(groupId)
        const reportId = `r-${now()}`
        const groupDir = path.join(baseDir, safeGroupId)
        fs.mkdirSync(groupDir, { recursive: true })

        const imageFile = `${reportId}.png`
        const imagePath = path.join(groupDir, imageFile)
        const imageUrl = [staticBase, encodeURIComponent(safeGroupId), encodeURIComponent(imageFile)]
            .filter(Boolean)
            .join('/')

        return {
            reportId,
            groupId: safeGroupId,
            reportDir: groupDir,
            imagePath,
            imageUrl,
        }
    }

    const filterExpiredReports = (reports: ReportListItem[]): ReportListItem[] => {
        const windowMs = retentionHours * MILLIS_PER_HOUR
        const nowMs = now()
        const filtered = reports.filter((report) => {
            const timestamp = Date.parse(report.generatedAt)
            if (!Number.isFinite(timestamp)) return false
            return nowMs - timestamp <= windowMs
        })

        if (maxRecentReports > 0) {
            return filtered.slice(0, maxRecentReports)
        }

        return filtered
    }

    return {
        ensureDirs,
        createReportPaths,
        filterExpiredReports,
    }
}
```

- [ ] **Step 2: Align state type**

```typescript
import type { ReportStorageService } from '../services/report-storage-service'

// ...

reportStorage: ReportStorageService | null = null

// ...
setRuntimeServices(input: {
    reportStorage?: ReportStorageService | null;
    // ...
}): void {
    // unchanged logic
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `pnpm test -- tests/services/report-storage-service.test.ts`  
Expected: PASS

- [ ] **Step 4: Run typecheck**

Run: `pnpm run typecheck`  
Expected: PASS

### Task 3: Commit

- [ ] **Step 1: Commit changes**

```bash
git add docs/superpowers/specs/2026-04-06-report-storage-design.md docs/superpowers/plans/2026-04-06-report-storage-plan.md src/services/report-storage-service.ts tests/services/report-storage-service.test.ts src/core/state.ts
git commit -m "feat: add report storage service with ttl cleanup"
```
