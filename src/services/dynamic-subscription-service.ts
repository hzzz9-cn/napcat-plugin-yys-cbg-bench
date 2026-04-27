import fs from 'node:fs';
import path from 'node:path';
import type { OB11PostSendMsg } from '../napcat-shim';
import type {
    DynamicSubscriptionPollSummary,
    DynamicSubscriptionRecord,
} from '../types';
import type { DsFeedService } from './ds-feed-service';

export interface DynamicSubscriptionServiceOptions {
    dataPath: string;
    dsFeedService: DsFeedService;
    logger?: {
        debug?: (...args: unknown[]) => void;
        warn?: (...args: unknown[]) => void;
        error?: (...args: unknown[]) => void;
    };
}

export interface DynamicSubscriptionService {
    list: () => DynamicSubscriptionRecord[];
    addDsSubscription: (uid: string, groupId: string) => {
        created: boolean;
        groupAdded: boolean;
        record: DynamicSubscriptionRecord;
    };
    removeSubscription: (input: { uidOrNick: string; groupId?: string }) => {
        removed: boolean;
        removedRecord: boolean;
        record: DynamicSubscriptionRecord | null;
    };
    pollAndDispatch: (
        dispatch: (groupId: string, message: OB11PostSendMsg['message']) => Promise<boolean>
    ) => Promise<DynamicSubscriptionPollSummary>;
}

const FILE_NAME = 'dynamic-subscriptions.json';

function isObject(input: unknown): input is Record<string, unknown> {
    return input !== null && typeof input === 'object' && !Array.isArray(input);
}

function sanitizeRecord(input: unknown): DynamicSubscriptionRecord | null {
    if (!isObject(input) || typeof input.uid !== 'string') return null;
    const uid = input.uid.trim();
    if (!uid) return null;

    const groups = Array.isArray(input.groups)
        ? Array.from(new Set(input.groups.map((item) => String(item).trim()).filter(Boolean)))
        : [];

    return {
        uid,
        platform: 'ds',
        groups,
        lastDynamicId: typeof input.lastDynamicId === 'string' && input.lastDynamicId.trim()
            ? input.lastDynamicId.trim()
            : null,
        nickName: typeof input.nickName === 'string' && input.nickName.trim()
            ? input.nickName.trim()
            : undefined,
        lastCheckedAt: typeof input.lastCheckedAt === 'string' && input.lastCheckedAt.trim()
            ? input.lastCheckedAt.trim()
            : undefined,
        lastPushedAt: typeof input.lastPushedAt === 'string' && input.lastPushedAt.trim()
            ? input.lastPushedAt.trim()
            : undefined,
    };
}

function buildDynamicMessage(text: string, imageUrls: string[]): OB11PostSendMsg['message'] {
    const message: Array<{ type: string; data: Record<string, unknown> }> = [
        { type: 'text', data: { text } },
    ];

    for (const url of imageUrls) {
        message.push({ type: 'image', data: { file: url } });
    }

    return message;
}

export function createDynamicSubscriptionService({
    dataPath,
    dsFeedService,
    logger,
}: DynamicSubscriptionServiceOptions): DynamicSubscriptionService {
    const filePath = path.join(dataPath, FILE_NAME);
    let pollPromise: Promise<DynamicSubscriptionPollSummary> | null = null;

    const ensureDir = () => {
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
    };

    const readAll = (): DynamicSubscriptionRecord[] => {
        ensureDir();
        if (!fs.existsSync(filePath)) return [];

        try {
            const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
            if (!Array.isArray(raw)) return [];
            return raw.map(sanitizeRecord).filter((item): item is DynamicSubscriptionRecord => Boolean(item));
        } catch (error) {
            logger?.warn?.('读取动态订阅文件失败，已回退为空列表', error);
            return [];
        }
    };

    const writeAll = (records: DynamicSubscriptionRecord[]) => {
        ensureDir();
        fs.writeFileSync(filePath, JSON.stringify(records, null, 2), 'utf-8');
    };

    return {
        list: () => readAll(),

        addDsSubscription: (uid, groupId) => {
            const normalizedUid = uid.trim();
            const normalizedGroupId = groupId.trim();
            const records = readAll();
            const existing = records.find((item) => item.uid === normalizedUid);

            if (existing) {
                if (!existing.groups.includes(normalizedGroupId)) {
                    existing.groups.push(normalizedGroupId);
                    existing.groups.sort();
                    writeAll(records);
                    return { created: false, groupAdded: true, record: existing };
                }

                return { created: false, groupAdded: false, record: existing };
            }

            const record: DynamicSubscriptionRecord = {
                uid: normalizedUid,
                platform: 'ds',
                groups: [normalizedGroupId],
                lastDynamicId: null,
            };
            records.push(record);
            writeAll(records);
            return { created: true, groupAdded: true, record };
        },

        removeSubscription: ({ uidOrNick, groupId }) => {
            const normalizedTarget = uidOrNick.trim();
            const normalizedGroupId = groupId?.trim();
            const records = readAll();
            const target = records.find((item) =>
                item.uid === normalizedTarget || item.nickName === normalizedTarget
            );

            if (!target) {
                return { removed: false, removedRecord: false, record: null };
            }

            if (normalizedGroupId) {
                const nextGroups = target.groups.filter((item) => item !== normalizedGroupId);
                if (nextGroups.length === target.groups.length) {
                    return { removed: false, removedRecord: false, record: target };
                }

                target.groups = nextGroups;
                if (target.groups.length === 0) {
                    writeAll(records.filter((item) => item !== target));
                    return { removed: true, removedRecord: true, record: null };
                }

                writeAll(records);
                return { removed: true, removedRecord: false, record: target };
            }

            writeAll(records.filter((item) => item !== target));
            return { removed: true, removedRecord: true, record: null };
        },

        pollAndDispatch: async (dispatch) => {
            if (pollPromise) return pollPromise;

            pollPromise = (async () => {
                const records = readAll();
                let changed = false;
                let checkedCount = 0;
                let pushedCount = 0;
                let updatedCount = 0;

                for (const record of records) {
                    checkedCount++;
                    try {
                        const snapshot = await dsFeedService.fetchLatest(record.uid, record.lastDynamicId);
                        const checkedAt = new Date().toISOString();
                        if (record.lastCheckedAt !== checkedAt) {
                            record.lastCheckedAt = checkedAt;
                            changed = true;
                        }

                        if (snapshot.nickName && snapshot.nickName !== record.nickName) {
                            record.nickName = snapshot.nickName;
                            changed = true;
                            updatedCount++;
                        }

                        if (!snapshot.shouldReport || !snapshot.latestDynamicId || !snapshot.reportContent) {
                            continue;
                        }

                        const message = buildDynamicMessage(snapshot.reportContent, snapshot.imageUrls);
                        let sentAny = false;
                        for (const groupId of record.groups) {
                            const sent = await dispatch(groupId, message);
                            if (sent) {
                                pushedCount++;
                                sentAny = true;
                            }
                        }

                        if (sentAny) {
                            record.lastDynamicId = snapshot.latestDynamicId;
                            record.lastPushedAt = new Date().toISOString();
                            changed = true;
                            updatedCount++;
                        }
                    } catch (error) {
                        logger?.error?.(`检查订阅 UID ${record.uid} 的动态失败`, error);
                    }
                }

                if (changed) {
                    writeAll(records.filter((item) => item.groups.length > 0));
                }

                return {
                    checkedCount,
                    pushedCount,
                    updatedCount,
                };
            })();

            try {
                return await pollPromise;
            } finally {
                pollPromise = null;
            }
        },
    };
}
