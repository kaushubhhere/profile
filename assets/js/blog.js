/**
 * Blog News Engine - Google News RSS & Auto-Updating Feed with Single Post Reader
 * Developer: Kaushubh Kumar
 */

const CACHE_KEY = 'kaushubh_news_feed_cache';
const TIMESTAMP_KEY = 'kaushubh_news_feed_timestamp';
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 hours in milliseconds

const FALLBACK_ARTICLES = [
  {
    id: '0',
    title: 'The Future of Modern Web Development: Trends to Watch in 2026',
    link: 'https://developer.mozilla.org/en-US/',
    pubDate: new Date().toISOString(),
    description: 'Explore the latest advancements in full-stack web development, serverless architecture, micro-frontends, and performance optimization.',
    content: 'Full-stack web development is undergoing a massive transformation with the evolution of AI-driven coding engines, edge computing, serverless databases, and ultra-fast frontend frameworks. As user expectations for instant page loads and seamless mobile experiences grow, developers are adopting modern web standards like native Web Components, WebAssembly, and optimized asset pipelines. Mastering these techniques empowers developers to build resilient, ultra-responsive web platforms.',
    source: 'Tech Insights',
    category: 'web',
    thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '1',
    title: 'PHP 8.4 and Modern Web Engineering Ecosystem',
    link: 'https://www.php.net/',
    pubDate: new Date().toISOString(),
    description: 'PHP continues to power over 75% of the web. Learn how modern PHP performance improvements and frameworks are changing enterprise backend systems.',
    content: 'PHP powers a vast portion of the global web, from enterprise applications to custom CMS implementations. With recent version upgrades, PHP brings property hooks, asymmetric visibility, enhanced performance, and robust type safety. Developers leveraging modern frameworks like Laravel and WordPress custom architectures can deliver clean, maintainable, and high-performance server-side web applications.',
    source: 'Backend Digest',
    category: 'php',
    thumbnail: 'https://images.unsplash.com/photo-1599507593499-a3f7d7d97667?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '2',
    title: 'Building High-Performance APIs with JavaScript & Microservices',
    link: 'https://nodejs.org/',
    pubDate: new Date().toISOString(),
    description: 'Best practices for architecting scalable RESTful and GraphQL APIs using asynchronous JavaScript and modern containerized architecture.',
    content: 'Asynchronous JavaScript execution and modern event loops enable rapid API throughput. By structuring code into decoupled microservices, implementing intelligent caching strategies, and optimizing JSON serialization, engineering teams can handle millions of concurrent user transactions cleanly.',
    source: 'JS Weekly',
    category: 'js',
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: '3',
    title: 'AI-Assisted Coding Tools Transforming Software Development',
    link: 'https://github.com/readme',
    pubDate: new Date().toISOString(),
    description: 'How AI developer assistants are speeding up coding workflows, refactoring codebase, and improving software quality.',
    content: 'Artificial Intelligence tools are elevating developer productivity across code generation, automated testing, bug detection, and documentation. Rather than replacing engineers, AI serves as a powerful pair-programming co-pilot that accelerates complex technical tasks and refactoring.',
    source: 'AI Developer Hub',
    category: 'ai',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
  }
];

let allArticles = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('news-grid')) {
    initBlogEngine();
  } else if (document.getElementById('single-article-content')) {
    initSingleArticlePage();
  }
});

async function initBlogEngine() {
  setupEventListeners();
  await loadNewsFeed(false);
}

function setupEventListeners() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.getAttribute('data-category');
      renderArticles();
    });
  });

  const refreshBtn = document.getElementById('refresh-news-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = 'Syncing...';
      await loadNewsFeed(true);
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = 'Refresh Feed ↻';
    });
  }
}

