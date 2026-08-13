/**
 * 壁纸来源：src/assets/wallpapers/ 文件夹下的所有图片。
 * 增删图片即自动增删壁纸，无需修改本文件。
 * 支持扩展名：.jpg .jpeg .png .webp .gif .avif
 */
const imageModules = import.meta.glob('/src/assets/wallpapers/*.{jpg,jpeg,png,webp,gif,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export interface Wallpaper {
  id: string;
  /** CSS background 值 */
  background: string;
}

/** 当 wallpapers 文件夹为空时的渐变兜底 */
const FALLBACK_GRADIENTS: Wallpaper[] = [
  { id: 'aurora', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'sunset', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { id: 'ocean', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'forest', background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
];

// 按文件名排序，方便用户用 01.jpg / 02.jpg 控制顺序
const imageWallpapers: Wallpaper[] = Object.entries(imageModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => ({ id: path, background: `url("${url}")` }));

export const WALLPAPERS: Wallpaper[] = imageWallpapers.length > 0 ? imageWallpapers : FALLBACK_GRADIENTS;

/** 自动轮换间隔（毫秒） */
export const WALLPAPER_INTERVAL_MS = 15000;
