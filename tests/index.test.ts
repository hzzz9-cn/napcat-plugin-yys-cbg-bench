import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { pluginState } from '../src/core/state'
import { plugin_cleanup, plugin_init } from '../src/index'
import { createTestPluginContext } from './setup/test-plugin-context'

describe('plugin_init', () => {
    afterEach(async () => {
        const ctx = createTestPluginContext()
        await plugin_cleanup?.(ctx)
    })

    it('registers report static files and runtime report services', async () => {
        const ctx = createTestPluginContext()

        await plugin_init?.(ctx)

        expect(ctx.router.static).toHaveBeenCalledWith('/static/reports', `${ctx.dataPath}/reports`)
        expect(pluginState.reportStorage).not.toBeNull()
        expect(pluginState.reportOrchestrator).not.toBeNull()
        expect(pluginState.timers.has('report-cleanup')).toBe(true)
    })

    it('bundles the report template into the plugin source instead of requiring runtime template lookup', () => {
        const source = readFileSync(path.resolve(process.cwd(), 'src/index.ts'), 'utf-8')

        expect(source).toContain("report-poster.html?raw")
        expect(source).not.toContain("未找到报告模板 report-poster.html")
    })
})
