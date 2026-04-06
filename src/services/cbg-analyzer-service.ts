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

function isRecord(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseEquipDesc(rawValue: unknown): Record<string, any> {
    if (typeof rawValue !== 'string' || !rawValue.trim()) {
        return {}
    }

    try {
        const parsed = JSON.parse(rawValue)
        return isRecord(parsed) ? parsed : {}
    } catch {
        return {}
    }
}

function toNumeric(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string') {
        const normalized = value.replace(/[^\d.-]/g, '')
        if (!normalized) {
            return null
        }

        const parsed = Number(normalized)
        return Number.isFinite(parsed) ? parsed : null
    }

    return null
}

function formatNumber(value: unknown): string {
    const number = toNumeric(value)
    if (number == null) {
        return '0'
    }

    return String(number)
}

function formatPrice(value: unknown): string {
    const number = toNumeric(value)
    if (number == null) {
        return '¥0'
    }

    const yuan = number / 100
    const text = Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2).replace(/\.?0+$/, '')
    return `¥${text}`
}

function formatPlainNumber(value: unknown): string {
    const number = toNumeric(value)
    if (number == null) {
        return '0'
    }

    return String(number)
}

function normalizeStatus(value: unknown): string {
    if (value === 2 || value === 'public') return '上架中'
    if (value === 6 || value === 'sold_out') return '已售出'
    if (value == null || value === '') return ''
    return String(value)
}

function uniqueStrings(items: Array<unknown>): string[] {
    const seen = new Set<string>()
    const output: string[] = []

    for (const item of items) {
        if (typeof item !== 'string') continue
        const text = item.trim()
        if (!text || seen.has(text)) continue
        seen.add(text)
        output.push(text)
    }

    return output
}

function countHeroRarity(heroes: Record<string, any>, rarity: number): number {
    return Object.values(heroes).filter((hero) => isRecord(hero) && hero.rarity === rarity).length
}

function readCollectionProgress(value: unknown): { got: number; total: number } | null {
    if (!isRecord(value)) {
        return null
    }

    const got = toNumeric(value.got)
    const total = toNumeric(value.all)
    if (got == null || total == null) {
        return null
    }

    return {
        got: Math.max(0, got),
        total: Math.max(0, total),
    }
}

function countSkinEntries(value: unknown): number | null {
    if (Array.isArray(value)) return value.length
    if (isRecord(value)) return Object.keys(value).length
    if (typeof value === 'number' && Number.isFinite(value)) return value
    return null
}

function countHeroesByStar(heroes: Record<string, any>, star: number): number {
    return Object.values(heroes).filter((hero) => isRecord(hero) && toNumeric(hero.star) === star).length
}

function isFullySkilledHero(hero: unknown): boolean {
    if (!isRecord(hero) || !Array.isArray(hero.skinfo) || hero.skinfo.length === 0) {
        return false
    }

    return hero.skinfo.every((skill) => Array.isArray(skill) && skill.length >= 2 && (toNumeric(skill[1]) ?? 0) >= 5)
}

function countFullySkilledHeroes(heroes: Record<string, any>): number {
    return Object.values(heroes).filter((hero) => isFullySkilledHero(hero)).length
}

function isFullSpeedItem(item: Record<string, any>): boolean {
    const level = toNumeric(item.level)
    const star = toNumeric(item.qua) ?? 6
    if (level !== 15 || star !== 6) {
        return false
    }

    const pos = toNumeric(item.pos)
    if (pos === 2 && inferMainAttr(item) !== '速度') {
        return false
    }

    const displayedSpeed = extractDisplayedItemSpeed(item)
    if (displayedSpeed <= 0) {
        return false
    }

    return Math.ceil(displayedSpeed / 3) === 6
}

function sumNestedCountEntries(value: unknown, targetKey: string): number {
    if (!isRecord(value)) {
        return 0
    }

    return Object.values(value).reduce((sum, entry) => {
        if (!isRecord(entry)) {
            return sum
        }

        return sum + (toNumeric(entry[targetKey]) ?? 0)
    }, 0)
}