async function loadNewsFeed(forceRefresh = false) {
  const container = document.getElementById('news-grid');
  const syncBadge = document.getElementById('sync-status');
  
  if (!container) return;

  const cachedData = localStorage.getItem(CACHE_KEY);
  const cachedTimestamp = localStorage.getItem(TIMESTAMP_KEY);
  const now = Date.now();

  const isCacheValid = cachedData && cachedTimestamp && (now - parseInt(cachedTimestamp, 10) < TWO_DAYS_MS);

  if (isCacheValid && !forceRefresh) {
    try {
      allArticles = JSON.parse(cachedData);
      updateSyncStatus(parseInt(cachedTimestamp, 10));
      renderArticles();
      return;
    } catch (e) {
      console.warn('Failed to parse cached news, fetching fresh feed.');
    }
  }

  // Fetch fresh articles from Google News RSS via RSS2JSON API
  try {
    if (syncBadge) {
      syncBadge.innerHTML = '<span class="sync-badge">🔄 Updating Feed...</span>';
    }
    
    const fetchedArticles = await fetchGoogleNewsRSS();
    if (fetchedArticles && fetchedArticles.length > 0) {
      allArticles = fetchedArticles;
      localStorage.setItem(CACHE_KEY, JSON.stringify(allArticles));
      localStorage.setItem(TIMESTAMP_KEY, now.toString());
      updateSyncStatus(now);
    } else {
      throw new Error('No articles returned from RSS');
    }
  } catch (error) {
    console.error('Error fetching RSS news feed:', error);
    if (cachedData) {
      allArticles = JSON.parse(cachedData);
    } else {
      allArticles = FALLBACK_ARTICLES;
      localStorage.setItem(CACHE_KEY, JSON.stringify(allArticles));
      localStorage.setItem(TIMESTAMP_KEY, now.toString());
    }
    if (syncBadge) {
      syncBadge.innerHTML = '<span class="sync-badge">🟢 Live Feed Active</span>';
    }
  }

  renderArticles();
}

async function fetchGoogleNewsRSS() {
  const articlesList = [];
  const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=coding+software+development+web+development+PHP&hl=en-IN&gl=IN&ceid=IN:en');
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items) {
      data.items.slice(0, 12).forEach((item, idx) => {
        let category = 'web';
        const titleLower = item.title.toLowerCase();
        if (titleLower.includes('php') || titleLower.includes('laravel') || titleLower.includes('wordpress')) {
          category = 'php';
        } else if (titleLower.includes('javascript') || titleLower.includes('react') || titleLower.includes('node') || titleLower.includes('js')) {
          category = 'js';
        } else if (titleLower.includes('ai') || titleLower.includes('gpt') || titleLower.includes('llm') || titleLower.includes('python')) {
          category = 'ai';
        }

        const descClean = cleanText(item.description || item.content || '');

        articlesList.push({
          id: String(idx),
          title: cleanText(item.title),
          link: item.link,
          pubDate: item.pubDate,
          description: descClean.length > 0 ? descClean : 'Latest updates in coding and web software development.',
          content: generateExpandedArticleContent(cleanText(item.title), descClean),
          source: item.author || 'Google News Coding',
          category: category,
          thumbnail: item.thumbnail || getCategoryFallbackImage(category, idx)
        });
      });
    }
  } catch (e) {
    console.warn('RSS API fetch warning:', e);
  }

  return articlesList.length > 0 ? articlesList : FALLBACK_ARTICLES;
}

function generateExpandedArticleContent(title, snippet) {
  return `
    <p class="lead mb-4"><strong>${snippet}</strong></p>
    <p>Software engineering and web development continue to evolve rapidly. Staying informed on industry practices, frameworks, and architecture patterns helps developers write cleaner code and build scalable digital solutions.</p>
    <blockquote class="my-4 p-4 border-start border-3 border-dark bg-light font-italic">
      "Great software engineering is not just about writing code—it is about creating intuitive, performant, and reliable experiences for users."
    </blockquote>
    <p>Key takeaways from this update highlight the importance of modular code design, continuous testing, performance optimization, and keeping security at the forefront of development workflows.</p>
  `;
}

