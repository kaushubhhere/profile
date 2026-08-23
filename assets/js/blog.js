/**
 * Blog News Engine - Google News RSS Feed & Single Article Reader
 * Matching Portfolio Theme (bg-nude-dark)
 * Developer: Kaushubh Kumar
 */

const CACHE_KEY = 'kaushubh_news_feed_cache';
const TIMESTAMP_KEY = 'kaushubh_news_feed_timestamp';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours

const FALLBACK_ARTICLES = [
  {
    id: '0',
    title: 'The Future of Modern Web Development: Key Trends to Watch',
    link: 'https://developer.mozilla.org/en-US/',
    pubDate: '2026-08-20',
    description: 'Explore the latest advancements in full-stack web development, serverless architecture, micro-frontends, and performance optimization.',
    content: `
      Full-stack web development is undergoing a massive transformation with the evolution of AI-driven coding engines, edge computing, serverless databases, and ultra-fast frontend frameworks.<br><br>
      As user expectations for instant page loads and seamless mobile experiences grow, developers are adopting modern web standards like native Web Components, WebAssembly, and optimized asset pipelines. Mastering these techniques empowers developers to build resilient, ultra-responsive web platforms.
    `,
    source: 'Tech Insights',
    category: 'web',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '1',
    title: 'PHP 8.4 and Modern Web Engineering Ecosystem',
    link: 'https://www.php.net/',
    pubDate: '2026-08-18',
    description: 'PHP continues to power over 75% of the web. Learn how modern PHP performance improvements and frameworks are changing enterprise backend systems.',
    content: `
      PHP powers a vast portion of the global web, from enterprise applications to custom CMS implementations.<br><br>
      With recent version upgrades, PHP brings property hooks, asymmetric visibility, enhanced performance, and robust type safety. Developers leveraging modern frameworks like Laravel and WordPress custom architectures can deliver clean, maintainable, and high-performance server-side web applications.
    `,
    source: 'Backend Digest',
    category: 'php',
    thumbnail: 'https://images.unsplash.com/photo-1599507593499-a3f7d7d97667?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '2',
    title: 'Building High-Performance APIs with JavaScript & Microservices',
    link: 'https://nodejs.org/',
    pubDate: '2026-08-16',
    description: 'Best practices for architecting scalable RESTful and GraphQL APIs using asynchronous JavaScript and modern containerized architecture.',
    content: `
      Asynchronous JavaScript execution and modern event loops enable rapid API throughput.<br><br>
      By structuring code into decoupled microservices, implementing intelligent caching strategies, and optimizing JSON serialization, engineering teams can handle millions of concurrent user transactions cleanly.
    `,
    source: 'JS Weekly',
    category: 'js',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '3',
    title: 'AI-Assisted Coding Tools Transforming Software Engineering',
    link: 'https://github.com/readme',
    pubDate: '2026-08-14',
    description: 'How AI developer assistants are speeding up coding workflows, refactoring codebase, and improving software quality.',
    content: `
      Artificial Intelligence tools are elevating developer productivity across code generation, automated testing, bug detection, and documentation.<br><br>
      Rather than replacing engineers, AI serves as a powerful pair-programming co-pilot that accelerates complex technical tasks, refactoring, and test automation.
    `,
    source: 'AI Hub',
    category: 'ai',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
  }
];

let allArticles = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('news-items-container')) {
    initBlogList();
  } else if (document.getElementById('single-article-view')) {
    initSingleArticle();
  }
});

async function initBlogList() {
  setupFilterListeners();
  await loadArticles(false);
}

function setupFilterListeners() {
  const filterBtns = document.querySelectorAll('.blog-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.getAttribute('data-category');
      renderArticlesList();
    });
  });

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.innerText = 'Syncing...';
      await loadArticles(true);
      refreshBtn.innerText = 'Refresh Feed ↻';
    });
  }
}

async function loadArticles(forceRefresh = false) {
  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(TIMESTAMP_KEY);
  const now = Date.now();

  const isCacheValid = cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp, 10) < TWO_DAYS_MS);

  if (isCacheValid && !forceRefresh) {
    try {
      allArticles = JSON.parse(cachedData);
      updateSyncBadge(parseInt(cachedTimestamp, 10));
      renderArticlesList();
      return;
    } catch (e) {
      console.warn('Cache error, fetching RSS...');
    }
  }

  try {
    const fetched = await fetchRSS();
    if (fetched && fetched.length > 0) {
      allArticles = fetched;
    } else {
      allArticles = FALLBACK_ARTICLES;
    }
  } catch (e) {
    console.warn('RSS fetch error, loading default dataset:', e);
    allArticles = cachedData ? JSON.parse(cachedData) : FALLBACK_ARTICLES;
  }

  localStorage.setItem(CACHE_KEY, JSON.stringify(allArticles));
  localStorage.setItem(TIMESTAMP_KEY, now.toString());
  updateSyncBadge(now);
  renderArticlesList();
}