const SUIT_SPEED_META: Array<{ id: number; label: string }> = [
    { id: 300010, label: '招财猫' },
    { id: 300019, label: '火灵' },
    { id: 300034, label: '蚌精' },
    { id: 300079, label: '遗念火' },
    { id: 300080, label: '共潜' },
]
const PVE_HEADERS: BenchPosterViewModel['pve']['headers'] = ['土蜘蛛', '荒骷髅', '鬼灵歌伎', '平均值']
const SPEED_SECTION_TITLES = ['散件一速', '散件命中一速', '散件抵抗一速', '套装一速'] as const
const PVE_MAIN_SOULS = [
    { id: 300048, label: '狂骨', bonusAttr: '攻击加成' },
    { id: 300083, label: '海月火玉', bonusAttr: '暴击' },
    { id: 300029, label: '伤魂鸟', bonusAttr: '暴击' },
    { id: 300030, label: '破势', bonusAttr: '暴击' },
    { id: 300086, label: '隐念', bonusAttr: '攻击加成' },
    { id: 300031, label: '镇墓兽', bonusAttr: '暴击' },
    { id: 300055, label: '片叶之苇', bonusAttr: '暴击' },
] as const
const PVE_BOSS_SOULS = [
    { id: 300050, label: '土蜘蛛' },
    { id: 300052, label: '荒骷髅' },
    { id: 300077, label: '鬼灵歌伎' },
] as const
const PVE_TEMPLATES = [
    {
        heroName: '须佐之男',
        panel: { attack: 4154, critRate: 0.12, critDamage: 1.5 },
        mains: { 2: '攻击加成', 4: '攻击加成', 6: ['暴击伤害', '暴击'] as const },
    },
] as const
const PVE_SLOT_BASES: Record<number, string> = {
    1: '攻击',
    3: '防御',
    5: '生命',
}

type PveInventoryItem = {
    pos: number
    suitId: number
    mainAttr: string
    attrs: unknown
    singleAttr: unknown
    heuristic: number
}

function collectInventoryItems(inventory: unknown): Record<string, any>[] {
    if (Array.isArray(inventory)) {
        return inventory.filter(isRecord)
    }

    if (isRecord(inventory)) {
        return Object.values(inventory).filter(isRecord)
    }

    return []
}

function extractSpeedValue(attrs: unknown): number {
    if (!Array.isArray(attrs)) {
        return 0
    }

    let total = 0

    for (const attr of attrs) {
        if (!Array.isArray(attr) || attr.length < 2) continue
        if (attr[0] !== '速度') continue

        total += toNumeric(attr[1]) ?? 0
    }

    return total
}

function extractItemSpeed(item: Record<string, any>): number {
    return extractSpeedValue(item.attrs) + extractSingleAttrValue(item.single_attr, '速度')
}

function extractDisplayedItemSpeed(item: Record<string, any>): number {
    const total = extractItemSpeed(item)
    const pos = toNumeric(item.pos)
    if (pos !== 2) {
        return total
    }

    const mainSpeed = inferMainAttr(item) === '速度' && Array.isArray(item.attrs) && Array.isArray(item.attrs[0]) && item.attrs[0][0] === '速度'
        ? (toNumeric(item.attrs[0][1]) ?? 0)
        : 0
    return total - mainSpeed
}

function extractAttrValue(attrs: unknown, attrName: string): number {
    if (!Array.isArray(attrs)) {
        return 0
    }

    let total = 0
    for (const attr of attrs) {
        if (!Array.isArray(attr) || attr.length < 2) continue
        if (attr[0] !== attrName) continue
        total += toNumeric(attr[1]) ?? 0
    }

    return total
}

function extractSingleAttrValue(singleAttr: unknown, attrName: string): number {
    if (!Array.isArray(singleAttr) || singleAttr.length < 2) {
        return 0
    }

    if (singleAttr[0] !== attrName) {
        return 0
    }

    return toNumeric(singleAttr[1]) ?? 0
}

function inferMainAttr(item: Record<string, any>): string {
    const pos = toNumeric(item.pos)
    if (pos == null) {
        return ''
    }

    if (pos in PVE_SLOT_BASES) {
        return PVE_SLOT_BASES[pos]
    }

    const attrs = Array.isArray(item.attrs) ? item.attrs : []
    const main = attrs[0]
    if (!Array.isArray(main) || typeof main[0] !== 'string') {
        return ''
    }

    return main[0]
}

