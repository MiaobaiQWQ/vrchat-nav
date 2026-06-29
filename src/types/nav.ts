/**
 * 导航快速链接类型定义
 * 用于表示导航卡片中的快速链接按钮
 */
export interface QuickLink {
  /** 链接显示的标题文字 */
  title: string;
  /** 链接的完整 URL 地址 */
  url: string;
}

/**
 * 导航项类型定义
 * 表示单个导航卡片的数据结构
 */
export interface NavItem {
  /** 导航项的标题 */
  title: string;
  /** 导航项的链接地址 */
  url: string;
  /** 导航项的描述文字（可选） */
  description?: string;
  /** 导航项的自定义图标 URL（可选） */
  icon?: string;
  /** 快速链接列表（可选） */
  quickLinks?: QuickLink[];
}

/**
 * 导航子分类类型定义
 * 表示一个分类下的子分组
 */
export interface NavSubCategory {
  /** 子分类的名称 */
  name: string;
  /** 该子分类下的导航项列表 */
  items: NavItem[];
}

/**
 * 导航分类类型定义
 * 表示一个完整的导航分类，包含直接项和子分类
 */
export interface NavCategory {
  /** 分类的名称 */
  name: string;
  /** 该分类下的直接导航项列表 */
  items: NavItem[];
  /** 该分类下的子分类列表 */
  subCategories: NavSubCategory[];
  /** 分类的警告或注意事项列表（可选） */
  notices?: string[];
}
