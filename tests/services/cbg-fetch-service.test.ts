import { describe, expect, it, vi } from 'vitest'
import cbgDetailFixture from '../fixtures/cbg-detail.fixture.json'
import { createCbgFetchService } from '../../src/services/cbg-fetch-service'

const validUrl = 'https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV'
const safeError = {
    code: 'CBG_REQUEST_FAILED',
    publicMessage: '藏宝阁请求失败，请稍后再试',
}

describe('cbg-fetch-service', () => {
    it('maps fetch rejection to safe report error', async () => {
        const fetchImpl = vi.fn(async (_url: RequestInfo | URL, _options?: RequestInit) => {
            throw new Error('network failure')
        })
        const service = createCbgFetchService({ fetchImpl, timeoutMs: 500 })

        await expect(service.fetchDetail(validUrl)).rejects.toMatchObject(safeError)
    })

    it('maps timeout to safe report error', async () => {
        vi.useFakeTimers()

        try {
            const fetchImpl = vi.fn((_url: RequestInfo | URL, options?: RequestInit) => {
                return new Promise<Response>((_resolve, reject) => {
                    const signal = options?.signal
                    if (signal?.aborted) {
                        const err = new Error('aborted')
                        err.name = 'AbortError'
                        reject(err)
                        return
                    }
                    signal?.addEventListener('abort', () => {
                        const err = new Error('aborted')
                        err.name = 'AbortError'
                        reject(err)
                    })
                })
            })
            const service = createCbgFetchService({ fetchImpl, timeoutMs: 10 })

            const promise = service.fetchDetail(validUrl)
            const expectation = expect(promise).rejects.toMatchObject(safeError)

            await vi.advanceTimersByTimeAsync(20)

            await expectation
        } finally {
            vi.useRealTimers()
        }
    })

    it('returns parsed payload on success', async () => {
        let capturedBody: string | undefined
        const fetchImpl = vi.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
            capturedBody = options?.body as string | undefined
            return new Response(JSON.stringify(cbgDetailFixture), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            })
        })
        const service = createCbgFetchService({ fetchImpl, timeoutMs: 500 })

        await expect(service.fetchDetail(validUrl)).resolves.toEqual(cbgDetailFixture)
        expect(capturedBody).toBe('serverid=9&ordersn=202603281001616-9-VLP4WCHMFPJMEV')
    })
})