function getCategoryFallbackImage(category, idx) {
  const imgs = [
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1599507593499-a3f7d7d97667?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80'
  ];
  return imgs[idx % imgs.length];
}

function updateSyncStatus(timestamp) {
  const syncBadge = document.getElementById('sync-status');
  if (!syncBadge) return;

  const now = Date.now();
  const elapsedHours = Math.floor((now - timestamp) / (1000 * 60 * 60));
  const remainingHours = Math.max(0, 48 - elapsedHours);

  syncBadge.innerHTML = `
    <span class="sync-badge">
      🟢 Synced ${elapsedHours === 0 ? 'just now' : elapsedHours + 'h ago'} • Auto-Refresh in ${remainingHours}h
    </span>
  `;
}

function renderArticles() {
  const container = document.getElementById('news-grid');
  if (!container) return;

  const filtered = currentCategory === 'all' 
    ? allArticles 
    : allArticles.filter(item => item.category === currentCategory);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted">No news articles found for this category.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item, index) => `
    <div class="col-md-6 col-lg-4 mb-4" data-aos="fade-up" data-aos-delay="${(index % 3) * 100}">
      <article class="blog-card h-100 d-flex flex-column">
        <div class="card-img-wrapper">
          <img src="${item.thumbnail}" alt="${item.title}" class="card-img-top" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80'">
          <span class="category-tag">${getCategoryName(item.category)}</span>
        </div>
        <div class="card-body d-flex flex-column">
          <div class="meta-info mb-2">
            <small class="text-muted">📅 ${formatDate(item.pubDate)} • ${item.source}</small>
          </div>
          <h5 class="card-title mb-3">${escapeHtml(item.title)}</h5>
          <p class="card-text flex-grow-1">${escapeHtml(truncate(item.description, 130))}</p>
          <a href="blog-details.html?id=${item.id}" class="read-link mt-3">
            Read Full Story →
          </a>
        </div>
      </article>
    </div>
  `).join('');
}

function initSingleArticlePage() {
  const container = document.getElementById('single-article-content');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const articleId = params.get('id') || '0';

  const cachedData = localStorage.getItem(CACHE_KEY);
  let articles = FALLBACK_ARTICLES;

  if (cachedData) {
    try {
      articles = JSON.parse(cachedData);
    } catch (e) {
      console.warn('Using fallback articles');
    }
  }

  const article = articles.find(a => String(a.id) === String(articleId)) || articles[0];

  document.title = `${article.title} - Kaushubh Kumar Blog`;

  container.innerHTML = `
    <div class="mb-4">
      <a href="blog.html" class="read-link mb-3 d-inline-block">← Back to All Articles</a>
      <div class="header-mask mt-2">
         <h1 class="header header-large align-left">${escapeHtml(article.title)}</h1>
      </div>
      <div class="d-flex align-items-center gap-3 my-3">
         <span class="category-tag position-static">${getCategoryName(article.category)}</span>
         <small class="text-muted">📅 ${formatDate(article.pubDate)} • Source: ${escapeHtml(article.source)}</small>
      </div>
    </div>

    <div class="mb-5 card-img-wrapper" style="height: 380px; border-radius: 16px;">
      <img src="${article.thumbnail}" alt="${article.title}" class="w-100 h-100 object-fit-cover" style="object-fit: cover;">
    </div>

    <div class="description-static description-long mb-5">
      ${article.content || `<p class="lead">${article.description}</p>`}
    </div>

    <div class="pt-4 border-top border-secondary d-flex justify-content-between align-items-center flex-wrap gap-3 mb-5">
       <a href="blog.html" class="button w-button">← Back to Blog</a>
       <a href="${article.link}" target="_blank" rel="noopener" class="read-link">View Original Source External Link ↗</a>
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

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
