# Clerk 集成测试指南

## 本地测试

### 1. 启动开发服务器

```bash
npm run dev
```

### 2. 访问登录页面

```
http://localhost:3000/auth/login
```

### 3. Magic Link 流程测试

**步骤：**
1. 输入测试邮箱（如 `test@example.com`）
2. 点击 "Send login link"
3. 在 Clerk Dashboard → Users 中查看新用户
4. 测试邮件：Clerk 在开发环境显示链接（不实际发送邮件）
5. 点击链接应该重定向到 `/dashboard`

### 4. 测试受保护的 API

```bash
# 1. 获取有效 token
curl http://localhost:3000/api/personas/active \
  -H "Authorization: Bearer <token>"

# 2. 测试没有 token 的请求
curl http://localhost:3000/api/personas/active
# 应该返回 401 Unauthorized

# 3. 测试无效 token
curl http://localhost:3000/api/personas/active \
  -H "Authorization: Bearer invalid_token"
# 应该返回 401
```

---

## 自动化测试

### 创建测试文件

```bash
# __tests__/auth.test.ts
```

```typescript
import { verifyClerkToken } from '@/lib/clerk-server'

describe('Clerk Authentication', () => {
  test('should reject missing Authorization header', async () => {
    const req = new Request('http://localhost:3000/api/test')
    
    expect(async () => {
      await verifyClerkToken(req.headers.get('Authorization') || '')
    }).rejects.toThrow('Missing Authorization Bearer token')
  })

  test('should reject invalid token', async () => {
    const invalidToken = 'invalid.token.here'
    
    expect(async () => {
      await verifyClerkToken(invalidToken)
    }).rejects.toThrow('Invalid Clerk JWT')
  })

  test('should parse valid token', async () => {
    // 需要真实的 Clerk token 才能测试
    const validToken = process.env.TEST_CLERK_TOKEN
    if (!validToken) skip()

    const user = await verifyClerkToken(validToken)
    expect(user.userId).toBeDefined()
    expect(user.email).toBeDefined()
  })
})
```

---

## 前端测试

### 测试登录组件

```typescript
// __tests__/KnowledgeAuthPageClerk.test.tsx
import { render, screen } from '@testing-library/react'
import KnowledgeAuthPageClerk from '@/components/KnowledgeAuthPageClerk'

describe('KnowledgeAuthPageClerk', () => {
  test('renders login form', () => {
    render(<KnowledgeAuthPageClerk mode="login" />)
    
    expect(screen.getByText(/Sign in to KnowledgeOS/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Send login link/i })).toBeInTheDocument()
  })

  test('renders register form when mode is register', () => {
    render(<KnowledgeAuthPageClerk mode="register" />)
    
    expect(screen.getByText(/Create your KnowledgeOS workspace/i)).toBeInTheDocument()
  })
})
```

### 测试 API 钩子

```typescript
// __tests__/useClerkApi.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useClerkApi } from '@/hooks/useClerkApi'

describe('useClerkApi', () => {
  test('should add Authorization header', async () => {
    const { result } = renderHook(() => useClerkApi())
    
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    )

    const data = await result.current.fetchWithAuth('/api/test')

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    )
  })
})
```

---

## 集成测试

### 完整流程测试

```typescript
// __tests__/e2e/auth-flow.test.ts
describe('Complete Auth Flow', () => {
  test('should complete Magic Link login', async () => {
    // 1. 访问登录页面
    await page.goto('http://localhost:3000/auth/login')
    
    // 2. 输入邮箱
    await page.fill('input[type="email"]', 'test@example.com')
    
    // 3. 点击发送按钮
    await page.click('button:has-text("Send login link")')
    
    // 4. 验证成功消息
    await page.waitForSelector('text=Link sent')
    
    // 5. 模拟点击邮件中的链接
    const session = await getClerkSession('test@example.com')
    const magicLink = session.verificationUrl
    
    // 6. 导航到回调 URL
    await page.goto(magicLink)
    
    // 7. 应该重定向到 dashboard
    await page.waitForURL('**/dashboard')
  })

  test('should require auth for protected routes', async () => {
    // 不登录直接访问 dashboard
    await page.goto('http://localhost:3000/dashboard')
    
    // 应该重定向到登录
    await page.waitForURL('**/auth/login')
  })
})
```

---

## 测试环境变量

创建 `.env.test`：

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_test_key
CLERK_SECRET_KEY=sk_test_your_test_key

