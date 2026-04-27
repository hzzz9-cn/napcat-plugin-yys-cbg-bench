/**
 * API 服务模块
 * 注册 WebUI API 路由
 *
 * 路由类型说明：
 * ┌─────────────────┬──────────────────────────────────────────────┬─────────────────┐
 * │ 类型            │ 路径前缀                                      │ 注册方法        │
 * ├─────────────────┼──────────────────────────────────────────────┼─────────────────┤
 * │ 需要鉴权 API    │ /api/Plugin/ext/<plugin-id>/                 │ router.get/post │
 * │ 无需鉴权 API    │ /plugin/<plugin-id>/api/                     │ router.getNoAuth│
 * │ 静态文件        │ /plugin/<plugin-id>/files/<urlPath>/         │ router.static   │
 * │ 内存文件        │ /plugin/<plugin-id>/mem/<urlPath>/           │ router.staticOnMem│
 * │ 页面            │ /plugin/<plugin-id>/page/<path>             │ router.page     │
 * └─────────────────┴──────────────────────────────────────────────┴─────────────────┘
 *
 * 一般插件自带的 WebUI 页面使用 NoAuth 路由，因为页面本身已在 NapCat WebUI 内嵌展示。
 */

import type { NapCatPluginContext } from '../napcat-shim';
import { pluginState } from '../core/state';
import { refreshPluginRuntime, syncPluginTimers } from '../runtime';

async function sendGroupMessage(
    ctx: NapCatPluginContext,
    groupId: string,
    message: string | Array<{ type: string; data: Record<string, unknown> }>
): Promise<boolean> {
    try {
        await ctx.actions.call(
            'send_msg',
            {
                message,
                message_type: 'group',
                group_id: String(groupId),
            },
            ctx.adapterName,
            ctx.pluginManager.config,
        );
        return true;
    } catch (error) {
        ctx.logger.error(`发送动态订阅消息到群 ${groupId} 失败:`, error);
        return false;
    }
}

/**
 * 注册 API 路由
 */