function buildPveInventoryItem(item: Record<string, any>): PveInventoryItem | null {
    const pos = toNumeric(item.pos)
    const suitId = toNumeric(item.suitid)
    const level = toNumeric(item.level)
    const quality = toNumeric(item.qua)
    if (pos == null || suitId == null || level !== 15) {
        return null
    }
    if (quality != null && quality < 6) {
        return null
    }

    const attackPct = extractAttrValue(item.attrs, '攻击加成')
    const flatAttack = extractAttrValue(item.attrs, '攻击')
    const critRate = extractAttrValue(item.attrs, '暴击')
    const critDamage = extractAttrValue(item.attrs, '暴击伤害')
    const singleAttackPct = extractSingleAttrValue(item.single_attr, '攻击加成')
    const singleFlatAttack = extractSingleAttrValue(item.single_attr, '攻击')
    const singleCritRate = extractSingleAttrValue(item.single_attr, '暴击')
    const singleCritDamage = extractSingleAttrValue(item.single_attr, '暴击伤害')

    return {
        pos,
        suitId,
        mainAttr: inferMainAttr(item),
        attrs: item.attrs,
        singleAttr: item.single_attr,
        heuristic:
            (attackPct + singleAttackPct) * 3 +
            (flatAttack + singleFlatAttack) * 0.08 +
            (critRate + singleCritRate) * 4 +
            (critDamage + singleCritDamage) * 2.5,
    }
}

function formatSignedSpeed(value: number): string {
    return `+${Number(value.toPrecision(15)).toString()}`
}

function formatPercentValue(value: number): string {
    const text = Number.isInteger(value) ? String(Math.round(value)) : value.toFixed(2).replace(/\.?0+$/, '')
    return `${text}%`
}

function buildBestSpeedRow(
    items: Record<string, any>[],
    label: string,
    extraAttrName?: '效果命中' | '效果抵抗',
    requiredMainAttrByPos: Partial<Record<number, string>> = {}
): BenchPosterViewModel['speed']['sections'][number]['rows'][number] | null {
    const bestByPos = new Map<number, Record<string, any>>()

    for (const item of items) {
        const level = toNumeric(item.level)
        const pos = toNumeric(item.pos)
        if (level !== 15 || pos == null || pos < 1 || pos > 6) continue
        if (requiredMainAttrByPos[pos] && inferMainAttr(item) !== requiredMainAttrByPos[pos]) continue

        const current = bestByPos.get(pos)
        const speed = extractItemSpeed(item)
        const extra = extraAttrName ? extractAttrValue(item.attrs, extraAttrName) : 0
        const score = speed + extra * 0.01

        if (!current) {
            bestByPos.set(pos, item)
            continue
        }

        const currentScore = extractItemSpeed(current) + (extraAttrName ? extractAttrValue(current.attrs, extraAttrName) * 0.01 : 0)
        if (score > currentScore) {
            bestByPos.set(pos, item)
        }
    }

    if (bestByPos.size < 6) {
        return null
    }

    const selectedItems = [1, 2, 3, 4, 5, 6].map((pos) => bestByPos.get(pos)!)
    const total = selectedItems.reduce((sum, item) => sum + extractItemSpeed(item), 0)
    const slotTexts = selectedItems.map((item) => extractDisplayedItemSpeed(item).toFixed(2))
    const extraTotal = extraAttrName
        ? selectedItems.reduce((sum, item) => sum + extractAttrValue(item.attrs, extraAttrName) + extractSingleAttrValue(item.single_attr, extraAttrName), 0)
        : 0

    return {
        label,
        totalText: formatSignedSpeed(total),
        slotTexts,
        ...(extraAttrName
            ? {
                extraText: `${extraAttrName === '效果命中' ? '命中' : '抵抗'} ${formatPercentValue(extraTotal)}`,
            }
            : {}),
    }
}

function buildFourPlusTwoSuitRow(
    items: Record<string, any>[],
    suitId: number,
    label: string
): BenchPosterViewModel['speed']['sections'][number]['rows'][number] | null {
    const bestAny = new Map<number, Record<string, any>>()
    const bestSuit = new Map<number, Record<string, any>>()

    for (const item of items) {
        const level = toNumeric(item.level)
        const pos = toNumeric(item.pos)
        if (level !== 15 || pos == null || pos < 1 || pos > 6) continue

        const currentAny = bestAny.get(pos)
        if (!currentAny || extractItemSpeed(item) > extractItemSpeed(currentAny)) {
            bestAny.set(pos, item)
        }

        if (toNumeric(item.suitid) !== suitId) continue
        const currentSuit = bestSuit.get(pos)
        if (!currentSuit || extractItemSpeed(item) > extractItemSpeed(currentSuit)) {
            bestSuit.set(pos, item)
        }
    }

    if (bestAny.size < 6 || bestSuit.size < 4) {
        return null
    }

    let bestSelection: Record<string, any>[] | null = null
    let bestTotal = -1
    for (let scatterA = 1; scatterA <= 5; scatterA++) {
        for (let scatterB = scatterA + 1; scatterB <= 6; scatterB++) {
            const current: Record<string, any>[] = []
            let valid = true

            for (const pos of [1, 2, 3, 4, 5, 6]) {
                const item = pos === scatterA || pos === scatterB ? bestAny.get(pos) : bestSuit.get(pos)
                if (!item) {
                    valid = false
                    break
                }
                current.push(item)
            }

            if (!valid) {
                continue
            }

            const suitCount = current.filter((item) => toNumeric(item.suitid) === suitId).length
            if (suitCount < 4) {
                continue
            }

            const total = current.reduce((sum, item) => sum + extractItemSpeed(item), 0)
            if (total > bestTotal) {
                bestTotal = total
                bestSelection = current
            }
        }
    }

    if (!bestSelection) {
        return null
    }

    return {
        label,
        totalText: formatSignedSpeed(bestSelection.reduce((sum, item) => sum + extractItemSpeed(item), 0)),
        slotTexts: bestSelection.map((item) => extractDisplayedItemSpeed(item).toFixed(2)),
    }
}

