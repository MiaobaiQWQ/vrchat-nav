import { marked } from 'marked';
import type { NavCategory, NavSubCategory, NavItem, QuickLink } from '@/types/nav';

/**
 * Markdown 文件解析结果类型
 */
export interface ParsedFile {
  /** 解析出的导航分类 */
  category: NavCategory;
  /** 分类的优先级（用于排序） */
  priority: number;
}

/**
 * 从 Markdown 字符串中提取 Frontmatter 元数据
 * Frontmatter 格式为 --- 包裹的键值对
 * @param mdContent - Markdown 内容字符串
 * @returns 包含 Frontmatter 数据和剩余内容的对象
 */
function extractFrontmatter(mdContent: string): { frontmatter: Record<string, string>; body: string } {
  // 匹配 --- 开头和结尾的 Frontmatter 块
  const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+/;
  const match = mdContent.match(frontmatterRegex);

  if (match) {
    const frontmatterStr = match[1];
    const frontmatter: Record<string, string> = {};
    // 按行解析键值对
    const lines = frontmatterStr.split(/[\r\n]+/);

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }

    return {
      frontmatter,
      body: mdContent.slice(match[0].length)
    };
  }

  // 如果没有 Frontmatter，返回空对象和完整内容
  return {
    frontmatter: {},
    body: mdContent
  };
}

/**
 * 解析 Markdown 内容体为导航分类结构
 * @param mdContent - Markdown 内容（不含 Frontmatter）
 * @param categoryName - 分类名称
 * @returns 解析后的导航分类对象
 */
function parseMarkdownBody(mdContent: string, categoryName: string): NavCategory {
  // 使用 marked 词法分析器解析 Markdown
  const tokens = marked.lexer(mdContent);

  // 初始化分类对象
  const category: NavCategory = {
    name: categoryName,
    items: [],
    subCategories: [],
    notices: []
  };

  // 当前正在处理的子分类
  let currentSubCategory: NavSubCategory | null = null;
  // 上一个标题的深度
  let lastHeadingDepth = 0;

  // 遍历所有 Markdown token
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // 处理标题 token
    if (token.type === 'heading') {
      const depth = token.depth;

      // 二级或三级标题作为子分类标题
      if (depth === 2 || depth === 3) {
        // 如果有当前子分类且有内容，先保存
        if (currentSubCategory && currentSubCategory.items.length > 0) {
          category.subCategories.push(currentSubCategory);
        }
        // 创建新的子分类
        currentSubCategory = {
          name: token.text,
          items: []
        };
        lastHeadingDepth = depth;
      }
    }
    // 处理列表 token（导航项）
    else if (token.type === 'list') {
      // 确定要添加到哪个列表
      const targetItems =
        (lastHeadingDepth === 2 || lastHeadingDepth === 3) && currentSubCategory
          ? currentSubCategory.items
          : category.items;

      // 解析列表中的每一项
      for (const item of token.items) {
        const parsedItem = parseListItem(item.text);
        if (parsedItem) {
          targetItems.push(parsedItem);
        }
      }
    }
    // 处理段落 token（可能是注意事项或链接）
    else if (token.type === 'paragraph') {
      const text = token.text.trim();
      const raw = token.raw.trim();

      // 检测是否是注意事项（包含警告图标或关键词）
      if (text.includes('⚠️') || text.includes('警告') || text.includes('**重要**') || text.includes('注意')) {
        const html = marked.parse(raw) as string;
        // 移除外层的 <p> 标签
        const cleanHtml = html.replace(/^<p>([\s\S]*)<\/p>$/, '$1').trim();
        category.notices?.push(cleanHtml);
      } else {
        // 否则尝试解析为导航项
        const targetItems =
          (lastHeadingDepth === 2 || lastHeadingDepth === 3) && currentSubCategory
            ? currentSubCategory.items
            : category.items;

        const parsedItem = parseParagraphLink(token.text);
        if (parsedItem) {
          targetItems.push(parsedItem);
        }
      }
    }
  }

  // 保存最后一个子分类
  if (currentSubCategory && currentSubCategory.items.length > 0) {
    category.subCategories.push(currentSubCategory);
  }

  return category;
}

