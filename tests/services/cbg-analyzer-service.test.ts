import { describe, expect, it } from 'vitest'
import cbgDetailFixture from '../fixtures/cbg-detail.fixture.json'
import { analyzeCbgDetail } from '../../src/services/cbg-analyzer-service'

const sourceUrl = 'https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV'

describe('cbg-analyzer-service', () => {
    it('builds a minimal poster view model from fixture data', () => {
        const result = analyzeCbgDetail(cbgDetailFixture as unknown, sourceUrl)

        expect(result.hero.equipName).toBe('脱敏账号')
        expect(result.hero.priceText).toBe('¥64800')
        expect(result.resources).toEqual(expect.arrayContaining([{ label: '战力', value: '123456' }]))
        expect(Array.isArray(result.highlights)).toBe(true)
        expect(result.yuhun.inventorySummary[0]).toContain('御魂总数')
    })
})
