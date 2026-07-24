const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 浏览器路径（跨平台自动检测）
const os = require('os');
function getChromePath() {
  const platform = os.platform();
  if (platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ];
    return paths.find(p => require('fs').existsSync(p)) || paths[0];
  } else if (platform === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  } else {
    // Linux
    const paths = ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium-browser', '/usr/bin/chromium'];
    return paths.find(p => require('fs').existsSync(p)) || '/usr/bin/google-chrome';
  }
}
const BROWSER_PATH = process.env.CHROME_PATH || getChromePath();

// ============ 公司配置（国内优先）============
const COMPANIES = {
  china: [
    { name: 'DeepSeek', id: 'deepseek', type: '大模型', logo: 'https://chat.deepseek.com/apple-touch-icon.png', career: 'https://app.mokahr.com/social-recruitment/high-flyer/140576' },
    { name: 'Kimi(月之暗面)', id: 'moonshot', type: '大模型', logo: 'https://kimi.moonshot.cn/favicon.ico', career: 'https://app.mokahr.com/apply/moonshot/148506', greenhouse: 'moonshot' },
    { name: 'MiniMax', id: 'minimax', type: '大模型', logo: 'https://www.minimaxi.com/favicon.ico', career: 'https://vrfi1sk8a0.jobs.feishu.cn/index/' },
    { name: '智谱AI(GLM)', id: 'zhipu', type: '大模型', logo: 'https://www.zhipuai.cn/favicon.ico', career: 'https://www.zhipuai.cn/recruitment' },
    { name: '阿里千问', id: 'qwen', type: '大模型', logo: 'https://img.alicdn.com/imgextra/i1/O1CN01AKUdEM1oPxOVjmFEg_!!6000000005218-2-tps-1024-1024.png', career: 'https://talent.quark.cn/off-campus/position-list' },
    { name: '小米', id: 'xiaomi', type: 'AI/智能硬件', logo: 'https://s01.mifile.cn/favicon.ico', career: 'https://hr.xiaomi.com/job' },
    { name: '字节跳动', id: 'bytedance', type: '大模型/互联网', logo: 'https://lf-headquarters.bytescm.com/logo.png', career: 'https://jobs.bytedance.com' },
    { name: '腾讯', id: 'tencent', type: '大模型/互联网', logo: 'https://mat1.gtimg.com/qqcdn/qqindex2021/favicon.ico', career: 'https://careers.tencent.com' },
    { name: '百度', id: 'baidu', type: '大模型/AI', logo: 'https://www.baidu.com/favicon.ico', career: 'https://talent.baidu.com' },
    { name: '华为', id: 'huawei', type: 'AI/芯片', logo: 'https://www.huawei.com/favicon.ico', career: 'https://career.huawei.com' },
  ],
  greenhouse: [
    { name: 'Anthropic', token: 'anthropic', type: '大模型', logo: 'https://www.anthropic.com/favicon.ico' },
    { name: 'xAI', token: 'xai', type: '大模型', logo: 'https://x.ai/favicon.ico' },
    { name: 'Scale AI', token: 'scaleai', type: 'AI基础设施', logo: 'https://scale.com/favicon.ico' },
    { name: 'Stability AI', token: 'stabilityai', type: 'AIGC', logo: 'https://stability.ai/favicon.ico' },
    { name: 'Databricks', token: 'databricks', type: 'AI/数据', logo: 'https://www.databricks.com/favicon.ico' },
  ],
  ashby: [
    { name: 'OpenAI', token: 'openai', type: '大模型', logo: 'https://openai.com/favicon.ico' },
    { name: 'Cohere', token: 'cohere', type: '大模型', logo: 'https://cohere.com/favicon.ico' },
    { name: 'Perplexity', token: 'perplexity', type: 'AI搜索', logo: 'https://www.perplexity.ai/favicon.ico' },
    { name: 'DeepL', token: 'deepl', type: 'AI翻译', logo: 'https://www.deepl.com/favicon.ico' },
    { name: 'Runway', token: 'runway', type: 'AIGC/视频', logo: 'https://runwayml.com/favicon.ico' },
  ],
};

// ============ 缓存管理 ============
const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map();

function getCache(key) {
  const entry = cache.get(key);
  if (entry && (Date.now() - entry.timestamp < CACHE_TTL)) {
    console.log(`[缓存命中] ${key} (${Math.round((Date.now() - entry.timestamp) / 1000)}s前)`);
    return entry.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`[缓存写入] ${key} (${data.length} 条)`);
}

async function withCache(key, fetchFn) {
  const cached = getCache(key);
  if (cached !== null) return cached;
  const data = await fetchFn();
  if (data && data.length > 0) setCache(key, data);
  return data;
}

// ============ Puppeteer 浏览器管理 ============
let browserInstance = null;
async function getBrowser() {
  if (!browserInstance || !browserInstance.connected) {
    browserInstance = await puppeteer.launch({
      executablePath: BROWSER_PATH,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-proxy-server'],
    });
  }
  return browserInstance;
}

