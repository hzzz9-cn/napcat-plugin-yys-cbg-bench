import fs from 'fs/promises'
import type { BenchPosterViewModel } from '../types'

const DEFAULT_RENDER_TIMEOUT_MS = 15000

interface RenderApiResponse {
    code: number
    data?: unknown
    message?: string
}

type FetchLike = typeof fetch

export interface ReportRenderService {
    renderHtml: (viewModel: BenchPosterViewModel) => string
    renderToPng: (html: string, outputPath: string) => Promise<void>
}

export interface ReportRenderServiceOptions {
    templateHtml: string
    renderEndpoint: string
    requestTimeoutMs?: number
    fetchImpl?: FetchLike
    writeFile?: typeof fs.writeFile
}

function serializeForInlineScript(viewModel: BenchPosterViewModel): string {
    return JSON.stringify(viewModel)
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
}

function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timer),
    }
}

function extractBase64Image(data: unknown): string {
    if (typeof data === 'string' && data.trim()) {
        return data
    }

    if (Array.isArray(data) && typeof data[0] === 'string' && data[0].trim()) {
        return data[0]
    }

    throw new Error('截图服务未返回有效图片数据')
}

function buildRenderErrorMessage(result: RenderApiResponse): string {
    const message = typeof result.message === 'string' && result.message.trim()
        ? result.message.trim()
        : '未知错误'
    return `截图服务返回错误: ${message}`
}

export function createReportRenderService({
    templateHtml,
    renderEndpoint,
    requestTimeoutMs = DEFAULT_RENDER_TIMEOUT_MS,
    fetchImpl = fetch,
    writeFile = fs.writeFile,
}: ReportRenderServiceOptions): ReportRenderService {
    const renderHtml = (viewModel: BenchPosterViewModel): string => {
        return templateHtml.replace('__REPORT_JSON__', serializeForInlineScript(viewModel))
    }

    const renderToPng = async (html: string, outputPath: string): Promise<void> => {
        const { signal, cleanup } = createTimeoutSignal(requestTimeoutMs)

        try {
            const response = await fetchImpl(renderEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html,
                    encoding: 'base64',
                    fullPage: true,
                    type: 'png',
                    pageGotoParams: {
                        waitUntil: 'networkidle0',
                        timeout: requestTimeoutMs,
                    },
                }),
                signal,
            })

            const result = await response.json() as RenderApiResponse

            if (!response.ok) {
                throw new Error(buildRenderErrorMessage(result))
            }

            if (result.code !== 0) {
                throw new Error(buildRenderErrorMessage(result))
            }

            const imageBytes = Buffer.from(extractBase64Image(result.data), 'base64')
            await writeFile(outputPath, imageBytes)
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`截图服务请求超时: ${requestTimeoutMs}ms`)
            }

            if (error instanceof Error) {
                throw error
            }

            throw new Error('截图服务请求失败')
        } finally {
            cleanup()
        }
    }

    return {
        renderHtml,
        renderToPng,
    }
}