async function fetchRSS() {
  const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=coding+software+development+web+development+PHP&hl=en-IN&gl=IN&ceid=IN:en');
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;

  const res = await fetch(apiUrl);
  const data = await res.json();

  if (data.status === 'ok' && data.items && data.items.length > 0) {
    return data.items.slice(0, 10).map((item, idx) => {
      let cat = 'web';
      const t = item.title.toLowerCase();
      if (t.includes('php') || t.includes('laravel') || t.includes('wordpress')) cat = 'php';
      else if (t.includes('javascript') || t.includes('react') || t.includes('node') || t.includes('js')) cat = 'js';
      else if (t.includes('ai') || t.includes('gpt') || t.includes('python')) cat = 'ai';

      const desc = cleanText(item.description || item.content || '');
      const title = cleanText(item.title);

      return {
        id: String(idx),
        title: title,
        link: item.link,
        pubDate: item.pubDate,
        description: desc.length > 0 ? desc : 'Latest updates in coding and web software development.',
        content: `
          Software engineering and web development continue to evolve rapidly with new frameworks, performance standards, and security practices.<br><br>
          Staying informed on modern architecture patterns helps developers write cleaner code and build scalable digital solutions.<br><br>
          Continuous learning and optimizing application performance are essential to building modern web applications.
        `,
        source: item.author || 'Google News',
        category: cat,
        thumbnail: item.thumbnail || getFallbackThumb(cat, idx)
      };
    });
  }
  return FALLBACK_ARTICLES;
}

function getFallbackThumb(cat, idx) {
  const imgs = [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1599507593499-a3f7d7d97667?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
  ];
  return imgs[idx % imgs.length];
}

function updateSyncBadge(timestamp) {
  const badge = document.getElementById('sync-info');
  if (!badge) return;
  const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
  const remaining = Math.max(0, 48 - hours);
  badge.innerText = `Synced ${hours === 0 ? 'just now' : hours + 'h ago'} • Auto-refresh in ${remaining}h`;
}

function renderArticlesList() {
  const container = document.getElementById('news-items-container');
  if (!container) return;

  const filtered = currentCategory === 'all' 
    ? allArticles 
    : allArticles.filter(a => a.category === currentCategory);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="nav-item"><p class="description">No articles found in this category.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map((item, idx) => `
    <div style="opacity: 1; filter: blur(0px);" role="listitem" class="nav-item w-dyn-item mb-5" data-aos="fade-up" data-aos-delay="${(idx % 4) * 100}">
       <a href="blog-details.html?id=${item.id}" class="nav-link is-pink" style="font-size: 3vw; line-height: 1.15em;">${escapeHtml(item.title)}</a>
       <div class="nav-sub d-flex justify-content-between align-items-center mt-2">
          <div class="role" style="color: var(--offwhite);">📅 ${formatDate(item.pubDate)} • ${getCategoryName(item.category)} • ${escapeHtml(item.source)}</div>
          <a href="blog-details.html?id=${item.id}" class="role text-decoration-none" style="color: var(--coral); font-weight: 600;">Read Article →</a>
       </div>
       <div class="nav-underline"></div>
    </div>
  `).join('');
}

function initSingleArticle() {
  const container = document.getElementById('single-article-view');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || '0';

  let articles = FALLBACK_ARTICLES;
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try { articles = JSON.parse(cached); } catch (e) {}
  }

  const item = articles.find(a => String(a.id) === String(id)) || articles[0];

  document.title = `${item.title} - Kaushubh Kumar Blog`;

  container.innerHTML = `
    <div class="content py-4" data-aos="fade-up">
       <div class="mb-4">
          <a href="blog.html" class="button w-button" style="background-color: var(--coral); color: #ffffff; padding: 10px 28px; font-size: 16px; text-decoration: none; display: inline-block;">← Back to Blog</a>
       </div>

       <div class="header-mask" style="margin-bottom: 2vh;">
          <h1 class="header header-large align-left" style="font-size: 3.5vw; line-height: 1.15em; color: var(--offwhite);">${escapeHtml(item.title)}</h1>
       </div>
       
       <div class="mb-4">
          <span class="role" style="font-size: 16px; color: var(--coral); font-weight: 600;">📅 ${formatDate(item.pubDate)} • ${getCategoryName(item.category)} • ${escapeHtml(item.source)}</span>
       </div>

       ${item.thumbnail ? `
       <div class="mb-4" style="border-radius: 12px; max-height: 380px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15);">
          <img src="${item.thumbnail}" alt="${escapeHtml(item.title)}" style="width: 100%; height: 380px; object-fit: cover;">
       </div>` : ''}

       <div class="description-mask my-4">
          <p class="description" style="color: var(--offwhite); font-size: 20px; line-height: 1.7em;">
             <span class="quote" style="color: var(--pink); font-size: 22px;">"${escapeHtml(item.description)}"<br></span><br>
             ${item.content || ''}
          </p>
       </div>

       <div class="pt-4 mt-5 border-top border-secondary d-flex justify-content-between align-items-center flex-wrap gap-3 mb-5">
          <a href="blog.html" class="button w-button" style="background-color: var(--coral); color: #ffffff; text-decoration: none;">← Back to Articles</a>
          <a href="${item.link}" target="_blank" rel="noopener" class="role" style="font-size: 16px; color: var(--offwhite); text-decoration: underline;">View Original External Source ↗</a>
       </div>
    </div>
  `;
}

function getCategoryName(cat) {
  switch (cat) {
    case 'php': return 'PHP & Backend';
    case 'js': return 'JavaScript';
    case 'ai': return 'AI & Tools';
    default: return 'Web Development';
  }
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return 'Recent';
  }
}

function cleanText(html) {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