// ============ 通用飞书招聘抓取（MiniMax / 智谱AI 共用）============
async function fetchFeishuJobs(config) {
  const { url, company, companyId, companyType, logo, maxPages = 10 } = config;
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('a[href*="/position/"]', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));

    const extractJobs = () => page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/position/"]');
      const results = [];
      links.forEach(a => {
        const dataId = a.getAttribute('data-id') || '';
        const title = a.querySelector('.positionItem-title-text')?.textContent?.trim() || '';
        const subTitle = a.querySelector('[class*="subTitle"]');
        const location = subTitle?.querySelector('span')?.textContent?.trim() || '';
        const category = a.querySelector('[class*="infoText-category"]')?.textContent?.trim() || '';
        const descEl = a.querySelector('[class*="desc"], [class*="detail-text"], [class*="position-desc"]');
        const desc = descEl?.textContent?.trim()?.slice(0, 500) || '';
        if (title && title.length > 2) {
          results.push({ title, location: location || '未知', category, desc, url: a.href, id: dataId });
        }
      });
      return results;
    });

    const jobs = await extractJobs();
    const pageInfo = await page.evaluate(() => {
      const items = document.querySelectorAll('li[class*="pager"], ul[class*="pagination"] li, [class*="page"] li');
      const nums = Array.from(items).map(li => parseInt(li.textContent?.trim())).filter(n => !isNaN(n));
      return { maxPage: nums.length > 0 ? Math.max(...nums) : 1 };
    });

    console.log(`[${company}] 第1页: ${jobs.length} 个职位, 总页数: ${pageInfo.maxPage}`);
    let allJobs = [...jobs];
    const totalPages = Math.min(pageInfo.maxPage, maxPages);
    for (let p = 2; p <= totalPages; p++) {
      try {
        const clicked = await page.evaluate((pageNum) => {
          const items = document.querySelectorAll('li[class*="pager"], ul[class*="pagination"] li, [class*="page"] li');
          for (const li of items) {
            if (li.textContent?.trim() === String(pageNum)) { li.click(); return true; }
          }
          const nextBtn = document.querySelector('li[title="下一页"], [class*="next"]');
          if (nextBtn) { nextBtn.click(); return true; }
          return false;
        }, p);
        if (!clicked) break;
        await new Promise(r => setTimeout(r, 2000));
        const moreJobs = await extractJobs();
        allJobs = allJobs.concat(moreJobs);
        console.log(`[${company}] 第${p}页: ${moreJobs.length} 个职位`);
      } catch (e) { break; }
    }

    return allJobs.map(job => ({
      id: `${companyId}_${job.id || job.url.split('/').pop() || Math.random().toString(36).slice(2)}`,
      title: job.title, company, companyType, logo,
      location: job.location, url: job.url, source: '飞书招聘',
      updatedAt: '', department: job.category || '', description: job.desc || '',
    }));
  } catch (err) {
    console.error(`[${company}] 飞书抓取失败:`, err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

async function fetchMiniMaxJobs() {
  return fetchFeishuJobs({ url: 'https://vrfi1sk8a0.jobs.feishu.cn/index/', company: 'MiniMax', companyId: 'minimax', companyType: '大模型', logo: 'https://www.minimaxi.com/favicon.ico', maxPages: 10 });
}

// ============ DeepSeek 抓取 (Moka HR) ============
async function fetchDeepSeekJobs() {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://app.mokahr.com/social-recruitment/high-flyer/140576#/jobs', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    await page.waitForSelector('a[href*="/job/"]', { timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const jobs = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href*="/job/"]');
      const results = [];
      links.forEach(a => {
        const fullText = a.textContent || '';
        const titleEl = a.querySelector('[class*="title"], [class*="name"]');
        const title = titleEl?.textContent?.trim() || fullText.split('\n')[0]?.trim() || '';
        if (!title || title.length < 3) return;
        const locationMatch = fullText.match(/[\u4e00-\u9fa5]+·[\u4e00-\u9fa5]+市|[\u4e00-\u9fa5]{2,4}市/g);
        const location = locationMatch ? [...new Set(locationMatch)].slice(0, 3).join(', ') : '';
        const categoryEl = a.closest('[class*="category"], [class*="group"]');
        const category = categoryEl?.querySelector('[class*="title"], [class*="header"]')?.textContent?.trim() || '';
        let desc = fullText;
        if (title) desc = desc.replace(title, '');
        desc = desc.replace(/\s+/g, ' ').trim();
        const responsibilityMatch = desc.match(/【(?:岗位职责|工作职责|主要职责|职责描述)】([\s\S]*?)(?=【(?:岗位要求|任职要求|职位要求|核心要求|加分项|我们希望你)】|$)/);
        const requirementMatch = desc.match(/【(?:岗位要求|任职要求|职位要求|核心要求)】([\s\S]*?)(?=【(?:加分项|我们希望你|福利待遇)】|$)/);
        const bonusMatch = desc.match(/【加分项】([\s\S]*?)(?=【|$)/);
        results.push({
          title, location, category, url: a.href,
          description: desc.slice(0, 2000),
          responsibility: responsibilityMatch ? responsibilityMatch[1].trim().slice(0, 800) : '',
          requirement: requirementMatch ? requirementMatch[1].trim().slice(0, 800) : '',
          bonus: bonusMatch ? bonusMatch[1].trim().slice(0, 500) : '',
        });
      });
      return results;
    });

    console.log(`[DeepSeek] Moka获取: ${jobs.length} 个职位（含完整描述）`);
    return jobs.map(job => ({
      id: `deepseek_${job.url.split('/').pop() || Math.random().toString(36).slice(2)}`,
      title: job.title, company: 'DeepSeek', companyType: '大模型',
      logo: 'https://chat.deepseek.com/apple-touch-icon.png',
      location: job.location || '未知', url: job.url, source: 'Moka招聘',
      updatedAt: '', department: job.category || '', description: job.description || '',
      responsibility: job.responsibility || '', requirement: job.requirement || '', bonus: job.bonus || '',
    }));
  } catch (err) {
    console.error('[DeepSeek] 抓取失败:', err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ============ 智谱AI 抓取（飞书招聘平台）============
async function fetchZhipuJobs() {
  return fetchFeishuJobs({ url: 'https://zhipu-ai.jobs.feishu.cn/index/', company: '智谱AI(GLM)', companyId: 'zhipu', companyType: '大模型', logo: 'https://www.zhipuai.cn/favicon.ico', maxPages: 15 });
}

// ============ 小米抓取 ============
async function fetchXiaomiJobs() {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://hr.xiaomi.com/job', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));
    const jobs = await page.evaluate(() => {
      const results = [];
      const selectors = ['[class*="job"]', '[class*="position"]', '[class*="list-item"]', 'a[href*="detail"]'];
      for (const sel of selectors) {
        const els = document.querySelectorAll(sel);
        els.forEach(el => {
          const title = el.querySelector('[class*="title"], [class*="name"], h3, h4')?.textContent?.trim() || '';
          if (title && title.length > 3 && title.length < 100 && !results.find(r => r.title === title)) {
            const location = el.querySelector('[class*="location"], [class*="city"], [class*="address"]')?.textContent?.trim() || '';
            const desc = el.querySelector('[class*="desc"], p')?.textContent?.trim()?.slice(0, 300) || '';
            const link = el.closest('a')?.href || el.querySelector('a')?.href || '';
            results.push({ title, location, desc, url: link });
          }
        });
        if (results.length > 0) break;
      }
      return results;
    });
    console.log(`[小米] 获取: ${jobs.length} 个职位`);
    return jobs.map(job => ({
      id: `xiaomi_${job.url?.split('/').pop() || Math.random().toString(36).slice(2)}`,
      title: job.title, company: '小米', companyType: 'AI/智能硬件',
      logo: 'https://s01.mifile.cn/favicon.ico', location: job.location || '未知',
      url: job.url || 'https://hr.xiaomi.com/job', source: '官网',
      updatedAt: '', department: '', description: job.desc || '',
    }));
  } catch (err) {
    console.error('[小米] 抓取失败:', err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ============ 阿里千问抓取（Puppeteer + 分页点击）============
async function fetchQwenJobs() {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://talent.quark.cn/off-campus/position-list?lang=zh', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 8000));
    
    const extractJobs = () => page.evaluate(() => {
      const body = document.body.innerText || '';
      const results = [];
      const lines = body.split('\n').map(l => l.trim()).filter(l => l);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('更新于') && i > 0) {
          const title = lines[i - 1];
          const category = lines[i + 1] || '';
          const location = lines[i + 2] || '';
          if (title && title.length > 5 && title.length < 100 && !title.startsWith('更新于') && !title.includes('职位类别')) {
            results.push({ title, category, location: location.replace(/\//g, ', ').trim() });
          }
        }
      }
      return results;
    });
    
    // 获取第一页
    let allJobs = await extractJobs();
    console.log(`[阿里千问] 第1页: ${allJobs.length} 个职位`);
    
    // 点击下一页按钮加载更多（最多20页）
    let prevFirstTitle = allJobs.length > 0 ? allJobs[0].title : '';
    for (let p = 2; p <= 20; p++) {
      const clicked = await page.evaluate(() => {
        // 尝试多种下一页按钮选择器
        const selectors = ['.next-next', '[class*="arrow-right"]', 'button.next-btn:last-of-type'];
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn && !btn.disabled) { btn.click(); return true; }
        }
        return false;
      });
      if (!clicked) break;
      // 等待页面内容变化（最多等5秒）
      let pageJobs = [];
      for (let wait = 0; wait < 5; wait++) {
        await new Promise(r => setTimeout(r, 1000));
        pageJobs = await extractJobs();
        if (pageJobs.length > 0 && pageJobs[0].title !== prevFirstTitle) break;
      }
      if (pageJobs.length === 0 || pageJobs[0].title === prevFirstTitle) break;
      prevFirstTitle = pageJobs[0].title;
      allJobs = allJobs.concat(pageJobs);
      console.log(`[阿里千问] 第${p}页: ${pageJobs.length} 个职位`);
    }
    
    // 去重
    const seen = new Set();
    allJobs = allJobs.filter(j => { if (seen.has(j.title)) return false; seen.add(j.title); return true; });
    
    console.log(`[阿里千问] 总计: ${allJobs.length} 个职位`);
    return allJobs.slice(0, 200).map((job, idx) => ({
      id: `qwen_${idx}`,
      title: job.title, company: '阿里千问', companyType: '大模型',
      logo: 'https://img.alicdn.com/imgextra/i1/O1CN01AKUdEM1oPxOVjmFEg_!!6000000005218-2-tps-1024-1024.png',
      location: job.location || '未知', url: 'https://talent.quark.cn/off-campus/position-list?lang=zh',
      source: '官网', updatedAt: '', department: job.category || '', description: '',
    }));
  } catch (err) {
    console.error('[阿里千问] 抓取失败:', err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ============ 华为抓取（猎聘第三方数据源）============
async function fetchHuaweiJobs2() {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://www.liepin.com/zhaopin/?key=%E5%8D%8E%E4%B8%BA&curPage=0', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 5000));
    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="job-card"], [class*="JobCard"], [class*="position-item"]');
      const results = [];
      cards.forEach(card => {
        const rawTitle = card.querySelector('[class*="title"], [class*="name"], h3, h4, a')?.textContent?.trim() || '';
        if (!rawTitle || rawTitle.length < 5) return;
        // 解析格式：职位名【地点】薪资·薪月数经验学历
        const locMatch = rawTitle.match(/【(.+?)】/);
        const location = locMatch ? locMatch[1] : '';
        const title = rawTitle.split('【')[0].trim();
        const afterLoc = rawTitle.split('】')[1] || '';
        const salaryMatch = afterLoc.match(/(\d+[\-~]\d+k[·・]?\d*薪?)/i);
        const salary = salaryMatch ? salaryMatch[1] : '';
        const expMatch = afterLoc.match(/(经验不限|应届生|\d+[\-~]?\d*年[以上]*)/);
        const exp = expMatch ? expMatch[1] : '';
        const eduMatch = afterLoc.match(/(本科|硕士|博士|大专|学历不限)/);
        const edu = eduMatch ? eduMatch[1] : '';
        if (title.length > 3 && title.length < 80) {
          results.push({ title, location, salary, exp, edu });
        }
      });
      return results;
    });
    console.log(`[华为/猎聘] 获取: ${jobs.length} 个职位`);
    return jobs.slice(0, 40).map((job, idx) => ({
      id: `huawei_${idx}`,
      title: job.title,
      company: '华为',
      companyType: 'AI/芯片',
      logo: 'https://www.huawei.com/favicon.ico',
      location: job.location || '未知',
      url: 'https://www.liepin.com/zhaopin/?key=%E5%8D%8E%E4%B8%BA',
      source: '猎聘',
      updatedAt: '',
      department: [job.salary, job.exp, job.edu].filter(Boolean).join(' | '),
      description: `${job.salary ? '薪资: ' + job.salary : ''} ${job.exp ? '经验: ' + job.exp : ''} ${job.edu ? '学历: ' + job.edu : ''}`.trim(),
    }));
  } catch (err) {
    console.error('[华为/猎聘] 抓取失败:', err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

// ============ Greenhouse API ============
async function fetchGreenhouseJobs(company) {
  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company.token || company.greenhouse}/jobs`;
    const res = await fetch(url, { timeout: 20000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.jobs || []).map(job => ({
      id: `gh_${company.token || company.greenhouse}_${job.id}`,
      title: job.title, company: company.name, companyType: company.type, logo: company.logo,
      location: job.location?.name || '未知', url: job.absolute_url, source: 'Greenhouse',
      updatedAt: job.updated_at, department: job.departments?.[0]?.name || '', description: '',
    }));
  } catch (err) {
    console.error(`[Greenhouse] ${company.name}:`, err.message);
    return [];
  }
}

// ============ Ashby API ============
async function fetchAshbyJobs(company) {
  try {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${company.token}`;
    const res = await fetch(url, { timeout: 20000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.jobs || []).map(job => ({
      id: `ashby_${company.token}_${job.id}`,
      title: job.title, company: company.name, companyType: company.type, logo: company.logo,
      location: job.location || '未知', url: job.jobUrl || job.applyUrl, source: 'Ashby',
      updatedAt: job.publishedAt || '', department: job.department || job.team || '',
      description: (job.descriptionHtml || '').replace(/<[^>]+>/g, '').slice(0, 300),
    }));
  } catch (err) {
    console.error(`[Ashby] ${company.name}:`, err.message);
    return [];
  }
}

// ============ 腾讯 API ============
async function fetchTencentJobs(keyword = '') {
  try {
    const url = `https://careers.tencent.com/tencentcareer/api/post/Query?timestamp=${Date.now()}&countryId=&cityId=&bgIds=&productId=&categoryId=&parentCategoryId=&attrId=1&keyword=${encodeURIComponent(keyword)}&pageIndex=1&pageSize=100&language=zh-cn&area=cn`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://careers.tencent.com/' }, timeout: 20000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data?.Data?.Posts || []).map(job => ({
      id: `tencent_${job.PostId}`, title: job.RecruitPostName, company: '腾讯', companyType: '大模型/互联网',
      logo: 'https://mat1.gtimg.com/qqcdn/qqindex2021/favicon.ico',
      location: `${job.LocationName || ''}`.trim() || '未知',
      url: `https://careers.tencent.com/jobdesc.html?postId=${job.PostId}`, source: '官网',
      updatedAt: job.LastUpdateTime || '', department: job.BGName || '',
      description: (job.Responsibility || '').replace(/<[^>]+>/g, '').slice(0, 300),
      requirement: (job.Requirement || '').replace(/<[^>]+>/g, '').slice(0, 300),
    }));
  } catch (err) {
    console.error('[腾讯]:', err.message);
    return [];
  }
}

