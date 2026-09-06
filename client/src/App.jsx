import { useState, useEffect, useCallback, useRef } from 'react'

const API_BASE = '/api'

// 英文职位名翻译映射（完整词组优先）
const TITLE_TRANSLATIONS = {
  // 工程师类
  'Software Engineer': '软件工程师', 'Senior Software Engineer': '高级软件工程师',
  'Staff Software Engineer': '资深软件工程师', 'Principal Software Engineer': '首席软件工程师',
  'Backend Engineer': '后端工程师', 'Frontend Engineer': '前端工程师',
  'Full Stack Engineer': '全栈工程师', 'Fullstack Engineer': '全栈工程师',
  'Machine Learning Engineer': '机器学习工程师', 'ML Engineer': '机器学习工程师',
  'MLOps Engineer': 'MLOps工程师', 'Data Engineer': '数据工程师',
  'Data Scientist': '数据科学家', 'Research Engineer': '研究工程师',
  'Research Scientist': '研究科学家', 'AI Engineer': 'AI工程师',
  'NLP Engineer': 'NLP工程师', 'Computer Vision Engineer': '计算机视觉工程师',
  'DevOps Engineer': '运维工程师', 'Site Reliability Engineer': 'SRE工程师',
  'SRE': 'SRE工程师', 'Security Engineer': '安全工程师',
  'QA Engineer': '测试工程师', 'Test Engineer': '测试工程师',
  'iOS Engineer': 'iOS工程师', 'Android Engineer': 'Android工程师',
  'Mobile Engineer': '移动端工程师', 'Cloud Engineer': '云工程师',
  'Platform Engineer': '平台工程师', 'Infrastructure Engineer': '基础设施工程师',
  'Network Engineer': '网络工程师', 'Systems Engineer': '系统工程师',
  'Embedded Engineer': '嵌入式工程师', 'Hardware Engineer': '硬件工程师',
  'Firmware Engineer': '固件工程师', 'Robotics Engineer': '机器人工程师',
  'Blockchain Engineer': '区块链工程师', 'Web3 Engineer': 'Web3工程师',
  'Solutions Engineer': '解决方案工程师', 'Support Engineer': '支持工程师',
  'Customer Engineer': '客户工程师', 'Field Engineer': '现场工程师',
  'Release Engineer': '发布工程师', 'Build Engineer': '构建工程师',
  'Tools Engineer': '工具工程师', 'Compiler Engineer': '编译器工程师',
  'Kernel Engineer': '内核工程师', 'Driver Engineer': '驱动工程师',
  // 产品/设计类
  'Product Manager': '产品经理', 'Senior Product Manager': '高级产品经理',
  'Program Manager': '项目经理', 'Project Manager': '项目经理',
  'Technical Program Manager': '技术项目经理', 'Product Designer': '产品设计师',
  'UX Designer': 'UX设计师', 'UI Designer': 'UI设计师',
  'Interaction Designer': '交互设计师', 'Visual Designer': '视觉设计师',
  'Graphic Designer': '平面设计师', 'Motion Designer': '动效设计师',
  'Service Designer': '服务设计师',
  // 管理/领导类
  'Engineering Manager': '工程经理', 'Director of Engineering': '工程总监',
  'VP of Engineering': '工程副总裁', 'CTO': '首席技术官',
  'Technical Lead': '技术负责人', 'Team Lead': '团队负责人',
  'Lead Engineer': '主任工程师', 'Principal Engineer': '首席工程师',
  'Head of': '负责人', 'Director': '总监', 'VP': '副总裁',
  'General Manager': '总经理', 'Operations Manager': '运营经理',
  // 架构/咨询类
  'Solutions Architect': '解决方案架构师', 'Software Architect': '软件架构师',
  'System Architect': '系统架构师', 'Cloud Architect': '云架构师',
  'Data Architect': '数据架构师', 'Security Architect': '安全架构师',
  'Technical Consultant': '技术顾问', 'Solutions Consultant': '解决方案顾问',
  // 市场/销售/运营类
  'Marketing': '市场营销', 'Sales': '销售', 'Operations': '运营',
  'Business Development': '商务拓展', 'BD': '商务拓展',
  'Account Manager': '客户经理', 'Sales Manager': '销售经理',
  'Marketing Manager': '市场经理', 'Growth Manager': '增长经理',
  'Content Manager': '内容经理', 'Community Manager': '社区经理',
  'Customer Success': '客户成功', 'Account Executive': '客户执行',
  'Partnership Manager': '合作伙伴经理', 'Channel Manager': '渠道经理',
  // 研究/学术类
  'Researcher': '研究员', 'Research Associate': '研究助理',
  'Postdoc': '博士后', 'PhD Intern': '博士实习生',
  'Applied Scientist': '应用科学家', 'Staff Scientist': '资深科学家',
  // 其他常见职位
  'Analyst': '分析师', 'Data Analyst': '数据分析师',
  'Business Analyst': '业务分析师', 'Financial Analyst': '财务分析师',
  'Product Analyst': '产品分析师', 'Strategy Analyst': '战略分析师',
  'Specialist': '专员', 'Coordinator': '协调员',
  'Administrator': '管理员', 'Assistant': '助理',
  'Intern': '实习生', 'New Grad': '应届生',
  'Category Lead': '品类负责人', 'Lead': '负责人',
  'Manager': '经理', 'Engineer': '工程师',
  'Designer': '设计师', 'Scientist': '科学家',
  'Developer': '开发者', 'Architect': '架构师',
  'Consultant': '顾问', 'Advisor': '顾问',
  'Recruiter': '招聘专员', 'HR': '人力资源',
  'Finance': '财务', 'Legal': '法务',
  'Compliance': '合规', 'Audit': '审计',
  'Procurement': '采购', 'Supply Chain': '供应链',
  'Logistics': '物流', 'Warehouse': '仓储',
  'Manufacturing': '制造', 'Quality': '质量',
  'Training': '培训', 'Education': '教育',
  'Healthcare': '医疗', 'Medical': '医疗',
  'Nurse': '护士', 'Doctor': '医生',
  'Teacher': '教师', 'Professor': '教授',
  'Writer': '作家', 'Editor': '编辑',
  'Journalist': '记者', 'Translator': '翻译',
  'Interpreter': '口译员', 'Photographer': '摄影师',
  'Videographer': '摄像师', 'Animator': '动画师',
  'Illustrator': '插画师', 'Artist': '艺术家',
  'Musician': '音乐家', 'Actor': '演员',
  'Chef': '厨师', 'Bartender': '调酒师',
  'Waiter': '服务员', 'Cashier': '收银员',
  'Driver': '司机', 'Pilot': '飞行员',
  'Captain': '船长', 'Officer': '官员',
  'Agent': '代理', 'Broker': '经纪人',
  'Realtor': '房地产经纪人', 'Insurance Agent': '保险代理',
  'Banker': '银行家', 'Trader': '交易员',
  'Investor': '投资者', 'Entrepreneur': '企业家',
  'Founder': '创始人', 'CEO': '首席执行官',
  'CFO': '首席财务官', 'COO': '首席运营官',
  'CMO': '首席营销官', 'CIO': '首席信息官',
}

