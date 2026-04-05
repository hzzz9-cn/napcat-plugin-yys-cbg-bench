/**
 * 类型定义文件
 * 定义插件内部使用的接口和类型
 *
 * 注意：OneBot 相关类型（OB11Message, OB11PostSendMsg 等）
 * 以及插件框架类型（NapCatPluginContext, PluginModule 等）
 * 均来自 napcat-types 包，无需在此重复定义。
 */

// ==================== 插件配置 ====================

/**
 * 插件主配置接口
 * 在此定义你的插件所需的所有配置项
 */
export interface PluginConfig {
    /** 全局开关：是否启用插件功能 */
    enabled: boolean;
    /** 调试模式：启用后输出详细日志 */
    debug: boolean;
    /** 自动解析群聊中的藏宝阁链接 */
    autoParseLinks: boolean;
    /** 触发命令前缀，默认为 #cmd */
    commandPrefix: string;
    /** 同一命令请求冷却时间（秒），0 表示不限制 */
    cooldownSeconds: number;
    /** 请求藏宝阁接口的超时时间（毫秒） */
    requestTimeoutMs: number;
    /** 海报渲染超时时间（毫秒） */
    maxRenderMs: number;
    /** 报告保留时间（小时） */
    reportRetentionHours: number;
    /** 最近报告列表的最大条数 */
    maxRecentReports: number;
    /** 按群的单独配置 */
    groupConfigs: Record<string, GroupConfig>;
}

/**
 * 群配置
 */
export interface GroupConfig {
    /** 是否启用此群的功能 */
    enabled?: boolean;
}

// ==================== 报告索引与视图模型 ====================

export interface ReportListItem {
    reportId: string;
    sourceUrl: string;
    groupId: string;
    imageUrl: string;
    generatedAt: string;
    status: 'success' | 'error';
    summary: string;
}

export interface BenchPosterViewModel {
    reportId: string;
    sourceUrl: string;
    generatedAt: string;
    hero: {
        areaName: string;
        serverName: string;
        equipName: string;
        priceText: string;
        statusText: string;
        daysText: string;
    };
    highlights: string[];
    resources: Array<{ label: string; value: string }>;
    collection: {
        missingSp: number;
        missingSsr: number;
        linkageSummary: string[];
        skinSummary: string[];
    };
    yuhun: {
        speedSummary: string;
        critSummary: string;
        inventorySummary: string[];
        suitJudgements: string[];
    };
    warnings: string[];
}

// ==================== API 响应 ====================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
    /** 状态码，0 表示成功，-1 表示失败 */
    code: number;
    /** 错误信息（仅错误时返回） */
    message?: string;
    /** 响应数据（仅成功时返回） */
    data?: T;
}
