# AI 招聘信息聚合平台

实时聚合国内外 AI 大模型厂商的官方招聘数据，提供职位搜索、详情查看、数据统计分析等功能。

## 功能特性

- **多源数据聚合**：接入 DeepSeek、Kimi、MiniMax、智谱AI、腾讯、百度、阿里千问、华为、OpenAI、Anthropic 等 20+ 家 AI 公司
- **实时数据获取**：通过官方 API 和 Puppeteer 爬虫实时获取各公司官网招聘数据
- **智能过滤**：自动过滤游戏等非 AI 相关职位，聚焦 AI 领域
- **二级详情页**：点击职位卡片查看完整信息（职责、要求、学历、经验、技能标签）
- **数据统计**：公司排名、岗位分布、地点分布、学历/经验要求、专业排名、高频词云
- **按公司汇总**：支持按公司筛选查看专属统计数据
- **中英文翻译**：英文职位名自动附加中文翻译
- **10 分钟缓存**：避免重复请求官网，降低反爬风险

## 技术栈

- **前端**：React 18 + Vite
- **后端**：Node.js + Express
- **爬虫**：Puppeteer-core（使用系统 Chrome）
- **数据源**：Greenhouse API、Ashby API、飞书招聘、Moka HR、腾讯/百度官网 API

## 快速开始

### 环境要求

- Node.js >= 18
- Google Chrome 浏览器（Puppeteer 使用，自动检测路径）
  - Windows: 自动检测 Program Files 下的 Chrome
  - macOS: `/Applications/Google Chrome.app`
  - Linux: `/usr/bin/google-chrome` 或 `/usr/bin/chromium`
  - 自定义路径: 设置环境变量 `CHROME_PATH`

### 安装与运行

```bash
# 安装依赖
cd server && npm install
cd ../client && npm install

# 启动后端（端口 3001）
cd server && node index.js

# 启动前端（端口 5173）
cd client && npx vite --port 5173
```

访问 http://localhost:5173 即可使用。

## 项目结构

```
ai-jobs-finder/
├── server/          # 后端服务
│   ├── index.js     # 主服务（API + 爬虫 + 缓存）
│   └── package.json
├── client/          # 前端应用
│   ├── src/
│   │   ├── App.jsx  # 主组件
│   │   └── index.css
│   └── package.json
└── README.md
```

## 支持的公司

### 国内（10 家）
DeepSeek、Kimi(月之暗面)、MiniMax、智谱AI(GLM)、阿里千问、小米、字节跳动、腾讯、百度、华为

### 海外（10 家）
OpenAI、Anthropic、xAI、Databricks、Scale AI、Cohere、Perplexity、DeepL、Stability AI、Runway

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/jobs/all?source=china&company=&keyword=` | 获取职位列表 |
| `GET /api/jobs/:id/detail` | 获取职位详情（按需抓取） |
| `GET /api/stats?source=&company=&keyword=` | 获取统计数据 |
| `GET /api/companies` | 获取公司列表 |
| `GET /api/cache/status` | 查看缓存状态 |
| `POST /api/cache/clear` | 清除缓存 |

## 注意事项

- 部分公司（华为、字节跳动、小米）因官网反爬机制，暂无法获取数据
- 首次加载需要较长时间（Puppeteer 抓取），后续请求走缓存
- 请合理使用，避免对目标网站造成过大压力
