# WE Tools

WE Tools 是一个功能丰富的软件工具目录和网站分享平台，使用 React、TypeScript 和 Supabase 构建。平台提供了软件工具分享、网站目录、用户认证、AI助手等多种功能，旨在帮助用户发现和分享优质工具资源。

## 功能特点

- **软件工具目录**：发现、分享和评价各类软件工具
- **网站目录**：浏览和分享有用的网站资源
- **用户认证系统**：支持邮箱密码、魔法链接和QQ第三方登录
- **AI助手**：内置聊天助手，提供智能问答服务
- **管理面板**：管理员可以管理软件、网站和广告内容
- **个人用户档案**：用户可以自定义偏好设置
- **消息留言板**：用户之间的交流平台

## 技术栈

- **前端**：React 18, TypeScript, Vite, TailwindCSS
- **状态管理**：React Context API
- **后端/数据库**：Supabase (PostgreSQL)
- **认证**：Supabase Auth, QQ第三方登录
- **UI组件**：Framer Motion, Lucide React
- **工具**：ESLint, PostCSS, Autoprefixer

## 项目环境配置

### 前提条件

- Node.js 16+ 
- npm 或 yarn
- Supabase 账户和项目

### 开发环境设置

1. 克隆内部仓库
```bash
git clone [内部仓库地址]
cd we-tools
```

2. 安装依赖
```bash
npm install
# 或
yarn install
```

3. 环境变量设置
联系项目管理员获取开发环境的 `.env` 文件，或创建自己的 `.env` 文件，添加以下变量：
```
VITE_SUPABASE_URL=开发环境的supabase-url
VITE_SUPABASE_ANON_KEY=开发环境的supabase-anon-key
VITE_QQ_APP_ID=开发环境的qq-app-id
VITE_QQ_REDIRECT_URI=开发环境的qq-redirect-uri
```

4. 启动开发服务器
```bash
npm run dev
# 或
yarn dev
```

## 项目详细文件结构

```
we-tools/
├── public/                      # 静态资源目录
│   ├── ai-assistant-icon.svg    # AI助手图标
│   ├── robots.txt               # 搜索引擎爬虫协议
│   └── sitemap.xml              # 网站地图
│
├── src/                         # 源代码主目录
│   ├── api/                     # API调用
│   │   └── chatAPI.ts           # AI聊天API封装
│   │
│   ├── components/              # 可复用组件
│   │   ├── icons/               # 图标组件
│   │   ├── SoftwareCard.tsx     # 软件卡片展示组件
│   │   ├── WebsiteCard.tsx      # 网站卡片展示组件
│   │   ├── Pagination.tsx       # 分页控制组件
│   │   ├── Navbar.tsx           # 顶部导航栏
│   │   ├── DonationSection.tsx  # 赞助展示区域
│   │   ├── AdModal.tsx          # 广告弹窗组件
│   │   ├── AIAssistant.tsx      # AI助手入口组件
│   │   ├── MessageBoard.tsx     # 留言板组件
│   │   └── SupabaseStatusChecker.tsx # Supabase连接状态检测
│   │
│   ├── contexts/                # 全局状态管理
│   │   ├── AuthContext.tsx      # 用户认证与偏好全局状态
│   │   ├── ChatbotContext.tsx   # AI助手全局状态
│   │   └── AdvertisementContext.tsx # 广告全局状态
│   │
│   ├── lib/                     # 核心工具库
│   │   ├── supabase.ts          # Supabase初始化与API封装
│   │   ├── upload.ts            # 文件上传工具
│   │   ├── qq-connect.ts        # QQ第三方登录工具
│   │   └── prisma.ts            # Prisma数据库客户端
│   │
│   ├── pages/                   # 页面组件
│   │   ├── admin/               # 管理员相关页面
│   │   ├── auth/                # 认证相关页面
│   │   │   └── QQCallback.tsx   # QQ登录回调处理
│   │   ├── Login.tsx            # 登录页面
│   │   ├── Register.tsx         # 注册页面
│   │   ├── ForgotPassword.tsx   # 忘记密码页面
│   │   ├── Home.tsx             # 首页，软件列表展示
│   │   ├── Admin.tsx            # 后台管理页面
│   │   ├── SoftwareDetail.tsx   # 软件详情页
│   │   ├── WebsiteDetail.tsx    # 网站详情页
│   │   ├── Profile.tsx          # 用户个人中心
│   │   ├── WebsiteDirectory.tsx # 网站导航页
│   │   ├── Terms.tsx            # 服务条款页面
│   │   ├── Privacy.tsx          # 隐私政策页面
│   │   └── Disclaimer.tsx       # 免责声明页面
│   │
│   ├── types/                   # TypeScript类型定义
│   │   ├── global.d.ts          # 全局类型定义
│   │   ├── qq-connect.d.ts      # QQ登录类型定义
│   │   ├── jsx.d.ts             # JSX相关类型扩展
│   │   └── vite-env.d.ts        # Vite环境变量类型
│   │
│   ├── utils/                   # 工具函数
│   │   ├── dateFormat.ts        # 日期格式化工具
│   │   └── validation.ts        # 表单验证工具
│   │
│   ├── App.tsx                  # 主应用组件，路由配置
│   ├── main.tsx                 # 应用入口
│   └── index.css                # 全局样式
│
├── supabase/                    # Supabase后端相关
│   ├── migrations/              # 数据库迁移脚本
│   └── functions/               # Edge Functions目录（验证码、短信等）
│
├── prisma/                      # Prisma ORM配置
│   └── schema.prisma            # 数据库表结构定义
│
├── .env                         # 环境变量（需自行创建）
├── index.html                   # HTML模板
├── package.json                 # 项目依赖管理
├── tsconfig.json                # TypeScript基础配置
├── tsconfig.app.json            # 应用TypeScript配置
├── tsconfig.node.json           # Node环境TypeScript配置
├── vite.config.ts               # Vite构建配置
├── tailwind.config.js           # TailwindCSS配置
├── postcss.config.js            # PostCSS配置
└── eslint.config.js             # ESLint配置
```

