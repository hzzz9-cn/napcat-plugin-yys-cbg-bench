import { describe, expect, it } from 'vitest'
import cbgDetailFixture from '../fixtures/cbg-detail.fixture.json'
import { analyzeCbgDetail } from '../../src/services/cbg-analyzer-service'

const sourceUrl = 'https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV'
const pveHeaders = ['土蜘蛛', '荒骷髅', '鬼灵歌伎', '平均值'] as const
const speedSectionTitles = ['散件一速', '散件命中一速', '散件抵抗一速', '套装一速'] as const

describe('cbg-analyzer-service', () => {
    it('builds a poster view model from fixture data with new sections', () => {
        const result = analyzeCbgDetail(cbgDetailFixture as unknown, sourceUrl)

        expect(result.reportId).toBe('202603281001616-9-VLP4WCHMFPJMEV')
        expect(result.sourceUrl).toBe(sourceUrl)
        expect(result.hero).toMatchObject({
            areaName: '测试大区',
            serverName: '测试服务器',
            equipName: '脱敏账号',
            priceText: '¥648',
            statusText: '上架中',
        })
        expect(result.resources).toEqual(expect.arrayContaining([
            { label: '战力', value: '123456' },
            { label: 'SP/SSR', value: '12/28' },
            { label: '御魂库存', value: '1234' },
        ]))
        expect(result.collection.ownedSp).toBe(12)
        expect(result.collection.ownedSsr).toBe(28)
        expect(result.collection.skinSummary).toEqual(expect.arrayContaining(['SP皮肤 12']))
        expect(result.overview.inventorySummary[0]).toContain('御魂总数')
        expect(result.pve.headers).toEqual([...pveHeaders])
        expect(result.speed.sections.map((section) => section.title)).toEqual([...speedSectionTitles])
        expect(result.speed.fullSpeedPreview).toBeDefined()
    })

    it('filters linkage summary to displayable strings only', () => {
        const data = JSON.parse(JSON.stringify(cbgDetailFixture)) as any
        data.equip.heroes.collections = ['sp_1', { bad: true }]

        const result = analyzeCbgDetail(data, sourceUrl)

        expect(result.collection.linkageSummary).toEqual(['sp_1'])
        expect(result.collection.linkageSummary).not.toContain('[object Object]')
    })

    it('adds warnings when equip data is missing', () => {
        const result = analyzeCbgDetail({}, sourceUrl)

        expect(result.warnings?.length ?? 0).toBeGreaterThan(0)
    })

    it('extracts identity, trade, resources, collection depth, overview, pve and speed previews from equip_desc', () => {
        const data = {
            equip: {
                area_name: '网易-心意相通',
                server_name: '夜之月',
                equip_name: 'YYS柒十叁',
                price: 88800,
                status: 2,
                create_time_desc: '2026-04-05 21:28:50',
                highlights: ['散件一速158.64', '招财一速156.40', '终极之巅'],
                equip_desc: JSON.stringify({
                    lv: 60,
                    sign_days: 3376,
                    origin_server_name: '夜之月',
                    pvp_score: 2775,
                    pvp_stage: 9,
                    pvp_rank: 1318,
                    honor_score: 17000,
                    fengzidu: 46633,
                    redheart: 95857,
                    soul_jade: 20250,
                    money: 216135073,
                    goyu: 83016,
                    strength: 456789,
                    gameble_card: 181,
                    ar_gamble_card: 9,
                    hunyu: 8,
                    currency_900188: 99,
                    yuhun_buff: 2333444,
                    equips_summary: 8975,
                    level_15: 5813,
                    damo_count_dict: {
                        2: { 411: 17 },
                        4: { 411: 3 },
                    },
                    achieve_ids: new Array(625).fill(0).map((_, index) => index + 1),
                    honors: new Array(37).fill(0).map((_, index) => index + 1),
                    pve_rows: [
                        {
                            soulName: '狂荒歌土',
                            values: [
                                { heroName: '缘结神', metricText: '18.6w' },
                                { heroName: '丑时之女', metricText: '19.2w' },
                                { heroName: '不见岳', metricText: '17.8w' },
                            ],
                        },
                    ],
                    heroes: {
                        sp1: { rarity: 6 },
                        sp2: { rarity: 6 },
                        sp3: { rarity: 6 },
                        ssr1: { rarity: 5 },
                        ssr2: { rarity: 5 },
                        ssr3: { rarity: 5 },
                    },
                    skin: {
                        yard: [[1, '庭院甲'], [2, '庭院乙']],
                        yys: [[10, '阴阳师皮肤']],
                        jiejie: [[100, '结界皮肤']],
                        ss: [[200, '式神皮肤']],
                    },
                    inventory: {
                        a1: { level: 15, pos: 1, suitid: 300019, attrs: [['攻击加成', '27.00%'], ['速度', '15.00']] },
                        a2: { level: 15, pos: 2, suitid: 300019, attrs: [['速度', '57.00'], ['暴击', '3.00%']] },
                        a3: { level: 15, pos: 3, suitid: 300019, attrs: [['防御', '4.00'], ['速度', '14.00']] },
                        a4: { level: 15, pos: 4, suitid: 300019, attrs: [['效果命中', '55.00%'], ['速度', '13.00']] },
                        a5: { level: 15, pos: 5, suitid: 300019, attrs: [['生命', '114.00'], ['速度', '12.00']] },
                        a6: { level: 15, pos: 6, suitid: 300019, attrs: [['攻击加成', '55.00%'], ['速度', '11.00']] },
                        b1: { level: 15, pos: 1, suitid: 300079, attrs: [['攻击加成', '27.00%'], ['速度', '13.00']] },
                        b2: { level: 15, pos: 2, suitid: 300079, attrs: [['速度', '57.00'], ['暴击', '3.00%']] },
                        b3: { level: 15, pos: 3, suitid: 300079, attrs: [['防御', '4.00'], ['速度', '12.00']] },
                        b4: { level: 15, pos: 4, suitid: 300079, attrs: [['效果命中', '55.00%'], ['速度', '11.00']] },
                        b5: { level: 15, pos: 5, suitid: 300079, attrs: [['生命', '114.00'], ['速度', '10.00']] },
                        b6: { level: 15, pos: 6, suitid: 300079, attrs: [['攻击加成', '55.00%'], ['速度', '9.00']] },
                        c1: { level: 15, pos: 1, suitid: 300080, attrs: [['攻击加成', '27.00%'], ['速度', '10.00']] },
                        c2: { level: 15, pos: 2, suitid: 300080, attrs: [['速度', '57.00'], ['暴击', '3.00%']] },
                        c3: { level: 15, pos: 3, suitid: 300080, attrs: [['防御', '4.00'], ['速度', '9.00']] },
                        c4: { level: 15, pos: 4, suitid: 300080, attrs: [['效果抵抗', '55.00%'], ['速度', '8.00']] },
                        c5: { level: 15, pos: 5, suitid: 300080, attrs: [['生命', '114.00'], ['速度', '7.00']] },
                        c6: { level: 15, pos: 6, suitid: 300080, attrs: [['攻击加成', '55.00%'], ['速度', '6.00']] },
                        d1: { level: 15, pos: 1, suitid: 300034, attrs: [['攻击加成', '27.00%'], ['速度', '12.00']] },
                        d2: { level: 15, pos: 2, suitid: 300034, attrs: [['速度', '57.00'], ['暴击', '3.00%']] },
                        d3: { level: 15, pos: 3, suitid: 300034, attrs: [['防御', '4.00'], ['速度', '11.00']] },
                        d4: { level: 15, pos: 4, suitid: 300034, attrs: [['效果命中', '55.00%'], ['速度', '10.00']] },
                        d5: { level: 15, pos: 5, suitid: 300034, attrs: [['生命', '114.00'], ['速度', '9.00']] },
                        d6: { level: 15, pos: 6, suitid: 300034, attrs: [['攻击加成', '55.00%'], ['速度', '8.00']] },
                        e1: { level: 15, pos: 1, suitid: 300010, attrs: [['攻击加成', '27.00%'], ['速度', '14.00']] },
                        e2: { level: 15, pos: 2, suitid: 300010, attrs: [['速度', '57.00'], ['暴击', '3.00%']] },
                        e3: { level: 15, pos: 3, suitid: 300010, attrs: [['防御', '4.00'], ['速度', '13.00']] },
                        e4: { level: 15, pos: 4, suitid: 300010, attrs: [['效果命中', '55.00%'], ['速度', '12.00']] },
                        e5: { level: 15, pos: 5, suitid: 300010, attrs: [['生命', '114.00'], ['速度', '11.00']] },
                        e6: { level: 15, pos: 6, suitid: 300010, attrs: [['攻击加成', '55.00%'], ['速度', '10.00']] },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)

        expect(result.hero).toMatchObject({
            areaName: '网易-心意相通',
            serverName: '夜之月',
            equipName: 'YYS柒十叁',
            priceText: '¥888',
            statusText: '上架中',
        })
        expect(result.hero.daysText).toContain('3376 天')
        expect(result.resources).toEqual(expect.arrayContaining([
            { label: '金币', value: '216135073' },
            { label: '勾玉', value: '83016' },
            { label: '体力', value: '456789' },
            { label: '蓝票', value: '190' },
            { label: '御札', value: '20250' },
            { label: '金御札', value: '99' },
            { label: '魂玉', value: '8' },
            { label: '黑蛋', value: '20' },
        ]))
        expect(result.collection.ownedSp).toBe(3)
        expect(result.collection.ownedSsr).toBe(3)
        expect(result.collection.linkageSummary).toEqual(expect.arrayContaining([
            '原服 夜之月',
            '成就 625',
            '荣誉 37',
        ]))
        expect(result.collection.skinSummary).toEqual(expect.arrayContaining([
            '庭院皮肤 2',
            '阴阳师皮肤 1',
            '结界皮肤 1',
            '式神皮肤 1',
        ]))
        expect(result.overview.inventorySummary).toEqual(expect.arrayContaining([
            '满级御魂 8975',
            '15级御魂 5813',
            '御魂加成分 2333444',
        ]))
        expect(result.overview.suitJudgements).toEqual(expect.arrayContaining([
            '斗技 2775 / 段位 9 / 名次 1318',
            '风姿度 46633',
            '红心值 95857',
        ]))
        expect(result.pve.headers).toEqual([...pveHeaders])
        expect(result.pve.rows[0]).toMatchObject({
            soulName: '狂荒歌土',
        })
        expect(result.speed.sections.map((section) => section.title)).toEqual([...speedSectionTitles])
        expect(result.speed.sections[3].rows.map((row) => row.label)).toEqual(expect.arrayContaining([
            '火灵',
            '遗念火',
            '共潜',
            '蚌精',
            '招财猫',
        ]))
    })

    it('derives pve preview rows from inventory when equip_desc does not provide pve_rows', () => {
        const data = {
            equip: {
                area_name: '中国区',
                server_name: '测试服',
                equip_name: 'PVE样例',
                price: 123400,
                status: 2,
                equip_desc: JSON.stringify({
                    sign_days: '1200',
                    head_skin_count: 9,
                    inventory: {
                        m1: { level: 15, qua: 6, pos: 1, suitid: 300048, attrs: [['攻击', '486.00'], ['暴击', '10.00%'], ['暴击伤害', '10.00%']] },
                        m2: { level: 15, qua: 6, pos: 2, suitid: 300048, attrs: [['攻击加成', '55.00%'], ['暴击', '10.00%'], ['暴击伤害', '10.00%']] },
                        m3: { level: 15, qua: 6, pos: 3, suitid: 300048, attrs: [['防御', '4.00'], ['暴击', '10.00%'], ['暴击伤害', '10.00%']] },
                        m4: { level: 15, qua: 6, pos: 4, suitid: 300048, attrs: [['攻击加成', '55.00%'], ['暴击', '10.00%'], ['暴击伤害', '10.00%']] },
                        m5: { level: 15, qua: 6, pos: 5, suitid: 300048, attrs: [['生命', '114.00'], ['暴击', '10.00%'], ['暴击伤害', '10.00%']] },
                        m6: { level: 15, qua: 6, pos: 6, suitid: 300048, attrs: [['暴击伤害', '89.00%'], ['暴击', '15.00%'], ['攻击加成', '5.00%'], ['暴击', '15.00%']] },
                        b1: { level: 15, qua: 6, pos: 1, suitid: 300050, attrs: [['攻击', '486.00'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['攻击加成', '8.00%'] },
                        b2: { level: 15, qua: 6, pos: 2, suitid: 300050, attrs: [['攻击加成', '55.00%'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['攻击加成', '8.00%'] },
                        h1: { level: 15, qua: 6, pos: 1, suitid: 300052, attrs: [['攻击', '486.00'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['暴击伤害', '8.00%'] },
                        h2: { level: 15, qua: 6, pos: 2, suitid: 300052, attrs: [['攻击加成', '55.00%'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['暴击伤害', '8.00%'] },
                        g1: { level: 15, qua: 6, pos: 1, suitid: 300077, attrs: [['攻击', '486.00'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['暴击', '8.00%'] },
                        g2: { level: 15, qua: 6, pos: 2, suitid: 300077, attrs: [['攻击加成', '55.00%'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['暴击', '8.00%'] },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)

        expect(result.hero.daysText).toContain('1200 天')
        expect(result.collection.skinSummary).toEqual(expect.arrayContaining(['头像框主题数 9']))
        expect(result.pve.rows).toHaveLength(1)
        expect(result.pve.rows[0]).toMatchObject({
            soulName: '狂骨',
        })
        expect(result.pve.rows[0].values).toHaveLength(4)
        expect(result.pve.rows[0].values[0].metricText).not.toBe('--')
        expect(result.pve.rows[0].values[1].metricText).not.toBe('--')
        expect(result.pve.rows[0].values[2].metricText).not.toBe('--')
        expect(result.pve.rows[0].values[3]).toMatchObject({
            heroName: '均值',
        })
    })

    it('prefers hero_history for collection progress and exposes key account depth metrics', () => {
        const data = {
            equip: {
                area_name: '中国区-iOS',
                server_name: '春之樱',
                equip_name: '深度样例',
                price: 660000,
                status: 2,
                equip_desc: JSON.stringify({
                    sp_coin: 1,
                    ssr_coin: 1,
                    heroes: {
                        sp1: { rarity: 6, star: 6, skinfo: [[1, 5], [2, 5], [3, 5]] },
                        sp2: { rarity: 6, star: 6, skinfo: [[1, 1], [2, 1], [3, 1]] },
                        ssr1: { rarity: 5, star: 6, skinfo: [[1, 5], [2, 5], [3, 5]] },
                    },
                    hero_history: {
                        sp: { got: 49, all: 49 },
                        ssr: { got: 58, all: 59 },
                        x: { got: 23, all: 25 },
                        ur: { got: 1, all: 1 },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)

        expect(result.collection).toMatchObject({
            ownedSp: 49,
            totalSp: 49,
            ownedSsr: 58,
            totalSsr: 59,
            ownedCollab: 23,
            totalCollab: 25,
            ownedUr: 1,
            totalUr: 1,
        })
        expect(result.collection.linkageSummary).toEqual(expect.arrayContaining([
            '六星式神 3',
            '满技能式神 2',
            '500SSR未使用',
            '999SP未使用',
        ]))
    })

    it('uses susanoo pve panel and applies the correct speed selection rules', () => {
        const data = {
            equip: {
                area_name: '中国区',
                server_name: '测试服',
                equip_name: '速度样例',
                price: 200000,
                status: 2,
                equip_desc: JSON.stringify({
                    heroes: {
                        hero1: { rarity: 5, star: 6, skinfo: [[1, 5], [2, 5], [3, 5]] },
                    },
                    inventory: {
                        s1: { level: 15, qua: 6, pos: 1, suitid: 300048, attrs: [['攻击', '486.00'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        s2: { level: 15, qua: 6, pos: 2, suitid: 300048, attrs: [['攻击加成', '55.00%'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        s3: { level: 15, qua: 6, pos: 3, suitid: 300048, attrs: [['防御', '4.00'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        s4: { level: 15, qua: 6, pos: 4, suitid: 300048, attrs: [['攻击加成', '55.00%'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        s5: { level: 15, qua: 6, pos: 5, suitid: 300048, attrs: [['生命', '114.00'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        s6: { level: 15, qua: 6, pos: 6, suitid: 300048, attrs: [['暴击', '15.00%'], ['攻击加成', '5.00%'], ['暴击伤害', '12.00%'], ['暴击', '15.00%']] },
                        b1: { level: 15, qua: 6, pos: 1, suitid: 300050, attrs: [['攻击', '486.00'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['攻击加成', '8.00%'] },
                        b2: { level: 15, qua: 6, pos: 2, suitid: 300050, attrs: [['攻击加成', '55.00%'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['攻击加成', '8.00%'] },

                        a1: { level: 15, pos: 1, suitid: 300111, attrs: [['攻击', '486.00'], ['速度', '16.00']] },
                        a2: { level: 15, pos: 2, suitid: 300112, attrs: [['速度', '57.00'], ['速度', '16.00']] },
                        a3: { level: 15, pos: 3, suitid: 300113, attrs: [['防御', '4.00'], ['速度', '15.00']] },
                        a4atk: { level: 15, pos: 4, suitid: 300114, attrs: [['攻击加成', '55.00%'], ['速度', '18.00']] },
                        a4hit: { level: 15, pos: 4, suitid: 300115, attrs: [['效果命中', '55.00%'], ['速度', '14.00']] },
                        a4res: { level: 15, pos: 4, suitid: 300116, attrs: [['效果抵抗', '55.00%'], ['速度', '13.00']] },
                        a5: { level: 15, pos: 5, suitid: 300117, attrs: [['生命', '114.00'], ['速度', '12.00']] },
                        a6: { level: 15, pos: 6, suitid: 300118, attrs: [['攻击加成', '55.00%'], ['速度', '11.00']] },

                        hl2: { level: 15, pos: 2, suitid: 300019, attrs: [['速度', '57.00'], ['速度', '10.00']] },
                        hl4: { level: 15, pos: 4, suitid: 300019, attrs: [['效果命中', '55.00%'], ['速度', '9.00']] },
                        hl5: { level: 15, pos: 5, suitid: 300019, attrs: [['生命', '114.00'], ['速度', '8.00']] },
                        hl6: { level: 15, pos: 6, suitid: 300019, attrs: [['攻击加成', '55.00%'], ['速度', '7.00']] },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)
        const scatter = result.speed.sections[0].rows[0]
        const hit = result.speed.sections[1].rows[0]
        const resist = result.speed.sections[2].rows[0]
        const fire = result.speed.sections[3].rows.find((row) => row.label === '火灵')
        const fullSpeedFirst = result.speed.fullSpeedPreview[0]

        expect(result.pve.rows[0]?.values[0]?.heroName).toBe('须佐之男')
        expect(result.overview.speedSummary).toBe('散件一速145')
        expect(scatter.slotTexts[1]).toBe('16.00')
        expect(hit.totalText).toBe('+141')
        expect(hit.slotTexts[3]).toBe('14.00')
        expect(hit.extraText).toContain('55')
        expect(resist.totalText).toBe('+140')
        expect(resist.slotTexts[3]).toBe('13.00')
        expect(fire).toBeDefined()
        expect(fire).toMatchObject({
            totalText: '+122',
            slotTexts: ['16.00', '10.00', '15.00', '9.00', '8.00', '7.00'],
        })
        expect(fullSpeedFirst).toMatchObject({
            position: 1,
            count: 1,
        })
        expect(fullSpeedFirst.rows[0]).toMatchObject({
            speedText: '16.00',
        })
    })

    it('uses full-crit gated susanoo attack-times-crit-damage formula for pve preview', () => {
        const data = {
            equip: {
                area_name: '中国区',
                server_name: '测试服',
                equip_name: 'PVE样例',
                price: 200000,
                status: 2,
                equip_desc: JSON.stringify({
                    inventory: {
                        // main soul: 狂骨
                        m1: { level: 15, qua: 6, pos: 1, suitid: 300048, attrs: [['攻击', '486.00'], ['攻击加成', '5.00%'], ['暴击', '10.00%'], ['暴击伤害', '14.00%']] },
                        m2: { level: 15, qua: 6, pos: 2, suitid: 300048, attrs: [['攻击加成', '55.00%'], ['攻击加成', '8.00%'], ['暴击', '10.00%'], ['暴击伤害', '10.00%']] },
                        m3: { level: 15, qua: 6, pos: 3, suitid: 300048, attrs: [['防御', '4.00'], ['攻击加成', '5.00%'], ['暴击', '10.00%'], ['暴击伤害', '14.00%']] },
                        m4: { level: 15, qua: 6, pos: 4, suitid: 300048, attrs: [['攻击加成', '55.00%'], ['攻击加成', '8.00%'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        m5: { level: 15, qua: 6, pos: 5, suitid: 300048, attrs: [['生命', '114.00'], ['攻击加成', '6.00%'], ['暴击', '10.00%'], ['暴击伤害', '15.00%']] },
                        m6cd: { level: 15, qua: 6, pos: 6, suitid: 300048, attrs: [['暴击伤害', '89.00%'], ['攻击加成', '5.00%'], ['暴击', '15.00%'], ['暴击伤害', '12.00%'], ['暴击', '15.00%']] },

                        // boss soul: 土蜘蛛
                        b1: { level: 15, qua: 6, pos: 1, suitid: 300050, attrs: [['攻击', '486.00'], ['攻击加成', '4.00%'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['攻击加成', '8.00%'] },
                        b2: { level: 15, qua: 6, pos: 2, suitid: 300050, attrs: [['攻击加成', '55.00%'], ['攻击加成', '5.00%'], ['暴击', '15.00%'], ['暴击伤害', '8.00%']], single_attr: ['攻击加成', '8.00%'] },

                        // distractors that have higher raw heuristic but do not reach 100 crit
                        x1: { level: 15, qua: 6, pos: 6, suitid: 300048, attrs: [['暴击伤害', '89.00%'], ['攻击加成', '10.00%'], ['暴击', '1.00%'], ['暴击伤害', '18.00%']] },
                        x2: { level: 15, qua: 6, pos: 5, suitid: 300048, attrs: [['生命', '114.00'], ['攻击加成', '9.00%'], ['暴击', '1.00%'], ['暴击伤害', '18.00%']] },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)
        expect(result.pve.rows[0]).toMatchObject({
            soulName: '狂骨',
        })
        expect(result.pve.rows[0]?.values[0]?.heroName).toBe('须佐之男')
        expect(result.pve.rows[0]?.values[0]?.metricText).toBe('36553')
    })

    it('keeps boss-soul candidates with critical single_attr in the pve heuristic pool', () => {
        const data = {
            equip: {
                area_name: '中国区',
                server_name: '测试服',
                equip_name: '首领固定属性样例',
                price: 200000,
                status: 2,
                equip_desc: JSON.stringify({
                    inventory: {
                        m3: { level: 15, qua: 6, pos: 3, suitid: 300048, attrs: [['防御', '104.00'], ['攻击加成', '5.00%'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        m4: { level: 15, qua: 6, pos: 4, suitid: 300048, attrs: [['攻击加成', '55.00%'], ['攻击加成', '8.00%'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        m5: { level: 15, qua: 6, pos: 5, suitid: 300048, attrs: [['生命', '2052.00'], ['攻击加成', '5.00%'], ['暴击', '10.00%'], ['暴击伤害', '12.00%']] },
                        m6: { level: 15, qua: 6, pos: 6, suitid: 300048, attrs: [['暴击伤害', '89.00%'], ['攻击加成', '5.00%'], ['暴击', '15.00%'], ['暴击伤害', '12.00%'], ['暴击', '15.00%']] },

                        b1a: { level: 15, qua: 6, pos: 1, suitid: 300050, attrs: [['攻击', '486.00'], ['攻击加成', '5.00%'], ['暴击', '5.00%'], ['暴击伤害', '5.00%']] },
                        b1b: { level: 15, qua: 6, pos: 1, suitid: 300050, attrs: [['攻击', '486.00'], ['攻击加成', '4.80%'], ['暴击', '5.20%'], ['暴击伤害', '5.00%']] },
                        b1c: { level: 15, qua: 6, pos: 1, suitid: 300050, attrs: [['攻击', '486.00'], ['攻击加成', '4.50%'], ['暴击', '5.30%'], ['暴击伤害', '5.10%']] },
                        b1d: { level: 15, qua: 6, pos: 1, suitid: 300050, attrs: [['攻击', '486.00'], ['攻击加成', '4.00%'], ['暴击', '4.00%'], ['暴击伤害', '4.00%']], single_attr: ['暴击', '8.00%'] },

                        b2: { level: 15, qua: 6, pos: 2, suitid: 300050, attrs: [['攻击加成', '55.00%'], ['攻击加成', '5.00%'], ['暴击', '20.00%'], ['暴击伤害', '8.00%']] },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)

        expect(result.pve.rows[0]).toMatchObject({
            soulName: '狂骨',
        })
        expect(result.pve.rows[0]?.values[0]?.heroName).toBe('须佐之男')
        expect(result.pve.rows[0]?.values[0]?.metricText).not.toBe('--')
    })

    it('keeps all full speed values for a slot instead of truncating them', () => {
        const data = {
            equip: {
                area_name: '测试区',
                server_name: '测试服',
                equip_name: '测试账号',
                price: 100,
                equip_desc: JSON.stringify({
                    inventory: {
                        known1: {
                            level: 15,
                            qua: 6,
                            pos: 5,
                            suitid: 300023,
                            attrs: [['生命', '114.00'], ['速度', '16.00']],
                        },
                        known2: {
                            level: 15,
                            qua: 6,
                            pos: 5,
                            suitid: 300024,
                            attrs: [['生命', '114.00'], ['速度', '16.30']],
                        },
                        known3: {
                            level: 15,
                            qua: 6,
                            pos: 5,
                            suitid: 300030,
                            attrs: [['生命', '114.00'], ['速度', '16.60']],
                        },
                        known4: {
                            level: 15,
                            qua: 6,
                            pos: 5,
                            suitid: 300039,
                            attrs: [['生命', '114.00'], ['速度', '16.90']],
                        },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)
        const slotFive = result.speed.fullSpeedPreview.find((item) => item.position === 5)

        expect(slotFive?.count).toBe(4)
        expect(slotFive?.rows.map((row) => row.speedText)).toEqual(['16.90', '16.60', '16.30', '16.00'])
    })

    it('sorts slot 2 full speed preview by displayed speed after removing main speed and only keeps speed-main souls', () => {
        const data = {
            equip: {
                area_name: '测试区',
                server_name: '测试服',
                equip_name: '测试账号',
                price: 100,
                equip_desc: JSON.stringify({
                    inventory: {
                        speedMainA: {
                            level: 15,
                            qua: 6,
                            pos: 2,
                            suitid: 300010,
                            attrs: [['速度', '57.00'], ['速度', '15.89']],
                        },
                        attackMainB: {
                            level: 15,
                            qua: 6,
                            pos: 2,
                            suitid: 300011,
                            attrs: [['攻击加成', '55.00%'], ['速度', '16.78']],
                        },
                        lifeMainD: {
                            level: 15,
                            qua: 6,
                            pos: 2,
                            suitid: 300013,
                            attrs: [['生命加成', '55.00%'], ['速度', '15.95']],
                        },
                        speedMainC: {
                            level: 15,
                            qua: 6,
                            pos: 2,
                            suitid: 300012,
                            attrs: [['速度', '57.00'], ['速度', '16.39']],
                        },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)
        const slotTwo = result.speed.fullSpeedPreview.find((item) => item.position === 2)

        expect(slotTwo?.count).toBe(2)
        expect(slotTwo?.rows.map((row) => row.speedText)).toEqual(['16.39', '15.89'])
    })

    it('does not force scatter total speed to two fixed decimals', () => {
        const data = {
            equip: {
                area_name: '测试区',
                server_name: '测试服',
                equip_name: '测试账号',
                price: 100,
                equip_desc: JSON.stringify({
                    inventory: {
                        p1: { level: 15, qua: 6, pos: 1, suitid: 300010, attrs: [['攻击', '486.00'], ['速度', '17.11']] },
                        p2: { level: 15, qua: 6, pos: 2, suitid: 300011, attrs: [['速度', '57.00'], ['速度', '16.12']] },
                        p3: { level: 15, qua: 6, pos: 3, suitid: 300012, attrs: [['防御', '104.00'], ['速度', '16.93']] },
                        p4: { level: 15, qua: 6, pos: 4, suitid: 300013, attrs: [['攻击加成', '55.00%'], ['速度', '16.74']] },
                        p5: { level: 15, qua: 6, pos: 5, suitid: 300014, attrs: [['生命', '2052.00'], ['速度', '16.55']] },
                        p6: { level: 15, qua: 6, pos: 6, suitid: 300015, attrs: [['攻击加成', '55.00%'], ['速度', '17.225']] },
                    },
                }),
            },
        }

        const result = analyzeCbgDetail(data, sourceUrl)
        const scatter = result.speed.sections[0].rows[0]

        expect(scatter.totalText).toBe('+157.675')
        expect(result.overview.speedSummary).toBe('散件一速157.675')
    })
})