/**
 * 解析列表项文本为导航项
 * @param text - 列表项文本
 * @returns 解析后的导航项，失败返回 null
 */
function parseListItem(text: string): NavItem | null {
  // 1. 提取图标
  let icon: string | undefined;
  let remainingText = text;
  const iconMatch = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);

  if (iconMatch) {
    icon = iconMatch[2].trim();
    remainingText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/, '').trim();
  }

  // 2. 提取快速链接（用 | 分隔）
  const quickLinks: QuickLink[] = [];
  const parts = remainingText.split('|').map((s) => s.trim());
  const mainPart = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const ql = parseQuickLink(parts[i]);
    if (ql) {
      quickLinks.push(ql);
    }
  }

  // 3. 解析主链接：[标题](链接) - 描述
  const linkMatch = mainPart.match(/\[([^\]]+)\]\(([^)]+)\)(?:\s*[-—:]\s*(.*))?/);

  if (linkMatch) {
    return {
      title: linkMatch[1].trim(),
      url: linkMatch[2].trim(),
      description: linkMatch[3]?.trim() || '',
      icon,
      quickLinks: quickLinks.length > 0 ? quickLinks : undefined
    };
  }

  return null;
}

/**
 * 解析段落中的链接为导航项
 * @param text - 段落文本
 * @returns 解析后的导航项，失败返回 null
 */
function parseParagraphLink(text: string): NavItem | null {
  // 1. 提取图标
  let icon: string | undefined;
  let remainingText = text;
  const iconMatch = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);

  if (iconMatch) {
    icon = iconMatch[2].trim();
    remainingText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/, '').trim();
  }

  // 2. 提取快速链接（用 | 分隔）
  const quickLinks: QuickLink[] = [];
  const parts = remainingText.split('|').map((s) => s.trim());
  const mainPart = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const ql = parseQuickLink(parts[i]);
    if (ql) {
      quickLinks.push(ql);
    }
  }

  // 3. 解析主链接
  const linkMatch = mainPart.match(/\[([^\]]+)\]\(([^)]+)\)/);

  if (linkMatch) {
    const remainingDesc = mainPart.replace(/\[([^\]]+)\]\(([^)]+)\)/, '').trim();
    return {
      title: linkMatch[1].trim(),
      url: linkMatch[2].trim(),
      description: remainingDesc.replace(/^[\s\-—:]+/, '').trim(),
      icon,
      quickLinks: quickLinks.length > 0 ? quickLinks : undefined
    };
  }

  return null;
}

/**
 * 解析快速链接文本
 * @param text - 快速链接文本
 * @returns 解析后的快速链接，失败返回 null
 */
function parseQuickLink(text: string): QuickLink | null {
  const linkMatch = text.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (linkMatch) {
    return {
      title: linkMatch[1].trim(),
      url: linkMatch[2].trim()
    };
  }
  return null;
}

/**
 * 根据 URL 获取域名对应的 favicon 图标
 * @param url - 目标网站 URL
 * @returns favicon 图标 URL，失败返回 undefined
 */
export function getDomainFavicon(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    // 使用 Google 的 favicon 服务获取图标
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return undefined;
  }
}

/**
 * 解析完整的 Markdown 文件内容
 * @param mdContent - Markdown 文件完整内容
 * @param defaultName - 默认分类名称（当没有 Frontmatter 时使用）
 * @returns 解析后的文件结果
 */
export function parseMarkdownFile(mdContent: string, defaultName: string): ParsedFile {
  const { frontmatter, body } = extractFrontmatter(mdContent);
  const name = frontmatter.name || defaultName;
  const category = parseMarkdownBody(body, name);
  const priority = frontmatter.priority ? parseInt(frontmatter.priority, 10) : 100;

  return {
    category,
    priority
  };
}
