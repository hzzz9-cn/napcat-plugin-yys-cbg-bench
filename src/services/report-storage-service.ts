import fs from 'fs'
import path from 'path'
import type { ReportListItem } from '../types'

export interface ReportPaths {
    reportId: string
    imagePath: string
    htmlPath: string
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
    const imagesDir = path.join(baseDir, 'images')
    const htmlDir = path.join(baseDir, 'html')
    const staticBase = normalizeStaticBase(pluginStaticBase)

    const ensureDirs = (): void => {
        fs.mkdirSync(imagesDir, { recursive: true })
        fs.mkdirSync(htmlDir, { recursive: true })
    }

    const createReportPaths = (groupId: string): ReportPaths => {
        const safeGroupId = sanitizeSegment(groupId)
        const reportId = `${safeGroupId}-${now()}`
        ensureDirs()

        const imageFile = `${reportId}.png`
        const htmlFile = `${reportId}.html`
        const imagePath = path.join(imagesDir, imageFile)
        const htmlPath = path.join(htmlDir, htmlFile)
        const imageUrl = `${staticBase}/images/${encodeURIComponent(imageFile)}`

        return {
            reportId,
            imagePath,
            htmlPath,
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