// 职位级别前缀翻译
const LEVEL_PREFIXES = {
  'Senior': '高级', 'Junior': '初级', 'Staff': '资深',
  'Principal': '首席', 'Lead': '主任', 'Head': '负责人',
  'Chief': '首席', 'Executive': '执行',
}

// 完整词组按长度降序只排一次（模块级缓存，避免每次渲染重排）
const SORTED_TRANSLATIONS = Object.entries(TITLE_TRANSLATIONS).sort((a, b) => b[0].length - a[0].length)
const LOWERED_TRANSLATIONS = SORTED_TRANSLATIONS.map(([en, zh]) => [en.toLowerCase(), zh])

function translateTitle(title) {
  if (!title) return ''
  // 1. 先尝试完整匹配（最长匹配优先）
  const lowerTitle = title.toLowerCase()
  for (const [en, zh] of LOWERED_TRANSLATIONS) {
    if (lowerTitle.includes(en)) return zh
  }
  // 2. 尝试提取核心职位词翻译
  const words = title.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  for (const word of words) {
    if (LEVEL_PREFIXES[word]) continue // 跳过级别前缀
    for (const [en, zh] of LOWERED_TRANSLATIONS) {
      if (en === word.toLowerCase()) return zh
    }
  }
  return ''
}

// 从文本中提取学历要求（中英文兼容）
function extractEducation(text) {
  if (!text) return ''
  if (/博士|Ph\.?D|Doctorate|Doctoral/i.test(text)) return '博士'
  if (/硕士|研究生|Master|M\.S\.|MSc/i.test(text)) return '硕士及以上'
  if (/本科|Bachelor|B\.S\.|BSc|undergraduate/i.test(text)) return '本科及以上'
  if (/大专|专科|Associate/i.test(text)) return '大专及以上'
  return ''
}

