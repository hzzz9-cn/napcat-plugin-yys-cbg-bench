/**
 * 插件配置模块
 * 定义默认配置值和 WebUI 配置 Schema
 */

import type { NapCatPluginContext, PluginConfigSchema } from './napcat-shim';
import type { PluginConfig } from './types';

/** 默认配置 */
export const DEFAULT_CONFIG: PluginConfig = {
    enabled: true,
    debug: false,
    autoParseLinks: true,
    commandPrefix: '#cbg',
    cooldownSeconds: 30,
    requestTimeoutMs: 10000,
    maxRenderMs: 15000,
    renderServiceEndpoint: 'http://127.0.0.1:6099/plugin/napcat-plugin-puppeteer/api/render',
    reportRetentionHours: 24,
    maxRecentReports: 20,
    dynamicSubscriptionsEnabled: true,
    dynamicPollingIntervalMinutes: 2,
    dynamicMaxReportAgeMs: 60 * 60 * 1000,
    dynamicDsBaseUrl: 'https://inf.ds.163.com/v1/web/feed/basic/getSomeOneFeeds?feedTypes=1,2,3,6&someOneUid=',
    groupConfigs: {},
};

/**
 * 构建 WebUI 配置 Schema
 *
 * 使用 ctx.NapCatConfig 提供的构建器方法生成配置界面：
 *   - boolean(key, label, defaultValue?, description?, reactive?)  → 开关
 *   - text(key, label, defaultValue?, description?, reactive?)     → 文本输入
 *   - number(key, label, defaultValue?, description?, reactive?)   → 数字输入
 *   - select(key, label, options, defaultValue?, description?)     → 下拉单选
 *   - multiSelect(key, label, options, defaultValue?, description?) → 下拉多选
 *   - html(content)     → 自定义 HTML 展示（不保存值）
 *   - plainText(content) → 纯文本说明
 *   - combine(...items)  → 组合多个配置项为 Schema
 */
export function buildConfigSchema(ctx: NapCatPluginContext): PluginConfigSchema {
    return ctx.NapCatConfig.combine(
        // 插件信息头部
        ctx.NapCatConfig.html(`
            <div style="padding: 16px; background: #FB7299; border-radius: 12px; margin-bottom: 20px; color: white;">
                <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 600;">阴阳师藏宝阁分析</h3>
                <p style="margin: 0; font-size: 13px; opacity: 0.85;">自动识别群聊藏宝阁链接并生成账号分析海报</p>
            </div>
        `),
        // 全局开关
        ctx.NapCatConfig.boolean('enabled', '启用插件', true, '是否启用此插件的功能'),
        // 调试模式
        ctx.NapCatConfig.boolean('debug', '调试模式', false, '启用后将输出详细的调试日志'),
        // 自动解析链接
        ctx.NapCatConfig.boolean('autoParseLinks', '自动解析链接', true, '自动识别群聊中的藏宝阁链接'),
        // 命令前缀
        ctx.NapCatConfig.text('commandPrefix', '命令前缀', '#cbg', '手动指令前缀（预留）'),
        // 冷却时间
        ctx.NapCatConfig.number('cooldownSeconds', '冷却时间（秒）', 30, '同一群触发分析的冷却时间，0 表示不限制'),
        // 请求超时
        ctx.NapCatConfig.number('requestTimeoutMs', '请求超时（毫秒）', 10000, '藏宝阁请求的超时时间'),
        // 渲染超时
        ctx.NapCatConfig.number('maxRenderMs', '渲染超时（毫秒）', 15000, '海报渲染与截图超时'),
        // 截图服务接口
        ctx.NapCatConfig.text(
            'renderServiceEndpoint',
            '截图服务接口',
            'http://127.0.0.1:6099/plugin/napcat-plugin-puppeteer/api/render',
            '部署在同一台服务器时保持默认即可；如 NapCat 端口不同可在此覆盖',
        ),
        // 报告保留时间
        ctx.NapCatConfig.number('reportRetentionHours', '报告保留时间（小时）', 24, '超过该时间的报告会被清理'),
        // 最近报告上限
        ctx.NapCatConfig.number('maxRecentReports', '最近报告上限', 20, 'WebUI 中最多保留的报告条数'),
        // 动态订阅开关
        ctx.NapCatConfig.boolean(
            'dynamicSubscriptionsEnabled',
            '启用动态订阅',
            true,
            '启用后可使用添加订阅 / 删除订阅 / 订阅清单命令，并按周期检查网易大神动态',
        ),
        // 动态轮询间隔
        ctx.NapCatConfig.number(
            'dynamicPollingIntervalMinutes',
            '动态轮询间隔（分钟）',
            2,
            '检查订阅动态的轮询周期，最小 1 分钟',
        ),
        // 动态推送时效
        ctx.NapCatConfig.number(
            'dynamicMaxReportAgeMs',
            '动态推送时效（毫秒）',
            60 * 60 * 1000,
            '超过该时长的旧动态不再回推到群聊',
        ),
        // 网易大神动态接口
        ctx.NapCatConfig.text(
            'dynamicDsBaseUrl',
            '网易大神动态接口',
            'https://inf.ds.163.com/v1/web/feed/basic/getSomeOneFeeds?feedTypes=1,2,3,6&someOneUid=',
            '仅在网易大神接口发生变化时需要覆盖',
        ),
    );
}
