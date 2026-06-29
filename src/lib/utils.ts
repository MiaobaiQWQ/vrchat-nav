import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名
 * 功能：
 * 1. 使用 clsx 智能合并类名（支持条件类名、数组、对象等多种格式）
 * 2. 使用 twMerge 解决 Tailwind 类名冲突问题
 * 
 * @param inputs - 任意数量的类名参数，支持字符串、数组、对象等格式
 * @returns 合并后的类名字符串
 * 
 * @example
 * // 基本用法
 * cn('px-4', 'py-2') // => 'px-4 py-2'
 * 
 * // 条件类名
 * cn('px-4', isActive && 'bg-blue-500')
 * 
 * // 对象格式
 * cn('px-4', { 'bg-blue-500': isActive, 'text-white': isActive })
 * 
 * // 解决冲突
 * cn('px-2', 'px-4') // => 'px-4' (twMerge 会自动处理冲突)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