// ============ 百度 API ============
async function fetchBaiduJobs(keyword = '') {
  try {
    const url = `https://talent.baidu.com/ht/api/getRecruitPostListNew?recruitType=SOCIAL&pageSize=100&keyWord=${encodeURIComponent(keyword)}&curPage=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://talent.baidu.com/jobs/social-list' }, timeout: 20000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data?.data?.list || []).map(job => ({
      id: `baidu_${job.id}`, title: job.name, company: '百度', companyType: '大模型/AI',
      logo: 'https://www.baidu.com/favicon.ico', location: job.city || '未知',
      url: `https://talent.baidu.com/jobs/social-detail?recruitId=${job.id}`, source: '官网',
      updatedAt: job.publishTime || '', department: job.department || '',
      description: (job.desc || '').replace(/<[^>]+>/g, '').slice(0, 300),
    }));
  } catch (err) {
    console.error('[百度]:', err.message);
    return [];
  }
}

// ============ 华为 API ============
async function fetchHuaweiJobs(keyword = '') {
  try {
    const res = await fetch('https://career.huawei.com/reccampportal/api/index/getIndexPageRecruitPostList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://career.huawei.com/reccampportal/portal5/index.html' },
      body: JSON.stringify({ key: keyword, pageIndex: 1, pageSize: 100, site: 'cn', recruitType: 'social' }),
      timeout: 20000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data?.data?.list || []).map(job => ({
      id: `huawei_${job.id}`, title: job.name, company: '华为', companyType: 'AI/芯片',
      logo: 'https://www.huawei.com/favicon.ico', location: job.workPlace || '未知',
      url: `https://career.huawei.com/reccampportal/portal5/detail.html?id=${job.id}`, source: '官网',
      updatedAt: job.publishTime || '', department: job.deptName || '',
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
    }));
  } catch (err) {
    console.error('[华为]:', err.message);
    return [];
  }
}

