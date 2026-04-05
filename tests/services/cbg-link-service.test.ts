import { describe, expect, it } from 'vitest'
import { extractFirstCbgUrl, isValidCbgUrl, normalizeCbgUrl } from '../../src/services/cbg-link-service'

describe('cbg-link-service', () => {
    const baseLink = 'https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV'

    it('extracts the first valid cbg link from a mixed message', () => {
        const message = [
            '先看看这个无关链接 https://example.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV',
            '再看看 https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV',
            '最后还有 https://yys.cbg.163.com/cgi/mweb/equip/20/202604052001616-20-W1CJXG4PBFYEE',
        ].join(' ')

        const link = extractFirstCbgUrl(message)

        expect(link).toBe('https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV')
    })

    it.each([
        ['（%s）', '（https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV）'],
        ['【%s】', '【https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV】'],
    ])('extracts clean link when wrapped by fullwidth brackets: %s', (_label, message) => {
        const link = extractFirstCbgUrl(message)

        expect(link).toBe(baseLink)
    })

    it.each([
        ['。', `链接是 ${baseLink}。`],
        [',', `链接是 ${baseLink},`],
    ])('extracts clean link when ending with punctuation: %s', (_label, message) => {
        const link = extractFirstCbgUrl(message)

        expect(link).toBe(baseLink)
    })

    it('rejects non yys.cbg.163.com links', () => {
        const link = 'https://example.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV'

        expect(isValidCbgUrl(link)).toBe(false)
    })

    it('validates after normalization', () => {
        const raw = 'yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV'
        const normalized = normalizeCbgUrl(raw)

        expect(normalized).toBe('https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV')
        expect(isValidCbgUrl(normalized)).toBe(true)
    })

    it('rejects extra path segments beyond ordersn', () => {
        const link = `${baseLink}/extra`

        expect(isValidCbgUrl(link)).toBe(false)
    })
})
