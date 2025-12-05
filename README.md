# 比乐时成长系统

比乐时成长系统是一个基于React和Firebase开发的儿童成长激励平台，通过任务打卡和星星奖励机制，帮助家长培养孩子的良好习惯。

## 项目功能

### 1. 日历视图
- 展示公历和农历日期
- 标记节气和特殊节日
- 显示任务完成情况
- 支持年份（1901-2099）和月份选择

### 2. 任务管理
- 每日任务列表展示
- 任务完成打卡功能
- 任务完成后奖励星星
- 支持不同类型任务（每日、每周、每月）

### 3. 星星奖励系统
- 星星数量实时显示
- 支持即时奖励功能
- 密码验证确保奖励安全
- 奖励记录历史查询

### 4. 管理员功能
- 管理员账户登录
- 用户管理（查看、禁止登录、删除）
- 支持现有用户手动添加

### 5. 成员档案
- 支持多成员管理
- 成员信息编辑
- 成员数据独立存储

### 6. 登录系统
- 普通用户注册/登录
- 管理员账户登录
- 密码显示/隐藏功能
- Caps Lock状态提示

## 技术栈

### 前端技术
- **React 19**：使用Hooks（useState, useEffect, useCallback）
- **Vite**：构建工具，支持热模块替换（HMR）
- **Tailwind CSS**：实用优先的CSS框架
- **Lucide React**：图标库

### 后端技术
- **Firebase Authentication**：用户认证
- **Firestore**：NoSQL数据库，用于存储用户数据和任务信息

### 开发工具
- **ESLint**：代码质量检查
- **Git**：版本控制

## 项目结构

```
star-tracker/
├── src/
│   ├── App.jsx              # 主应用组件
│   ├── index.css            # 全局样式
│   └── main.jsx             # 应用入口
├── public/                  # 静态资源
├── .gitignore               # Git忽略文件
├── eslint.config.js         # ESLint配置
├── index.html               # HTML模板
├── package.json             # 项目依赖
├── postcss.config.js        # PostCSS配置
├── tailwind.config.js       # Tailwind CSS配置
└── vite.config.js           # Vite配置
```

## 核心功能实现

### 1. 日历生成
```javascript
const generateCalendar = (year, month) => {
  // 生成指定月份的日历数据
  // 包含公历日期、农历信息、节气等
};
```

### 2. 管理员登录
```javascript
// 检查是否为管理员登录
if (email === ADMIN_ACCOUNT && password === ADMIN_PASSWORD) {
  onAdminLogin();
  return;
}
```

### 3. 任务完成处理
```javascript
const handleTaskComplete = (taskId) => {
  // 更新任务完成状态
  // 增加星星数量
  // 记录历史
};
```

### 4. 即时奖励
```javascript
const handleRewardSubmit = () => {
  // 密码验证
  // 应用奖励
  // 更新星星数量和历史记录
};
```

## 开发说明

### 环境要求
- Node.js 18+ 
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 代码检查
```bash
npm run lint
```

## 管理员账户

默认管理员账户：
- 账户：AdminTsou
- 密码：Sqxwxq202401zcH

## 项目特色

1. **响应式设计**：适配不同屏幕尺寸
2. **直观的用户界面**：简洁明了，易于使用
3. **安全的奖励机制**：密码验证确保奖励安全
4. **完整的任务管理**：支持多种任务类型
5. **详细的历史记录**：记录所有奖励和惩罚
6. **多成员支持**：适合家庭多个孩子使用

## 未来规划

1. 增加更多任务类型和奖励方式
2. 支持数据导出功能
3. 增加任务提醒功能
4. 优化移动端体验
5. 增加数据统计和分析功能

## 许可证

MIT
