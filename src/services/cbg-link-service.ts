const CBG_HOST = 'yys.cbg.163.com'
const CBG_PATH_PREFIX = '/cgi/mweb/equip/'

const CANDIDATE_REGEX = /https?:\/\/[^\s<>"]+|yys\.cbg\.163\.com\/[^\s<>"]+/gi
const LEADING_CHARS = /^[<\(\[\{'"“‘]/
const TRAILING_CHARS = /[>\)\]\}'"”’.,!?，。！？；:：]$/

function stripEdgePunctuation(value: string): string {
    let result = value.trim()
    while (result && LEADING_CHARS.test(result)) {
        result = result.slice(1).trim()
    }
    while (result && TRAILING_CHARS.test(result)) {
        result = result.slice(0, -1).trim()
    }
    return result
}

export function normalizeCbgUrl(url: string): string {
    const trimmed = stripEdgePunctuation(url)
    if (!trimmed) return ''

    if (/^https?:\/\//i.test(trimmed)) {
        if (/^http:\/\/yys\.cbg\.163\.com\//i.test(trimmed)) {
            return trimmed.replace(/^http:\/\//i, 'https://')
        }
        return trimmed
    }

    if (/^yys\.cbg\.163\.com\//i.test(trimmed)) {
        return `https://${trimmed}`
    }

    return trimmed
}

export function isValidCbgUrl(url: string): boolean {
    const normalized = normalizeCbgUrl(url)
    if (!normalized) return false

    let parsed: URL
    try {
        parsed = new URL(normalized)
    } catch (error) {
        return false
    }

    if (parsed.hostname !== CBG_HOST) return false
    if (!parsed.pathname.startsWith(CBG_PATH_PREFIX)) return false

    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length < 5) return false
    if (parts[0] !== 'cgi' || parts[1] !== 'mweb' || parts[2] !== 'equip') return false
    if (!parts[3] || !parts[4]) return false

    return true
}

export function extractFirstCbgUrl(message: string): string | null {
    if (!message) return null
    const matches = message.match(CANDIDATE_REGEX)
    if (!matches) return null

    for (const candidate of matches) {
        const normalized = normalizeCbgUrl(candidate)
        if (isValidCbgUrl(normalized)) return normalized
    }

    return null
}
