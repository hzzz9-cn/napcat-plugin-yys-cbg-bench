import path from 'path'
import { vi } from 'vitest'
import type { NapCatConfigBuilder, NapCatPluginContext, PluginLogger, PluginRouter } from '../../src/napcat-shim'
import type { PluginConfig, ReportListItem, BenchPosterViewModel } from '../../src/types'
import type { PluginStatus } from '../../src/webui/src/types'

const _typecheckConfig: PluginConfig = {
    enabled: true,
    debug: false,
    commandPrefix: '#bench',
    cooldownSeconds: 0,
    autoParseLinks: true,
    requestTimeoutMs: 15000,
    maxRenderMs: 30000,
    reportRetentionHours: 72,
    maxRecentReports: 20,
    groupConfigs: {},
}

const _typecheckReport: ReportListItem = {
    reportId: 'r-1',
    sourceUrl: 'https://example.com',
    groupId: '123',
    imageUrl: 'https://example.com/img.png',
    generatedAt: new Date().toISOString(),
    status: 'success',
    summary: 'ok',
}

const _typecheckViewModel: BenchPosterViewModel = {
    reportId: 'r-1',
    sourceUrl: 'https://example.com',
    generatedAt: new Date().toISOString(),
    hero: {
        areaName: '大区',
        serverName: '服务器',
        equipName: '御魂',
        priceText: '¥100',
        statusText: '在售',
        daysText: '3天',
    },
    highlights: ['亮点1'],
    resources: [{ label: '资源', value: '值' }],
    collection: {
        missingSp: 1,
        missingSsr: 2,
        linkageSummary: ['联动1'],
        skinSummary: ['皮肤1'],
    },
    yuhun: {
        speedSummary: '速度',
        critSummary: '暴击',
        inventorySummary: ['数量'],
        suitJudgements: ['套装'],
    },
    warnings: ['注意事项'],
}

const _typecheckStatus: PluginStatus = {
    pluginName: 'yys-cbg-bench',
    uptime: 0,
    uptimeFormatted: '0秒',
    config: _typecheckConfig,
    stats: {
        processed: 0,
        todayProcessed: 0,
        lastUpdateDay: new Date().toDateString(),
    },
    reports: [_typecheckReport],
    recentErrors: [],
}

void _typecheckConfig
void _typecheckReport
void _typecheckViewModel
void _typecheckStatus

const createLogger = (): PluginLogger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
})

const createRouter = (): PluginRouter => ({
    getNoAuth: vi.fn(),
    postNoAuth: vi.fn(),
    static: vi.fn(),
    page: vi.fn(),
})

const createNapCatConfig = (): NapCatConfigBuilder => ({
    combine: (...items) => items,
    html: (content) => ({ type: 'html', description: content }),
    boolean: (key, label, defaultValue, description, reactive) => ({
        key,
        type: 'boolean',
        label,
        default: defaultValue,
        description,
        reactive,
    }),
    text: (key, label, defaultValue, description, reactive) => ({
        key,
        type: 'text',
        label,
        default: defaultValue,
        description,
        reactive,
    }),
    number: (key, label, defaultValue, description, reactive) => ({
        key,
        type: 'number',
        label,
        default: defaultValue,
        description,
        reactive,
    }),
})

export function createTestPluginContext(overrides: Record<string, unknown> = {}): NapCatPluginContext {
    const base: NapCatPluginContext = {
        pluginName: 'yys-cbg-bench',
        dataPath: path.join(process.cwd(), '.test-data'),
        configPath: path.join(process.cwd(), '.test-config.json'),
        adapterName: 'test-adapter',
        pluginManager: { config: {} },
        logger: createLogger(),
        router: createRouter(),
        NapCatConfig: createNapCatConfig(),
        actions: {
            call: vi.fn(async () => ({})),
        },
    }

    return { ...base, ...overrides } as NapCatPluginContext
}
