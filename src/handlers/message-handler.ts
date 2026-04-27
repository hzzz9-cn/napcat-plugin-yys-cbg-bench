/**
 * 消息处理器
 *
 * 处理接收到的 QQ 消息事件，包含：
 * - 命令解析与分发
 * - CD 冷却管理
 * - 消息发送工具函数
 *
 * 最佳实践：将不同类型的业务逻辑拆分到不同的 handler 文件中，
 * 保持每个文件职责单一。
 */

import fs from 'node:fs/promises';
import type { NapCatPluginContext, OB11Message, OB11PostSendMsg } from '../napcat-shim';
import { pluginState } from '../core/state';
import { extractFirstCbgUrl } from '../services/cbg-link-service';
import { parseDynamicCommand } from '../services/dynamic-command-service';
import { ReportError } from '../services/report-error';

// ==================== CD 冷却管理 ====================

/** CD 冷却记录 key: `${groupId}:${command}`, value: 过期时间戳 */
const cooldownMap = new Map<string, number>();

/**
 * 检查是否在 CD 中
 * @returns 剩余秒数，0 表示可用
 */
function getCooldownRemaining(groupId: number | string, command: string): number {
    const cdSeconds = pluginState.config.cooldownSeconds ?? 60;
    if (cdSeconds <= 0) return 0;

    const key = `${groupId}:${command}`;
    const expireTime = cooldownMap.get(key);
    if (!expireTime) return 0;

    const remaining = Math.ceil((expireTime - Date.now()) / 1000);
    if (remaining <= 0) {
        cooldownMap.delete(key);
        return 0;
    }
    return remaining;
}

/** 设置 CD 冷却 */
function setCooldown(groupId: number | string, command: string): void {
    const cdSeconds = pluginState.config.cooldownSeconds ?? 60;
    if (cdSeconds <= 0) return;
    cooldownMap.set(`${groupId}:${command}`, Date.now() + cdSeconds * 1000);
}

// ==================== 消息发送工具 ====================

/**
 * 发送消息（通用）
 * 根据消息类型自动发送到群或私聊
 *
 * @param ctx 插件上下文
 * @param event 原始消息事件（用于推断回复目标）
 * @param message 消息内容（支持字符串或消息段数组）
 */
export async function sendReply(
    ctx: NapCatPluginContext,
    event: OB11Message,
    message: OB11PostSendMsg['message']
): Promise<boolean> {
    try {
        const params: OB11PostSendMsg = {
            message,
            message_type: event.message_type,
            ...(event.message_type === 'group' && event.group_id
                ? { group_id: String(event.group_id) }
                : {}),
            ...(event.message_type === 'private' && event.user_id
                ? { user_id: String(event.user_id) }
                : {}),
        };
        await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
        return true;
    } catch (error) {
        pluginState.logger.error('发送消息失败:', error);
        return false;
    }
}

async function buildImageMessageFile(imagePath: string): Promise<string> {
    const imageBuffer = await fs.readFile(imagePath);
    return `base64://${imageBuffer.toString('base64')}`;
}

/**
 * 发送群消息
 */
export async function sendGroupMessage(
    ctx: NapCatPluginContext,
    groupId: number | string,
    message: OB11PostSendMsg['message']
): Promise<boolean> {
    try {
        const params: OB11PostSendMsg = {
            message,
            message_type: 'group',
            group_id: String(groupId),
        };
        await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
        return true;
    } catch (error) {
        pluginState.logger.error('发送群消息失败:', error);
        return false;
    }
}

/**
 * 发送私聊消息
 */
export async function sendPrivateMessage(
    ctx: NapCatPluginContext,
    userId: number | string,
    message: OB11PostSendMsg['message']
): Promise<boolean> {
    try {
        const params: OB11PostSendMsg = {
            message,
            message_type: 'private',
            user_id: String(userId),
        };
        await ctx.actions.call('send_msg', params, ctx.adapterName, ctx.pluginManager.config);
        return true;
    } catch (error) {
        pluginState.logger.error('发送私聊消息失败:', error);
        return false;
    }
}

// ==================== 合并转发消息 ====================

/** 合并转发消息节点 */
export interface ForwardNode {
    type: 'node';
    data: {
        nickname: string;
        user_id?: string;
        content: Array<{ type: string; data: Record<string, unknown> }>;
    };
}

/**
 * 发送合并转发消息
 * @param ctx 插件上下文
 * @param target 群号或用户 ID
 * @param isGroup 是否为群消息
 * @param nodes 合并转发节点列表
 */
export async function sendForwardMsg(
    ctx: NapCatPluginContext,
    target: number | string,
    isGroup: boolean,
    nodes: ForwardNode[],
): Promise<boolean> {
    try {
        const actionName = isGroup ? 'send_group_forward_msg' : 'send_private_forward_msg';
        const params: Record<string, unknown> = { message: nodes };
        if (isGroup) {
            params.group_id = String(target);
        } else {
            params.user_id = String(target);
        }
        await ctx.actions.call(
            actionName as 'send_group_forward_msg',
            params as never,
            ctx.adapterName,
            ctx.pluginManager.config,
        );
        return true;
    } catch (error) {
        pluginState.logger.error('发送合并转发消息失败:', error);
        return false;
    }
}