# 可选：测试用 token
TEST_CLERK_TOKEN=eyJ0eXAiOiJKV1QiLC...
```

---

## Postman 测试

### 导入集合

```json
{
  "info": {
    "name": "Clerk API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Active Persona",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{clerk_token}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{base_url}}/api/personas/active",
          "host": ["{{base_url}}"],
          "path": ["api", "personas", "active"]
        }
      }
    },
    {
      "name": "Update Active Persona",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{clerk_token}}",
            "type": "text"
          },
          {
            "key": "Content-Type",
            "value": "application/json",
            "type": "text"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"persona_id\": \"12345\"}"
        },
        "url": {
          "raw": "{{base_url}}/api/personas/active",
          "host": ["{{base_url}}"],
          "path": ["api", "personas", "active"]
        }
      }
    }
  ]
}
```

### Postman 环境变量

```json
{
  "id": "clerk-env",
  "name": "Clerk Development",
  "values": [
    {
      "key": "base_url",
      "value": "http://localhost:3000",
      "enabled": true
    },
    {
      "key": "clerk_token",
      "value": "your-clerk-token-here",
      "enabled": true
    }
  ]
}
```

---

## 测试检查清单

### 功能测试
- [ ] Magic Link 登录成功
- [ ] 无效邮箱被拒绝
- [ ] 邮件正确发送
- [ ] 链接点击后自动登录
- [ ] 注册流程工作

### 安全测试
- [ ] 无 token 无法访问 API
- [ ] 无效 token 被拒绝
- [ ] 过期 token 被拒绝
- [ ] 跨域请求被阻止
- [ ] Session 正确隔离

### 性能测试
- [ ] 登录 < 2 秒
- [ ] API 响应 < 200ms
- [ ] Token 刷新无缝
- [ ] 无内存泄漏

### 浏览器兼容性
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile (iOS/Android)

---

## 常见测试问题

### 问题：Magic Link 邮件未发送

**原因：** 在开发环境，Clerk 不发送真实邮件  
**解决：** 检查 Clerk Dashboard → Users 查看生成的链接

### 问题：Token 验证失败

**原因：** 环境变量未配置或 token 过期  
**解决：**
```bash
# 检查环境变量
echo $CLERK_SECRET_KEY

# 获取新 token
# 在 Clerk Dashboard 中创建测试用户
```

### 问题：CORS 错误

**原因：** Redirect URLs 未配置  
**解决：** 在 Clerk Dashboard 中添加：
- `http://localhost:3000`
- `http://localhost:3000/auth/callback`

### 问题：Session 在页面刷新后丢失

**原因：** Cookie 配置问题  
**解决：** 检查浏览器 DevTools → Storage → Cookies
- 应该有 `__session` 和 `__clerk_db_jwt` cookies

---

## 调试技巧

### 1. 启用详细日志

```tsx
// lib/clerk-browser.ts
if (process.env.NODE_ENV === 'development') {
  console.log('Clerk loaded:', { userId, sessionId })
}
```

### 2. 检查 Token 内容

```bash
# 在浏览器控制台
const token = localStorage.getItem('__clerk_db_jwt')
const decoded = JSON.parse(atob(token.split('.')[1]))
console.log(decoded)
```

### 3. 网络请求调试

```bash
# 在 Network 标签中查看 /api/personas/active 请求
# 检查 Authorization header 是否正确
```

### 4. 检查 Clerk 状态

```tsx
const { isLoaded, userId, session } = useAuth()
console.log('Auth state:', { isLoaded, userId, session })
```

---

## CI/CD 测试集成

### GitHub Actions

```yaml
name: Test Auth Integration

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: npm install
      
      - name: Set up test env
        run: |
          echo "CLERK_SECRET_KEY=${{ secrets.CLERK_SECRET_KEY }}" >> .env.test
          echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${{ secrets.CLERK_PUBLISHABLE_KEY }}" >> .env.test
      
      - run: npm run test:auth
```

---

## 性能基准测试

```typescript
// __tests__/performance.test.ts
describe('Auth Performance', () => {
  test('verifyClerkToken should complete in < 10ms', async () => {
    const token = process.env.TEST_CLERK_TOKEN!
    const start = performance.now()
    
    const user = await verifyClerkToken(token)
    
    const duration = performance.now() - start
    expect(duration).toBeLessThan(10)
  })

  test('useClerkApi.fetchWithAuth should complete in < 200ms', async () => {
    // 测试实现...
  })
})
```