## 主要文件功能详解

### 核心文件

1. **`src/App.tsx`**：
   - 应用程序的主要入口点
   - 配置所有路由和页面跳转
   - 集成了全局Context提供者
   - 处理魔法链接登录回调

2. **`src/contexts/AuthContext.tsx`**：
   - 管理用户认证状态
   - 提供登录、注册、登出功能
   - 处理QQ第三方登录
   - 管理用户偏好设置
   - 判断用户管理员权限

3. **`src/lib/supabase.ts`**：
   - Supabase客户端初始化
   - 网络错误自动重试机制
   - 提供备用数据以应对连接失败
   - 软件下载链接和点赞功能
   - 存储结构初始化

4. **`src/pages/Home.tsx`**：
   - 网站主页
   - 展示软件目录和分类
   - 集成搜索和筛选功能
   - 处理分页和排序

### 功能模块文件

5. **`src/pages/Login.tsx` 和 `Register.tsx`**：
   - 用户登录和注册表单
   - 验证码发送和倒计时处理
   - 实现多种登录方式（邮箱密码、魔法链接、QQ）
   - 表单验证和错误处理

6. **`src/components/AIAssistant.tsx`**：
   - AI聊天助手UI组件
   - 处理用户问答交互
   - 可拖拽浮动窗口

7. **`src/components/SoftwareCard.tsx` 和 `WebsiteCard.tsx`**：
   - 软件和网站信息展示卡片
   - 处理点赞和收藏功能
   - 提供详情页链接

8. **`src/pages/Admin.tsx`**：
   - 管理员后台
   - 软件和网站管理（增删改查）
   - 用户管理和权限控制
   - 广告管理

### 工具和配置文件

9. **`tsconfig.app.json`**：
   - TypeScript编译配置
   - 设置模块解析策略
   - 配置类型检查规则
   - 路径别名定义

10. **`vite.config.ts`**：
    - 开发服务器配置
    - 构建优化设置
    - 插件配置

## 项目现状

### 已完成功能

- 基础软件目录和网站目录展示
- 用户认证系统（邮箱、密码、QQ登录）
- 管理员后台基本功能
- AI助手初步集成
- 软件和网站详情页
- 用户个人中心

### 已知问题和修复状态

1. **验证码发送UI状态问题**：
   - **问题**：在注册和登录页面发送验证码时，前端UI状态没有正确更新。当验证码发送成功后，按钮状态没有从"发送中..."变为倒计时状态。
   - **解决方案**：已在Register.tsx和ForgotPassword.tsx中添加备选计时器，无论网络请求成功与否，都会在5秒后自动将按钮状态从"发送中..."更新为倒计时状态，同时显示"验证码已发送"的提示。
   - **状态**：已修复，但保留了原有验证码发送逻辑，将5秒后自动成功作为备选方案。

2. **断网/弱网环境兼容性**：
   - **问题**：在网络连接不稳定时，部分功能会卡顿或失败。
   - **解决方案**：已在supabase.ts中实现了网络重试机制和备用数据，但仍需完善。
   - **状态**：部分解决，需进一步优化用户体验。

3. **移动端适配**：
   - **问题**：部分页面在移动设备上显示不佳。
   - **状态**：需要改进。

## 优先开发任务

以下是接下来需要优先处理的任务：

1. **完善AI助手功能**：
   - 改进AI助手的响应速度和准确性
   - 添加更多针对软件和网站推荐的专业能力
   - 优先级：高

2. **移动端界面优化**：
   - 检查并改进所有页面的移动端适配
   - 特别关注软件详情页和管理后台的响应式设计
   - 优先级：中

3. **系统性能优化**：
   - 实现图片懒加载和按需加载
   - 优化首页加载速度
   - 代码分割和Tree Shaking
   - 优先级：中

4. **用户分析和统计**：
   - 集成用户行为分析
   - 添加软件/网站访问统计
   - 优先级：低

## 开发流程和规范

### 版本控制

- 使用内部Git仓库管理代码
- 主分支：`main`（生产环境）
- 开发分支：`dev`（开发环境）
- 功能分支：`feature/功能名称`
- 修复分支：`fix/问题描述`

### 代码提交规范

提交信息格式：`[类型]: 简明描述`

类型包括：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码风格修改（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动


