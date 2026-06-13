# 几何维度 — 会员体系数据结构设计

---

## 一、用户分层

```
访客 (Guest)
  └─ 无需注册即可使用核心功能
  └─ 每日 50 题额度
  └─ 本地历史记录

注册用户 (Free)
  └─ 与访客相同的功能限制
  └─ 云端数据同步
  └─ 跨设备使用

Pro 会员 (Pro) — ¥19/月
  └─ 无限额度
  └─ 高级教师模式
  └─ PPT/PDF/图片导出
  └─ 错题本
  └─ 学习分析
  └─ 高级分享
  └─ 云端同步

教师版 (Teacher) — ¥29/月
  └─ Pro 全部功能
  └─ 班级管理
  └─ 批量课件生成
  └─ 学生学习统计
  └─ 作业布置与批改
```

---

## 二、权限系统架构

```
feature_permissions 表
  plan (free|pro|teacher) + feature_key → { enabled, daily_limit }

SubscriptionContext (前端)
  checkFeature(featureKey) → boolean
  getDailyLimit(featureKey) → number | null

后端中间件
  requireFeature(featureKey)
```

### 功能权限矩阵

| Feature | Free | Pro | Teacher |
|---------|------|-----|---------|
| ai_parse | 50/天 | 无限 | 无限 |
| 3d_visualize | ✅ | ✅ | ✅ |
| step_explain | ✅ | ✅ | ✅ |
| history_records | 本地 | 云端 | 云端 |
| share_link | ✅ | ✅ | ✅ |
| model_switch | ✅ | ✅ | ✅ |
| ai_teacher_mode | ❌ | ✅ | ✅ |
| ppt_export | ❌ | ✅ | ✅ |
| pdf_export | ❌ | ✅ | ✅ |
| image_export | ❌ | ✅ | ✅ |
| error_book | ❌ | ✅ | ✅ |
| learning_analytics | ❌ | ✅ | ✅ |
| advanced_share | ❌ | ✅ | ✅ |
| cloud_sync | ❌ | ✅ | ✅ |
| classroom | ❌ | ❌ | ✅ |
| batch_export | ❌ | ❌ | ✅ |
| student_stats | ❌ | ❌ | ✅ |

---

## 三、支付流程

```
用户点击"升级 Pro"
  → 检查登录状态
    → 未登录: 弹出登录/注册
    → 已登录: 调用 stripe-checkout Edge Function
      → Stripe 创建 Checkout Session
        → 用户完成支付
          → Stripe webhook → 更新 subscriptions 表
            → 前端实时监听 → 更新 SubscriptionContext
```

### 支付方式
- 银行卡 (Stripe)
- 支付宝 (Stripe 支持)
- 未来: 微信支付 (需额外集成)

### 预留接口

```typescript
// 前端
interface PaymentFlow {
  initiateUpgrade(planId: 'pro' | 'teacher', interval: 'monthly' | 'yearly'): Promise<{
    url?: string          // Stripe Checkout URL
    needsAuth?: boolean   // 需要先登录
    needsConfig?: boolean  // Stripe 未配置
  }>
  manageSubscription(): Promise<void>  // 打开 Stripe Customer Portal
}

// 后端 API (预留)
POST /api/billing/checkout     → { planId, interval } → { url }
POST /api/billing/portal       → { } → { url }
POST /api/billing/webhook      → Stripe Event → 200
GET  /api/billing/status       → { plan, status, dailyUsage }
```

---

## 四、Supabase 表结构

### 核心表 (已存在)
- `profiles` — 用户档案
- `subscriptions` — 订阅状态
- `usage_records` — 用量追踪
- `workspaces` — 工作台存储

### 新增表 (v4 迁移)
- `error_book` — 错题本
- `learning_analytics` — 学习分析
- `classrooms` — 班级管理
- `classroom_students` — 班级学生关联
- `assignments` — 作业布置
- `assignment_submissions` — 作业提交
- `share_records` — 分享记录
- `feature_permissions` — 功能权限矩阵

---

## 五、用户数据流

```
用户解题
  → 记录 usage_records
  → 更新 learning_analytics (解题数、正确率)
  → 错误题目 → error_book
  → 分享 → share_records

教师创建班级
  → classrooms
  → 邀请学生 → classroom_students
  → 布置作业 → assignments
  → 学生提交 → assignment_submissions
  → 教师查看 → learning_analytics (聚合视图)
```
