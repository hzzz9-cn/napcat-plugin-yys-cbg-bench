import { describe, expect, it, vi } from 'vitest'
import type { BenchPosterViewModel } from '../../src/types'
import { createReportRenderService } from '../../src/services/report-render-service'

function createViewModel(overrides: Partial<BenchPosterViewModel> = {}): BenchPosterViewModel {
    return {
        reportId: overrides.reportId ?? 'r1',
        sourceUrl: overrides.sourceUrl ?? 'https://example.com',
        generatedAt: overrides.generatedAt ?? '2026-04-05T12:00:00.000Z',
        hero: overrides.hero ?? {
            areaName: '中国区',
            serverName: '夏之蝉',
            equipName: '测试角色',
            priceText: '¥3888',
            statusText: '上架中',
            daysText: '3650 天',
        },
        highlights: overrides.highlights ?? ['六星满速散件可用'],
        resources: overrides.resources ?? [{ label: '勾玉', value: '6480' }],
        collection: overrides.collection ?? {
            missingSp: 0,
            missingSsr: 2,
            linkageSummary: ['鬼灭之刃联动完整'],
            skinSummary: ['典藏皮肤 7'],
        },
        yuhun: overrides.yuhun ?? {
            speedSummary: '散一速 +156.4',
            critSummary: '高分暴击 18',
            inventorySummary: ['御魂总数 1423'],
            suitJudgements: ['困28 超星玉藻前：可做'],
        },
        warnings: overrides.warnings ?? [],
    }
}

describe('report-render-service', () => {
    it('injects the poster view model into html output', () => {
        const service = createReportRenderService({
            templateHtml: '<html><body><script id="report-data" type="application/json">__REPORT_JSON__</script></body></html>',
            launchBrowser: vi.fn(),
        })

        const html = service.renderHtml(createViewModel())

        expect(html).toContain('"equipName":"测试角色"')
        expect(html).not.toContain('__REPORT_JSON__')
    })

    it('escapes script-breaking content inside injected json', () => {
        const service = createReportRenderService({
            templateHtml: '<html><body><script id="report-data" type="application/json">__REPORT_JSON__</script></body></html>',
            launchBrowser: vi.fn(),
        })

        const html = service.renderHtml(createViewModel({
            hero: {
                areaName: '中国区',
                serverName: '夏之蝉',
                equipName: '</script><div>bad</div>',
                priceText: '¥3888',
                statusText: '上架中',
                daysText: '3650 天',
            },
        }))

        expect(html).toContain('\\u003C/script\\u003E\\u003Cdiv\\u003Ebad\\u003C/div\\u003E')
    })

    it('calls screenshot pipeline with the generated html', async () => {
        const screenshot = vi.fn()
        const close = vi.fn()
        const setContent = vi.fn()
        const newPage = vi.fn().mockResolvedValue({ setContent, screenshot })
        const service = createReportRenderService({
            templateHtml: '<html><body><script id="report-data" type="application/json">__REPORT_JSON__</script></body></html>',
            launchBrowser: vi.fn().mockResolvedValue({ newPage, close }),
        })

        await service.renderToPng('<html></html>', 'D:/tmp/report.png')

        expect(newPage).toHaveBeenCalled()
        expect(setContent).toHaveBeenCalledWith('<html></html>', { waitUntil: 'networkidle' })
        expect(screenshot).toHaveBeenCalledWith({ path: 'D:/tmp/report.png', fullPage: true })
        expect(close).toHaveBeenCalled()
    })
})
