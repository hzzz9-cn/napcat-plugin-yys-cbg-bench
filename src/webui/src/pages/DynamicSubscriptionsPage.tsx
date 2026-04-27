import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type {
    DynamicSubscriptionPollSummary,
    DynamicSubscriptionRecord,
    GroupInfo,
} from '../types'
import { IconBell, IconRefresh, IconX, IconCheck } from '../components/icons'

export default function DynamicSubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<DynamicSubscriptionRecord[]>([])
    const [groups, setGroups] = useState<GroupInfo[]>([])
    const [uid, setUid] = useState('')
    const [groupId, setGroupId] = useState('')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [polling, setPolling] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [subscriptionsRes, groupsRes] = await Promise.all([
                noAuthFetch<DynamicSubscriptionRecord[]>('/dynamic/subscriptions'),
                noAuthFetch<GroupInfo[]>('/groups'),
            ])

            if (subscriptionsRes.code === 0 && subscriptionsRes.data) {
                setSubscriptions(subscriptionsRes.data)
            }
            if (groupsRes.code === 0 && groupsRes.data) {
                setGroups(groupsRes.data)
            }
        } catch {
            showToast('获取动态订阅数据失败', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void fetchData()
    }, [fetchData])

    const enabledGroups = useMemo(
        () => groups.filter((group) => group.enabled),
        [groups]
    )

    useEffect(() => {
        if (!groupId && enabledGroups[0]) {
            setGroupId(String(enabledGroups[0].group_id))
        }
    }, [enabledGroups, groupId])

    const groupNameMap = useMemo(() => {
        return Object.fromEntries(groups.map((group) => [String(group.group_id), group.group_name || String(group.group_id)]))
    }, [groups])

    const addSubscription = async () => {
        const normalizedUid = uid.trim()
        if (!normalizedUid || !groupId) {
            showToast('请输入 UID 并选择群', 'warning')
            return
        }

        setSubmitting(true)
        try {
            await noAuthFetch('/dynamic/subscriptions', {
                method: 'POST',
                body: JSON.stringify({ uid: normalizedUid, groupId }),
            })
            setUid('')
            await fetchData()
            showToast('订阅已添加', 'success')
        } catch {
            showToast('添加订阅失败', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const removeSubscription = async (uidOrNick: string, targetGroupId?: string) => {
        try {
            await noAuthFetch('/dynamic/subscriptions/remove', {
                method: 'POST',
                body: JSON.stringify({ uidOrNick, groupId: targetGroupId }),
            })
            await fetchData()
            showToast('订阅已删除', 'success')
        } catch {
            showToast('删除订阅失败', 'error')
        }
    }

    const pollNow = async () => {
        setPolling(true)
        try {
            const res = await noAuthFetch<DynamicSubscriptionPollSummary>('/dynamic/subscriptions/poll', {
                method: 'POST',
            })
            const summary = res.data
            if (summary) {
                showToast(
                    `检查 ${summary.checkedCount} 项，推送 ${summary.pushedCount} 条，更新 ${summary.updatedCount} 项`,
                    'success',
                )
            } else {
                showToast('订阅检查完成', 'success')
            }
            await fetchData()
        } catch {
            showToast('手动检查失败', 'error')
        } finally {
            setPolling(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">加载动态订阅中...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="card p-5 hover-lift">
                <div className="flex items-center justify-between gap-4 mb-5">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <IconBell size={16} className="text-gray-400" />
                            添加订阅
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">命令侧支持 `添加订阅 UID`、`删除订阅 UID`、`订阅清单`</p>
                    </div>
                    <button className="btn btn-ghost text-xs" onClick={fetchData}>
                        <IconRefresh size={13} />
                        刷新
                    </button>
                </div>

                <div className="grid lg:grid-cols-[1.3fr,1fr,auto,auto] gap-3 items-end">
                    <Field label="网易大神 UID">
                        <input
                            className="input-field"
                            value={uid}
                            onChange={(e) => setUid(e.target.value)}
                            placeholder="输入要订阅的 UID"
                        />
                    </Field>
                    <Field label="推送群">
                        <select
                            className="input-field"
                            value={groupId}
                            onChange={(e) => setGroupId(e.target.value)}
                        >
                            {enabledGroups.length > 0 ? enabledGroups.map((group) => (
                                <option key={group.group_id} value={group.group_id}>
                                    {group.group_name} ({group.group_id})
                                </option>
                            )) : (
                                <option value="">暂无已启用群</option>
                            )}
                        </select>
                    </Field>
                    <button
                        className="btn btn-primary text-xs h-10"
                        disabled={submitting || enabledGroups.length === 0}
                        onClick={addSubscription}
                    >
                        <IconCheck size={13} />
                        添加
                    </button>
                    <button
                        className="btn btn-ghost text-xs h-10"
                        disabled={polling}
                        onClick={pollNow}
                    >
                        <IconRefresh size={13} />
                        手动检查
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-white/[0.02]">
                            <th className="py-2.5 px-4 font-medium">昵称 / UID</th>
                            <th className="py-2.5 px-4 font-medium">平台</th>
                            <th className="py-2.5 px-4 font-medium">推送群</th>
                            <th className="py-2.5 px-4 font-medium">最近动态</th>
                            <th className="py-2.5 px-4 font-medium">检查时间</th>
                            <th className="py-2.5 px-4 font-medium text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {subscriptions.map((subscription) => (
                            <tr key={subscription.uid} className="align-top hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 px-4">
                                    <div className="font-medium text-gray-800 dark:text-gray-200">
                                        {subscription.nickName || subscription.uid}
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono mt-1">{subscription.uid}</div>
                                </td>
                                <td className="py-3 px-4 text-xs text-gray-500">网易大神</td>
                                <td className="py-3 px-4">
                                    <div className="flex flex-wrap gap-2">
                                        {subscription.groups.map((item) => (
                                            <button
                                                key={`${subscription.uid}-${item}`}
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-600 dark:text-gray-300"
                                                onClick={() => removeSubscription(subscription.uid, item)}
                                                title="移除此群的订阅关系"
                                            >
                                                <span>{groupNameMap[item] || item}</span>
                                                <IconX size={12} />
                                            </button>
                                        ))}
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-xs text-gray-500 font-mono">
                                    {subscription.lastDynamicId || '-'}
                                </td>
                                <td className="py-3 px-4 text-xs text-gray-500">
                                    {subscription.lastCheckedAt || '-'}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button
                                        className="btn btn-danger text-xs"
                                        onClick={() => removeSubscription(subscription.uid)}
                                    >
                                        <IconX size={13} />
                                        删除整项
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {subscriptions.length === 0 && (
                    <div className="py-12 text-center empty-state">
                        <p className="text-gray-400 text-sm">暂无动态订阅</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">{label}</div>
            <div className="text-xs text-gray-400 mb-2">只支持网易大神动态 UID，群需先在群管理中启用。</div>
            {children}
        </div>
    )
}
