import os from 'os'
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
    renderServiceEndpoint: 'http://127.0.0.1:6099/plugin/napcat-plugin-puppeteer/api/render',
    reportRetentionHours: 72,
    maxRecentReports: 20,
    dynamicSubscriptionsEnabled: true,
    dynamicPollingIntervalMinutes: 2,
    dynamicMaxReportAgeMs: 60 * 60 * 1000,
    dynamicDsBaseUrl: 'https://inf.ds.163.com/v1/web/feed/basic/getSomeOneFeeds?feedTypes=1,2,3,6&someOneUid=',
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
        ownedSp: 1,
        totalSp: 1,
        ownedSsr: 2,
        totalSsr: 2,
        ownedCollab: 0,
        totalCollab: 0,
        ownedUr: 0,
        totalUr: 0,
        linkageSummary: ['联动1'],
        skinSummary: ['皮肤1'],
    },
    overview: {
        speedSummary: '速度',
        critSummary: '暴击',
        inventorySummary: ['数量'],
        suitJudgements: ['套装'],
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

const createTempBaseDir = (): string => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    return path.join(os.tmpdir(), 'napcat-plugin-yys-cbg-bench', `test-${suffix}`)
}

export function createTestPluginContext(overrides: Partial<NapCatPluginContext> = {}): NapCatPluginContext {
    const baseDir = createTempBaseDir()
    const base: NapCatPluginContext = {
        pluginName: 'yys-cbg-bench',
        dataPath: path.join(baseDir, 'data'),
        configPath: path.join(baseDir, 'config.json'),
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
