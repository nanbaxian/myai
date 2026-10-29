# P2 文件放置指南

## 新增文件

| 交付文件 | 放置路径 | 说明 |
|---------|---------|------|
| `MemoryManager.tsx` | `components/MemoryManager.tsx` | 记忆可视化管理弹窗 |
| `PersonaSwitcher.tsx` | `components/PersonaSwitcher.tsx` | 多人设切换面板 |
| `cf-personas.ts` | `functions/api/personas.ts` | 人设列表 CRUD |
| `cf-personas-active.ts` | `functions/api/personas/active.ts` | 活跃人设读写 |
| `cf-memory-core.ts` | `functions/api/memory/core.ts` | 核心记忆管理 |
| `cf-memory-snapshots.ts` | `functions/api/memory/snapshots.ts` | 快照管理 |

## 更新文件（覆盖替换）

| 交付文件 | 放置路径 | 改动 |
|---------|---------|------|
| `page.tsx` | `app/page.tsx` | 接入三个弹窗，切换人设清空消息 |
| `Sidebar.tsx` | `components/Sidebar.tsx` | 新增三个操作按钮 |
| `memory-engine.ts` | `lib/memory-engine.ts` | 向量嵌入生成 + 语义搜索 |
| `context-builder.ts` | `lib/context-builder.ts` | 语义匹配记忆注入 |

## 数据库（Cloudflare D1）

数据库绑定名为 `myai`，表结构由以下文件定义：

- `schema-d1-knowledgeos.sql`：租户、机器人、文档、会话、人设、用量等表
- `schema-d1-memory-chat.sql`：聊天记录、核心记忆、记忆快照、用户套餐、应用设置

执行方式：

```bash
npx wrangler d1 execute myai --remote --file schema-d1-knowledgeos.sql
npx wrangler d1 execute myai --remote --file schema-d1-memory-chat.sql
```

## 新增目录

```bash
mkdir -p functions/api/personas
mkdir -p functions/api/memory
```

## P2 完成检查清单

- [ ] 侧边栏有三个按钮：人设 / 记忆 / 切换
- [ ] 记忆管理弹窗能看到核心记忆和快照，能单条删除
- [ ] 手动触发压缩按钮有响应
- [ ] 人设切换面板能看到所有人设，点击切换后聊天记录清空
- [ ] 预设人设模板能一键创建
- [ ] 创建新人设能正常保存并切换
- [ ] 向量搜索：压缩记忆后，新对话的 System Prompt 里出现"和这个话题相关的记忆"

## 语音成本分层（Free/Pro）

- Free：Deepgram ASR + Google TTS，默认每日 10 分钟（按 Clerk user_id 计）
- Pro ：Deepgram ASR + ElevenLabs TTS

需要在 Cloudflare Pages 里配置：

- 环境变量：
  - `DEEPGRAM_API_KEY`、`GOOGLE_TTS_API_KEY`、`ELEVENLABS_API_KEY`（可选）、`ELEVENLABS_VOICE_ID`（可选）
- KV 绑定：`VOICE_KV`（用于免费用户每日配额）

## 登录（Clerk）

Sidebar 底部的登录入口跳转到 `/auth/login`，由 Clerk 处理登录和注册。

- 客户端：`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`（写在 `.env.local`，构建时注入）
- 服务端 Worker：`CLERK_SECRET_KEY`（用 `npx wrangler secret put CLERK_SECRET_KEY` 设置）
- 聊天、RAG 和图片分析全部走 Workers AI（`wrangler.toml` 的 `[ai]` 绑定，无需外部 API key）
- 可选：`WORKERS_AI_MODEL`（默认 `@cf/qwen/qwen3-30b-a3b-fp8`，中文较好且耗费较低）、`WORKERS_AI_VISION_MODEL`（默认 `@cf/meta/llama-3.2-11b-vision-instruct`）、`WORKERS_AI_MAX_TOKENS`（默认 200）
- 免费额度每天 10,000 Neurons，用完后 `/api/chat` 返回 429

> `/api/voice` 已强制要求登录：请求必须带 `Authorization: Bearer <Clerk session token>`。

## 全项目完成！

P0 ✅ 文字对话 + 流式输出 + 人设设定 + 短期记忆
P1 ✅ 语音输入输出 + 图片识别 + 记忆压缩 Cron
P2 ✅ 向量语义搜索 + 记忆管理页面 + 多人设切换


## R2 (New)
- Bind an R2 bucket as `BUCKET`
- Upload endpoint: POST /api/upload (multipart field: file)
- Public read: GET /r2/:key