// ============ 字节跳动 API ============
async function fetchByteDanceJobs(keyword = '') {
  try {
    const res = await fetch('https://jobs.bytedance.com/api/v1/search/job/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://jobs.bytedance.com/experienced/position' },
      body: JSON.stringify({ keyword, limit: 100, offset: 0, job_category_id_list: [], location_code_list: [], subject_id_list: [], recruitment_id_list: [], portal_type: 2, portal_entrance: 1 }),
      timeout: 20000,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data?.data?.job_post_list || []).map(job => ({
      id: `bytedance_${job.id}`, title: job.title, company: '字节跳动', companyType: '大模型/互联网',
      logo: 'https://lf-headquarters.bytescm.com/logo.png', location: job.city_info?.name || '未知',
      url: `https://jobs.bytedance.com/experienced/position/${job.id}/detail`, source: '官网',
      updatedAt: job.publish_time ? new Date(job.publish_time).toISOString() : '',
      department: job.job_category?.name || '',
      description: (job.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      requirement: (job.requirement || '').replace(/<[^>]+>/g, '').slice(0, 300),
    }));
  } catch (err) {
    console.error('[字节跳动]:', err.message);
    return [];
  }
}

// ============ API 路由 ============
app.get('/api/companies', (req, res) => {
  const companies = [
    ...COMPANIES.china.map(c => ({ name: c.name, type: c.type, logo: c.logo, source: '官网', career: c.career })),
    ...COMPANIES.greenhouse.map(c => ({ name: c.name, type: c.type, logo: c.logo, source: 'Greenhouse' })),
    ...COMPANIES.ashby.map(c => ({ name: c.name, type: c.type, logo: c.logo, source: 'Ashby' })),
  ];
  res.json({ companies });
});

