import { describe, expect, it, vi } from 'vitest'
import { createDynamicSubscriptionService } from '../../src/services/dynamic-subscription-service'
import { createTestPluginContext } from '../setup/test-plugin-context'

describe('dynamic-subscription-service', () => {
    it('adds, lists, and removes subscriptions by group', () => {
        const ctx = createTestPluginContext()
        const service = createDynamicSubscriptionService({
            dataPath: ctx.dataPath,
            dsFeedService: {
                fetchLatest: vi.fn(),
            },
        })

        const addFirst = service.addDsSubscription('12345', '1001')
        const addDuplicate = service.addDsSubscription('12345', '1001')
        const addSecondGroup = service.addDsSubscription('12345', '1002')

        expect(addFirst.created).toBe(true)
        expect(addDuplicate.groupAdded).toBe(false)
        expect(addSecondGroup.record.groups).toEqual(['1001', '1002'])
        expect(service.list()).toHaveLength(1)

        const removeOneGroup = service.removeSubscription({ uidOrNick: '12345', groupId: '1001' })
        expect(removeOneGroup.removed).toBe(true)
        expect(service.list()[0]?.groups).toEqual(['1002'])

        const removeLastGroup = service.removeSubscription({ uidOrNick: '12345', groupId: '1002' })
        expect(removeLastGroup.removedRecord).toBe(true)
        expect(service.list()).toEqual([])
    })

    it('polls the latest feed and dispatches message segments', async () => {
        const ctx = createTestPluginContext()
        const service = createDynamicSubscriptionService({
            dataPath: ctx.dataPath,
            dsFeedService: {
                fetchLatest: vi.fn().mockResolvedValue({
                    uid: '12345',
                    nickName: '大神昵称',
                    latestDynamicId: 'feed-1',
                    shouldReport: true,
                    reportContent: '大神昵称发布了新动态：\r\n测试内容\r\n链接：https://ds.163.com/feed/feed-1',
                    imageUrls: ['https://example.com/a.png'],
                }),
            },
        })

        service.addDsSubscription('12345', '1001')
        const dispatch = vi.fn().mockResolvedValue(true)

        const summary = await service.pollAndDispatch(dispatch)
        const records = service.list()

        expect(summary).toMatchObject({
            checkedCount: 1,
            pushedCount: 1,
        })
        expect(dispatch).toHaveBeenCalledWith('1001', [
            { type: 'text', data: { text: '大神昵称发布了新动态：\r\n测试内容\r\n链接：https://ds.163.com/feed/feed-1' } },
            { type: 'image', data: { file: 'https://example.com/a.png' } },
        ])
        expect(records[0]).toMatchObject({
            uid: '12345',
            nickName: '大神昵称',
            lastDynamicId: 'feed-1',
        })
    })
})
