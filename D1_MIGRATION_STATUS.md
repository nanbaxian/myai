# Supabase → D1 + Clerk 迁移状态

## ✅ 已完成

### API 迁移
- ✅ `/api/personas/active.ts` - 获取/设置活跃 persona（使用 D1 + Clerk）
- ✅ `/api/personas.ts` - 列表/创建/删除 persona（使用 D1 + Clerk）
- ✅ `lib/knowledgeos-d1.ts` - 添加 D1Persona 类型和查询函数

### 配置
- ✅ `wrangler.toml` - 更新 D1 绑定配置
- ✅ `schema-knowledgeos-d1.sql` - 创建数据库 schema
- ✅ `.env.example` - 移除 Supabase 变量

### 认证集成
- ✅ Clerk 认证添加到 personas API
- ✅ JWT 验证函数（verifyClerkToken）

---

## ⏳ 待处理（11 个 API）

### 高优先级（必须迁移）
- [ ] `/api/persona.ts` - 获取单个 persona - **需要 Clerk 认证**
- [ ] `/api/upload.ts` - 文件上传 - **需要 Clerk + R2 绑定**
- [ ] `/api/voice.ts` - 语音相关 - **需要 Clerk 认证**

### 中优先级（与 chat 相关，可能已经用 D1）
- [ ] `/api/history/index.ts` - 历史列表 - **检查是否用 D1**
- [ ] `/api/history/[id].ts` - 历史详情 - **检查是否用 D1**

### 低优先级（内存管理）
- [ ] `/api/memory/core.ts` - 核心内存 - **检查是否用 D1**
- [ ] `/api/memory/list.ts` - 内存列表 - **检查是否用 D1**
- [ ] `/api/memory/snapshots.ts` - 内存快照 - **检查是否用 D1**
- [ ] `/api/memory/compress.ts` - 内存压缩 - **检查是否用 D1**

---

## 🔄 迁移步骤

### 第 1 步：D1 数据库设置
```bash
# 1. 检查数据库是否已创建
wrangler d1 list

# 2. 如果需要创建新数据库
wrangler d1 create knowledgeos_db

# 3. 应用 schema
wrangler d1 execute knowledgeos_db --file schema-knowledgeos-d1.sql

# 4. 在 wrangler.toml 中更新 database_id
[[d1_databases]]
binding = "DB"
database_name = "knowledgeos_db"
database_id = "YOUR_ID_HERE"
```

### 第 2 步：Clerk 设置
```bash
# 1. 创建 Clerk 应用（见 QUICKSTART_CLERK.md）
# 2. 获取 Publishable Key 和 Secret Key
# 3. 在 Cloudflare Dashboard 中配置环境变量：
#    - CLERK_SECRET_KEY = sk_test_...
#    - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_test_...
```

### 第 3 步：迁移其他 API
每个 API 需要：
1. 添加 Clerk JWT 验证
2. 用 D1 查询替换 Supabase 调用
3. 更新 Env 类型
4. 测试端点

---

## 📋 高优先级 API 迁移清单

### `/api/persona.ts` 迁移
```
Current: 用 Supabase 获取/更新单个 persona
Todo: 
  - 用 D1 查询替代
  - 添加 Clerk 认证
  - 检查是否有其他业务逻辑
```

### `/api/upload.ts` 迁移  
```
Current: 文件上传到 R2
Todo:
  - 检查是否需要迁移数据存储
  - 用 D1 保存上传记录
  - 添加 Clerk 认证
```

### `/api/voice.ts` 迁移
```
Current: 语音处理
Todo:
  - 检查完整实现
  - 用 D1 保存语音记录
  - 添加 Clerk 认证
```

---

## 🔌 Clerk Webhook 集成 (可选)

创建 `functions/api/webhooks/clerk.ts` 来同步用户：

```typescript
import { createApiLogger } from '../../lib/api-log'
import { D1Env } from '../../lib/knowledgeos-d1'

export const onRequestPost: PagesFunction<D1Env> = async (ctx) => {
  const { request, env } = ctx
  const log = createApiLogger('webhooks:clerk', ctx)

  try {
    const event = await request.json()

    switch (event.type) {
      case 'user.created':
        // 创建用户记录到 D1
        const email = event.data.email_addresses[0].email_address
        const userId = event.data.id
        // INSERT INTO users (id, email, ...) VALUES (...)
        break

      case 'user.updated':
        // 更新用户记录
        break

      case 'user.deleted':
        // 删除用户记录
        break
    }

    return new Response('OK', { status: 200 })
  } catch (e) {
    log.fail(e)
    return new Response('Error', { status: 500 })
  }
}
```

---

## 📚 参考

- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Clerk Authentication](https://clerk.com/docs)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)

---

## 部署检查清单

- [ ] 所有 Supabase 调用已替换为 D1
- [ ] 所有 API 已添加 Clerk 认证
- [ ] D1 Schema 已应用
- [ ] wrangler.toml 中 D1 database_id 已更新
- [ ] 环境变量已配置 (CLERK_SECRET_KEY, CLERK_PUBLIC_KEY)
- [ ] 测试所有 API 端点
- [ ] 部署到生产环境
