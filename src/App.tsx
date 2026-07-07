import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Search, Bookmark, Sun, Moon, Hash, ChevronRight, X, LayoutGrid, Menu, FolderOpen, Globe, BookOpen, Users, Code, Gamepad2, User } from 'lucide-react';
import { parseMarkdownFile, getDomainFavicon } from '@/utils/mdParser';
import SplashScreen from '@/components/SplashScreen';
import type { NavCategory, NavItem, NavSubCategory } from '@/types/nav';
import './App.css';

const mdModules = import.meta.glob('/src/data/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function NavCard({ item, onImageClick }: { item: NavItem; onImageClick?: (url: string, title: string) => void }) {
  const [imgError, setImgError] = useState(false);
  const faviconUrl = getDomainFavicon(item.url);
  const iconUrl = item.icon || faviconUrl;
  const hasQuickLinks = item.quickLinks && item.quickLinks.length > 0;

  const MainLink = hasQuickLinks ? 'div' : 'a';
  const linkProps = hasQuickLinks ? {} : { href: item.url, target: '_blank', rel: 'noopener noreferrer' };

  return (
    <div className="nav-card">
      <MainLink {...linkProps} className="nav-card-main-link">
        <div className="nav-card-icon">
          {!imgError && iconUrl ? (
            <img
              src={iconUrl}
              alt={item.title}
              onError={() => setImgError(true)}
              className="nav-card-img"
              onClick={(e) => {
                if (onImageClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  onImageClick(iconUrl, item.title);
                }
              }}
            />
          ) : (
            <Bookmark className="nav-card-fallback" />
          )}
        </div>
        <div className="nav-card-body">
          <div className="nav-card-header">
            <h3 className="nav-card-title">{item.title}</h3>
          </div>
          {item.description && <p className="nav-card-desc">{item.description}</p>}
        </div>
      </MainLink>
      {hasQuickLinks && (
        <div className="nav-card-quick-links">
          {item.quickLinks!.map((link, idx) => (
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

const countSubCategoryLinks = (subCategories: NavSubCategory[]): number => 
  subCategories.reduce((sum, sub) => sum + sub.items.length + countSubCategoryLinks(sub.subCategories), 0);

const hasSubCategoryMatch = (subCategories: NavSubCategory[], searchTerm: string): boolean => 
  subCategories.some(sub => {
    const hasMatchingItems = sub.items.some(
      item => item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.url.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const hasMatchingChildSubs = hasSubCategoryMatch(sub.subCategories, searchTerm);
    return hasMatchingItems || hasMatchingChildSubs;
  });

function SidebarSubCategoryItem({
  sub,
  subId,
  expandedCategories,
  toggleCategoryExpanded,
  setSidebarOpen,
  searchTerm
}: {
  sub: NavSubCategory;
  subId: string;
  expandedCategories: Set<string>;
  toggleCategoryExpanded: (id: string, e: React.MouseEvent) => void;
  setSidebarOpen: (open: boolean) => void;
  searchTerm: string;
}) {
  const isExpanded = expandedCategories.has(subId);
  const hasContent = useMemo(() => {
    if (!searchTerm.trim()) return true;
    return hasSubCategoryMatch([sub], searchTerm);
  }, [sub, searchTerm]);

  if (!hasContent) return null;

  return (
    <div key={subId} className="sidebar-subcategory-wrapper">
      <button
        className="sidebar-subcategory-item"
        onClick={(e) => {
          e.stopPropagation();
          const el = document.getElementById(subId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setSidebarOpen(false);
          }
        }}
      >
        {sub.subCategories.length > 0 && (
          <div
            className="sidebar-nav-chevron-btn"
            onClick={(e) => toggleCategoryExpanded(subId, e)}
          >
            <ChevronRight className={`sidebar-nav-chevron ${isExpanded ? 'sidebar-nav-chevron-active' : ''}`} />
          </div>
        )}
        {sub.subCategories.length === 0 && <div className="sidebar-nav-chevron-placeholder" />}
        <FolderOpen className="sidebar-subcategory-icon" />
        <span className="sidebar-subcategory-label">{sub.name}</span>
      </button>
      {sub.subCategories.length > 0 && (
        <div className={`sidebar-nested-subcategories ${isExpanded ? 'sidebar-nested-subcategories-expanded' : ''}`}>
          {sub.subCategories.map((childSub, childIdx) => (
            <SidebarSubCategoryItem
              key={`${subId}-child-${childIdx}`}
              sub={childSub}
              subId={`${subId}-child-${childIdx}`}
              expandedCategories={expandedCategories}
              toggleCategoryExpanded={toggleCategoryExpanded}
              setSidebarOpen={setSidebarOpen}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SubCategorySection({
  sub,
  searchTerm,
  subcategoryId,
  onImageClick
}: {
  sub: NavSubCategory;
  searchTerm: string;
  subcategoryId: string;
  onImageClick?: (url: string, title: string) => void;
}) {
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return sub.items;
    const term = searchTerm.toLowerCase();
    return sub.items.filter(
      item => item.title.toLowerCase().includes(term) ||
              item.description?.toLowerCase().includes(term) ||
              item.url.toLowerCase().includes(term)
    );
  }, [sub.items, searchTerm]);

  const filteredSubCategories = useMemo(() => {
    if (!searchTerm.trim()) return sub.subCategories;
    return sub.subCategories.filter(childSub => hasSubCategoryMatch([childSub], searchTerm));
  }, [sub.subCategories, searchTerm]);

  if (filteredItems.length === 0 && filteredSubCategories.length === 0) return null;

  return (
    <div id={subcategoryId} className="subcategory">
      <div className="subcategory-header">
        <FolderOpen className="subcategory-icon" />
        <h3 className="subcategory-title">{sub.name}</h3>
      </div>
      {filteredItems.length > 0 && (
        <div className="nav-grid">
          {filteredItems.map((item, idx) => (
            <NavCard key={`${item.url}-${idx}`} item={item} onImageClick={onImageClick} />
          ))}
        </div>
      )}
      {filteredSubCategories.map((childSub, idx) => (
        <SubCategorySection
          key={`${childSub.name}-${idx}`}
          sub={childSub}
          searchTerm={searchTerm}
          subcategoryId={`${subcategoryId}-child-${idx}`}
          onImageClick={onImageClick}
        />
      ))}
    </div>
  );
}

function CategorySection({
  category,
  searchTerm,
  categoryId,
  onImageClick
}: {
  category: NavCategory;
  searchTerm: string;
  categoryId: string;
  onImageClick?: (url: string, title: string) => void;
}) {
  const directItems = useMemo(() => {
    if (!searchTerm.trim()) return category.items;
    const term = searchTerm.toLowerCase();
    return category.items.filter(
      item => item.title.toLowerCase().includes(term) ||
              item.description?.toLowerCase().includes(term) ||
              item.url.toLowerCase().includes(term)
    );
  }, [category.items, searchTerm]);

  const hasSubResults = category.subCategories.some(sub => {
    if (!searchTerm.trim()) {
      return sub.items.length > 0 || countSubCategoryLinks(sub.subCategories) > 0;
    }
    return hasSubCategoryMatch([sub], searchTerm);
  });

  if (directItems.length === 0 && !hasSubResults) return null;

  return (
    <section id={categoryId} className="category-section">
      <div className="category-header">
        <div className="category-header-left">
          <Hash className="category-icon" />
          <h2 className="category-title">{category.name}</h2>
        </div>
      </div>
      {category.notices && category.notices.length > 0 && (
        <div className="notices-container">
          {category.notices.map((notice, idx) => (
            <div key={idx} className="notice-card">
              <span className="notice-text" dangerouslySetInnerHTML={{ __html: notice }} />
            </div>
          ))}
        </div>
      )}
      {directItems.length > 0 && (
        <div className="nav-grid" style={{ marginBottom: category.subCategories.length > 0 ? 20 : 0 }}>
          {directItems.map((item, idx) => (
            <NavCard key={`${item.url}-${idx}`} item={item} onImageClick={onImageClick} />
          ))}
        </div>
      )}
      {category.subCategories.map((sub, idx) => (
        <SubCategorySection
          key={`${sub.name}-${idx}`}
          sub={sub}
          searchTerm={searchTerm}
          subcategoryId={`${categoryId}-sub-${idx}`}
          onImageClick={onImageClick}
        />
      ))}
    </section>
  );
}

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

export default function App() {
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
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
  const [contentVisible, setContentVisible] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>('');
  
  const psContent = [
    '点击图标可以放大哦',
    '开发团队看似是3人实际2人！！！',
    '欢迎反馈onedrive@kipfel.cn',
    '不知道写什么啦'
  ];
  
  const [currentPsIndex, setCurrentPsIndex] = useState(0);
  const [psTransitioning, setPsTransitioning] = useState(false);
  const psIntervalRef = useRef<number | null>(null);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      return next;
    });
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setTimeout(() => setContentVisible(true), 50);
  }, []);

  useEffect(() => {
    try {
      const parsedFiles = Object.entries(mdModules)
        .map(([filePath, content]) => 
          parseMarkdownFile(content as string, filePath.split('/').pop()?.replace('.md', '') || '未知')
        )
        .sort((a, b) => a.priority - b.priority);

      setCategories(parsedFiles.map(f => f.category));
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

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

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    return categories.filter(cat => {
      const directMatch = cat.items.some(
        item => item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.url.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const subMatch = hasSubCategoryMatch(cat.subCategories, searchTerm.toLowerCase());
      return directMatch || subMatch;
    });
  }, [categories, searchTerm]);

  const totalLinks = useMemo(
    () => categories.reduce(
      (sum, cat) => sum + cat.items.length + countSubCategoryLinks(cat.subCategories),
      0
    ),
    [categories]
  );

  const scrollToCategory = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setSidebarOpen(false);
    }
  };

  const toggleCategoryExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleImageClick = (url: string, title: string) => {
    setModalImage(url);
    setModalTitle(title);
  };

  const closeModal = () => {
    setModalImage(null);
    setModalTitle('');
  };

  const scrollToDisclaimer = () => {
    const el = document.getElementById('disclaimer-section');
    const detailsEl = el?.querySelector('details');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (detailsEl) {
        detailsEl.open = true;
      }
      setSidebarOpen(false);
    }
  };
  
  useEffect(() => {
    psIntervalRef.current = setInterval(() => {
      setPsTransitioning(true);
      setTimeout(() => {
        setCurrentPsIndex((prev) => (prev + 1) % psContent.length);
        setPsTransitioning(false);
      }, 300);
    }, 3000);
    
    return () => {
      if (psIntervalRef.current) {
        clearInterval(psIntervalRef.current);
      }
    };
  }, [psContent.length]);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p className="loading-text">正在加载导航数据...</p>
      </div>
    );
  }

  return (
    <div className={`app ${contentVisible ? 'app-visible' : ''}`}>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      
      {/* 图片弹窗 */}
      {modalImage && (
        <div className="image-modal" onClick={closeModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeModal}>
              <X size={24} />
            </button>
            <div className="image-modal-header">
              <h3 className="image-modal-title">{modalTitle}</h3>
            </div>
            <div className="image-modal-image-container">
              <img src={modalImage} alt={modalTitle} className="image-modal-image" />
            </div>
          </div>
        </div>
      )}
      
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${contentVisible ? 'sidebar-visible' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <LayoutGrid className="sidebar-logo-icon" />
            <span className="sidebar-logo-text">VRChat 导航</span>
          </div>
          <p className="sidebar-stats">{categories.length} 分类 · {totalLinks} 链接</p>
        </div>
        <nav className="sidebar-nav">
          {categories.map((cat, idx) => {
            const catId = `cat-${idx}`;
            const isActive = activeCategory === catId;
            const isExpanded = expandedCategories.has(catId);
            const hasResults = filteredCategories.some(fc => fc.name === cat.name);
            if (!hasResults) return null;

            return (
              <div key={catId} className="sidebar-nav-category">
                <button
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-active' : ''}`}
                  onClick={() => scrollToCategory(catId)}
                >
                  {cat.subCategories.length > 0 && (
                    <div
                      className="sidebar-nav-chevron-btn"
                      onClick={(e) => toggleCategoryExpanded(catId, e)}
                    >
                      <ChevronRight className={`sidebar-nav-chevron ${isExpanded ? 'sidebar-nav-chevron-active' : ''}`} />
                    </div>
                  )}
                  {cat.subCategories.length === 0 && <div className="sidebar-nav-chevron-placeholder" />}
                  <div className="sidebar-nav-icon-wrapper">{getCategoryIcon(cat.name)}</div>
                  <span className="sidebar-nav-label">{cat.name}</span>
                </button>
                {cat.subCategories.length > 0 && (
                  <div className={`sidebar-subcategories ${isExpanded ? 'sidebar-subcategories-expanded' : ''}`}>
                    {cat.subCategories.map((sub, subIdx) => (
                      <SidebarSubCategoryItem
                        key={`${catId}-sub-${subIdx}`}
                        sub={sub}
                        subId={`${catId}-sub-${subIdx}`}
                        expandedCategories={expandedCategories}
                        toggleCategoryExpanded={toggleCategoryExpanded}
                        setSidebarOpen={setSidebarOpen}
                        searchTerm={searchTerm}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="ps-container ps-footer">
            <div className="ps-wrapper">
              <span className="ps-label">PS:</span>
              <span className={`ps-text ${psTransitioning ? 'ps-transitioning' : ''}`}>
                {psContent[currentPsIndex]}
              </span>
            </div>
          </div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? <Moon className="theme-toggle-icon" /> : <Sun className="theme-toggle-icon" />}
            <span>{theme === 'light' ? '深色模式' : '浅色模式'}</span>
          </button>
          <button className="disclaimer-link" onClick={scrollToDisclaimer}>
            <svg className="disclaimer-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span>免责声明</span>
          </button>
        </div>
      </aside>
      <main className={`main ${contentVisible ? 'main-visible' : ''}`}>
        <div className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            <Menu className="menu-btn-icon" />
          </button>
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
          <button className="topbar-theme-btn" onClick={toggleTheme}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
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
                onImageClick={handleImageClick}
              />
            ))
          )}
          <div className="disclaimer-section" id="disclaimer-section">
            <details className="disclaimer-details">
              <summary className="disclaimer-summary">
                <svg className="disclaimer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
                <span>免责声明</span>
                <svg className="disclaimer-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </summary>
              <div className="disclaimer-content">
                <div className="disclaimer-grid">
                  <div className="disclaimer-card">
                    <div className="disclaimer-card-header">
                      <svg className="disclaimer-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="disclaimer-card-title">所有权</span>
                    </div>
                    <p className="disclaimer-card-text">本网站（含所有子页面）及所属域名均为个人所有，并非由「kipfel社区团队」制作或运营。若站内任何内容涉及侵权，权利人提出有效证明后，我将立即下架对应资源。</p>
                  </div>
                  <div className="disclaimer-card">
                    <div className="disclaimer-card-header">
                      <svg className="disclaimer-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="disclaimer-card-title">团队立场</span>
                    </div>
                    <p className="disclaimer-card-text">
                      本<a href="https://docs.kipfel.wiki/zh/video-parser/team.html" target="_blank" rel="noopener noreferrer" className="disclaimer-card-link">团队</a>全体成员（共3人）绝不参与任何VRChat社团、群组的纠纷或对立事件，亦不会在旗下导航站或文档站中展示任何与群组相关的内容（如宣传、排行榜等）。
                    </p>
                  </div>
                  <div className="disclaimer-card">
                    <div className="disclaimer-card-header">
                      <svg className="disclaimer-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="disclaimer-card-title">官方域名</span>
                    </div>
                    <div className="disclaimer-tags">
                      <a href="https://docs.kipfel.wiki" target="_blank" rel="noopener noreferrer" className="disclaimer-tag">docs.kipfel.wiki</a>
                      <a href="https://kipfel.wiki" target="_blank" rel="noopener noreferrer" className="disclaimer-tag">kipfel.wiki</a>
                      <a href="https://api.kipfel.link" target="_blank" rel="noopener noreferrer" className="disclaimer-tag">api.kipfel.link</a>
                    </div>
                    <p className="disclaimer-card-text" style={{ marginTop: '8px', marginBottom: '8px', fontSize: '13px' }}>
                      kipfel.cn 是邮箱域名，暂时只有这些网站开放，后续会继续为社区增加更多优质的网站。
                    </p>
                    <p className="disclaimer-card-subtitle">联系邮箱</p>
                    <div className="disclaimer-tags">
                      <a href="mailto:admin@kipfel.link" className="disclaimer-tag">admin@kipfel.link</a>
                      <a href="mailto:xiao-luo@kipfel.cn" className="disclaimer-tag">xiao-luo@kipfel.cn</a>
                      <a href="mailto:onedrive@kipfel.cn" className="disclaimer-tag">onedrive@kipfel.cn</a>
                    </div>
                  </div>
                  <div className="disclaimer-card">
                    <div className="disclaimer-card-header">
                      <svg className="disclaimer-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span className="disclaimer-card-title">第三方免责</span>
                    </div>
                    <p className="disclaimer-card-text">cn.kipfel.link 并非本团队持有或管理，该域名已分配给其他团队独立运营。若该域名引发任何社区纠纷或争议，一切后果均与本团队无关，我们不对其内容及行为承担任何责任。</p>
                  </div>
                </div>
                <div className="disclaimer-footer">
                  <span className="disclaimer-date">发布日期：2026年7月1日</span>
                  <a href="https://docs.kipfel.wiki/zh/video-parser/team.html" target="_blank" rel="noopener noreferrer" className="disclaimer-team">我们的团队</a>
                </div>
              </div>
            </details>
          </div>
          
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
