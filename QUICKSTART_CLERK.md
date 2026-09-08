# Clerk Magic Link 快速开始指南 (5分钟)

## 🎯 目标
用 Clerk 替换 Supabase Auth 的 Magic Link，修复当前 API 错误

## ⚡ 5 分钟快速设置

### 第 1 步：创建 Clerk 账户 (1 分钟)
1. 访问 https://dashboard.clerk.com
2. 点击 "Sign Up"
3. 用 Google/GitHub/邮箱注册

### 第 2 步：创建应用 (1 分钟)
1. Dashboard 主页点击 "Create Application"
2. 输入应用名称：`KnowledgeOS`
3. 选择 "Magic Link" 作为认证方式
4. 点击 "Create Application"

### 第 3 步：获取密钥 (1 分钟)
左侧菜单 → **API Keys** → 复制以下两个：

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

### 第 4 步：配置项目 (2 分钟)

编辑 `.env.local`:
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

安装依赖：
```bash
npm install
```

就是这样！🎉

## 🧪 立即测试

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 访问登录页面
```
http://localhost:3000/auth/login
```

### 3. 输入任何邮箱，点击 "Send login link"

### 4. 检查 Clerk Dashboard → Users
应该看到新用户出现！

## 📁 已创建的文件

| 文件 | 用途 |
|------|------|
| `lib/clerk-browser.ts` | 客户端 Clerk 钩子 |
| `lib/clerk-server.ts` | 服务器 JWT 验证 |
| `lib/api-middleware.ts` | API 中间件 |
| `components/KnowledgeAuthPageClerk.tsx` | 新登录页面 |
| `hooks/useClerkApi.ts` | 带认证的 API 调用 |
| `middleware.ts` | 路由保护 |
| `types/clerk.ts` | TypeScript 类型 |

## 🔧 现在做什么？

### 选项 A：现在开始使用 (建议)
```bash
# 1. 安装
npm install

# 2. 配置环境变量
# 编辑 .env.local

# 3. 测试
npm run dev
# 访问 http://localhost:3000/auth/login
```

### 选项 B：深入了解
阅读这些文件（按顺序）：
1. `CLERK_SETUP.md` - 完整设置指南
2. `MIGRATION_COMPARISON.md` - 为什么选择 Clerk
3. `CLERK_INTEGRATION_SUMMARY.md` - 详细集成说明

### 选项 C：生产部署
查看 `CLERK_SETUP.md` 的生产部分

## 🆘 遇到问题？

### 问题：Magic Link 邮件未收到
**原因：** 在开发环境不发送真实邮件  
**解决：** 检查 Clerk Dashboard → Users 查看登录链接

### 问题：API 返回 401 Unauthorized
**原因：** Token 无效或过期  
**解决：** 
```tsx
const { getToken } = useAuth()
const token = await getToken()
console.log('Token:', token) // 检查是否存在
```

### 问题：Cannot find module '@clerk/nextjs'
**原因：** 依赖未安装  
**解决：**
```bash
rm -rf node_modules package-lock.json
npm install
```

### 问题：环境变量未读取
**原因：** 需要重启开发服务器  
**解决：**
```bash
# 停止开发服务器
npm run dev
```

## 📚 关键代码示例

### 登录页面
```tsx
// app/auth/login/page.tsx
import KnowledgeAuthPageClerk from '@/components/KnowledgeAuthPageClerk'

export default function LoginPage() {
  return <KnowledgeAuthPageClerk mode="login" />
}
```

### 前端调用 API
```tsx
'use client'
import { useClerkApi } from '@/hooks/useClerkApi'

export function MyComponent() {
  const { fetchWithAuth } = useClerkApi()

  async function loadData() {
    const data = await fetchWithAuth('/api/personas/active')
    console.log(data)
  }

  return <button onClick={loadData}>Load</button>
}
```

### 后端验证
```ts
// functions/api/personas/active.ts
import { verifyClerkToken } from '@/lib/api-middleware'

export const onRequestGet = async (ctx) => {
  const authHeader = ctx.request.headers.get('Authorization') || ''
  const user = await verifyClerkToken(authHeader)
  
  // user.userId 和 user.email 现在可用
  console.log('User:', user.userId)
  
  // 获取用户的 persona
  return json({ persona: {...} })
}
```

## ✅ 检查清单

- [ ] 创建了 Clerk 账户
- [ ] 获得了 API 密钥
- [ ] 配置了 `.env.local`
- [ ] 运行了 `npm install`
- [ ] 启动了 `npm run dev`
- [ ] 测试了 Magic Link 登录
- [ ] 检查了 API 认证

## 🚀 下一步

1. **配置生产环境** - 在 Clerk Dashboard 添加生产 URL
2. **定制邮件** - 修改 Magic Link 邮件模板
3. **启用 MFA** - 双因素认证 (可选)
4. **添加 OAuth** - 社交登录 (可选)
5. **设置 Webhook** - 用户事件通知 (可选)

## 💡 Pro Tips

### Tip 1：查看用户列表
```
Clerk Dashboard → Users → 查看所有登录过的用户
```

### Tip 2：测试令牌
```tsx
const { getToken } = useAuth()
const token = await getToken()
console.log('Token:', token?.substring(0, 20) + '...')
```

### Tip 3：本地发送邮件
在开发环境，Clerk 显示魔法链接而不是发送邮件。

### Tip 4：调试认证问题
```tsx
const { isLoaded, userId, sessionId } = useAuth()
console.log({ isLoaded, userId, sessionId })
```

## 📞 需要帮助？

| 问题 | 资源 |
|------|------|
| 设置问题 | `CLERK_SETUP.md` |
| API 集成 | `CLERK_INTEGRATION_SUMMARY.md` |
| 性能对比 | `MIGRATION_COMPARISON.md` |
| 测试 | `TESTING_CLERK.md` |
| Clerk 文档 | https://clerk.com/docs |

## 🎓 学习路径

```
新手 (5 分钟)
  ↓
本文件 (QUICKSTART_CLERK.md)
  ↓
中级 (30 分钟)
  ↓
CLERK_SETUP.md
  ↓
高级 (1 小时)
  ↓
CLERK_INTEGRATION_SUMMARY.md
+ TESTING_CLERK.md
```

---

**现在就开始吧！** 🚀

只需 5 分钟，你就能有一个工作的 Magic Link 登录系统。

有问题？查看文件顶部的 **遇到问题？** 部分。
