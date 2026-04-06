import { describe, expect, it, vi } from 'vitest'
import type { BenchPosterViewModel } from '../../src/types'
import { createReportOrchestratorService } from '../../src/services/report-orchestrator-service'

function createViewModel(): BenchPosterViewModel {
    return {
        reportId: 'pending',
        sourceUrl: 'https://example.com',
        generatedAt: '2026-04-05T12:00:00.000Z',
        hero: {
            areaName: '中国区',
            serverName: '夏之蝉',
            equipName: '测试角色',
            priceText: '¥3888',
            statusText: '上架中',
            daysText: '3650 天',
        },
        highlights: [],
        resources: [],
        collection: {
            ownedSp: 0,
            totalSp: 0,
            ownedSsr: 0,
            totalSsr: 0,
            ownedCollab: 0,
            totalCollab: 0,
            ownedUr: 0,
            totalUr: 0,
            linkageSummary: [],
            skinSummary: [],
        },
        overview: {
            speedSummary: '',
            critSummary: '',
            inventorySummary: [],
            suitJudgements: [],
        },
        pve: {
            headers: ['土蜘蛛', '荒骷髅', '鬼灵歌伎', '平均值'],
            rows: [],
        },
        speed: {
            sections: [
                { title: '散件一速', rows: [] },
                { title: '散件命中一速', rows: [] },
                { title: '散件抵抗一速', rows: [] },
                { title: '套装一速', rows: [] },
            ],
            fullSpeedPreview: [],
        },
        warnings: [],
    }
}

describe('report-orchestrator-service', () => {
    it('returns report metadata after fetch, analyze, render, and store succeed', async () => {
        const fetchDetail = vi.fn().mockResolvedValue({ equip: { equip_name: '测试角色' } })
        const analyzer = vi.fn().mockReturnValue(createViewModel())
        const renderHtml = vi.fn().mockReturnValue('<html></html>')
        const renderToPng = vi.fn().mockResolvedValue(undefined)
        const writeFile = vi.fn().mockResolvedValue(undefined)
        const ensureDirs = vi.fn()
        const createReportPaths = vi.fn().mockReturnValue({
            reportId: 'r1',
            imagePath: 'D:/tmp/r1.png',
            htmlPath: 'D:/tmp/r1.html',
            imageUrl: '/plugin/yys/files/static/reports/images/r1.png',
        })

        const service = createReportOrchestratorService({
            fetchService: { fetchDetail },
            analyzer,
            storage: { ensureDirs, createReportPaths },
            renderer: { renderHtml, renderToPng },
            writeFile,
        })

        await expect(
            service.generateReport(
                'https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV',
                '123'
            )
        ).resolves.toEqual({
            reportId: 'r1',
            imagePath: 'D:/tmp/r1.png',
            imageUrl: '/plugin/yys/files/static/reports/images/r1.png',
            summary: '夏之蝉 · 测试角色',
            generatedAt: '2026-04-05T12:00:00.000Z',
        })

        expect(ensureDirs).toHaveBeenCalled()
        expect(fetchDetail).toHaveBeenCalled()
        expect(analyzer).toHaveBeenCalled()
        expect(writeFile).toHaveBeenCalledWith('D:/tmp/r1.html', '<html></html>', 'utf-8')
        expect(renderToPng).toHaveBeenCalledWith('<html></html>', 'D:/tmp/r1.png')
    })
})
