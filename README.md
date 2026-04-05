# 阴阳师藏宝阁分析 NapCat 插件

这是一个以群聊自动触发为主入口的 NapCat 插件。群里出现合法的阴阳师藏宝阁链接后，机器人会先回复“正在分析”，随后生成一张数据海报并回图；WebUI 负责查看状态、最近报告、错误摘要和群开关。

## 使用方式

1. 安装依赖：

```bash
pnpm install
pnpm exec playwright install chromium
```

2. 本地开发或构建：

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

3. 部署到 NapCat 插件目录后，在群聊中发送类似下面的链接：

```text
https://yys.cbg.163.com/cgi/mweb/equip/9/202603281001616-9-VLP4WCHMFPJMEV
https://yys.cbg.163.com/cgi/mweb/equip/20/202604052001616-20-W1CJXG4PBFYEE
```

## 插件行为

插件会：

1. 自动识别群消息中的阴阳师藏宝阁链接。
2. 立即回复“正在分析这条藏宝阁链接，请稍等”。
3. 拉取藏宝阁详情并生成结构化视图模型。
4. 通过 HTML 模板 + Playwright 渲染 PNG 海报。
5. 回发图片消息，并把最近报告写入 WebUI 状态页。

分析失败时，只返回受控错误文案，不暴露本地目录、绝对路径或堆栈。

## WebUI

WebUI 主要提供这些能力：

1. 查看插件运行状态、处理统计、最近报告和最近错误。
2. 修改自动解析、请求超时、渲染超时、报告保留时长等配置。
3. 管理哪些群允许自动分析并回图。
4. 通过 API 手动触发过期报告清理。

## 目录说明

```text
src/services/cbg-*.ts           解析、抓取、分析服务
src/services/report-*.ts        渲染、存储、编排服务
src/handlers/message-handler.ts 群消息触发入口
templates/report-poster.html    数据海报模板
tests/                          Vitest 测试
```

## 验证

常用验证命令：

```bash
pnpm test
pnpm run typecheck
pnpm run build
```
