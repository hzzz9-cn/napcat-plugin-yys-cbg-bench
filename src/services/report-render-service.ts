import { chromium } from 'playwright'
import type { BenchPosterViewModel } from '../types'

interface BrowserPageLike {
    setContent: (html: string, options: { waitUntil: 'networkidle' }) => Promise<unknown>
    screenshot: (options: { path: string; fullPage: boolean }) => Promise<unknown>
}

interface BrowserLike {
    newPage: () => Promise<BrowserPageLike>
    close: () => Promise<unknown>
}

type LaunchBrowser = (options: { headless: boolean }) => Promise<BrowserLike>

export interface ReportRenderService {
    renderHtml: (viewModel: BenchPosterViewModel) => string
    renderToPng: (html: string, outputPath: string) => Promise<void>
}

export interface ReportRenderServiceOptions {
    templateHtml: string
    launchBrowser?: LaunchBrowser
}

function serializeForInlineScript(viewModel: BenchPosterViewModel): string {
    return JSON.stringify(viewModel)
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
}

export function createReportRenderService({
    templateHtml,
    launchBrowser = ((options) => chromium.launch(options)) as LaunchBrowser,
}: ReportRenderServiceOptions): ReportRenderService {
    const renderHtml = (viewModel: BenchPosterViewModel): string => {
        return templateHtml.replace('__REPORT_JSON__', serializeForInlineScript(viewModel))
    }

    const renderToPng = async (html: string, outputPath: string): Promise<void> => {
        const browser = await launchBrowser({ headless: true })

        try {
            const page = await browser.newPage()
            await page.setContent(html, { waitUntil: 'networkidle' })
            await page.screenshot({ path: outputPath, fullPage: true })
        } finally {
            await browser.close()
        }
    }

    return {
        renderHtml,
        renderToPng,
    }
}