// 游戏相关过滤关键词
const GAME_KEYWORDS = /游戏|Game|Unity|Unreal|关卡|PUBG|和平精英|王者荣耀|英雄联盟|三角洲行动|暗区突围|火影忍者|航海王|龙珠|圣斗士|金铲铲|云顶之弈|无畏契约|Valorant|League of Legends|Fortnite|Apex|Overwatch|CS:GO|Dota|魔兽世界|星际争霸|暴雪|Blizzard|Riot Games|Epic Games|Supercell|Zynga|EA Games|Ubisoft|Capcom|Square Enix|Nintendo|PlayStation|Xbox|Nintendo Switch|Steam|游戏策划|游戏运营|游戏测试|游戏美术|游戏音效|游戏客户端|游戏服务器|游戏引擎|数值策划/i;
const DEPT_BLACKLIST = ['网游', '游戏', 'IEG', '互动娱乐', '本科', '硕士', '博士', '大专'];

function filterGameJobs(jobs) {
  return jobs.filter(job => {
    const text = `${job.title} ${job.department} ${job.description}`;
    return !GAME_KEYWORDS.test(text);
  });
}

function cleanDepartments(jobs) {
  jobs.forEach(job => {
    if (job.department && DEPT_BLACKLIST.some(k => job.department.includes(k))) {
      job.department = '';
    }
  });
  return jobs;
}

