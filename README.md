# AI 招聘信息聚合平台

[![CI](https://github.com/wqshan-cn/ai-jobs-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/wqshan-cn/ai-jobs-finder/actions/workflows/ci.yml)

实时聚合国内外 AI 大模型厂商的官方招聘数据，提供职位搜索、详情查看、数据统计分析等功能。

## 功能特性

- **多源数据聚合**：接入 DeepSeek、Kimi、MiniMax、智谱AI、腾讯、百度、阿里千问、华为、OpenAI、Anthropic 等 30+ 家 AI 公司
- **实时数据获取**：通过官方 API 和 Puppeteer 爬虫实时获取各公司官网招聘数据
- **智能过滤**：自动过滤游戏等非 AI 相关职位，聚焦 AI 领域
- **二级详情页**：点击职位卡片查看完整信息（职责、要求、学历、经验、技能标签）
- **数据统计**：公司排名、岗位分布、地点分布、学历/经验要求、专业排名、高频词云
- **按公司汇总**：支持按公司筛选查看专属统计数据
- **中英文翻译**：英文职位名自动附加中文翻译
- **10 分钟缓存**：避免重复请求官网，降低反爬风险；并发请求自动去重；空结果短缓存避免失败后反复重试

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

### 方式一：开发模式（前后端分离，推荐本地开发）

```bash
# 一键安装前后端依赖
npm run install-all

# 同时启动后端(3001) + 前端(5173)
npm run dev
```

访问 http://localhost:5173 即可使用。

也可以分别手动启动：

```bash
# 启动后端（端口 3001）
cd server && npm start

# 启动前端（端口 5173）
cd client && npm run dev
```

### 方式二：生产模式（单进程）

```bash
npm run install-all
npm run build          # 构建前端到 client/dist
npm start              # 服务端自动托管前端静态文件
```

访问 http://localhost:3001 即可，无需单独启动前端。

### 方式三：Docker

```bash
docker compose up -d
```

容器内自带 Chromium 与中文字体，访问 http://localhost:3001。

## 项目结构

```
ai-jobs-finder/
├── server/                  # 后端服务
│   ├── index.js             # 主服务（API + 爬虫 + 缓存）
│   └── package.json
├── client/                  # 前端应用
│   ├── index.html
│   ├── vite.config.js
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── App.jsx          # 主组件（列表 / 详情 / 统计）
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
├── .github/workflows/ci.yml # CI（服务端语法检查 + 前端构建）
├── Dockerfile / docker-compose.yml
├── package.json             # 根脚本（npm run dev / install-all）
└── README.md
```

## 支持的公司

### 国内（12 家）
DeepSeek、Kimi(月之暗面)、MiniMax、智谱AI(GLM)、阿里千问、零一万物(Yi)、生数科技(Vidu)、小米、字节跳动、腾讯、百度、华为

### 海外（19 家）
OpenAI、Anthropic、xAI、Databricks、Scale AI、Cohere、Perplexity、DeepL、Stability AI、Runway、SambaNova、Lightning AI、AssemblyAI、Cerebras、ElevenLabs、Midjourney、Cartesia、Suno、Baseten

## API 接口

| 接口 | 说明 |
|------|------|
| `GET /api/jobs/all?source=china&company=&keyword=` | 获取职位列表 |
| `GET /api/jobs/:id/detail` | 获取职位详情（按需抓取） |
| `GET /api/jobs/:id` | 获取单个职位基本信息 |
| `GET /api/stats?source=&company=&keyword=` | 获取统计数据 |
| `GET /api/companies` | 获取公司列表 |
| `GET /api/cache/status` | 查看缓存状态 |
| `POST /api/cache/clear` | 清除缓存 |
| `GET /api/health` | 健康检查 |

支持环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3001` | 服务端监听端口 |
| `CHROME_PATH` | 自动检测 | Chrome/Chromium 可执行文件路径 |

## 常见问题

- **首页一直加载中 / 提示获取数据失败**
  确认后端已启动（`npm run server`），且浏览器控制台无跨域报错。前端 dev 模式通过 Vite 代理访问 3001 端口。
- **国内厂商职位为空**
  百度因官网强制登录暂无数据；华为走第三方渠道，可能间歇性为空；其余厂商若爬取失败，空结果只缓存 2 分钟，稍后刷新即可。海外厂商（Greenhouse/Ashby API）最稳定。
- **报错找不到 Chrome**
  通过环境变量指定：`CHROME_PATH="C:\path\to\chrome.exe" npm run server`。
- **端口被占用**
  `PORT=3002 npm run server`，前端开发模式下需同步修改 `client/vite.config.js` 中的代理目标。
- **首次加载慢**
  首次需 Puppeteer 实时抓取各官网（约 30s–2min），之后走 10 分钟缓存。

## 注意事项

- 所有数据实时抓取自各公司公开招聘渠道，仅供个人求职参考，具体以各公司官网为准
- 请合理使用，避免对目标网站造成过大压力
- 服务端对抓取到的 URL 做了 SSRF 防护（仅允许公网 http/https 地址）

### 各厂商适配说明

| 厂商 | 接入方式 | 状态 |
|------|----------|------|
| 腾讯、字节跳动 | 官方 API（腾讯分页抓取；字节经浏览器 CSRF 令牌调用） | 稳定 |
| OpenAI、Anthropic 等 19 家海外厂商 | Greenhouse / Ashby 官方 API | 稳定 |
| MiniMax、智谱AI、零一万物、生数科技 | 飞书招聘页面（新旧两版模板均已适配） | 稳定 |
| DeepSeek | Moka 招聘页面 | 稳定 |
| 阿里千问、小米 | 官网页面抓取 | 基本稳定 |
| 华为 | 第三方渠道（猎聘） | 不稳定，可能为空 |
| 百度 | — | 官网已强制登录且有自动化检测，暂无法获取 |

## License

[MIT](LICENSE)
