/**
 * Blog News Engine - Google News RSS & Auto-Updating Feed
 * Matching Native Site Design System
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
      <p class="description-static description-long"><span class="quote">Modern web engineering is transforming rapidly with edge computing, AI co-pilots, and server-side optimizations.<br></span><br>
      As user expectations for instant page loads and seamless mobile experiences grow, developers are adopting modern standards like native Web Components, WebAssembly, and optimized asset pipelines. Mastering these techniques empowers developers to build resilient, ultra-responsive web platforms.<br><br>
      <span class="quote">“Building for performance,”</span><br> requires continuous learning, modular design, and prioritizing seamless user experience above all else.
      </p>
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
      <p class="description-static description-long"><span class="quote">PHP powers a vast portion of the web, from custom APIs to enterprise CMS implementations.<br></span><br>
      With recent version upgrades, PHP brings property hooks, asymmetric visibility, enhanced performance, and robust type safety. Developers leveraging modern frameworks like Laravel and WordPress custom architectures can deliver clean, maintainable, and high-performance server-side web applications.<br><br>
      <span class="quote">“Modern PHP is fast, typed, and clean.”</span><br> Exploring asynchronous processing and optimized database queries ensures your backend applications scale effortlessly.
      </p>
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
      <p class="description-static description-long"><span class="quote">Asynchronous JavaScript execution enables exceptional API throughput and scalability.<br></span><br>
      By structuring code into decoupled microservices, implementing intelligent caching strategies, and optimizing JSON serialization, engineering teams can handle high concurrent user traffic cleanly.<br><br>
      <span class="quote">“Scalability starts at architecture,”</span><br> ensuring non-blocking operations, clear error handling, and robust API contracts.
      </p>
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
      <p class="description-static description-long"><span class="quote">Artificial Intelligence tools are elevating developer productivity across code generation and testing.<br></span><br>
      Rather than replacing engineers, AI serves as a powerful pair-programming co-pilot that accelerates complex technical tasks, refactoring, and test automation.<br><br>
      <span class="quote">“AI as an accelerator,”</span><br> allows developers to focus on high-level problem solving, architecture, and delivering maximum value to users.
      </p>
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
          <p class="description-static description-long"><span class="quote">${desc || title}<br></span><br>
          Software engineering and web development continue to evolve rapidly. Staying informed on industry practices, frameworks, and architecture patterns helps developers write cleaner code and build scalable digital solutions.<br><br>
          <span class="quote">“Continuous improvement,”</span><br> is key to mastering web technology, building intuitive interfaces, and optimizing application performance for real-world impact.
          </p>
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
    container.innerHTML = `<div class="nav-item"><p class="description">No articles in this category.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map((item, idx) => `
    <div style="opacity: 1; filter: blur(0px);" role="listitem" class="nav-item w-dyn-item mb-4" data-aos="fade-up" data-aos-delay="${(idx % 4) * 100}">
       <a href="blog-details.html?id=${item.id}" class="nav-link is-pink" style="font-size: 3.5vw; line-height: 1.1em;">${escapeHtml(item.title)}</a>
       <div class="nav-sub d-flex justify-content-between align-items-center mt-2">
          <div class="role">📅 ${formatDate(item.pubDate)} • ${getCategoryName(item.category)} • ${item.source}</div>
          <a href="blog-details.html?id=${item.id}" class="role text-decoration-none" style="color: var(--coral);">Read Article →</a>
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
    <div class="content" data-aos="fade-up">
       <a href="blog.html" class="button w-button mb-4" style="padding: 10px 30px; font-size: 16px; display: inline-block;">← Back to Blog</a>
       
       <div class="header-mask" style="margin-bottom: 1.5vh;">
          <h1 class="header header-large align-left" style="font-size: 4.5vw; line-height: 1.1em;">${escapeHtml(item.title)}</h1>
       </div>
       
       <div class="mb-4">
          <span class="role" style="font-size: 16px; color: var(--coral);">📅 ${formatDate(item.pubDate)} • ${getCategoryName(item.category)} • ${escapeHtml(item.source)}</span>
       </div>

       <div class="mb-5 overflow-hidden" style="border-radius: 12px; max-height: 400px;">
          <img src="${item.thumbnail}" alt="${item.title}" class="w-100 h-100 object-fit-cover" style="object-fit: cover;">
       </div>

       ${item.content || `<p class="description-static description-long"><span class="quote">${escapeHtml(item.description)}</span></p>`}

       <div class="pt-4 mt-5 border-top border-secondary d-flex justify-content-between align-items-center flex-wrap gap-3">
          <a href="blog.html" class="button w-button">← Back to Articles</a>
          <a href="${item.link}" target="_blank" rel="noopener" class="role" style="font-size: 16px; color: var(--offwhite);">View Original Source ↗</a>
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
