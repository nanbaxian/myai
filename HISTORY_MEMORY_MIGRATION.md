# History 和 Memory API 迁移指南

## 已完成的迁移
- ✅ `/api/personas/active.ts` - D1 + Clerk
- ✅ `/api/persona.ts` - D1 + Clerk
- ✅ `/api/personas.ts` - D1 + Clerk
- ✅ `/api/upload.ts` - Clerk (保持 R2 存储)
- ✅ `/api/voice.ts` - Clerk (保持 STT/TTS)

---

## 待处理：History API (2 个)

### `/api/history/index.ts`

**当前代码：**
```typescript
import { listChatSessions, createChatSession } from '../../../lib/chat-history'
interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}
```

**迁移步骤：**
1. 替换导入：
```typescript
// OLD:
import { listChatSessions, createChatSession } from '../../../lib/chat-history'

// NEW: (需要先创建 D1 版本的函数)
import { listConversations, createConversation } from '../../../lib/knowledgeos-d1'
import { verifyClerkToken } from '../../../lib/api-middleware'
```

2. 替换 Env：
```typescript
// OLD:
interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

// NEW:
import { D1Env } from '../../../lib/knowledgeos-d1'
interface Env extends D1Env {}
```

3. 添加 Clerk 认证：
```typescript
export const onRequestGet: PagesFunction<Env> = async ctx => {
  const authHeader = ctx.request.headers.get('Authorization') || ''
  const user = await verifyClerkToken(authHeader)
  const tenantId = readTenantId(ctx.request)
  // ...使用 D1 查询
}
```

### `/api/history/[id].ts`

**迁移方式同上** - 替换 Supabase 调用为 D1 查询

---

## 待处理：Memory API (4 个)

### `/api/memory/core.ts`
### `/api/memory/list.ts`
### `/api/memory/snapshots.ts`
### `/api/memory/compress.ts`

**快速迁移方式：**

1. 查看 `lib/chat-history` 中的内存相关函数
2. 如果已在使用 D1，检查是否需要添加 Clerk 认证
3. 如果还在使用 Supabase，按照上述模式迁移

---

## 关键库迁移

### `lib/chat-history.ts` 需要迁移的函数

需要检查并转换为 D1 版本：
- `listChatSessions()` → `listConversations()` (已在 D1 库)
- `createChatSession()` → `createConversation()` (需要添加)
- `getChatSession()` → 查询单个 conversation
- `patchChatSession()` → 更新 conversation
- `deleteChatSession()` → 删除 conversation

---

## 快速完成清单

### 第一步：添加缺失的 D1 函数到 `lib/knowledgeos-d1.ts`

```typescript
// 如果还没有这些，添加到文件末尾：

export async function createConversation(
  env: D1Env,
  conversation: D1Conversation
): Promise<D1Conversation | null> {
  return dbAll<D1Conversation>(
    env,
    `INSERT INTO conversations (id, tenant_id, bot_id, created_by, title, channel, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING *`,
    [conversation.id, conversation.tenant_id, conversation.bot_id, conversation.created_by, 
     conversation.title, conversation.channel, conversation.created_at, conversation.updated_at]
  ).then(rows => rows?.[0] ?? null)
}

export async function getConversation(
  env: D1Env,
  conversationId: string
): Promise<D1Conversation | null> {
  return dbFirst<D1Conversation>(
    env,
    `SELECT * FROM conversations WHERE id = ? LIMIT 1`,
    [conversationId]
  )
}

export async function updateConversation(
  env: D1Env,
  conversationId: string,
  updates: Partial<D1Conversation>
): Promise<D1Conversation | null> {
  const now = new Date().toISOString()
  const setClause = Object.keys(updates)
    .filter(k => updates[k as keyof D1Conversation] !== undefined)
    .map(k => `${k}=?`)
    .join(', ')
  
  if (!setClause) return getConversation(env, conversationId)
  
  const params = Object.values(updates).filter(v => v !== undefined)
  params.push(now, conversationId)
  
  return dbFirst<D1Conversation>(
    env,
    `UPDATE conversations SET ${setClause}, updated_at=? WHERE id=? RETURNING *`,
    params
  )
}

export async function deleteConversation(env: D1Env, conversationId: string): Promise<boolean> {
  return dbRun(env, `DELETE FROM conversations WHERE id = ?`, [conversationId])
}
```

### 第二步：批量替换 API 文件中的认证

```bash
# 在所有 history 和 memory API 中：
# 1. 替换导入
sed -i 's/verifySupabaseJwt/verifyClerkToken/g' functions/api/history/*.ts
sed -i 's/verifySupabaseJwt/verifyClerkToken/g' functions/api/memory/*.ts

# 2. 添加认证调用
# 每个 onRequest* 函数添加：
const authHeader = request.headers.get('Authorization') || ''
const user = await verifyClerkToken(authHeader)
```

---

## 测试用例

### History API
```bash
# GET /api/history - 列表
curl -H "Authorization: Bearer $TOKEN" \
  https://app.com/api/history

# POST /api/history - 创建
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Chat","persona_id":"..."}' \
  https://app.com/api/history

# GET /api/history/[id] - 详情
curl -H "Authorization: Bearer $TOKEN" \
  https://app.com/api/history/conv_abc123
```

### Memory API
```bash
# GET /api/memory/core - 核心记忆
curl -H "Authorization: Bearer $TOKEN" \
  https://app.com/api/memory/core
```

---

## 优先级

1. **立即处理** (今天)
   - History API (2 个) - 用户常用
   - 添加缺失的 D1 函数

2. **明天**
   - Memory API (4 个) - 内部使用

3. **可选**
   - 性能优化
   - 缓存机制

---

## 已完成的 API 统计

✅ 7 个 API 已完全迁移到 D1 + Clerk：
- personas (3)
- upload (1)
- voice (1)
- history 预计 (2 个待完成)

⏳ 剩余工作：
- history/*（2 个）
- memory/* (4 个)

---

## 参考

- [D1 Conversation 类型](lib/knowledgeos-d1.ts#L27)
- [Clerk 认证验证](lib/api-middleware.ts)
- [已完成的 API 示例](functions/api/personas/active.ts)