// 从文本中提取经验要求（中英文兼容）
function extractExperience(text) {
  if (!text) return ''
  const m = text.match(/(\d+)[\s~\-至]*(\d+)?\s*年(?:以上)?(?:工作)?经验/)
  if (m) return m[0].replace(/工作/g, '').trim()
  const en = text.match(/(\d+)\s*\+?\s*(?:-\s*(\d+)\s*)?years?(?:\s+of)?(?:\s+(?:work|professional|industry|relevant))?\s*experience/i)
  if (en) return `${en[1]}${en[2] ? '-' + en[2] : '+'}年经验`
  if (/经验不限|应届|校招/.test(text)) return '应届/经验不限'
  return ''
}

// 从职位描述中提取 AI/技术技能标签
const AI_SKILLS = [
  'Python', 'Java', 'C++', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Scala', 'R',
  'TensorFlow', 'PyTorch', 'JAX', 'Keras', 'Scikit-learn', 'Pandas', 'NumPy',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'Reinforcement Learning',
  'LLM', 'GPT', 'Transformer', 'BERT', 'Diffusion', 'GAN',
  'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'Terraform',
  'React', 'Vue', 'Angular', 'Node.js', 'GraphQL', 'REST API',
  'SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Spark', 'Hadoop', 'Kafka', 'Flink', 'Airflow',
  'Git', 'CI/CD', 'DevOps', 'MLOps', 'Agile', 'Scrum',
  'Linux', 'Unix', 'Bash', 'Shell',
  'Mathematics', 'Statistics', 'Linear Algebra', 'Calculus', 'Probability',
  'Algorithm', 'Data Structure', 'System Design', 'Distributed Systems',
  'API', 'Microservices', 'Cloud', 'Serverless',
  'Prompt Engineering', 'RAG', 'Fine-tuning', 'Embedding', 'Vector Database',
  'LangChain', 'LlamaIndex', 'Hugging Face', 'OpenAI', 'Anthropic',
]

function extractSkills(text) {
  if (!text) return []
  const found = []
  const lowerText = text.toLowerCase()
  for (const skill of AI_SKILLS) {
    if (found.includes(skill)) continue
    if (skill.length <= 3) {
      // 短技能名（R、Go、C++ 等）按词边界匹配，避免命中普通单词中的字母
      const escaped = skill.replace(/[+]/g, '\\+')
      if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text)) found.push(skill)
    } else if (lowerText.includes(skill.toLowerCase())) {
      found.push(skill)
    }
  }
  return found.slice(0, 12) // 最多显示12个技能标签
}

