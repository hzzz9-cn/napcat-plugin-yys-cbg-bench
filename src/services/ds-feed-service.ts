import { ReportError } from './report-error';

type FetchImpl = typeof fetch;

export interface DsFeedServiceOptions {
    baseUrl: string;
    timeoutMs: number;
    maxReportAgeMs: number;
    fetchImpl?: FetchImpl;
    now?: () => number;
}

export interface DsFeedSnapshot {
    uid: string;
    nickName?: string;
    latestDynamicId: string | null;
    shouldReport: boolean;
    reportContent: string;
    imageUrls: string[];
}

export interface DsFeedService {
    fetchLatest: (uid: string, lastDynamicId: string | null) => Promise<DsFeedSnapshot>;
}

interface DsFeedBody {
    text?: string;
    media?: Array<{
        mimeType?: string;
        url?: string;
    }>;
}

function parseFeedBody(input: unknown): DsFeedBody | null {
    if (!input) return null;

    let parsed = input;
    if (typeof input === 'string') {
        try {
            parsed = JSON.parse(input);
        } catch {
            return null;
        }
    }

    if (!parsed || typeof parsed !== 'object') return null;
    const body = (parsed as { body?: unknown }).body;
    if (!body || typeof body !== 'object') return null;

    return body as DsFeedBody;
}

function buildReportContent(nickName: string, dynamicId: string, text: string): string {
    const firstLine = text.split('\n').map((item) => item.trim()).find(Boolean) ?? '点击查看详情';
    return `${nickName}发布了新动态：\r\n${firstLine}\r\n链接：https://ds.163.com/feed/${dynamicId}`;
}

export function createDsFeedService({
    baseUrl,
    timeoutMs,
    maxReportAgeMs,
    fetchImpl = fetch,
    now = () => Date.now(),
}: DsFeedServiceOptions): DsFeedService {
    return {
        fetchLatest: async (uid, lastDynamicId) => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
            let timeoutCleared = false;

            const clearTimeoutSafe = () => {
                if (timeoutCleared) return;
                clearTimeout(timeoutId);
                timeoutCleared = true;
            };

            try {
                const response = await fetchImpl(`${baseUrl}${encodeURIComponent(uid)}`, {
                    method: 'GET',
                    signal: controller.signal,
                });
                clearTimeoutSafe();

                if (!response.ok) {
                    throw new ReportError('DYNAMIC_FETCH_FAILED', '动态订阅检查失败，请稍后再试');
                }

                const payload = await response.json() as {
                    result?: {
                        feeds?: Array<{
                            id?: string | number;
                            createTime?: number;
                            content?: unknown;
                        }>;
                        userInfos?: Array<{
                            user?: {
                                nick?: string;
                            };
                        }>;
                    };
                };

                const currentFeed = payload.result?.feeds?.[0];
                const nickName = payload.result?.userInfos?.[0]?.user?.nick?.trim() || undefined;
                const dynamicId = currentFeed?.id ? String(currentFeed.id) : null;
                const body = parseFeedBody(currentFeed?.content);
                const bodyText = body?.text?.trim() ?? '';
                const imageUrls = (body?.media ?? [])
                    .filter((media) => media.mimeType?.startsWith('image') && typeof media.url === 'string')
                    .map((media) => media.url as string);

                if (!dynamicId || !nickName || !currentFeed || !body) {
                    return {
                        uid,
                        nickName,
                        latestDynamicId: dynamicId,
                        shouldReport: false,
                        reportContent: '',
                        imageUrls,
                    };
                }

                const ageMs = now() - Number(currentFeed.createTime ?? 0);
                const shouldReport = dynamicId !== lastDynamicId && ageMs >= 0 && ageMs <= maxReportAgeMs;

                return {
                    uid,
                    nickName,
                    latestDynamicId: dynamicId,
                    shouldReport,
                    reportContent: shouldReport ? buildReportContent(nickName, dynamicId, bodyText) : '',
                    imageUrls,
                };
            } catch (error) {
                if (error instanceof ReportError) throw error;
                throw new ReportError('DYNAMIC_FETCH_FAILED', '动态订阅检查失败，请稍后再试');
            } finally {
                clearTimeoutSafe();
            }
        },
    };
}