export function registerApiRoutes(ctx: NapCatPluginContext): void {
    const router = ctx.router;

    // ==================== 插件信息（无鉴权）====================

    /** 获取插件状态 */
    router.getNoAuth('/status', (_req, res) => {
        res.json({
            code: 0,
            data: {
                pluginName: ctx.pluginName,
                uptime: pluginState.getUptime(),
                uptimeFormatted: pluginState.getUptimeFormatted(),
                config: pluginState.config,
                stats: pluginState.stats,
                reports: pluginState.reports,
                recentErrors: pluginState.recentErrors,
            },
        });
    });

    /** 获取最近报告列表 */
    router.getNoAuth('/reports', (_req, res) => {
        res.json({
            code: 0,
            data: pluginState.reports,
        });
    });

    /** 手动清理过期报告 */
    router.postNoAuth('/reports/cleanup', async (_req, res) => {
        try {
            pluginState.cleanupExpiredReports();
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('清理报告失败:', err);
            res.status(500).json({ code: -1, message: '清理报告失败' });
        }
    });

    // ==================== 配置管理（无鉴权）====================

    /** 获取配置 */
    router.getNoAuth('/config', (_req, res) => {
        res.json({ code: 0, data: pluginState.config });
    });

    /** 保存配置 */
    router.postNoAuth('/config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            if (!body) {
                return res.status(400).json({ code: -1, message: '请求体为空' });
            }
            pluginState.updateConfig(body as Partial<import('../types').PluginConfig>);
            refreshPluginRuntime(ctx);
            syncPluginTimers(ctx);
            ctx.logger.info('配置已保存');
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('保存配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 群管理（无鉴权）====================

    /** 获取群列表（附带各群启用状态） */
    router.getNoAuth('/groups', async (_req, res) => {
        try {
            const groups = await ctx.actions.call(
                'get_group_list',
                {},
                ctx.adapterName,
                ctx.pluginManager.config
            ) as Array<{ group_id: number; group_name: string; member_count: number; max_member_count: number }>;

            const groupsWithConfig = (groups || []).map((group) => {
                const groupId = String(group.group_id);
                return {
                    group_id: group.group_id,
                    group_name: group.group_name,
                    member_count: group.member_count,
                    max_member_count: group.max_member_count,
                    enabled: pluginState.isGroupEnabled(groupId),
                };
            });

            res.json({ code: 0, data: groupsWithConfig });
        } catch (e) {
            ctx.logger.error('获取群列表失败:', e);
            res.status(500).json({ code: -1, message: String(e) });
        }
    });

    /** 更新单个群配置 */
    router.postNoAuth('/groups/:id/config', async (req, res) => {
        try {
            const groupId = req.params?.id;
            if (!groupId) {
                return res.status(400).json({ code: -1, message: '缺少群 ID' });
            }

            const body = req.body as Record<string, unknown> | undefined;
            const enabled = body?.enabled;
            pluginState.updateGroupConfig(groupId, { enabled: Boolean(enabled) });
            ctx.logger.info(`群 ${groupId} 配置已更新: enabled=${enabled}`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('更新群配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    /** 批量更新群配置 */
    router.postNoAuth('/groups/bulk-config', async (req, res) => {
        try {
            const body = req.body as Record<string, unknown> | undefined;
            const { enabled, groupIds } = body || {};

            if (typeof enabled !== 'boolean' || !Array.isArray(groupIds)) {
                return res.status(400).json({ code: -1, message: '参数错误' });
            }

            for (const groupId of groupIds) {
                pluginState.updateGroupConfig(String(groupId), { enabled });
            }

            ctx.logger.info(`批量更新群配置完成 | 数量: ${groupIds.length}, enabled=${enabled}`);
            res.json({ code: 0, message: 'ok' });
        } catch (err) {
            ctx.logger.error('批量更新群配置失败:', err);
            res.status(500).json({ code: -1, message: String(err) });
        }
    });

    // ==================== 动态订阅管理（无鉴权）====================

    router.getNoAuth('/dynamic/subscriptions', (_req, res) => {
        const service = pluginState.dynamicSubscriptionService;
        if (!service) {
            return res.status(503).json({ code: -1, message: '动态订阅服务未初始化' });
        }

        res.json({
            code: 0,
            data: service.list(),
        });
    });

    router.postNoAuth('/dynamic/subscriptions', async (req, res) => {
        try {
            const service = pluginState.dynamicSubscriptionService;
            if (!service) {
                return res.status(503).json({ code: -1, message: '动态订阅服务未初始化' });
            }

            const body = req.body as Record<string, unknown> | undefined;
            const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
            const groupId = typeof body?.groupId === 'string' || typeof body?.groupId === 'number'
                ? String(body.groupId).trim()
                : '';

            if (!uid || !groupId) {
                return res.status(400).json({ code: -1, message: '缺少 UID 或群 ID' });
            }

            const result = service.addDsSubscription(uid, groupId);
            res.json({
                code: 0,
                message: result.groupAdded ? 'ok' : 'duplicate',
                data: result.record,
            });
        } catch (error) {
            ctx.logger.error('新增动态订阅失败:', error);
            res.status(500).json({ code: -1, message: '新增动态订阅失败' });
        }
    });

    router.postNoAuth('/dynamic/subscriptions/remove', async (req, res) => {
        try {
            const service = pluginState.dynamicSubscriptionService;
            if (!service) {
                return res.status(503).json({ code: -1, message: '动态订阅服务未初始化' });
            }

            const body = req.body as Record<string, unknown> | undefined;
            const uidOrNick = typeof body?.uidOrNick === 'string' ? body.uidOrNick.trim() : '';
            const groupId = typeof body?.groupId === 'string' || typeof body?.groupId === 'number'
                ? String(body.groupId).trim()
                : undefined;

            if (!uidOrNick) {
                return res.status(400).json({ code: -1, message: '缺少 UID 或昵称' });
            }

            const result = service.removeSubscription({ uidOrNick, groupId });
            if (!result.removed) {
                return res.status(404).json({ code: -1, message: '订阅不存在' });
            }

            res.json({ code: 0, message: 'ok' });
        } catch (error) {
            ctx.logger.error('删除动态订阅失败:', error);
            res.status(500).json({ code: -1, message: '删除动态订阅失败' });
        }
    });

    router.postNoAuth('/dynamic/subscriptions/poll', async (_req, res) => {
        try {
            const service = pluginState.dynamicSubscriptionService;
            if (!service) {
                return res.status(503).json({ code: -1, message: '动态订阅服务未初始化' });
            }

            const summary = await service.pollAndDispatch((groupId, message) => sendGroupMessage(ctx, groupId, message));
            res.json({ code: 0, data: summary, message: 'ok' });
        } catch (error) {
            ctx.logger.error('手动检查动态订阅失败:', error);
            res.status(500).json({ code: -1, message: '手动检查动态订阅失败' });
        }
    });

    ctx.logger.debug('API 路由注册完成');
}
