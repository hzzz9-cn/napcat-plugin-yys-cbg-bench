import fs from 'fs/promises'
import type { BenchPosterViewModel } from '../types'
import type { ReportPaths, ReportStorageService } from './report-storage-service'

interface FetchService {
    fetchDetail: (url: string) => Promise<unknown>
}

interface RenderService {
    renderHtml: (viewModel: BenchPosterViewModel) => string
    renderToPng: (html: string, outputPath: string) => Promise<void>
}

type Analyzer = (detail: unknown, sourceUrl: string) => BenchPosterViewModel

interface ReportMetadata {
    reportId: string
    imageUrl: string
    summary: string
    generatedAt: string
}

export interface ReportOrchestratorService {
    generateReport: (sourceUrl: string, groupId: string) => Promise<ReportMetadata>
}

export interface ReportOrchestratorServiceOptions {
    fetchService: FetchService
    analyzer: Analyzer
    storage: Pick<ReportStorageService, 'ensureDirs' | 'createReportPaths'>
    renderer: RenderService
    writeFile?: typeof fs.writeFile
}

function buildSummary(viewModel: BenchPosterViewModel): string {
    const serverName = viewModel.hero.serverName.trim()
    const equipName = viewModel.hero.equipName.trim()
    if (serverName && equipName) {
        return `${serverName} · ${equipName}`
    }
    return equipName || serverName || '藏宝阁分析报告'
}

function applyReportIdentity(viewModel: BenchPosterViewModel, paths: ReportPaths): BenchPosterViewModel {
    return {
        ...viewModel,
        reportId: paths.reportId,
    }
}

export function createReportOrchestratorService({
    fetchService,
    analyzer,
    storage,
    renderer,
    writeFile = fs.writeFile,
}: ReportOrchestratorServiceOptions): ReportOrchestratorService {
    return {
        async generateReport(sourceUrl: string, groupId: string): Promise<ReportMetadata> {
            storage.ensureDirs()

            const detail = await fetchService.fetchDetail(sourceUrl)
            const paths = storage.createReportPaths(groupId)
            const viewModel = applyReportIdentity(analyzer(detail, sourceUrl), paths)
            const html = renderer.renderHtml(viewModel)

            await writeFile(paths.htmlPath, html, 'utf-8')
            await renderer.renderToPng(html, paths.imagePath)

            return {
                reportId: paths.reportId,
                imageUrl: paths.imageUrl,
                summary: buildSummary(viewModel),
                generatedAt: viewModel.generatedAt,
            }
        },
    }
}
