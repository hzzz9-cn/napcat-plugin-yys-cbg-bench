export type DynamicCommand =
    | { type: 'list' }
    | { type: 'poll' }
    | { type: 'add'; uid: string; platform: 'ds' }
    | { type: 'remove'; target: string }
    | { type: 'unsupported-platform'; platformLabel: string };

const LIST_COMMANDS = new Set(['订阅清单', '订阅列表', '全部订阅']);

function stripPrefix(rawMessage: string, commandPrefix: string): string {
    const trimmed = rawMessage.trim();
    if (!commandPrefix.trim()) return trimmed;
    if (!trimmed.startsWith(commandPrefix)) return trimmed;
    return trimmed.slice(commandPrefix.length).trim();
}

function normalizePlatform(input: string): 'ds' | null {
    const text = input.trim();
    if (text === '网易大神' || text.toLowerCase() === 'ds') return 'ds';
    return null;
}

export function parseDynamicCommand(rawMessage: string, commandPrefix: string): DynamicCommand | null {
    const content = stripPrefix(rawMessage, commandPrefix);
    if (!content) return null;

    if (LIST_COMMANDS.has(content)) {
        return { type: 'list' };
    }

    if (content === '检查订阅' || content === '立即检查订阅') {
        return { type: 'poll' };
    }

    if (content.startsWith('删除订阅')) {
        const target = content.slice('删除订阅'.length).trim();
        return target ? { type: 'remove', target } : null;
    }

    if (content.startsWith('添加订阅')) {
        const parts = content.split(/\s+/).filter(Boolean);
        if (parts.length === 2) {
            return { type: 'add', uid: parts[1], platform: 'ds' };
        }
        if (parts.length >= 3) {
            const platform = normalizePlatform(parts[1]);
            if (!platform) {
                return { type: 'unsupported-platform', platformLabel: parts[1] };
            }
            return { type: 'add', uid: parts[2], platform };
        }
    }

    return null;
}
