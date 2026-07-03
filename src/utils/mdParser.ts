import { marked } from 'marked';
import type { NavCategory, NavSubCategory, NavItem, QuickLink } from '@/types/nav';

export interface ParsedFile {
  category: NavCategory;
  priority: number;
}

function extractFrontmatter(mdContent: string): { frontmatter: Record<string, string>; body: string } {
  const frontmatterRegex = /^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]+/;
  const match = mdContent.match(frontmatterRegex);

  if (match) {
    const frontmatterStr = match[1];
    const frontmatter: Record<string, string> = {};
    const lines = frontmatterStr.split(/[\r\n]+/);

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }

    return { frontmatter, body: mdContent.slice(match[0].length) };
  }

  return { frontmatter: {}, body: mdContent };
}

function parseListItem(text: string): NavItem | null {
  let icon: string | undefined;
  let remainingText = text;
  const iconMatch = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);

  if (iconMatch) {
    icon = iconMatch[2].trim();
    remainingText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/, '').trim();
  }

  const quickLinks: QuickLink[] = [];
  const parts = remainingText.split('|').map((s) => s.trim());
  const mainPart = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const ql = parseQuickLink(parts[i]);
    if (ql) {
      quickLinks.push(ql);
    }
  }

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

function parseParagraphLink(text: string): NavItem | null {
  let icon: string | undefined;
  let remainingText = text;
  const iconMatch = text.match(/!\[([^\]]*)\]\(([^)]+)\)/);

  if (iconMatch) {
    icon = iconMatch[2].trim();
    remainingText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/, '').trim();
  }

  const quickLinks: QuickLink[] = [];
  const parts = remainingText.split('|').map((s) => s.trim());
  const mainPart = parts[0];

  for (let i = 1; i < parts.length; i++) {
    const ql = parseQuickLink(parts[i]);
    if (ql) {
      quickLinks.push(ql);
    }
  }

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

function parseMarkdownBody(mdContent: string, categoryName: string): NavCategory {
  const tokens = marked.lexer(mdContent);
  const category: NavCategory = {
    name: categoryName,
    items: [],
    subCategories: [],
    notices: []
  };
  const categoryStack: Array<{ depth: number; subCategory: NavSubCategory }> = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'heading' && token.depth >= 2) {
      const depth = token.depth;
      while (categoryStack.length > 0 && categoryStack[categoryStack.length - 1].depth >= depth) {
        categoryStack.pop();
      }

      const newSubCategory: NavSubCategory = {
        name: token.text,
        items: [],
        subCategories: []
      };

      if (categoryStack.length === 0) {
        category.subCategories.push(newSubCategory);
      } else {
        categoryStack[categoryStack.length - 1].subCategory.subCategories.push(newSubCategory);
      }

      categoryStack.push({ depth, subCategory: newSubCategory });
    } else if (token.type === 'list') {
      let targetItems: NavItem[] = category.items;
      if (categoryStack.length > 0) {
        targetItems = categoryStack[categoryStack.length - 1].subCategory.items;
      }

      for (const item of token.items) {
        const parsedItem = parseListItem(item.text);
        if (parsedItem) {
          targetItems.push(parsedItem);
        }
      }
    } else if (token.type === 'paragraph') {
      const text = token.text.trim();
      const raw = token.raw.trim();

      if (text.includes('⚠️') || text.includes('警告') || text.includes('**重要**') || text.includes('注意')) {
        const html = marked.parse(raw) as string;
        const cleanHtml = html.replace(/^<p>([\s\S]*)<\/p>$/, '$1').trim();
        category.notices?.push(cleanHtml);
      } else {
        let targetItems: NavItem[] = category.items;
        if (categoryStack.length > 0) {
          targetItems = categoryStack[categoryStack.length - 1].subCategory.items;
        }

        const parsedItem = parseParagraphLink(token.text);
        if (parsedItem) {
          targetItems.push(parsedItem);
        }
      }
    }
  }

  return category;
}

export function getDomainFavicon(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return undefined;
  }
}

export function parseMarkdownFile(mdContent: string, defaultName: string): ParsedFile {
  const { frontmatter, body } = extractFrontmatter(mdContent);
  const name = frontmatter.name || defaultName;
  const category = parseMarkdownBody(body, name);
  const priority = frontmatter.priority ? parseInt(frontmatter.priority, 10) : 100;

  return { category, priority };
}
