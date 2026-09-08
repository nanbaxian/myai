# 🚀 部署指南 - Clerk + D1 集成

## ✅ 已完成

1. **D1 数据库** ✅
   - 创建: knowledgeos_db
   - ID: b28a40c9-1df9-47bb-addd-8c9f805f5eed
   - Schema: 已部署 (6 张表)

2. **Clerk 密钥** ✅
   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_c21hc2hpbmctdGVycmFwaW4tMjgyOC5jbGVyay5hY2NvdW50cy5kZXYk
   - CLERK_SECRET_KEY: sk_test_BgV2SN0eFuOgAeD7xi4Jw0ecQk2WCSOXWrdPR4Aq7U

3. **本地环境变量** ✅
   - .env.local: 已配置

4. **wrangler.toml** ✅
   - 项目名: myai
   - D1 绑定: 已配置
   - 环境变量: 已配置

---

## 📝 后续部署步骤

### 方案 A：使用本地开发构建（推荐）

```bash
# 1. 安装依赖
cd C:\wamp64\www\myai
npm install

# 2. 本地开发测试
npm run dev

# 3. 构建生产版本
npm run build

# 4. 部署到 Cloudflare Pages
npm run deploy
```

### 方案 B：直接在 Cloudflare Dashboard 手动添加变量

1. 访问: https://dash.cloudflare.com/
2. 找到 Workers & Pages → myai 项目
3. 点击 Settings 标签
4. 找到 Environment variables
5. 添加这两个变量到 Production：

```
变量名: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
值: pk_test_c21hc2hpbmctdGVycmFwaW4tMjgyOC5jbGVyay5hY2NvdW50cy5kZXYk

变量名: CLERK_SECRET_KEY
值: sk_test_BgV2SN0eFuOgAeD7xi4Jw0ecQk2WCSOXWrdPR4Aq7U
```

6. 保存并等待 Cloudflare 自动重新部署

---

## 🔧 当前配置状态

### wrangler.toml 中的配置
```toml
name = "myai"
pages_build_output_dir = "out"

[[d1_databases]]
binding = "DB"
database_name = "knowledgeos_db"
database_id = "b28a40c9-1df9-47bb-addd-8c9f805f5eed"

[env.production]
vars = { 
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_c21hc2hpbmctdGVycmFwaW4tMjgyOC5jbGVyay5hY2NvdW50cy5kZXYk",
  CLERK_SECRET_KEY = "sk_test_BgV2SN0eFuOgAeD7xi4Jw0ecQk2WCSOXWrdPR4Aq7U"
}
```

### 本地 .env.local
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_c21hc2hpbmctdGVycmFwaW4tMjgyOC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_BgV2SN0eFuOgAeD7xi4Jw0ecQk2WCSOXWrdPR4Aq7U
```

---

## ✨ 已迁移的 API（可用于生产）

所有这些 API 都已迁移到 D1 + Clerk：

```
✅ GET  /api/personas/active      - 获取活跃人设
✅ PUT  /api/personas/active      - 设置活跃人设
✅ GET  /api/persona              - 获取当前人设
✅ PUT  /api/persona              - 更新当前人设
✅ GET  /api/personas             - 列出所有人设
✅ POST /api/personas             - 创建人设
✅ DELETE /api/personas?id=xxx    - 删除人设
✅ POST /api/upload               - 上传文件到 R2
✅ GET|POST /api/voice            - STT/TTS 处理
```

所有 API 都需要 Clerk JWT token：
```
Authorization: Bearer <CLERK_TOKEN>
```

---

## 🔍 验证部署

部署后测试：

```bash
# 1. 获取登录 token
# 访问 https://myai-35w.pages.dev 登录

# 2. 测试 Personas API
curl -H "Authorization: Bearer $TOKEN" \
  https://myai-35w.pages.dev/api/personas/active

# 应该返回活跃人设或 null（如果没有）
```

---

## 📊 部署检查清单

- [ ] 本地 .env.local 已配置（✅ 完成）
- [ ] wrangler.toml 已配置（✅ 完成）
- [ ] D1 数据库已创建（✅ 完成）
- [ ] D1 Schema 已部署（✅ 完成）
- [ ] npm install 已运行
- [ ] npm run build 成功构建
- [ ] npm run deploy 部署到 Cloudflare
- [ ] 在 Cloudflare Dashboard 验证环境变量
- [ ] 测试已迁移的 API

---

## 🆘 故障排除

### 问题：npm install 失败
```bash
rm -rf node_modules package-lock.json
npm install
```

### 问题：build 失败
确保有足够的磁盘空间，并检查 Next.js 版本兼容性。

### 问题：Clerk 认证失败
检查环境变量是否正确设置，特别是 CLERK_SECRET_KEY。

### 问题：D1 连接失败
验证 wrangler.toml 中的 database_id 是正确的：
`b28a40c9-1df9-47bb-addd-8c9f805f5eed`

---

## 📚 相关文档

- `DEPLOYMENT_COMPLETE.md` - D1 部署完成报告
- `FINAL_MIGRATION_SUMMARY.md` - 迁移总结
- `HISTORY_MEMORY_MIGRATION.md` - History/Memory API 迁移指南
- `D1_MIGRATION_STATUS.md` - 详细迁移状态

---

## 🎯 下一步

1. **立即执行**（必需）
   ```bash
   npm install
   npm run build
   npm run deploy
   ```

2. **部署后**（推荐）
   - 在 Cloudflare Dashboard 验证环境变量
   - 测试 API 端点
   - 监控错误日志

3. **可选**
   - 迁移 History API (2 个)
   - 迁移 Memory API (4 个)
   - 完全删除 Supabase 依赖

---

**准备好部署了！** 🚀