function buildSuitSpeedRows(items: Record<string, any>[]): BenchPosterViewModel['speed']['sections'][number]['rows'] {
    return SUIT_SPEED_META.flatMap(({ id, label }) => {
        const row = buildFourPlusTwoSuitRow(items, id, label)
        return row ? [row] : []
    })
}

function parseMetricCell(value: unknown): { number: number; suffix: string } | null {
    if (typeof value !== 'string') {
        return null
    }

    const trimmed = value.trim()
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(.*)$/)
    if (!match) {
        return null
    }

    const parsed = Number(match[1])
    if (!Number.isFinite(parsed)) {
        return null
    }

    return {
        number: parsed,
        suffix: match[2] ?? '',
    }
}

function formatAverageMetric(values: string[]): string {
    const parsed = values
        .map((value) => parseMetricCell(value))
        .filter((item): item is { number: number; suffix: string } => item != null)

    if (parsed.length === 0) {
        return '--'
    }

    const avg = parsed.reduce((sum, item) => sum + item.number, 0) / parsed.length
    const suffix = parsed[0].suffix
    const text = Number.isInteger(avg) ? String(Math.round(avg)) : avg.toFixed(1).replace(/\.?0+$/, '')
    return `${text}${suffix}`
}

function formatPveMetric(value: number): string {
    if (!Number.isFinite(value) || value <= 0) {
        return '--'
    }

    return String(Math.round(value))
}

function sumPveAttr(items: PveInventoryItem[], attrName: string): number {
    return items.reduce((sum, item) => {
        return sum + extractAttrValue(item.attrs, attrName) + extractSingleAttrValue(item.singleAttr, attrName)
    }, 0)
}

function applyTwoPieceBonus(items: PveInventoryItem[], mainSoulId: number): { attackPctBonus: number; critRateBonus: number } {
    const suitCounts = new Map<number, number>()
    for (const item of items) {
        suitCounts.set(item.suitId, (suitCounts.get(item.suitId) ?? 0) + 1)
    }

    const mainSoul = PVE_MAIN_SOULS.find((soul) => soul.id === mainSoulId)
    let attackPctBonus = 0
    let critRateBonus = 0

    if (mainSoul && (suitCounts.get(mainSoul.id) ?? 0) >= 2) {
        if (mainSoul.bonusAttr === '攻击加成') attackPctBonus += 0.15
        if (mainSoul.bonusAttr === '暴击') critRateBonus += 0.15
    }

    return { attackPctBonus, critRateBonus }
}

function computePveMetric(
    items: PveInventoryItem[],
    template: (typeof PVE_TEMPLATES)[number],
    mainSoulId: number
): number {
    const attackPct = sumPveAttr(items, '攻击加成') / 100
    const flatAttack = sumPveAttr(items, '攻击')
    const critRate = sumPveAttr(items, '暴击') / 100
    const critDamage = sumPveAttr(items, '暴击伤害') / 100
    const { attackPctBonus, critRateBonus } = applyTwoPieceBonus(items, mainSoulId)
    const totalCritRate = template.panel.critRate + critRate + critRateBonus
    if (totalCritRate < 1) {
        return 0
    }

    const attack = template.panel.attack * (1 + attackPct + attackPctBonus) + flatAttack
    const critPower = template.panel.critDamage + critDamage
    return attack * critPower
}

