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
