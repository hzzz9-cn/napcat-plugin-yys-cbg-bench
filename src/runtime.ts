import type { NapCatPluginContext } from './napcat-shim';
import { pluginState } from './core/state';
import { analyzeCbgDetail } from './services/cbg-analyzer-service';
import { createCbgFetchService } from './services/cbg-fetch-service';
import { createDsFeedService } from './services/ds-feed-service';
import { createDynamicSubscriptionService } from './services/dynamic-subscription-service';
import { createReportOrchestratorService } from './services/report-orchestrator-service';
import { createReportRenderService } from './services/report-render-service';
import { createReportStorageService } from './services/report-storage-service';
import reportPosterTemplateHtml from '../templates/report-poster.html?raw';

export function refreshPluginRuntime(ctx: NapCatPluginContext): void {
    const reportStorage = createReportStorageService({
        dataPath: ctx.dataPath,
        pluginStaticBase: `/plugin/${ctx.pluginName}/files/static/reports`,
        retentionHours: pluginState.config.reportRetentionHours,
        maxRecentReports: pluginState.config.maxRecentReports,
    });
    const reportRenderer = createReportRenderService({
        templateHtml: reportPosterTemplateHtml,
        renderEndpoint: pluginState.config.renderServiceEndpoint,
        requestTimeoutMs: pluginState.config.maxRenderMs,
    });
    const reportOrchestrator = createReportOrchestratorService({
        fetchService: createCbgFetchService({
            timeoutMs: pluginState.config.requestTimeoutMs,
        }),
        analyzer: analyzeCbgDetail,
        storage: reportStorage,
        renderer: reportRenderer,
    });
    const dynamicSubscriptionService = createDynamicSubscriptionService({
        dataPath: ctx.dataPath,
        dsFeedService: createDsFeedService({
            baseUrl: pluginState.config.dynamicDsBaseUrl,
            timeoutMs: pluginState.config.requestTimeoutMs,
            maxReportAgeMs: pluginState.config.dynamicMaxReportAgeMs,
        }),
        logger: ctx.logger,
    });

    pluginState.setRuntimeServices({
        reportStorage,
        reportOrchestrator,
        dynamicSubscriptionService,
    });
}

export function syncPluginTimers(ctx: NapCatPluginContext): void {
    pluginState.startCleanupTimer(() => {
        pluginState.cleanupExpiredReports();
    });

    const service = pluginState.dynamicSubscriptionService;
    if (!service || !pluginState.config.dynamicSubscriptionsEnabled) {
        pluginState.stopTimer('dynamic-subscription-poll');
        return;
    }

    const intervalMinutes = Math.max(1, pluginState.config.dynamicPollingIntervalMinutes);
    pluginState.startTimer('dynamic-subscription-poll', intervalMinutes * 60 * 1000, async () => {
        await service.pollAndDispatch(async (groupId, message) => {
            try {
                await ctx.actions.call(
                    'send_msg',
                    {
                        message_type: 'group',
                        group_id: String(groupId),
                        message,
                    },
                    ctx.adapterName,
                    ctx.pluginManager.config,
                );
                return true;
            } catch (error) {
                ctx.logger.error(`发送动态订阅消息到群 ${groupId} 失败:`, error);
                return false;
            }
        });
    });
}