// 获取所有职位（默认国内优先）
app.get('/api/jobs/all', async (req, res) => {
  const { company, keyword, source } = req.query;
  let chinaJobs = [];
  let overseasJobs = [];
  const needChina = !source || source === 'all' || source === 'china';
  const needOverseas = !source || source === 'all' || source === 'overseas';
  const promises = [];

  if (needChina) {
    const kw = keyword || '';
    let fetchers = [];
    if (!company || company === 'Kimi(月之暗面)') fetchers.push(withCache('kimi', () => fetchGreenhouseJobs({ name: 'Kimi(月之暗面)', greenhouse: 'moonshot', type: '大模型', logo: 'https://kimi.moonshot.cn/favicon.ico' })));
    if (!company || company === '腾讯') fetchers.push(withCache('tencent', () => fetchTencentJobs(kw)));
    if (!company || company === '百度') fetchers.push(withCache('baidu', () => fetchBaiduJobs(kw)));
    if (!company || company === '华为') fetchers.push(withCache('huawei', () => fetchHuaweiJobs(kw)));
    if (!company || company === '字节跳动') fetchers.push(withCache('bytedance', () => fetchByteDanceJobs(kw)));
    if (!company || company === 'MiniMax') fetchers.push(withCache('minimax', fetchMiniMaxJobs));
    if (!company || company === 'DeepSeek') fetchers.push(withCache('deepseek', fetchDeepSeekJobs));
    if (!company || company === '智谱AI(GLM)') fetchers.push(withCache('zhipu', fetchZhipuJobs));
    if (!company || company === '小米') fetchers.push(withCache('xiaomi', fetchXiaomiJobs));
    if (!company || company === '阿里千问') fetchers.push(withCache('qwen', fetchQwenJobs));
    if (!company || company === '华为') fetchers.push(withCache('huawei2', fetchHuaweiJobs2));
    promises.push((async () => {
      const results = await Promise.allSettled(fetchers);
      chinaJobs = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    })());
  }

  if (needOverseas) {
    let ghCompanies = COMPANIES.greenhouse;
    let asCompanies = COMPANIES.ashby;
    if (company) {
      ghCompanies = ghCompanies.filter(c => c.name === company);
      asCompanies = asCompanies.filter(c => c.name === company);
    }
    promises.push((async () => {
      const results = await Promise.allSettled([
        ...ghCompanies.map(c => withCache(`gh_${c.token}`, () => fetchGreenhouseJobs(c))),
        ...asCompanies.map(c => withCache(`ashby_${c.token}`, () => fetchAshbyJobs(c))),
      ]);
      overseasJobs = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
      if (keyword) {
        const kw = keyword.toLowerCase();
        overseasJobs = overseasJobs.filter(j => j.title.toLowerCase().includes(kw) || j.department.toLowerCase().includes(kw) || j.location.toLowerCase().includes(kw));
      }
    })());
  }

  await Promise.all(promises);
  let allJobs = [...chinaJobs, ...overseasJobs];
  allJobs.sort((a, b) => {
    if (!a.updatedAt) return 1;
    if (!b.updatedAt) return -1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // 过滤游戏相关职位 + 清理部门标签
  allJobs = filterGameJobs(allJobs);
  cleanDepartments(allJobs);

  allJobs.forEach(job => { jobStore.set(job.id, job); });
  // 过滤后重新计算来源数量（确保与 total 一致）
  const chinaCompanyNames2 = COMPANIES.china.map(c => c.name);
  const filteredChina = allJobs.filter(j => chinaCompanyNames2.includes(j.company)).length;
  const filteredOverseas = allJobs.length - filteredChina;
  res.json({ jobs: allJobs, total: allJobs.length, sources: { china: filteredChina, overseas: filteredOverseas } });
});

// 职位详情存储
const jobStore = new Map();
const detailCache = new Map();

// ============ 按需抓取职位完整详情 ============
async function fetchFeishuJobDetail(url) {
  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    const data = await page.evaluate(() => {
      const body = document.body.innerText || '';
      let responsibility = '', requirement = '';
      const descIdx = body.indexOf('职位描述');
      const reqIdx = body.indexOf('职位要求');
      if (descIdx !== -1 && reqIdx !== -1 && reqIdx > descIdx) {
        responsibility = body.slice(descIdx + 4, reqIdx).trim();
        requirement = body.slice(reqIdx + 4).replace(/投递[\s\S]*$/, '').trim();
      } else if (descIdx !== -1) {
        responsibility = body.slice(descIdx + 4).replace(/投递[\s\S]*$/, '').trim();
      }
      return { responsibility: responsibility.slice(0, 2000), requirement: requirement.slice(0, 2000), full: body.slice(0, 3000) };
    });
    return data;
  } catch (err) {
    console.error('[飞书详情] 抓取失败:', err.message);
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

function htmlToText(html) {
  return (html || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

async function fetchGreenhouseJobDetail(token, jobId) {
  try {
    const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs/${jobId}`, { timeout: 10000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = htmlToText(data.content || '');
    return { description: text.slice(0, 3000), responsibility: '', requirement: '' };
  } catch (err) {
    console.error('[Greenhouse详情]:', err.message);
    return null;
  }
}

async function fetchAshbyJobDetail(token, jobId) {
  try {
    const res = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${token}/${jobId}`, { timeout: 10000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = htmlToText(data.descriptionHtml || data.description || '');
    return { description: text.slice(0, 3000), responsibility: '', requirement: '' };
  } catch (err) {
    console.error('[Ashby详情]:', err.message);
    return null;
  }
}

async function fetchTencentJobDetail(postId) {
  try {
    const res = await fetch(`https://careers.tencent.com/tencentcareer/api/post/ByPostId?timestamp=${Date.now()}&postId=${postId}&language=zh-cn`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://careers.tencent.com/' }, timeout: 10000 });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const post = data?.Data || {};
    return {
      responsibility: (post.Responsibility || '').replace(/<[^>]+>/g, '').slice(0, 2000),
      requirement: (post.Requirement || '').replace(/<[^>]+>/g, '').slice(0, 2000),
      description: (post.Responsibility || '').replace(/<[^>]+>/g, '').slice(0, 3000),
    };
  } catch (err) {
    console.error('[腾讯详情]:', err.message);
    return null;
  }
}

async function enrichJobDetail(job) {
  if ((job.responsibility || job.requirement) && (job.description || '').length > 200) return job;
  const id = job.id || '';
  let detail = null;
  if (id.startsWith('minimax_') || id.startsWith('zhipu_')) {
    detail = await fetchFeishuJobDetail(job.url);
  } else if (id.startsWith('gh_')) {
    const parts = id.split('_');
    detail = await fetchGreenhouseJobDetail(parts[1], parts.slice(2).join('_'));
  } else if (id.startsWith('ashby_')) {
    const parts = id.split('_');
    detail = await fetchAshbyJobDetail(parts[1], parts.slice(2).join('_'));
  } else if (id.startsWith('tencent_')) {
    detail = await fetchTencentJobDetail(id.replace('tencent_', ''));
  }
  if (detail) {
    return { ...job, description: detail.description || detail.full || job.description || '', responsibility: detail.responsibility || job.responsibility || '', requirement: detail.requirement || job.requirement || '', bonus: detail.bonus || job.bonus || '' };
  }
  return job;
}

app.get('/api/jobs/:id/detail', async (req, res) => {
  const base = jobStore.get(req.params.id);
  if (!base) return res.status(404).json({ error: '职位未找到，请先刷新列表' });
  if (detailCache.has(req.params.id)) return res.json({ job: detailCache.get(req.params.id), fromCache: true });
  const enriched = await enrichJobDetail(base);
  detailCache.set(req.params.id, enriched);
  jobStore.set(req.params.id, enriched);
  res.json({ job: enriched, fromCache: false });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobStore.get(req.params.id);
  if (!job) return res.status(404).json({ error: '职位未找到，请先刷新列表' });
  res.json({ job });
});

// ============ 统计 API ============
app.get('/api/stats', async (req, res) => {
  const { keyword, company, source } = req.query;
  const kw = keyword || '';
  const needChina = !source || source === 'all' || source === 'china';
  const needOverseas = !source || source === 'all' || source === 'overseas';
  const promises = [];

  if (needChina) {
    promises.push(
      withCache('tencent', () => fetchTencentJobs(kw)),
      withCache('baidu', () => fetchBaiduJobs(kw)),
      withCache('huawei', () => fetchHuaweiJobs(kw)),
      withCache('bytedance', () => fetchByteDanceJobs(kw)),
      withCache('kimi', () => fetchGreenhouseJobs({ name: 'Kimi(月之暗面)', greenhouse: 'moonshot', type: '大模型', logo: '' })),
      withCache('minimax', fetchMiniMaxJobs),
      withCache('deepseek', fetchDeepSeekJobs),
      withCache('zhipu', fetchZhipuJobs),
      withCache('xiaomi', fetchXiaomiJobs),
      withCache('qwen', fetchQwenJobs),
      withCache('huawei2', fetchHuaweiJobs2),
    );
  }
  if (needOverseas) {
    promises.push(
      ...COMPANIES.greenhouse.map(c => withCache(`gh_${c.token}`, () => fetchGreenhouseJobs(c))),
      ...COMPANIES.ashby.map(c => withCache(`ashby_${c.token}`, () => fetchAshbyJobs(c))),
    );
  }

  const results = await Promise.allSettled(promises);
  let allJobs = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  // 按来源筛选（基于公司名称分类，而非 source 字段，避免 Kimi 等使用海外平台的公司被错误归类）
  const chinaCompanyNames = COMPANIES.china.map(c => c.name);
  const overseasCompanyNames = [...COMPANIES.greenhouse, ...COMPANIES.ashby].map(c => c.name);
  if (source === 'china') allJobs = allJobs.filter(j => chinaCompanyNames.includes(j.company));
  else if (source === 'overseas') allJobs = allJobs.filter(j => overseasCompanyNames.includes(j.company));
  if (company) allJobs = allJobs.filter(j => j.company === company);

  // 过滤游戏 + 清理部门
  allJobs = filterGameJobs(allJobs);
  cleanDepartments(allJobs);

  // 1. 公司招聘数量排名
  const companyCount = {};
  allJobs.forEach(j => { companyCount[j.company] = (companyCount[j.company] || 0) + 1; });
  const companyRanking = Object.entries(companyCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  // 2. 岗位类型排名
  const deptCount = {};
  allJobs.forEach(j => { if (j.department) deptCount[j.department] = (deptCount[j.department] || 0) + 1; });
  const deptRanking = Object.entries(deptCount).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));

  // 3. 地点排名
  const locationCount = {};
  allJobs.forEach(j => { if (j.location && j.location !== '未知') locationCount[j.location] = (locationCount[j.location] || 0) + 1; });
  const locationRanking = Object.entries(locationCount).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, count]) => ({ name, count }));

  // 4. 专业要求排名
  const majorKeywords = ['计算机科学与技术', '软件工程', '人工智能', '机器学习', '深度学习', '自然语言处理', '计算机视觉', '数据科学', '电子信息', '通信工程', '自动化', '数学', '统计学', '物理学', '电子工程', '信息安全', '网络工程', '物联网', '机器人', '控制工程', '电气工程', '微电子', '集成电路', '芯片设计', '生物信息', '医学影像', '金融工程', '量化金融', '工商管理', '市场营销', '产品设计', '交互设计', '工业设计', '视觉传达', '动画', '法学', '英语', '翻译', '人力资源', '财务', '会计', '经济学', '国际贸易', '供应链管理', '物流管理', '土木工程', '机械工程', '材料科学', '化学工程', '环境工程', '航空航天', '汽车工程', '能源工程', '医学', '药学', '心理学', '教育学', '新闻传播', '广告学', '社会学', '哲学'];
  const majorCount = {};
  allJobs.forEach(j => {
    const text = `${j.description || ''} ${j.requirement || ''} ${j.title || ''}`;
    majorKeywords.forEach(major => { if (text.includes(major)) majorCount[major] = (majorCount[major] || 0) + 1; });
    const majorMatches = text.match(/[\u4e00-\u9fa5]{2,8}专业/g) || [];
    majorMatches.forEach(m => {
      const name = m.replace('专业', '');
      if (name.length >= 2) majorCount[name] = (majorCount[name] || 0) + 1;
    });
  });
  const majorRanking = Object.entries(majorCount).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([name, count]) => ({ name, count }));

  // 5. 词云数据
  const stopWords = new Set(['的', '了', '在', '是', '和', '与', '或', '等', '对', '有', '能', '会', '可', '要', '将', '及', '中', '上', '下', '个', '为', '以', '到', '从', '被', '把', '让', '向', '往', '这', '那', '之', '其', '我', '你', '他', '她', '它', '们', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'that', 'this', 'it', 'will', 'can', 'should', 'must', 'may', 'have', 'has', 'had', 'do', 'does', 'did', 'not', 'no', 'but', 'if', 'then', 'than', 'so', 'such', 'very', 'just', 'also', 'only', 'more', 'most', 'other', 'some', 'any', 'all', 'each', 'every', 'both', 'few', 'many', 'much', 'own', 'same', 'too', 'work', 'working', 'team', 'role', 'job', 'our', 'we', 'you', 'your']);
  const wordCount = {};
  allJobs.forEach(j => {
    const text = `${j.description || ''} ${j.requirement || ''} ${j.title}`;
    const cnWords = text.match(/[\u4e00-\u9fa5]{2,6}/g) || [];
    const enWords = text.match(/[A-Za-z][A-Za-z+#./]{2,}/g) || [];
    [...cnWords, ...enWords].forEach(w => {
      const word = w.toLowerCase().trim();
      if (word.length >= 2 && !stopWords.has(word) && !/^\d+$/.test(word)) wordCount[word] = (wordCount[word] || 0) + 1;
    });
  });
  const wordCloud = Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 80).map(([text, value]) => ({ text, value }));

  // 6. 学历要求统计
  const detectEdu = (text) => {
    if (/博士|Ph\.?D|Doctorate|Doctoral/i.test(text)) return '博士';
    if (/硕士|研究生|Master|M\.S\.|MSc|\bMS\b/i.test(text)) return '硕士';
    if (/本科|Bachelor|B\.S\.|BSc|\bBS\b|\bBA\b|undergraduate/i.test(text)) return '本科';
    if (/大专|专科|Associate/i.test(text)) return '大专';
    return null;
  };
  const eduCount = {};
  allJobs.forEach(j => {
    const text = `${j.description || ''} ${j.requirement || ''} ${j.responsibility || ''}`;
    const edu = detectEdu(text);
    if (edu) eduCount[edu] = (eduCount[edu] || 0) + 1;
  });
  const eduRanking = Object.entries(eduCount).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  // 7. 经验要求统计
  const expCount = {};
  allJobs.forEach(j => {
    const text = `${j.description || ''} ${j.requirement || ''} ${j.responsibility || ''}`;
    const cnMatch = text.match(/(\d+)[\s~\-至]*(\d+)?\s*年(?:以上)?(?:工作)?经验|经验不限|应届|校招/);
    const enMatch = text.match(/(\d+)\s*\+?\s*(?:-\s*(\d+)\s*)?years?(?:\s+of)?(?:\s+(?:work|professional|industry|relevant))?\s*experience/i) || text.match(/(\d+)\+?\s*years/i);
    if (cnMatch) {
      const label = cnMatch[0].includes('应届') || cnMatch[0].includes('校招') ? '应届/校招' : cnMatch[0].replace(/工作/g, '').trim();
      expCount[label] = (expCount[label] || 0) + 1;
    } else if (enMatch) {
      const label = `${enMatch[1]}${enMatch[2] ? '-' + enMatch[2] : '+'}年经验`;
      expCount[label] = (expCount[label] || 0) + 1;
    }
  });
  const expRanking = Object.entries(expCount).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count }));

  // 8. 按公司统计
  const companyStats = {};
  allJobs.forEach(j => {
    if (!companyStats[j.company]) companyStats[j.company] = { total: 0, locations: {}, depts: {}, eduCount: {}, logo: j.logo, type: j.companyType };
    const cs = companyStats[j.company];
    cs.total++;
    if (j.location && j.location !== '未知') cs.locations[j.location] = (cs.locations[j.location] || 0) + 1;
    if (j.department) cs.depts[j.department] = (cs.depts[j.department] || 0) + 1;
    const text = `${j.description || ''} ${j.requirement || ''} ${j.responsibility || ''}`;
    const edu = detectEdu(text);
    if (edu) cs.eduCount[edu] = (cs.eduCount[edu] || 0) + 1;
  });

  res.json({ total: allJobs.length, companyRanking, deptRanking, locationRanking, majorRanking, eduRanking, expRanking, companyStats, wordCloud });
});

