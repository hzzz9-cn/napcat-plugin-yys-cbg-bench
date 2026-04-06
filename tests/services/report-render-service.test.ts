import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
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
            ownedSp: 0,
            totalSp: 0,
            ownedSsr: 2,
            totalSsr: 2,
            ownedCollab: 1,
            totalCollab: 2,
            ownedUr: 1,
            totalUr: 1,
            linkageSummary: ['鬼灭之刃联动完整'],
            skinSummary: ['典藏皮肤 7'],
        },
        overview: overrides.overview ?? {
            speedSummary: '散一速 +156.4',
            critSummary: '高分暴击 18',
            inventorySummary: ['御魂总数 1423'],
            suitJudgements: ['困28 超星玉藻前：可做'],
        },
        pve: overrides.pve ?? {
            headers: ['土蜘蛛', '荒骷髅', '鬼灵歌伎', '平均值'],
            rows: [
                {
                    soulName: '狂荒歌土',
                    values: [
                        { heroName: '缘结神', metricText: '18.6w' },
                        { heroName: '丑时之女', metricText: '19.2w' },
                        { heroName: '不见岳', metricText: '17.8w' },
                        { heroName: '均值', metricText: '18.5w' },
                    ],
                },
            ],
        },
        speed: overrides.speed ?? {
            sections: [
                {
                    title: '散件一速',
                    rows: [{ label: '招财速散', totalText: '+156.4', slotTexts: ['16', '57', '15', '14', '13', '12'] }],
                },
                {
                    title: '散件命中一速',
                    rows: [{ label: '命中散件', totalText: '+152.3', slotTexts: ['15', '57', '14', '13', '12', '11'], extraText: '命中 146%' }],
                },
                {
                    title: '散件抵抗一速',
                    rows: [{ label: '抵抗散件', totalText: '+150.1', slotTexts: ['14', '57', '13', '12', '11', '10'], extraText: '抵抗 152%' }],
                },
                {
                    title: '套装一速',
                    rows: [{ label: '招财猫', totalText: '+148.8', slotTexts: ['14', '57', '13', '12', '11', '9'] }],
                },
            ],
            fullSpeedPreview: [
                {
                    position: 1,
                    count: 2,
                    rows: [
                        { label: '散件一速', speedText: '17.00' },
                        { label: '火灵', speedText: '16.69' },
                    ],
                },
            ],
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

    it('renders real poster template with new schema consumption and no warning branding block', async () => {
        const templateHtml = readFileSync(path.resolve(process.cwd(), 'templates/report-poster.html'), 'utf-8')
        const service = createReportRenderService({
            templateHtml,
            launchBrowser: vi.fn(),
        })

        const html = service.renderHtml(createViewModel())

        expect(html).toContain('data.collection.ownedSp')
        expect(html).toContain('data.collection.totalSp')
        expect(html).toContain('data.collection.ownedSsr')
        expect(html).toContain('data.collection.totalSsr')
        expect(html).toContain('data.collection.ownedCollab')
        expect(html).toContain('data.collection.ownedUr')
        expect(html).toContain('data.overview.speedSummary')
        expect(html).toContain('data.pve.headers')
        expect(html).toContain('data.speed.sections')
        expect(html).toContain('data.speed.fullSpeedPreview')
        expect(html).toContain('"ownedSp":0')
        expect(html).toContain('"totalSp":0')
        expect(html).toContain('"ownedSsr":2')
        expect(html).toContain('"ownedCollab":1')
        expect(html).toContain('"ownedUr":1')
        expect(html).toContain('须佐之男面板估算预览')
        expect(html).toContain('一速预览')
        expect(html).toContain('各位置满速情况')
        expect(html).toContain('.full-speed-values {')
        expect(html).toContain('color: rgba(255, 244, 214, 0.96);')
        expect(html).toContain('font-weight: 700;')
        expect(html).not.toContain('data.collection.missingSp')
        expect(html).not.toContain('data.collection.missingSsr')
        expect(html).not.toContain('data.yuhun')
        expect(html).not.toContain('data.warnings')
        expect(html).not.toContain('注意事项')
        expect(html).not.toContain('NapCat')
    })
})