function App() {
  const PAGE_SIZE = 30
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [selectedCompany, setSelectedCompany] = useState('')
  const [selectedSource, setSelectedSource] = useState('china')
  const [companies, setCompanies] = useState([])
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('jobs')
  const [error, setError] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [sourceCount, setSourceCount] = useState({ china: 0, overseas: 0 })
  const [selectedJob, setSelectedJob] = useState(null) // 详情页状态
  const [detailLoading, setDetailLoading] = useState(false) // 详情加载中
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE) // 分页展示数量
  const [selectedCategory, setSelectedCategory] = useState('') // 岗位类别筛选（客户端过滤）
  const detailRequestId = useRef(0)

  // 带超时的 fetch：默认 15s；首次全量爬取较慢的列表/统计接口用 timeoutMs 放宽
  const fetchJSON = useCallback(async (url, options = {}) => {
    const { timeoutMs = 15000, ...fetchOptions } = options
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    fetchJSON(`${API_BASE}/companies`).then(d => setCompanies(d.companies || [])).catch(() => {})
  }, [fetchJSON])

  const fetchJobs = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (selectedCompany) params.set('company', selectedCompany)
      params.set('source', selectedSource)
      const data = await fetchJSON(`${API_BASE}/jobs/all?${params}`, { timeoutMs: 180000 })
      setJobs(data.jobs || [])
      setTotalCount(data.total || 0)
      setSourceCount(data.sources || { china: 0, overseas: 0 })
      setVisibleCount(PAGE_SIZE)
    } catch { setError('获取数据失败，请确保后端已启动') }
    finally { setLoading(false) }
  }, [keyword, selectedCompany, selectedSource, fetchJSON])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (selectedCompany) params.set('company', selectedCompany)
      params.set('source', selectedSource)
      const qs = params.toString()
      setStats(await fetchJSON(`${API_BASE}/stats${qs ? '?' + qs : ''}`, { timeoutMs: 180000 }))
    } catch { setError('获取统计数据失败') }
    finally { setStatsLoading(false) }
  }, [keyword, selectedCompany, selectedSource, fetchJSON])

  // 挂载时加载 + 公司/数据源变化时自动查询；关键词需手动搜索，避免逐键触发请求
  const fetchJobsRef = useRef(fetchJobs)
  useEffect(() => { fetchJobsRef.current = fetchJobs })
  useEffect(() => { fetchJobsRef.current() }, [selectedSource, selectedCompany])

  // 岗位类别切换时重置分页
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [selectedCategory])

  // 按类别过滤后的列表（类别筛选在客户端完成，无需重新请求）
  const filteredJobs = selectedCategory ? jobs.filter(j => j.jobCategory === selectedCategory) : jobs

  // 点击卡片：先展示基本信息，再按需从官网抓取完整详情
  const openJobDetail = useCallback(async (job) => {
    const requestId = ++detailRequestId.current
    setSelectedJob(job)
    // 如果已有完整详情则不再请求
    if ((job.responsibility || job.requirement) && (job.description || '').length > 200) return
    setDetailLoading(true)
    try {
      const res = await fetch(`${API_BASE}/jobs/${encodeURIComponent(job.id)}/detail`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (requestId === detailRequestId.current && data.job) setSelectedJob(data.job)
    } catch { /* 保持基本信息 */ }
    finally { setDetailLoading(false) }
  }, [])

  const handleSearch = (e) => { e.preventDefault(); if (activeTab === 'stats') fetchStats(); else fetchJobs() }
  const handleSourceChange = (e) => {
    const source = e.target.value
    setSelectedSource(source)
    if (!selectedCompany || source === 'all') return
    const company = companies.find(item => item.name === selectedCompany)
    const isChinaCompany = company?.source === '官网'
    if ((source === 'china' && !isChinaCompany) || (source === 'overseas' && isChinaCompany)) {
      setSelectedCompany('')
    }
  }
  const switchTab = (tab) => {
    setActiveTab(tab)
    if (tab === 'stats') fetchStats()
    else fetchJobs() // 切回列表时用当前筛选条件刷新，避免展示过期结果
  }

  const formatDate = (d) => {
    if (!d) return ''
    try {
      const date = new Date(d)
      if (isNaN(date.getTime())) return '' // 非法日期直接隐藏（V8 的 toLocaleDateString 返回 "Invalid Date" 字符串而不抛错）
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    } catch { return '' }
  }

  // 词云颜色
  const wordCloudColors = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#34495e']

  return (
    <div className="app">
      <header className="header">
        <h1>AI 招聘信息聚合平台</h1>
        <p className="subtitle">实时查询大模型厂商 & AI厂商官方招聘数据</p>
      </header>

      {/* 搜索栏 */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input type="text" placeholder="搜索关键词（如：算法、大模型、工程师...）" value={keyword} onChange={e => setKeyword(e.target.value)} className="search-input" />
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} className="select-input">
            <option value="">全部公司</option>
            <optgroup label="🇨🇳 国内厂商">
              {companies.filter(c => c.source === '官网').map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </optgroup>
            <optgroup label="🌍 海外厂商">
              {companies.filter(c => c.source !== '官网').map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </optgroup>
          </select>
          <select value={selectedSource} onChange={handleSourceChange} className="select-input">
            <option value="china">国内厂商</option>
            <option value="overseas">海外厂商</option>
            <option value="all">全部</option>
          </select>
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="select-input">
            <option value="">全部岗位</option>
            <option value="算法/研究">算法/研究</option>
            <option value="工程技术">工程技术</option>
            <option value="产品">产品</option>
            <option value="设计">设计</option>
            <option value="其他">其他</option>
          </select>
          <button type="submit" className="search-btn" disabled={loading || statsLoading}>
            {loading || statsLoading ? '加载中...' : '搜索'}
          </button>
        </form>

        {/* Tab 切换 */}
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => switchTab('jobs')}>
            职位列表 {totalCount > 0 && `(${totalCount})`}
          </button>
          <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => switchTab('stats')}>
            数据统计
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading"><div className="spinner"></div><p>正在从各厂商官方招聘网站获取数据...</p></div>}

      {/* 职位列表 */}
      {activeTab === 'jobs' && !loading && !selectedJob && (
        <div className="jobs-container">
          <div className="stats-bar">
            <span>共 <strong>{totalCount}</strong> 个职位</span>
            <span>🇨🇳 国内 <strong>{sourceCount.china}</strong></span>
            <span>🌍 海外 <strong>{sourceCount.overseas}</strong></span>
            {selectedCategory && <span>📂 {selectedCategory} <strong>{filteredJobs.length}</strong>（按类别过滤）</span>}
          </div>
          {filteredJobs.length === 0 && !error && <div className="empty-state"><p>暂无匹配的职位</p></div>}
          <div className="jobs-grid">
            {filteredJobs.slice(0, visibleCount).map(job => (
              <div key={job.id} className="job-card" onClick={() => openJobDetail(job)} style={{cursor:'pointer'}}>
                <div className="job-card-header">
                  <img className="job-logo-img" src={job.logo} alt="" onError={(e) => { e.target.style.display = 'none' }} />
                  <div className="job-company-info">
                    <span className="job-company">{job.company}</span>
                    <span className="job-type-badge">{job.companyType}</span>
                  </div>
                  <span className="source-tag">{job.source}</span>
                </div>
                <h3 className="job-title">
                  {job.title}
                  {translateTitle(job.title) && <span className="title-zh-small">（{translateTitle(job.title)}）</span>}
                </h3>
                <div className="job-meta">
                  <span className="meta-item">📍 {job.location}</span>
                  {job.department && <span className="meta-item">🏢 {job.department}</span>}
                  {job.updatedAt && <span className="meta-item">📅 {formatDate(job.updatedAt)}</span>}
                </div>
                {job.description && <p className="job-desc">{job.description.slice(0, 120)}</p>}
              </div>
            ))}
          </div>
          {filteredJobs.length > visibleCount && (
            <div className="load-more-wrap">
              <button className="load-more-btn" onClick={() => setVisibleCount(n => n + PAGE_SIZE)}>
                加载更多（已显示 {visibleCount} / {filteredJobs.length}）
              </button>
            </div>
          )}
        </div>
      )}

      {/* 职位详情页 */}
      {selectedJob && (
        <div className="job-detail-container">
          <button className="back-btn" onClick={() => setSelectedJob(null)}>← 返回列表</button>
          <div className="detail-card">
            <div className="detail-header">
              <img className="detail-logo" src={selectedJob.logo} alt="" onError={(e) => { e.target.style.display = 'none' }} />
              <div className="detail-header-info">
                <h1 className="detail-title">
                  {selectedJob.title}
                  {translateTitle(selectedJob.title) && <span className="title-zh">（{translateTitle(selectedJob.title)}）</span>}
                </h1>
                <div className="detail-company-row">
                  <span className="detail-company">{selectedJob.company}</span>
                  <span className="detail-type-badge">{selectedJob.companyType}</span>
                  <span className="detail-source">来源：{selectedJob.source}</span>
                </div>
              </div>
            </div>

            {/* 关键信息卡片 */}
            <div className="detail-meta-grid">
              <div className="detail-meta-item"><span className="meta-label">📍 工作地点</span><span className="meta-value">{selectedJob.location || '未知'}</span></div>
              {selectedJob.department && <div className="detail-meta-item"><span className="meta-label">🏢 部门/类别</span><span className="meta-value">{selectedJob.department}</span></div>}
              {(extractEducation(`${selectedJob.description} ${selectedJob.requirement}`)) && <div className="detail-meta-item"><span className="meta-label">🎓 学历要求</span><span className="meta-value">{extractEducation(`${selectedJob.description} ${selectedJob.requirement}`)}</span></div>}
              {(extractExperience(`${selectedJob.description} ${selectedJob.requirement}`)) && <div className="detail-meta-item"><span className="meta-label">💼 经验要求</span><span className="meta-value">{extractExperience(`${selectedJob.description} ${selectedJob.requirement}`)}</span></div>}
              {selectedJob.updatedAt && <div className="detail-meta-item"><span className="meta-label">📅 更新时间</span><span className="meta-value">{formatDate(selectedJob.updatedAt)}</span></div>}
              <div className="detail-meta-item"><span className="meta-label"> 招聘来源</span><span className="meta-value">{selectedJob.source}</span></div>
            </div>

            {/* 技能标签 */}
            {extractSkills(`${selectedJob.description} ${selectedJob.requirement} ${selectedJob.responsibility}`).length > 0 && (
              <div className="skill-tags-section">
                <h3>🛠️ 关键技术栈</h3>
                <div className="skill-tags">
                  {extractSkills(`${selectedJob.description} ${selectedJob.requirement} ${selectedJob.responsibility}`).map(skill => (
                    <span key={skill} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 官网链接 - 显著位置 */}
            <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="official-link-btn">
              🔗 前往官网查看并投递 →
            </a>

            {/* 详情加载中 */}
            {detailLoading && (
              <div className="detail-loading">
                <div className="spinner"></div>
                <p>正在从 {selectedJob.company} 官网获取完整职位详情...</p>
              </div>
            )}

            {/* 岗位职责 */}
            {selectedJob.responsibility && (
              <div className="detail-section">
                <h3>💼 岗位职责</h3>
                <div className="detail-text">{selectedJob.responsibility}</div>
              </div>
            )}

            {/* 岗位要求 */}
            {selectedJob.requirement && (
              <div className="detail-section">
                <h3>🎯 岗位要求</h3>
                <div className="detail-text">{selectedJob.requirement}</div>
              </div>
            )}

            {/* 加分项 */}
            {selectedJob.bonus && (
              <div className="detail-section">
                <h3>⭐ 加分项</h3>
                <div className="detail-text">{selectedJob.bonus}</div>
              </div>
            )}

            {/* 完整职位描述 */}
            {selectedJob.description && (
              <div className="detail-section">
                <h3>📝 完整职位描述</h3>
                <div className="detail-text">{selectedJob.description}</div>
              </div>
            )}

            {/* 底部官网链接 */}
            <div className="detail-footer">
              <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="official-link-btn">
                🔗 前往 {selectedJob.company} 官网查看完整职位并投递 →
              </a>
              <p className="detail-footer-note">以上信息整理自 {selectedJob.company} 官方招聘渠道，具体内容以官网为准</p>
            </div>
          </div>
        </div>
      )}

      {/* 统计面板 */}
      {activeTab === 'stats' && (
        <div className="stats-container">
          {statsLoading && <div className="loading"><div className="spinner"></div><p>正在生成统计数据...</p></div>}
          {!statsLoading && stats && (
            <>
              {/* 整体概览 */}
              <div className="stats-overview">
                <h2 className="stats-main-title">{selectedCompany ? `📊 ${selectedCompany} 招聘数据汇总` : '📊 招聘数据总览'}</h2>
                {selectedCompany && <p className="stats-filter-note">当前仅统计「{selectedCompany}」，在搜索栏选择“全部公司”可查看整体汇总</p>}
                <div className="stats-summary">
                  <div className="summary-card highlight"><span className="summary-num">{stats.total}</span><span className="summary-label">总职位数</span></div>
                  <div className="summary-card"><span className="summary-num">{stats.companyRanking?.length}</span><span className="summary-label">招聘公司</span></div>
                  <div className="summary-card"><span className="summary-num">{stats.deptRanking?.length}</span><span className="summary-label">岗位类型</span></div>
                  <div className="summary-card"><span className="summary-num">{stats.locationRanking?.length}</span><span className="summary-label">工作城市</span></div>
                </div>
              </div>

              {/* 按公司汇总 */}
              {stats.companyStats && Object.keys(stats.companyStats).length > 0 && (
                <div className="stats-panel company-overview-panel">
                  <h3>🏢 各公司招聘概览</h3>
                  <div className="company-cards-grid">
                    {Object.entries(stats.companyStats).sort((a, b) => b[1].total - a[1].total).map(([name, cs]) => (
                      <div key={name} className="company-mini-card">
                        <div className="company-mini-header">
                          <div className="company-mini-left">
                            {cs.logo && <img className="company-mini-logo" src={cs.logo} alt="" onError={(e) => { e.target.style.display = 'none' }} />}
                            <span className="company-mini-name">{name}</span>
                          </div>
                          <span className="company-mini-count">{cs.total} 个职位</span>
                        </div>
                        <div className="company-mini-tags">
                          {Object.entries(cs.locations || {}).sort((a,b) => b[1]-a[1]).slice(0, 3).map(([loc, cnt]) => (
                            <span key={loc} className="mini-tag">📍{loc}({cnt})</span>
                          ))}
                          {Object.entries(cs.eduCount || {}).sort((a,b) => b[1]-a[1]).slice(0, 1).map(([edu, cnt]) => (
                            <span key={edu} className="mini-tag edu">🎓{edu}({cnt})</span>
                          ))}
                          {Object.entries(cs.depts || {}).sort((a,b) => b[1]-a[1]).slice(0, 2).map(([dept, cnt]) => (
                            <span key={dept} className="mini-tag dept">🏢{dept}({cnt})</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="stats-grid">
                {/* 公司招聘排名 */}
                <div className="stats-panel">
                  <h3>🏆 招聘数量排名</h3>
                  <div className="ranking-list">
                    {(stats.companyRanking || []).map((item, i) => (
                      <div key={item.name} className="ranking-item">
                        <span className={`rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                        <span className="rank-name">{item.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar" style={{ width: `${(item.count / stats.companyRanking[0].count) * 100}%` }}></div>
                        </div>
                        <span className="rank-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 岗位类型排名 */}
                <div className="stats-panel">
                  <h3>💼 岗位类型排名</h3>
                  <div className="ranking-list">
                    {(stats.deptRanking || []).slice(0, 12).map((item, i) => (
                      <div key={item.name} className="ranking-item">
                        <span className={`rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                        <span className="rank-name">{item.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar dept" style={{ width: `${(item.count / stats.deptRanking[0].count) * 100}%` }}></div>
                        </div>
                        <span className="rank-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 工作地点排名 */}
                <div className="stats-panel">
                  <h3>📍 工作地点排名</h3>
                  <div className="ranking-list">
                    {(stats.locationRanking || []).map((item, i) => (
                      <div key={item.name} className="ranking-item">
                        <span className={`rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                        <span className="rank-name">{item.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar location" style={{ width: `${(item.count / stats.locationRanking[0].count) * 100}%` }}></div>
                        </div>
                        <span className="rank-count">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 学历要求统计 */}
                <div className="stats-panel">
                  <h3>🎓 学历要求分布</h3>
                  <div className="ranking-list">
                    {(stats.eduRanking || []).map((item, i) => (
                      <div key={item.name} className="ranking-item">
                        <span className={`rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                        <span className="rank-name">{item.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar major" style={{ width: `${(item.count / (stats.eduRanking[0]?.count || 1)) * 100}%` }}></div>
                        </div>
                        <span className="rank-count">{item.count}</span>
                      </div>
                    ))}
                    {(!stats.eduRanking || stats.eduRanking.length === 0) && <p style={{color:'#999',fontSize:'13px',textAlign:'center',padding:'20px'}}>暂无学历数据</p>}
                  </div>
                </div>

                {/* 专业要求排名 */}
                <div className="stats-panel">
                  <h3>📚 专业要求排名</h3>
                  <div className="ranking-list">
                    {(stats.majorRanking || []).slice(0, 12).map((item, i) => (
                      <div key={item.name} className="ranking-item">
                        <span className={`rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                        <span className="rank-name">{item.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar" style={{ width: `${(item.count / (stats.majorRanking[0]?.count || 1)) * 100}%`, background: 'linear-gradient(90deg, #f093fb, #f5576c)' }}></div>
                        </div>
                        <span className="rank-count">{item.count}</span>
                      </div>
                    ))}
                    {(!stats.majorRanking || stats.majorRanking.length === 0) && <p style={{color:'#999',fontSize:'13px',textAlign:'center',padding:'20px'}}>暂无专业要求数据</p>}
                  </div>
                </div>

                {/* 经验要求统计 */}
                <div className="stats-panel">
                  <h3>⏳ 经验要求分布</h3>
                  <div className="ranking-list">
                    {(stats.expRanking || []).map((item, i) => (
                      <div key={item.name} className="ranking-item">
                        <span className={`rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
                        <span className="rank-name">{item.name}</span>
                        <div className="rank-bar-wrap">
                          <div className="rank-bar location" style={{ width: `${(item.count / (stats.expRanking[0]?.count || 1)) * 100}%` }}></div>
                        </div>
                        <span className="rank-count">{item.count}</span>
                      </div>
                    ))}
                    {(!stats.expRanking || stats.expRanking.length === 0) && <p style={{color:'#999',fontSize:'13px',textAlign:'center',padding:'20px'}}>暂无经验要求数据</p>}
                  </div>
                </div>

                {/* 词云 */}
                <div className="stats-panel wordcloud-panel">
                  <h3>☁️ 招聘要求高频词云</h3>
                  <div className="wordcloud">
                    {(stats.wordCloud || []).map((word, i) => (
                      <span key={word.text} className="word-item" style={{
                        fontSize: `${Math.max(12, Math.min(36, 12 + (word.value / (stats.wordCloud[0]?.value || 1)) * 24))}px`,
                        color: wordCloudColors[i % wordCloudColors.length],
                        opacity: Math.max(0.6, word.value / (stats.wordCloud[0]?.value || 1)),
                      }}>
                        {word.text}
                        <sup className="word-count">{word.value}</sup>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <footer className="footer">
        <p>数据来源：各公司官方招聘网站（Greenhouse / Ashby / 官网API）| 实时获取</p>
        <p>覆盖：DeepSeek、Kimi、MiniMax、智谱AI、小米、字节跳动、腾讯、百度、华为、OpenAI、Anthropic、xAI 等</p>
      </footer>
    </div>
  )
}

export default App
