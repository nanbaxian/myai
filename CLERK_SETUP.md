# Clerk Authentication Setup Guide

## 为什么用 Clerk？

✅ **Magic Link 登录** - 无需密码，点击邮件链接即可登录  
✅ **自动 Session 管理** - 内置 JWT token 和 session 管理  
✅ **简单的用户管理** - 无需自己维护用户表  
✅ **安全性高** - Clerk 处理所有 OAuth、SAML、MFA  
✅ **多租户友好** - 内置组织和权限管理  

## 快速开始

### 1. 创建 Clerk 账户
1. 访问 https://dashboard.clerk.com
2. 注册并创建新应用
3. 选择 "Magic Link" 作为认证方式

### 2. 获取 API 密钥
在 Clerk Dashboard 中：
- 复制 **Publishable Key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- 复制 **Secret Key** → `CLERK_SECRET_KEY`

### 3. 添加到 .env.local
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

### 4. Cloudflare Workers 配置 (wrangler.toml)
```toml
[env.production]
vars = { CLERK_SECRET_KEY = "sk_test_xxxxx" }
```

### 5. 安装依赖
```bash
npm install
```

## 使用 Magic Link

### 前端 - 登录页面
```tsx
import KnowledgeAuthPageClerk from '@/components/KnowledgeAuthPageClerk'

export default function LoginPage() {
  return <KnowledgeAuthPageClerk mode="login" />
}
```

### 前端 - 调用受保护的 API
```tsx
'use client'
import { useClerkApi } from '@/hooks/useClerkApi'

export default function MyComponent() {
  const { fetchWithAuth } = useClerkApi()

  async function loadPersona() {
    const data = await fetchWithAuth('/api/personas/active')
    console.log(data)
  }

  return <button onClick={loadPersona}>加载用户</button>
}
```

### 后端 - 验证请求
```ts
// 在 API 路由中
import { verifyClerkToken } from '@/lib/api-middleware'

export const onRequestGet = async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get('Authorization') || ''
    const user = await verifyClerkToken(authHeader)
    // user.userId, user.email 现在可用
  } catch (err) {
    return json({ error: 'Unauthorized' }, 401)
  }
}
```

## 用户检查和权限

### 在客户端检查登录状态
```tsx
'use client'
import { useAuth } from '@clerk/nextjs'

export default function ProtectedComponent() {
  const { isLoaded, userId } = useAuth()

  if (!isLoaded) return <div>Loading...</div>
  if (!userId) return <div>Please sign in</div>

  return <div>Welcome! {userId}</div>
}
```

### 创建受保护的页面
```tsx
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect('/auth/login')

  return <div>Dashboard</div>
}
```

## Magic Link 流程

1. 用户输入邮箱
2. 点击 "Send login link" 按钮
3. Clerk 发送邮件（自动模板或自定义）
4. 用户点击邮件中的链接
5. `/auth/callback` 处理验证
6. 用户重定向到 `/dashboard`

## 配置 Callback URL

在 Clerk Dashboard 的 **Redirect URLs** 中添加：
- `http://localhost:3000/auth/callback` (开发)
- `https://yourdomain.com/auth/callback` (生产)

## Webhook (可选)

当用户创建、更新、删除时获得通知：

1. Clerk Dashboard → Webhooks
2. 添加 endpoint: `https://yourdomain.com/api/webhooks/clerk`
3. 订阅事件: `user.created`, `user.updated`

示例 webhook handler:
```ts
// functions/api/webhooks/clerk.ts
export const onRequestPost = async (ctx) => {
  const signature = ctx.request.headers.get('svix-id')
  const payload = await ctx.request.text()

  // 验证签名...
  const event = JSON.parse(payload)

  if (event.type === 'user.created') {
    // 在你的数据库中创建用户
    console.log('New user:', event.data.id, event.data.email_addresses[0].email_address)
  }

  return new Response('OK', { status: 200 })
}
```

## Magic Link 自定义

在 Clerk Dashboard → Email:
- 自定义邮件内容
- 自定义链接重定向
- 设置邮件发送人

## 常见问题

**Q: 我还需要 Supabase 吗？**  
A: 是的，我们仍然用 Supabase 存储应用数据。Clerk 只负责认证和用户管理。

**Q: 如何迁移现有用户？**  
A: 可以使用 Clerk 的 Import API 或创建一次性迁移脚本。

**Q: Magic Link 会过期吗？**  
A: 默认 15 分钟过期，可在 Clerk Dashboard 配置。

## 故障排除

**Magic Link 不工作？**
- 检查邮箱是否正确
- 验证 Redirect URLs 配置
- 检查 Clerk 是否发送邮件

**API 返回 401？**
- 检查 Token 是否有效
- 验证 Authorization header 格式: `Bearer token`
- 检查 `CLERK_SECRET_KEY` 环境变量
