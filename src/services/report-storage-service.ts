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
