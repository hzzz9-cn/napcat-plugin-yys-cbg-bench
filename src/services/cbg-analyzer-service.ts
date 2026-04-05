import type { BenchPosterViewModel } from '../types'

function resolveReportId(sourceUrl: string): string {
    const extractTail = (value: string): string | null => {
        const parts = value.split('/').filter(Boolean)
        return parts.length > 0 ? parts[parts.length - 1] : null
    }

    if (sourceUrl) {
        try {
            const parsed = new URL(sourceUrl)
            const candidate = extractTail(parsed.pathname)
            if (candidate) return candidate
        } catch {
            const candidate = extractTail(sourceUrl)
            if (candidate) return candidate
        }
    }

    return `r-${Date.now()}`
}

export function analyzeCbgDetail(data: any, sourceUrl: string): BenchPosterViewModel {
    const hasEquip = Boolean(data?.equip)
    const equip = data?.equip ?? {}
    const detail = equip.detail ?? {}
    const heroes = equip.heroes ?? {}
    const skins = equip.skins ?? {}
    const yuhun = equip.yuhun ?? {}
    const speed = yuhun.speed ?? {}
    const crit = yuhun.crit ?? {}
    const inventory = yuhun.inventory ?? {}

    const warnings: string[] = []
    if (!hasEquip) warnings.push('缺少账号信息')

    const ensureKeyField = (value: unknown, label: string) => {
        if (value == null || value === '') {
            warnings.push(`缺少${label}`)
        }
    }

    ensureKeyField(equip.area_name, '大区信息')
    ensureKeyField(equip.server_name, '服务器信息')
    ensureKeyField(equip.equip_name, '账号名')
    ensureKeyField(equip.price, '价格')

    const priceRaw = equip.price ?? ''
    const hasPrice = priceRaw !== ''
    const priceText = hasPrice ? `¥${priceRaw}` : '¥0'

    const resources: Array<{ label: string; value: string }> = []
    if (detail.power != null) {
        resources.push({ label: '战力', value: String(detail.power) })
    }
    if (detail.level != null) {
        resources.push({ label: '等级', value: String(detail.level) })
    }
    if (heroes.sp != null || heroes.ssr != null) {
        resources.push({ label: 'SP/SSR', value: `${heroes.sp ?? 0}/${heroes.ssr ?? 0}` })
    }
    if (inventory.total != null) {
        resources.push({ label: '御魂库存', value: String(inventory.total) })
    }

    const highlights: string[] = []
    if (speed.best != null) {
        const suitText = speed.suit ? `(${speed.suit})` : ''
        highlights.push(`速度 ${speed.best}${suitText}`)
    }
    if (crit.best != null) {
        highlights.push(`暴击 ${crit.best}`)
    }

    const inventorySummary: string[] = [`御魂总数 ${inventory.total ?? 0}`]
    const suitJudgements: string[] = speed.suit ? [`速度套装: ${speed.suit}`] : []

    return {
        reportId: resolveReportId(sourceUrl),
        sourceUrl,
        generatedAt: new Date().toISOString(),
        hero: {
            areaName: String(equip.area_name ?? ''),
            serverName: String(equip.server_name ?? ''),
            equipName: String(equip.equip_name ?? ''),
            priceText,
            statusText: String(equip.status ?? ''),
            daysText: '',
        },
        highlights,
        resources,
        collection: {
            missingSp: 0,
            missingSsr: 0,
            linkageSummary: Array.isArray(heroes.collections)
                ? heroes.collections.filter(
                      (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0
                  )
                : [],
            skinSummary: [
                ...(skins.sp != null ? [`SP皮肤 ${skins.sp}`] : []),
                ...(skins.ssr != null ? [`SSR皮肤 ${skins.ssr}`] : []),
                ...(skins.sr != null ? [`SR皮肤 ${skins.sr}`] : []),
            ],
        },
        yuhun: {
            speedSummary: speed.best != null ? `速度 ${speed.best}` : '',
            critSummary: crit.best != null ? `暴击 ${crit.best}` : '',
            inventorySummary,
            suitJudgements,
        },
        warnings,
    }
}