// 缓存状态查询
app.get('/api/cache/status', (req, res) => {
  const entries = [];
  for (const [key, { data, timestamp }] of cache) {
    entries.push({ key, count: data.length, age: Math.round((Date.now() - timestamp) / 1000), expiresIn: Math.max(0, Math.round((CACHE_TTL - (Date.now() - timestamp)) / 1000)) });
  }
  res.json({ ttl: CACHE_TTL / 1000, entries, totalCached: entries.length });
});

// 清除缓存
app.post('/api/cache/clear', (req, res) => {
  const { key } = req.body || {};
  if (key) { cache.delete(key); res.json({ cleared: key }); }
  else { cache.clear(); res.json({ cleared: 'all' }); }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), browser: browserInstance?.connected || false, cacheSize: cache.size });
});

// 优雅关闭
process.on('SIGINT', async () => {
  if (browserInstance) await browserInstance.close().catch(() => {});
  process.exit();
});

app.listen(PORT, () => {
  console.log(`🚀 AI Jobs Finder 服务器运行在 http://localhost:${PORT}`);
  console.log(`📋 国内厂商: ${COMPANIES.china.map(c => c.name).join(', ')}`);
  console.log(`📋 海外(Greenhouse): ${COMPANIES.greenhouse.map(c => c.name).join(', ')}`);
  console.log(`📋 海外(Ashby): ${COMPANIES.ashby.map(c => c.name).join(', ')}`);
  console.log(`🌐 浏览器: ${BROWSER_PATH}`);
});
