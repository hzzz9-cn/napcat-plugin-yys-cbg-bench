import { isValidCbgUrl, normalizeCbgUrl } from './cbg-link-service'
import { ReportError } from './report-error'

const CBG_DETAIL_ENDPOINT = 'https://yys.cbg.163.com/cgi/api/get_equip_detail'
const REQUEST_FAILED_MESSAGE = '藏宝阁请求失败，请稍后再试'

type FetchImpl = typeof fetch

export interface CbgFetchService {
    fetchDetail: (url: string) => Promise<unknown>
}

export interface CbgFetchServiceOptions {
    fetchImpl?: FetchImpl
    timeoutMs: number
}

function parseDetailParams(rawUrl: string): { serverid: string; ordersn: string } {
    const normalized = normalizeCbgUrl(rawUrl)
    if (!isValidCbgUrl(normalized)) {
        throw new ReportError('CBG_INVALID_URL', '藏宝阁链接无效')
    }

    const parsed = new URL(normalized)
    const parts = parsed.pathname.split('/').filter(Boolean)

    return {
        serverid: parts[3],
        ordersn: parts[4],
    }
}

export function createCbgFetchService({ fetchImpl = fetch, timeoutMs }: CbgFetchServiceOptions): CbgFetchService {
    return {
        fetchDetail: async (url: string): Promise<unknown> => {
            const { serverid, ordersn } = parseDetailParams(url)
            const body = new URLSearchParams({ serverid, ordersn }).toString()
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
            let timeoutCleared = false
            const clearTimeoutSafe = () => {
                if (timeoutCleared) return
                clearTimeout(timeoutId)
                timeoutCleared = true
            }

            try {
                const response = await fetchImpl(CBG_DETAIL_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    },
                    body,
                    signal: controller.signal,
                })
                clearTimeoutSafe()

                if (!response.ok) {
                    throw new ReportError('CBG_REQUEST_FAILED', REQUEST_FAILED_MESSAGE)
                }

                try {
                    return await response.json()
                } catch {
                    throw new ReportError('CBG_REQUEST_FAILED', REQUEST_FAILED_MESSAGE)
                }
            } catch (error) {
                if (error instanceof ReportError) throw error
                throw new ReportError('CBG_REQUEST_FAILED', REQUEST_FAILED_MESSAGE)
            } finally {
                clearTimeoutSafe()
            }
        },
    }
}