function chooseBestPveCell(
    items: PveInventoryItem[],
    mainSoul: (typeof PVE_MAIN_SOULS)[number],
    bossSoul: (typeof PVE_BOSS_SOULS)[number]
): { heroName: string; metricText: string } {
    let bestMetric = 0
    let bestHeroName = '--'

    for (const template of PVE_TEMPLATES) {
        const mainSuitByPos = new Map<number, PveInventoryItem[]>()
        const bossSuitByPos = new Map<number, PveInventoryItem[]>()

        for (const pos of [1, 2, 3, 4, 5, 6]) {
            const allowedMainAttrs = pos === 2 || pos === 4
                ? [template.mains[pos]]
                : pos === 6
                    ? [...template.mains[6]]
                    : [PVE_SLOT_BASES[pos]]

            const sortAndSlice = (candidates: PveInventoryItem[]) => candidates
                .filter((item) => allowedMainAttrs.includes(item.mainAttr))
                .sort((a, b) => b.heuristic - a.heuristic)
                .slice(0, pos === 1 || pos === 3 || pos === 5 ? 3 : 5)

            mainSuitByPos.set(pos, sortAndSlice(items.filter((item) => item.suitId === mainSoul.id && item.pos === pos)))
            bossSuitByPos.set(pos, sortAndSlice(items.filter((item) => item.suitId === bossSoul.id && item.pos === pos)))
        }

        for (let first = 1; first <= 5; first++) {
            for (let second = first + 1; second <= 6; second++) {
                const lists = [1, 2, 3, 4, 5, 6].map((pos) => (pos === first || pos === second ? bossSuitByPos : mainSuitByPos).get(pos) ?? [])
                if (lists.some((list) => list.length === 0)) {
                    continue
                }

                const current: PveInventoryItem[] = []
                const walk = (index: number) => {
                    if (index >= lists.length) {
                        const metric = computePveMetric(current, template, mainSoul.id)
                        if (metric > bestMetric) {
                            bestMetric = metric
                            bestHeroName = template.heroName
                        }
                        return
                    }

                    for (const candidate of lists[index]) {
                        current.push(candidate)
                        walk(index + 1)
                        current.pop()
                    }
                }

                walk(0)
            }
        }
    }

    return {
        heroName: bestHeroName,
        metricText: formatPveMetric(bestMetric),
    }
}

function normalizePveRow(rawRow: unknown): BenchPosterViewModel['pve']['rows'][number] | null {
    if (!isRecord(rawRow)) {
        return null
    }

    const soulName = typeof rawRow.soulName === 'string' && rawRow.soulName.trim() ? rawRow.soulName.trim() : ''
    if (!soulName) {
        return null
    }

    const sourceValues = Array.isArray(rawRow.values) ? rawRow.values.filter(isRecord).slice(0, 3) : []
    const normalizedCells: Array<{ heroName: string; metricText: string }> = [0, 1, 2].map((index) => {
        const cell = sourceValues[index] ?? {}
        const heroName = typeof cell.heroName === 'string' && cell.heroName.trim() ? cell.heroName.trim() : '--'
        const metricText = typeof cell.metricText === 'string' && cell.metricText.trim() ? cell.metricText.trim() : '--'
        return { heroName, metricText }
    })

    const averageText = formatAverageMetric(
        normalizedCells
            .map((item) => item.metricText)
            .filter((metricText) => metricText !== '--')
    )

    normalizedCells.push({
        heroName: '均值',
        metricText: averageText,
    })

    return {
        soulName,
        values: normalizedCells,
    }
}

function buildPveRows(equipDesc: Record<string, any>): BenchPosterViewModel['pve']['rows'] {
    const rawRows = Array.isArray(equipDesc.pve_rows) ? equipDesc.pve_rows : []
    const normalizedRawRows = rawRows
        .map((row) => normalizePveRow(row))
        .filter((row): row is BenchPosterViewModel['pve']['rows'][number] => row != null)

    if (normalizedRawRows.length > 0) {
        return normalizedRawRows
    }

    const items = collectInventoryItems(equipDesc.inventory)
        .map((item) => buildPveInventoryItem(item))
        .filter((item): item is PveInventoryItem => item != null)

    if (items.length === 0) {
        return []
    }

    return PVE_MAIN_SOULS.map((mainSoul) => {
        const valueCells = PVE_BOSS_SOULS.map((bossSoul) => chooseBestPveCell(items, mainSoul, bossSoul))
        const averageText = formatAverageMetric(
            valueCells
                .map((item) => item.metricText)
                .filter((metricText) => metricText !== '--')
        )

        return {
            soulName: mainSoul.label,
            values: [
                ...valueCells,
                {
                    heroName: '均值',
                    metricText: averageText,
                },
            ],
        }
    }).filter((row) => row.values.some((value) => value.metricText !== '--'))
}

