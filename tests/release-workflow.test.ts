import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('release workflow', () => {
    it('packages templates into the GitHub release zip', () => {
        const workflow = readFileSync(path.resolve(process.cwd(), '.github/workflows/release.yml'), 'utf-8')

        expect(workflow).toContain('cp -r dist/templates release/')
        expect(workflow).toContain('zip -r ../${PLUGIN_NAME}.zip index.mjs package.json webui templates')
    })
})
