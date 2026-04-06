import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pluginState } from '../../src/core/state'
import { handleMessage } from '../../src/handlers/message-handler'
import { ReportError } from '../../src/services/report-error'
import { createTestPluginContext } from '../setup/test-plugin-context'

describe('message-handler', () => {
    beforeEach(() => {
        vi.useRealTimers()
    })

    afterEach(() => {
        pluginState.cleanup()
    })

    it('replies with processing text then image when a valid link appears in a group message', async () => {
        const ctx = createTestPluginContext()
        pluginState.init(ctx)
        pluginState.updateConfig({
            enabled: true,
            autoParseLinks: true,
            cooldownSeconds: 0,
            groupConfigs: {},
        })
        pluginState.setRuntimeServices({
            reportOrchestrator: {
                generateReport: vi.fn().mockResolvedValue({
                    reportId: 'r1',
                    imageUrl: '/plugin/yys/files/static/reports/images/r1.png',
                    summary: '夏之蝉 · 测试角色',
                    generatedAt: '2026-04-05T12:00:00.000Z',
                }),
            },
        })

        await handleMessage(ctx, {
            post_type: 'message',
            raw_message: '看这个 https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV',
            message_type: 'group',
            group_id: 123,
            user_id: 456,
            sender: { role: 'member' },
        })

        const sendCalls = (ctx.actions.call as ReturnType<typeof vi.fn>).mock.calls.filter(
            ([action]) => action === 'send_msg'
        )

        expect(sendCalls).toHaveLength(2)
        expect(sendCalls[0]?.[1]).toMatchObject({
            message: '正在分析这条藏宝阁链接，请稍等',
            message_type: 'group',
            group_id: '123',
        })
        expect(sendCalls[1]?.[1]).toMatchObject({
            message_type: 'group',
            group_id: '123',
        })
        expect(sendCalls[1]?.[1]).toMatchObject({
            message: [
                { type: 'text', data: { text: '夏之蝉 · 测试角色' } },
                { type: 'image', data: { file: '/plugin/yys/files/static/reports/images/r1.png' } },
            ],
        })
        expect(pluginState.stats.processed).toBe(1)
        expect(pluginState.reports[0]).toMatchObject({
            reportId: 'r1',
            groupId: '123',
            summary: '夏之蝉 · 测试角色',
            imageUrl: '/plugin/yys/files/static/reports/images/r1.png',
            status: 'success',
        })
    })

    it('replies with a safe error message when report generation fails', async () => {
        const ctx = createTestPluginContext()
        pluginState.init(ctx)
        pluginState.updateConfig({
            enabled: true,
            autoParseLinks: true,
            cooldownSeconds: 0,
            groupConfigs: {},
        })
        pluginState.setRuntimeServices({
            reportOrchestrator: {
                generateReport: vi.fn().mockRejectedValue(
                    new ReportError('RENDER_FAILED', '海报生成失败，请稍后再试')
                ),
            },
        })

        await handleMessage(ctx, {
            post_type: 'message',
            raw_message: '看这个 https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV',
            message_type: 'group',
            group_id: 123,
            user_id: 456,
            sender: { role: 'member' },
        })

        const sendCalls = (ctx.actions.call as ReturnType<typeof vi.fn>).mock.calls.filter(
            ([action]) => action === 'send_msg'
        )

        expect(sendCalls).toHaveLength(2)
        expect(sendCalls[1]?.[1]).toMatchObject({
            message: '分析失败：海报生成失败，请稍后再试',
            message_type: 'group',
            group_id: '123',
        })
        expect(String(sendCalls[1]?.[1])).not.toContain('D:\\')
        expect(pluginState.recentErrors[0]).toBe('海报生成失败，请稍后再试')
    })

    it('returns early when no valid cbg link is present', async () => {
        const ctx = createTestPluginContext()
        pluginState.init(ctx)
        pluginState.updateConfig({
            enabled: true,
            autoParseLinks: true,
            cooldownSeconds: 0,
            groupConfigs: {},
        })

        await handleMessage(ctx, {
            post_type: 'message',
            raw_message: '这是一条普通消息',
            message_type: 'group',
            group_id: 123,
            user_id: 456,
            sender: { role: 'member' },
        })

        const sendCalls = (ctx.actions.call as ReturnType<typeof vi.fn>).mock.calls.filter(
            ([action]) => action === 'send_msg'
        )
        expect(sendCalls).toHaveLength(0)
    })
})
