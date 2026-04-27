import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { PluginConfig } from '../types'
import { IconTerminal } from '../components/icons'

export default function ConfigPage() {
    const [config, setConfig] = useState<PluginConfig | null>(null)
    const [saving, setSaving] = useState(false)

    const fetchConfig = useCallback(async () => {
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) setConfig(res.data)
        } catch { showToast('获取配置失败', 'error') }
    }, [])

    useEffect(() => { fetchConfig() }, [fetchConfig])

    const saveConfig = useCallback(async (update: Partial<PluginConfig>) => {
        if (!config) return
        setSaving(true)
        try {
            const newConfig = { ...config, ...update }
            await noAuthFetch('/config', {
                method: 'POST',
                body: JSON.stringify(newConfig),
            })
            setConfig(newConfig)
            showToast('配置已保存', 'success')
        } catch {
            showToast('保存失败', 'error')
        } finally {
            setSaving(false)
        }
    }, [config])

    const updateField = <K extends keyof PluginConfig>(key: K, value: PluginConfig[K]) => {
        if (!config) return
        const updated = { ...config, [key]: value }
        setConfig(updated)
        saveConfig({ [key]: value })
    }

    if (!config) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">加载配置中...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 stagger-children">
            {/* 基础配置 */}
            <div className="card p-5 hover-lift">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-5">
                    <IconTerminal size={16} className="text-gray-400" />
                    基础配置
                </h3>
                <div className="space-y-5">
                    <ToggleRow
                        label="启用插件"
                        desc="全局开关，关闭后不响应任何命令"
                        checked={config.enabled}
                        onChange={(v) => updateField('enabled', v)}
                    />
                    <ToggleRow
                        label="调试模式"
                        desc="启用后输出详细日志到控制台"
                        checked={config.debug}
                        onChange={(v) => updateField('debug', v)}
                    />
                    <ToggleRow
                        label="自动解析藏宝阁链接"
                        desc="群聊中出现合法藏宝阁链接时自动触发分析并回图"
                        checked={config.autoParseLinks}
                        onChange={(v) => updateField('autoParseLinks', v)}
                    />
                    <InputRow
                        label="命令前缀"
                        desc="触发命令的前缀"
                        value={config.commandPrefix}
                        onChange={(v) => updateField('commandPrefix', v)}
                    />
                    <InputRow
                        label="冷却时间 (秒)"
                        desc="同一命令请求冷却时间，0 表示不限制"
                        value={String(config.cooldownSeconds)}
                        type="number"
                        onChange={(v) => updateField('cooldownSeconds', Number(v) || 0)}
                    />
                    <InputRow
                        label="请求超时 (ms)"
                        desc="藏宝阁详情接口请求超时时间"
                        value={String(config.requestTimeoutMs)}
                        type="number"
                        onChange={(v) => updateField('requestTimeoutMs', Number(v) || 0)}
                    />
                    <InputRow
                        label="渲染超时 (ms)"
                        desc="HTML 海报渲染和截图的最长等待时间"
                        value={String(config.maxRenderMs)}
                        type="number"
                        onChange={(v) => updateField('maxRenderMs', Number(v) || 0)}
                    />
                    <InputRow
                        label="截图服务接口"
                        desc="napcat-plugin-puppeteer 的 render API 地址，同机部署通常保持默认即可"
                        value={config.renderServiceEndpoint}
                        onChange={(v) => updateField('renderServiceEndpoint', v.trim())}
                    />
                    <InputRow
                        label="报告保留 (小时)"
                        desc="超过该时长的报告会在后台自动清理"
                        value={String(config.reportRetentionHours)}
                        type="number"
                        onChange={(v) => updateField('reportRetentionHours', Number(v) || 0)}
                    />
                    <InputRow
                        label="最近报告上限"
                        desc="WebUI 中保留的最近报告条数"
                        value={String(config.maxRecentReports)}
                        type="number"
                        onChange={(v) => updateField('maxRecentReports', Number(v) || 0)}
                    />
                    <ToggleRow
                        label="启用动态订阅"
                        desc="允许群管理员使用添加订阅 / 删除订阅 / 订阅清单命令，并开启后台动态轮询"
                        checked={config.dynamicSubscriptionsEnabled}
                        onChange={(v) => updateField('dynamicSubscriptionsEnabled', v)}
                    />
                    <InputRow
                        label="动态轮询间隔 (分钟)"
                        desc="网易大神动态的检查周期，最小 1 分钟"
                        value={String(config.dynamicPollingIntervalMinutes)}
                        type="number"
                        onChange={(v) => updateField('dynamicPollingIntervalMinutes', Math.max(1, Number(v) || 1))}
                    />
                    <InputRow
                        label="动态推送时效 (ms)"
                        desc="超过该时长的旧动态不会再回推到群聊"
                        value={String(config.dynamicMaxReportAgeMs)}
                        type="number"
                        onChange={(v) => updateField('dynamicMaxReportAgeMs', Math.max(0, Number(v) || 0))}
                    />
                    <InputRow
                        label="网易大神动态接口"
                        desc="仅在网易大神动态接口发生变化时需要覆盖"
                        value={config.dynamicDsBaseUrl}
                        onChange={(v) => updateField('dynamicDsBaseUrl', v.trim())}
                    />
                </div>
            </div>

            {saving && (
                <div className="saving-indicator fixed bottom-4 right-4 bg-primary text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                    <div className="loading-spinner !w-3 !h-3 !border-[1.5px]" />
                    保存中...
                </div>
            )}
        </div>
    )
}

/* ---- 子组件 ---- */

function ToggleRow({ label, desc, checked, onChange }: {
    label: string; desc: string; checked: boolean; onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </div>
            <label className="toggle">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
                <div className="slider" />
            </label>
        </div>
    )
}

function InputRow({ label, desc, value, type = 'text', onChange }: {
    label: string; desc: string; value: string; type?: string; onChange: (v: string) => void
}) {
    const [local, setLocal] = useState(value)
    useEffect(() => { setLocal(value) }, [value])

    const handleBlur = () => {
        if (local !== value) onChange(local)
    }

    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-2">{desc}</div>
            <input
                className="input-field"
                type={type}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            />
        </div>
    )
}