// ==================== 权限检查 ====================

/**
 * 检查群聊中是否有管理员权限
 * 私聊消息默认返回 true
 */
export function isAdmin(event: OB11Message): boolean {
    if (event.message_type !== 'group') return true;
    const role = (event.sender as Record<string, unknown>)?.role;
    return role === 'admin' || role === 'owner';
}

// ==================== 消息处理主函数 ====================

/**
 * 消息处理主函数
 * 在这里实现你的命令处理逻辑
 */
export async function handleMessage(ctx: NapCatPluginContext, event: OB11Message): Promise<void> {
    try {
        const rawMessage = event.raw_message || '';
        const messageType = event.message_type;
        const groupId = event.group_id;

        pluginState.ctx.logger.debug(`收到消息: ${rawMessage} | 类型: ${messageType}`);

        const command = parseDynamicCommand(rawMessage, pluginState.config.commandPrefix);
        if (command) {
            await handleDynamicCommand(ctx, event, command);
            return;
        }

        const link = pluginState.config.autoParseLinks ? extractFirstCbgUrl(rawMessage) : null;
        if (!link) return;

        if (messageType === 'group' && groupId && !pluginState.isGroupEnabled(String(groupId))) {
            return;
        }

        await sendReply(ctx, event, '正在分析这条藏宝阁链接，请稍等');

        if (!pluginState.reportOrchestrator) {
            const message = '插件尚未完成初始化';
            pluginState.appendRecentError(message);
            await sendReply(ctx, event, `分析失败：${message}`);
            return;
        }

        try {
            const report = await pluginState.reportOrchestrator.generateReport(link, String(groupId ?? 'private'));

            pluginState.setReports([
                {
                    reportId: report.reportId,
                    sourceUrl: link,
                    groupId: String(groupId ?? 'private'),
                    imageUrl: report.imageUrl,
                    generatedAt: report.generatedAt,
                    status: 'success',
                    summary: report.summary,
                },
                ...pluginState.reports,
            ]);
            pluginState.incrementProcessed();

            const imageFile = await buildImageMessageFile(report.imagePath);
            await sendReply(ctx, event, [
                { type: 'text', data: { text: report.summary } },
                { type: 'image', data: { file: imageFile } },
            ]);
        } catch (error) {
            const publicMessage = error instanceof ReportError ? error.publicMessage : '分析失败，请稍后再试';
            pluginState.appendRecentError(publicMessage);
            pluginState.logger.error('藏宝阁分析失败:', error);
            await sendReply(ctx, event, `分析失败：${publicMessage}`);
        }
    } catch (error) {
        pluginState.logger.error('处理消息时出错:', error);
    }
}

async function handleDynamicCommand(
    ctx: NapCatPluginContext,
    event: OB11Message,
    command: ReturnType<typeof parseDynamicCommand>
): Promise<void> {
    if (!command) return;

    if (!pluginState.config.dynamicSubscriptionsEnabled) {
        await sendReply(ctx, event, '动态订阅功能当前未启用');
        return;
    }

    if (event.message_type !== 'group' || !event.group_id) {
        await sendReply(ctx, event, '动态订阅命令仅支持在群聊中使用');
        return;
    }

    if (!isAdmin(event)) {
        await sendReply(ctx, event, '您没有权限进行此操作，请联系群管理员');
        return;
    }

    const service = pluginState.dynamicSubscriptionService;
    if (!service) {
        await sendReply(ctx, event, '动态订阅服务尚未完成初始化');
        return;
    }

    if (command.type === 'unsupported-platform') {
        await sendReply(ctx, event, `暂不支持平台：${command.platformLabel}`);
        return;
    }

    if (command.type === 'list') {
        const subscriptions = service.list().filter((item) => item.groups.includes(String(event.group_id)));
        if (subscriptions.length === 0) {
            await sendReply(ctx, event, '当前群尚未订阅任何动态');
            return;
        }

        const lines = subscriptions.map((item) => {
            const name = item.nickName || item.uid;
            return `${name} (网易大神)`;
        });
        await sendReply(ctx, event, `订阅信息如下：\n${lines.join('\n')}`);
        return;
    }

    if (command.type === 'add') {
        const result = service.addDsSubscription(command.uid, String(event.group_id));
        if (!result.groupAdded) {
            await sendReply(ctx, event, `已经存在网易大神的订阅 ${command.uid}`);
            return;
        }

        await sendReply(ctx, event, `成功添加网易大神订阅：${command.uid}`);
        return;
    }

    if (command.type === 'remove') {
        const result = service.removeSubscription({
            uidOrNick: command.target,
            groupId: String(event.group_id),
        });

        if (!result.removed) {
            await sendReply(ctx, event, `当前群还未订阅 ${command.target}`);
            return;
        }

        await sendReply(ctx, event, `成功取消订阅：${command.target}`);
        return;
    }

    if (command.type === 'poll') {
        const summary = await service.pollAndDispatch(async (targetGroupId, message) => {
            return sendGroupMessage(ctx, targetGroupId, message);
        });
        await sendReply(
            ctx,
            event,
            `订阅检查完成：检查 ${summary.checkedCount} 项，推送 ${summary.pushedCount} 条，更新 ${summary.updatedCount} 项`
        );
    }
}