export function analyzeCbgDetail(data: any, sourceUrl: string): BenchPosterViewModel {
    const hasEquip = Boolean(data?.equip)
    const equip = data?.equip ?? {}
    const equipDesc = parseEquipDesc(equip.equip_desc)
    const detail = equip.detail ?? {}
    const heroes = equip.heroes ?? {}
    const skins = equip.skins ?? {}
    const yuhun = equip.yuhun ?? {}
    const speedInfo = yuhun.speed ?? {}
    const crit = yuhun.crit ?? {}
    const inventory = yuhun.inventory ?? {}
    const descHeroes = isRecord(equipDesc.heroes) ? equipDesc.heroes : {}
    const heroHistory = isRecord(equipDesc.hero_history) ? equipDesc.hero_history : {}
    const descSkin = isRecord(equipDesc.skin) ? equipDesc.skin : {}
    const descInventory = equipDesc.inventory

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

    const signDays = toNumeric(equipDesc.sign_days)
    const level = detail.level ?? equipDesc.lv ?? null
    const blueTickets = (Number(equipDesc.gameble_card) || 0) + (Number(equipDesc.ar_gamble_card) || 0)
    const blackEggCount = sumNestedCountEntries(equipDesc.damo_count_dict, '411')
    const hasDescHeroes = Object.keys(descHeroes).length > 0
    const spProgress = readCollectionProgress(heroHistory.sp)
    const ssrProgress = readCollectionProgress(heroHistory.ssr)
    const collabProgress = readCollectionProgress(heroHistory.x)
    const urProgress = readCollectionProgress(heroHistory.ur)
    const heroTotal =
        Object.keys(descHeroes).length ||
        (typeof equipDesc.hero_summary === 'number' ? equipDesc.hero_summary : null) ||
        0
    const ownedSpFallback = Number(heroes.sp) || (hasDescHeroes ? countHeroRarity(descHeroes, 6) : 0)
    const ownedSsrFallback = Number(heroes.ssr) || (hasDescHeroes ? countHeroRarity(descHeroes, 5) : 0)
    const ownedSp = spProgress?.got ?? ownedSpFallback
    const totalSp = spProgress?.total ?? ownedSp
    const ownedSsr = ssrProgress?.got ?? ownedSsrFallback
    const totalSsr = ssrProgress?.total ?? ownedSsr
    const ownedCollab = collabProgress?.got ?? 0
    const totalCollab = collabProgress?.total ?? ownedCollab
    const ownedUr = urProgress?.got ?? 0
    const totalUr = urProgress?.total ?? ownedUr
    const sixStarCount = countHeroesByStar(descHeroes, 6)
    const fullSkillCount = countFullySkilledHeroes(descHeroes)
    const descInventoryItems = collectInventoryItems(descInventory).filter((item) => toNumeric(item.level) === 15)
    const scatterRow = buildBestSpeedRow(descInventoryItems, '散件极速')
    const hitRow = buildBestSpeedRow(descInventoryItems, '命中极速', '效果命中', { 4: '效果命中' })
    const resistRow = buildBestSpeedRow(descInventoryItems, '抵抗极速', '效果抵抗', { 4: '效果抵抗' })
    const suitRows = buildSuitSpeedRows(descInventoryItems)
    const speedSections: BenchPosterViewModel['speed']['sections'] = [
        { title: SPEED_SECTION_TITLES[0], rows: scatterRow ? [scatterRow] : [] },
        { title: SPEED_SECTION_TITLES[1], rows: hitRow ? [hitRow] : [] },
        { title: SPEED_SECTION_TITLES[2], rows: resistRow ? [resistRow] : [] },
        { title: SPEED_SECTION_TITLES[3], rows: suitRows },
    ]
    const suitSpeedSummaries = suitRows.map((row) => `${row.label}一速 ${row.totalText.replace(/^\+/, '')}`)
    
    // 计算各位置满速情况
    const fullSpeedPreview: BenchPosterViewModel['speed']['fullSpeedPreview'] = []
    
    for (let position = 1; position <= 6; position++) {
        const positionFullSpeedItems = descInventoryItems.filter((item) => {
            const pos = toNumeric(item.pos)
            return pos === position && isFullSpeedItem(item)
        }).sort((a, b) => extractDisplayedItemSpeed(b) - extractDisplayedItemSpeed(a))
        
        if (positionFullSpeedItems.length > 0) {
            const rows = positionFullSpeedItems.map((item) => {
                const speed = extractDisplayedItemSpeed(item)

                return {
                    label: '',
                    speedText: speed.toFixed(2),
                }
            })

            fullSpeedPreview.push({
                position,
                count: rows.length,
                rows,
            })
        } else {
            fullSpeedPreview.push({
                position,
                count: 0,
                rows: []
            })
        }
    }
    
    const pveRows = buildPveRows(equipDesc)

    const resources: Array<{ label: string; value: string }> = []
    if (detail.power != null) {
        resources.push({ label: '战力', value: String(detail.power) })
    }
    if (detail.level != null) {
        resources.push({ label: '等级', value: String(detail.level) })
    }
    if (hasDescHeroes || heroes.sp != null || heroes.ssr != null) {
        resources.push({ label: 'SP/SSR', value: `${ownedSp}/${ownedSsr}` })
    }
    if (inventory.total != null) {
        resources.push({ label: '御魂库存', value: String(inventory.total) })
    }
    if (equipDesc.money != null) {
        resources.push({ label: '金币', value: formatNumber(equipDesc.money) })
    }
    if (equipDesc.goyu != null) {
        resources.push({ label: '勾玉', value: formatNumber(equipDesc.goyu) })
    }
    if (equipDesc.strength != null) {
        resources.push({ label: '体力', value: formatNumber(equipDesc.strength) })
    }
    if (blueTickets > 0) {
        resources.push({ label: '蓝票', value: formatNumber(blueTickets) })
    }
    if (equipDesc.soul_jade != null) {
        resources.push({ label: '御札', value: formatNumber(equipDesc.soul_jade) })
    }
    if (equipDesc.currency_900188 != null) {
        resources.push({ label: '金御札', value: formatNumber(equipDesc.currency_900188) })
    }
    if (equipDesc.hunyu != null) {
        resources.push({ label: '魂玉', value: formatNumber(equipDesc.hunyu) })
    }
    if (blackEggCount > 0) {
        resources.push({ label: '黑蛋', value: formatNumber(blackEggCount) })
    }
    if (equipDesc.honor_score != null) {
        resources.push({ label: '荣誉', value: formatNumber(equipDesc.honor_score) })
    }

    const highlights = uniqueStrings([
        ...(Array.isArray(equip.highlights) ? equip.highlights : []),
        speedInfo.best != null ? `速度 ${speedInfo.best}${speedInfo.suit ? `(${speedInfo.suit})` : ''}` : '',
        crit.best != null ? `暴击 ${crit.best}` : '',
        signDays != null ? `签到 ${formatNumber(signDays)} 天` : '',
        equipDesc.fengzidu != null ? `风姿度 ${formatNumber(equipDesc.fengzidu)}` : '',
        equipDesc.redheart != null ? `红心 ${formatNumber(equipDesc.redheart)}` : '',
    ])

    const inventorySummary = uniqueStrings([
        inventory.total != null ? `御魂总数 ${formatNumber(inventory.total)}` : '',
        equipDesc.equips_summary != null ? `满级御魂 ${formatNumber(equipDesc.equips_summary)}` : '',
        equipDesc.level_15 != null ? `15级御魂 ${formatNumber(equipDesc.level_15)}` : '',
        equipDesc.yuhun_buff != null ? `御魂加成分 ${formatNumber(equipDesc.yuhun_buff)}` : '',
        heroTotal ? `式神总数 ${formatNumber(heroTotal)}` : '',
    ])

    const suitJudgements = uniqueStrings([
        speedInfo.suit ? `速度套装: ${speedInfo.suit}` : '',
        equipDesc.pvp_score != null || equipDesc.pvp_stage != null || equipDesc.pvp_rank != null
            ? `斗技 ${formatNumber(equipDesc.pvp_score)} / 段位 ${formatNumber(equipDesc.pvp_stage)} / 名次 ${formatNumber(equipDesc.pvp_rank)}`
            : '',
        equipDesc.fengzidu != null ? `风姿度 ${formatNumber(equipDesc.fengzidu)}` : '',
        equipDesc.redheart != null ? `红心值 ${formatNumber(equipDesc.redheart)}` : '',
        ...suitSpeedSummaries,
        ...highlights.slice(0, 4),
    ])

    const linkageSummary = uniqueStrings([
        ...(Array.isArray(heroes.collections) ? heroes.collections : []),
        equipDesc.origin_server_name ? `原服 ${equipDesc.origin_server_name}` : '',
        Array.isArray(equipDesc.achieve_ids) ? `成就 ${formatNumber(equipDesc.achieve_ids.length)}` : '',
        Array.isArray(equipDesc.honors) ? `荣誉 ${formatNumber(equipDesc.honors.length)}` : '',
        heroTotal ? `式神总数 ${formatNumber(heroTotal)}` : '',
        sixStarCount ? `六星式神 ${formatNumber(sixStarCount)}` : '',
        fullSkillCount ? `满技能式神 ${formatNumber(fullSkillCount)}` : '',
        equipDesc.ssr_coin === 1 ? '500SSR未使用' : '',
        equipDesc.sp_coin === 1 ? '999SP未使用' : '',
    ])

    const skinSummary = uniqueStrings([
        ...(skins.sp != null ? [`SP皮肤 ${skins.sp}`] : []),
        ...(skins.ssr != null ? [`SSR皮肤 ${skins.ssr}`] : []),
        ...(skins.sr != null ? [`SR皮肤 ${skins.sr}`] : []),
        Array.isArray(equipDesc.cbg_special_skin_list) ? `典藏/臻藏 ${formatNumber(equipDesc.cbg_special_skin_list.length)}` : '',
        Array.isArray(equipDesc.cbg_special_skin_list_2) ? `典藏/臻藏扩展 ${formatNumber(equipDesc.cbg_special_skin_list_2.length)}` : '',
        countSkinEntries(descSkin.yard) != null ? `庭院皮肤 ${formatNumber(countSkinEntries(descSkin.yard))}` : '',
        countSkinEntries(descSkin.yys) != null ? `阴阳师皮肤 ${formatNumber(countSkinEntries(descSkin.yys))}` : '',
        countSkinEntries(descSkin.jiejie) != null ? `结界皮肤 ${formatNumber(countSkinEntries(descSkin.jiejie))}` : '',
        countSkinEntries(descSkin.ss) != null ? `式神皮肤 ${formatNumber(countSkinEntries(descSkin.ss))}` : '',
        countSkinEntries(equipDesc.head_skin_count) != null ? `头像框主题数 ${formatNumber(countSkinEntries(equipDesc.head_skin_count))}` : '',
    ])

    const daysParts = uniqueStrings([
        signDays != null ? `${formatPlainNumber(signDays)} 天` : '',
        level != null ? `${formatPlainNumber(level)} 级` : '',
        typeof equip.create_time_desc === 'string' ? equip.create_time_desc : '',
    ])

    return {
        reportId: resolveReportId(sourceUrl),
        sourceUrl,
        generatedAt: new Date().toISOString(),
        hero: {
            areaName: String(equip.area_name ?? ''),
            serverName: String(equip.server_name ?? ''),
            equipName: String(equip.equip_name ?? ''),
            priceText: formatPrice(equip.price),
            statusText: normalizeStatus(equip.status),
            daysText: daysParts.join(' / '),
        },
        highlights,
        resources: uniqueStrings(resources.map((item) => `${item.label}:${item.value}`)).map((item) => {
            const [label, ...rest] = item.split(':')
            return { label, value: rest.join(':') }
        }),
        collection: {
            ownedSp,
            totalSp,
            ownedSsr,
            totalSsr,
            ownedCollab,
            totalCollab,
            ownedUr,
            totalUr,
            linkageSummary,
            skinSummary,
        },
        overview: {
            speedSummary:
                uniqueStrings([
                    scatterRow ? `散件一速${scatterRow.totalText.replace(/^\+/, '')}` : '',
                    highlights.find((item) => item.includes('一速')) ?? '',
                    speedInfo.best != null ? `速度 ${speedInfo.best}` : '',
                ])[0] ?? '',
            critSummary:
                uniqueStrings([
                    crit.best != null ? `暴击 ${crit.best}` : '',
                    equipDesc.level_15 != null ? `15级御魂 ${formatNumber(equipDesc.level_15)}` : '',
                    equipDesc.equips_summary != null ? `满级御魂 ${formatNumber(equipDesc.equips_summary)}` : '',
                ])[0] ?? '',
            inventorySummary,
            suitJudgements,
        },
        pve: {
            headers: PVE_HEADERS,
            rows: pveRows,
        },
        speed: {
            sections: speedSections,
            fullSpeedPreview,
        },
        warnings,
    }
}
