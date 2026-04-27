import { afterEach, describe, expect, it, vi } from 'vitest'
import { pluginState } from '../../src/core/state'
import { registerApiRoutes } from '../../src/services/api-service'
import { createTestPluginContext } from '../setup/test-plugin-context'

function createResponseRecorder() {
    return {
        statusCode: 200,
        body: undefined as unknown,
        status(code: number) {
            this.statusCode = code
            return this
        },
        json(data: unknown) {
            this.body = data
        },
        send(data: string | Buffer) {
            this.body = data
        },
        setHeader() {
            return this
        },
        sendFile(filePath: string) {
            this.body = filePath
        },
        redirect(url: string) {
            this.body = url
        },
    }
}

describe('api-service', () => {
    afterEach(() => {
        pluginState.cleanup()
    })

    it('registers status, reports, and cleanup endpoints with report data', async () => {
        const ctx = createTestPluginContext()
        pluginState.init(ctx)
        pluginState.setReports([
            {
                reportId: 'r1',
                sourceUrl: 'https://example.com',
                groupId: '123',
                imageUrl: '/plugin/yys/files/static/reports/images/r1.png',
                generatedAt: '2026-04-05T12:00:00.000Z',
                status: 'success',
                summary: '夏之蝉 · 测试角色',
            },
        ])
        pluginState.appendRecentError('海报生成失败，请稍后再试')
        pluginState.setRuntimeServices({
            reportStorage: {
                ensureDirs: vi.fn(),
                createReportPaths: vi.fn(),
                filterExpiredReports: vi.fn().mockReturnValue([]),
            },
        })

        registerApiRoutes(ctx)

        const getRoutes = (ctx.router.getNoAuth as ReturnType<typeof vi.fn>).mock.calls
        const postRoutes = (ctx.router.postNoAuth as ReturnType<typeof vi.fn>).mock.calls

        const statusHandler = getRoutes.find(([path]) => path === '/status')?.[1]
        const reportsHandler = getRoutes.find(([path]) => path === '/reports')?.[1]
        const cleanupHandler = postRoutes.find(([path]) => path === '/reports/cleanup')?.[1]

        expect(statusHandler).toBeTypeOf('function')
        expect(reportsHandler).toBeTypeOf('function')
        expect(cleanupHandler).toBeTypeOf('function')

        const statusRes = createResponseRecorder()
        await statusHandler?.({}, statusRes as any)
        expect(statusRes.body).toMatchObject({
            code: 0,
            data: {
                reports: [
                    expect.objectContaining({
                        reportId: 'r1',
                        summary: '夏之蝉 · 测试角色',
                    }),
                ],
                recentErrors: ['海报生成失败，请稍后再试'],
            },
        })

        const reportsRes = createResponseRecorder()
        await reportsHandler?.({}, reportsRes as any)
        expect(reportsRes.body).toMatchObject({
            code: 0,
            data: [
                expect.objectContaining({
                    reportId: 'r1',
                }),
            ],
        })

        const cleanupRes = createResponseRecorder()
        await cleanupHandler?.({}, cleanupRes as any)
        expect(cleanupRes.body).toMatchObject({ code: 0, message: 'ok' })
        expect(pluginState.reports).toEqual([])
    })

    it('registers dynamic subscription endpoints', async () => {
        const ctx = createTestPluginContext()
        pluginState.init(ctx)
        pluginState.setRuntimeServices({
            dynamicSubscriptionService: {
                list: vi.fn().mockReturnValue([
                    {
                        uid: '12345',
                        platform: 'ds',
                        groups: ['1001'],
                        lastDynamicId: 'feed-1',
                    },
                ]),
                addDsSubscription: vi.fn().mockReturnValue({
                    created: true,
                    groupAdded: true,
                    record: {
                        uid: '12345',
                        platform: 'ds',
                        groups: ['1001'],
                        lastDynamicId: null,
                    },
                }),
                removeSubscription: vi.fn().mockReturnValue({
                    removed: true,
                    removedRecord: false,
                    record: {
                        uid: '12345',
                        platform: 'ds',
                        groups: [],
                        lastDynamicId: null,
                    },
                }),
                pollAndDispatch: vi.fn().mockResolvedValue({
                    checkedCount: 1,
                    pushedCount: 1,
                    updatedCount: 1,
                }),
            },
        })

        registerApiRoutes(ctx)

        const getRoutes = (ctx.router.getNoAuth as ReturnType<typeof vi.fn>).mock.calls
        const postRoutes = (ctx.router.postNoAuth as ReturnType<typeof vi.fn>).mock.calls

        const listHandler = getRoutes.find(([path]) => path === '/dynamic/subscriptions')?.[1]
        const addHandler = postRoutes.find(([path]) => path === '/dynamic/subscriptions')?.[1]
        const removeHandler = postRoutes.find(([path]) => path === '/dynamic/subscriptions/remove')?.[1]
        const pollHandler = postRoutes.find(([path]) => path === '/dynamic/subscriptions/poll')?.[1]

        const listRes = createResponseRecorder()
        await listHandler?.({}, listRes as any)
        expect(listRes.body).toMatchObject({
            code: 0,
            data: [expect.objectContaining({ uid: '12345' })],
        })

        const addRes = createResponseRecorder()
        await addHandler?.({ body: { uid: '12345', groupId: '1001' } }, addRes as any)
        expect(addRes.body).toMatchObject({
            code: 0,
            data: expect.objectContaining({ uid: '12345' }),
        })

        const removeRes = createResponseRecorder()
        await removeHandler?.({ body: { uidOrNick: '12345', groupId: '1001' } }, removeRes as any)
        expect(removeRes.body).toMatchObject({ code: 0, message: 'ok' })

        const pollRes = createResponseRecorder()
        await pollHandler?.({}, pollRes as any)
        expect(pollRes.body).toMatchObject({
            code: 0,
            data: {
                checkedCount: 1,
                pushedCount: 1,
                updatedCount: 1,
            },
        })
    })
})
