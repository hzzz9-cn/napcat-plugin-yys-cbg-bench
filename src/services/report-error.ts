export interface ReportError {
    code: string
    publicMessage: string
}

export function createReportError(code: string, publicMessage: string): ReportError {
    return { code, publicMessage }
}

export function isReportError(error: unknown): error is ReportError {
    if (!error || typeof error !== 'object') return false
    const record = error as Record<string, unknown>
    return typeof record.code === 'string' && typeof record.publicMessage === 'string'
}
