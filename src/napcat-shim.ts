export interface PluginLogger {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
}

export interface PluginConfigItem {
    key?: string;
    type?: 'string' | 'number' | 'boolean' | 'select' | 'multi-select' | 'html' | 'text';
    label?: string;
    description?: string;
    default?: unknown;
    options?: Array<{ label: string; value: string | number }>;
    placeholder?: string;
    reactive?: boolean;
    hidden?: boolean;
}

export type PluginConfigSchema = PluginConfigItem[];

export interface PluginHttpRequest {
    path?: string;
    method?: string;
    query?: Record<string, string | string[] | undefined>;
    body?: unknown;
    headers?: Record<string, string | string[] | undefined>;
    params?: Record<string, string>;
    raw?: unknown;
}

export interface PluginHttpResponse {
    status(code: number): PluginHttpResponse;
    json(data: unknown): void;
    send(data: string | Buffer): void;
    setHeader(name: string, value: string): PluginHttpResponse;
    sendFile(filePath: string): void;
    redirect(url: string): void;
}

export interface PluginRouter {
    getNoAuth(path: string, handler: (req: PluginHttpRequest, res: PluginHttpResponse) => void | Promise<void>): void;
    postNoAuth(path: string, handler: (req: PluginHttpRequest, res: PluginHttpResponse) => void | Promise<void>): void;
    static(path: string, dir: string): void;
    page(input: {
        path: string;
        title: string;
        htmlFile: string;
        description?: string;
    }): void;
}

export interface NapCatConfigBuilder {
    combine: (...items: PluginConfigItem[]) => PluginConfigSchema;
    html: (content: string) => PluginConfigItem;
    boolean: (
        key: string,
        label: string,
        defaultValue?: boolean,
        description?: string,
        reactive?: boolean
    ) => PluginConfigItem;
    text: (
        key: string,
        label: string,
        defaultValue?: string,
        description?: string,
        reactive?: boolean
    ) => PluginConfigItem;
    number: (
        key: string,
        label: string,
        defaultValue?: number,
        description?: string,
        reactive?: boolean
    ) => PluginConfigItem;
}

export interface NapCatPluginContext {
    pluginName: string;
    dataPath: string;
    configPath: string;
    adapterName: string;
    pluginManager: {
        config: unknown;
    };
    logger: PluginLogger;
    router: PluginRouter;
    NapCatConfig: NapCatConfigBuilder;
    actions: {
        call: (
            action: string,
            params: unknown,
            adapterName: string,
            pluginManagerConfig: unknown
        ) => Promise<unknown>;
    };
}

export interface PluginModule {
    plugin_init?: (ctx: NapCatPluginContext) => Promise<void> | void;
    plugin_onmessage?: (ctx: NapCatPluginContext, event: OB11Message) => Promise<void> | void;
    plugin_onevent?: (ctx: NapCatPluginContext, event: Record<string, unknown>) => Promise<void> | void;
    plugin_cleanup?: (ctx: NapCatPluginContext) => Promise<void> | void;
    plugin_get_config?: (ctx: NapCatPluginContext) => Promise<unknown> | unknown;
    plugin_set_config?: (ctx: NapCatPluginContext, config: unknown) => Promise<void> | void;
    plugin_on_config_change?: (
        ctx: NapCatPluginContext,
        ui: unknown,
        key: string,
        value: unknown,
        currentConfig: unknown
    ) => Promise<void> | void;
}

export interface OB11PostSendMsg {
    message: string | Array<{ type: string; data: Record<string, unknown> }>;
    message_type: 'group' | 'private';
    group_id?: string;
    user_id?: string;
}

export interface OB11Message {
    post_type: string;
    raw_message?: string;
    message_type: 'group' | 'private';
    group_id?: number | string;
    user_id?: number | string;
    sender?: Record<string, unknown>;
}
