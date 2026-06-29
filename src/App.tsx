import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Bookmark, Sun, Moon, Hash, ChevronRight, X, LayoutGrid, Menu, FolderOpen, Globe, BookOpen, Users, Code, Gamepad2, User } from 'lucide-react';
import { parseMarkdownFile, getDomainFavicon } from '@/utils/mdParser';
import SplashScreen from '@/components/SplashScreen';
import type { NavCategory, NavItem, NavSubCategory } from '@/types/nav';
import type { ParsedFile } from '@/utils/mdParser';
import './App.css';

// 使用 Vite 的 glob 导入自动加载 src/data/ 目录下的所有 Markdown 文件
const mdModules = import.meta.glob('/src/data/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/**
 * 导航卡片组件
 * 展示单个导航项的详细信息
 * @param item - 导航项数据
 */
function NavCard({ item }: { item: NavItem }) {
  const [imgError, setImgError] = useState(false);
  const faviconUrl = getDomainFavicon(item.url);
  // 优先使用自定义图标，否则使用网站 favicon
  const iconUrl = item.icon || faviconUrl;

  return (
    <div className="nav-card">
      {/* 主链接 */}
      {/* 根据是否有快速链接决定使用链接还是普通容器 */}
      {item.quickLinks && item.quickLinks.length > 0 ? (
        <div className="nav-card-main-link">
          {/* 图标区域 */}
          <div className="nav-card-icon">
            {!imgError && iconUrl ? (
              <img
                src={iconUrl}
                alt={item.title}
                onError={() => setImgError(true)}
                className="nav-card-img"
              />
            ) : (
              <Bookmark className="nav-card-fallback" />
            )}
          </div>
          {/* 内容区域 */}
          <div className="nav-card-body">
            <div className="nav-card-header">
              <h3 className="nav-card-title">{item.title}</h3>
            </div>
            {item.description && <p className="nav-card-desc">{item.description}</p>}
          </div>
        </div>
      ) : (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-card-main-link"
        >
          {/* 图标区域 */}
          <div className="nav-card-icon">
            {!imgError && iconUrl ? (
              <img
                src={iconUrl}
                alt={item.title}
                onError={() => setImgError(true)}
                className="nav-card-img"
              />
            ) : (
              <Bookmark className="nav-card-fallback" />
            )}
          </div>
          {/* 内容区域 */}
          <div className="nav-card-body">
            <div className="nav-card-header">
              <h3 className="nav-card-title">{item.title}</h3>
            </div>
            {item.description && <p className="nav-card-desc">{item.description}</p>}
          </div>
        </a>
      )}
      {/* 快速链接 */}
      {item.quickLinks && item.quickLinks.length > 0 && (
        <div className="nav-card-quick-links">
          {item.quickLinks.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-card-quick-link"
            >
              {link.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 子分类区域组件
 * 展示一个子分类及其下的导航卡片
 * @param sub - 子分类数据
 * @param searchTerm - 搜索关键词（用于过滤）
 * @param subcategoryId - 子分类 ID（用于滚动定位）
 */
function SubCategorySection({
  sub,
  searchTerm,
  subcategoryId
}: {
  sub: NavSubCategory;
  searchTerm: string;
  subcategoryId: string;
}) {
  // 根据搜索词过滤导航项
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return sub.items;
    const term = searchTerm.toLowerCase();
    return sub.items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.url.toLowerCase().includes(term)
    );
  }, [sub.items, searchTerm]);

  // 如果没有匹配项，不渲染
  if (filteredItems.length === 0) return null;

  return (
    <div id={subcategoryId} className="subcategory">
      <div className="subcategory-header">
        <FolderOpen className="subcategory-icon" />
        <h3 className="subcategory-title">{sub.name}</h3>
      </div>
      <div className="nav-grid">
        {filteredItems.map((item, idx) => (
          <NavCard key={`${item.url}-${idx}`} item={item} />
        ))}
      </div>
    </div>
  );
}

/**
 * 分类区域组件
 * 展示一个完整的分类，包括直接项和子分类
 * @param category - 分类数据
 * @param searchTerm - 搜索关键词
 * @param categoryId - 分类 ID（用于滚动定位）
 */
function CategorySection({
  category,
  searchTerm,
  categoryId
}: {
  category: NavCategory;
  searchTerm: string;
  categoryId: string;
}) {
  // 过滤直接导航项
  const directItems = useMemo(() => {
    if (!searchTerm.trim()) return category.items;
    const term = searchTerm.toLowerCase();
    return category.items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.url.toLowerCase().includes(term)
    );
  }, [category.items, searchTerm]);

  // 检查是否有子分类包含匹配项
  const hasSubResults = category.subCategories.some((sub) => {
    if (!searchTerm.trim()) return sub.items.length > 0;
    const term = searchTerm.toLowerCase();
    return sub.items.some(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description?.toLowerCase().includes(term) ||
        item.url.toLowerCase().includes(term)
    );
  });

  // 如果没有任何匹配项，不渲染
  if (directItems.length === 0 && !hasSubResults) return null;

  return (
    <section id={categoryId} className="category-section">
      {/* 分类标题 */}
      <div className="category-header">
        <div className="category-header-left">
          <Hash className="category-icon" />
          <h2 className="category-title">{category.name}</h2>
        </div>
      </div>

      {/* 警告信息 */}
      {category.notices && category.notices.length > 0 && (
        <div className="notices-container">
          {category.notices.map((notice, idx) => (
            <div key={idx} className="notice-card">
              <span className="notice-text" dangerouslySetInnerHTML={{ __html: notice }} />
            </div>
          ))}
        </div>
      )}

      {/* 直接导航项 */}
      {directItems.length > 0 && (
        <div className="nav-grid" style={{ marginBottom: category.subCategories.length > 0 ? 20 : 0 }}>
          {directItems.map((item, idx) => (
            <NavCard key={`${item.url}-${idx}`} item={item} />
          ))}
        </div>
      )}

      {/* 子分类 */}
      {category.subCategories.map((sub, idx) => (
        <SubCategorySection
          key={`${sub.name}-${idx}`}
          sub={sub}
          searchTerm={searchTerm}
          subcategoryId={`${categoryId}-sub-${idx}`}
        />
      ))}
    </section>
  );
}

/**
 * 根据分类名称获取对应图标
 */
function getCategoryIcon(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('官方') || lowerName.includes('official')) return <Globe size={18} />;
  if (lowerName.includes('文档') || lowerName.includes('docs') || lowerName.includes('document')) return <BookOpen size={18} />;
  if (lowerName.includes('社区') || lowerName.includes('community')) return <Users size={18} />;
  if (lowerName.includes('api') || lowerName.includes('开发') || lowerName.includes('code')) return <Code size={18} />;
  if (lowerName.includes('工具') || lowerName.includes('tool') || lowerName.includes('vr')) return <Gamepad2 size={18} />;
  if (lowerName.includes('头像') || lowerName.includes('avatar') || lowerName.includes('模型')) return <User size={18} />;
  return <Hash size={18} />;
}

/**
 * 主应用组件
 */
export default function App() {
  // 状态管理 - 使用惰性初始化来避免在 effect 中调用 setState
  const [categories, setCategories] = useState<NavCategory[]>(() => {
    // 这个初始化会在客户端渲染时才执行
    return [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // 惰性初始化主题
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initial = saved || (prefersDark ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', initial);
      return initial;
    }
    return 'light';
  });
  const [activeCategory, setActiveCategory] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  /**
   * 切换主题（亮色/深色）
   */
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  /**
   * 启动画面完成回调
   */
  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  /**
   * 加载并解析所有 Markdown 文件
   */
  useEffect(() => {
    try {
      const parsedFiles: ParsedFile[] = [];

      // 遍历所有 Markdown 模块
      for (const [filePath, content] of Object.entries(mdModules)) {
        const fileName = filePath.split('/').pop()?.replace('.md', '') || '未知';
        const parsed = parseMarkdownFile(content as string, fileName);
        parsedFiles.push(parsed);
      }

      // 按优先级排序
      parsedFiles.sort((a, b) => a.priority - b.priority);

      // 这是初始化数据加载，不是副作用
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategories(parsedFiles.map((f) => f.category));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  /**
   * 滚动监听：更新当前激活的分类
   */
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll('.category-section');
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 120 && rect.bottom >= 120) {
          setActiveCategory(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  /**
   * 根据搜索词过滤分类
   */
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    return categories.filter((cat) => {
      const directMatch = cat.items.some(
        (item) =>
          item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const subMatch = cat.subCategories.some((sub) =>
        sub.items.some(
          (item) =>
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.url.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      return directMatch || subMatch;
    });
  }, [categories, searchTerm]);

  /**
   * 计算总链接数
   */
  const totalLinks = useMemo(
    () =>
      categories.reduce(
        (sum, cat) => sum + cat.items.length + cat.subCategories.reduce((s, sc) => s + sc.items.length, 0),
        0
      ),
    [categories]
  );

  /**
   * 滚动到指定分类
   * @param id - 分类 ID
   */
  const scrollToCategory = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSidebarOpen(false);
    }
  };

  /**
   * 切换分类的展开/折叠状态
   * @param id - 分类 ID
   */
  const toggleCategoryExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /**
   * 滚动到指定子分类
   * @param id - 子分类 ID
   */
  const scrollToSubCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSidebarOpen(false);
    }
  };

  // 显示启动画面
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // 显示加载状态
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">正在加载导航数据...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* 侧边栏 */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <LayoutGrid className="sidebar-logo-icon" />
            <span className="sidebar-logo-text">VRChat 导航</span>
          </div>
          <p className="sidebar-stats">{categories.length} 分类 · {totalLinks} 链接</p>
        </div>

        {/* 分类导航列表 */}
        <nav className="sidebar-nav">
          {categories.map((cat, idx) => {
            const catId = `cat-${idx}`;
            const isActive = activeCategory === catId;
            const isExpanded = expandedCategories.has(catId);
            const hasResults = filteredCategories.some((fc) => fc.name === cat.name);
            if (!hasResults) return null;

            return (
              <div key={catId} className="sidebar-nav-category">
                <button
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-active' : ''}`}
                  onClick={() => scrollToCategory(catId)}
                >
                  {cat.subCategories.length > 0 && (
                    <button
                      className="sidebar-nav-chevron-btn"
                      onClick={(e) => toggleCategoryExpanded(catId, e)}
                    >
                      <ChevronRight className={`sidebar-nav-chevron ${isExpanded ? 'sidebar-nav-chevron-active' : ''}`} />
                    </button>
                  )}
                  {cat.subCategories.length === 0 && (
                    <div className="sidebar-nav-chevron-placeholder" />
                  )}
                  <div className="sidebar-nav-icon-wrapper">
                    {getCategoryIcon(cat.name)}
                  </div>
                  <span className="sidebar-nav-label">{cat.name}</span>
                </button>
                {/* 展开显示的子分类 */}
                {isExpanded && cat.subCategories.length > 0 && (
                  <div className="sidebar-subcategories">
                    {cat.subCategories.map((sub, subIdx) => (
                      <button
                        key={`${catId}-sub-${subIdx}`}
                        className="sidebar-subcategory-item"
                        onClick={(e) => scrollToSubCategory(`${catId}-sub-${subIdx}`, e)}
                      >
                        <FolderOpen className="sidebar-subcategory-icon" />
                        <span className="sidebar-subcategory-label">{sub.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 主题切换 */}
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="theme-toggle-icon" /> : <Sun className="theme-toggle-icon" />}
            <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
          </button>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="main">
        {/* 顶部栏 */}
        <div className="topbar">
          {/* 移动端菜单按钮 */}
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu className="menu-btn-icon" />
          </button>

          {/* 搜索框 */}
          <div className="topbar-search">
            <Search className="topbar-search-icon" />
            <input
              type="text"
              placeholder="搜索导航链接..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="topbar-search-input"
            />
            {searchTerm && (
              <button className="topbar-search-clear" onClick={() => setSearchTerm('')}>
                <X className="topbar-search-clear-icon" />
              </button>
            )}
          </div>

          {/* 主题切换按钮（顶部栏） */}
          <button className="topbar-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        {/* 内容区域 */}
        <div className="content">
          {filteredCategories.length === 0 ? (
            <div className="empty-state">
              <Search className="empty-icon" />
              <p className="empty-title">未找到匹配的链接</p>
              <p className="empty-hint">尝试使用其他关键词搜索</p>
            </div>
          ) : (
            filteredCategories.map((cat, idx) => (
              <CategorySection
                key={`${cat.name}-${idx}`}
                category={cat}
                searchTerm={searchTerm}
                categoryId={`cat-${idx}`}
              />
            ))
          )}
          
          {/* 页脚 */}
          <footer className="footer">
            <div className="footer-content">
              <p className="footer-email">
                投稿邮箱: <a href="mailto:onedrive@kipfel.cn" className="footer-email-link">onedrive@kipfel.cn</a>
              </p>
              <p className="footer-copyright">
                Copyright © 2026 VRChat导航kipfel个人制作
              </p>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
