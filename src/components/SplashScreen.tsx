import { useEffect, useState, useRef } from 'react';

/**
 * 粒子数据类型
 */
interface Particle {
  x: number;           // 粒子 x 坐标
  y: number;           // 粒子 y 坐标
  size: number;        // 粒子大小
  speedY: number;      // y 轴移动速度
  speedX: number;      // x 轴移动速度
  opacity: number;     // 透明度
  color: string;       // 颜色
}

/**
 * 启动画面组件
 * 展示带有粒子动画的启动画面
 * @param onComplete - 动画完成后的回调函数
 */
export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'particles' | 'logo' | 'fadeout'>('particles');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    /**
     * 调整画布大小以适应窗口
     */
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 粒子颜色数组
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

    // 创建粒子
    const particles: Particle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedY: -(Math.random() * 1.5 + 0.5),
        speedX: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * 0.6 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    particlesRef.current = particles;

    /**
     * 粒子动画循环
     */
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        // 更新粒子位置
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += (Math.random() - 0.5) * 0.02;
        p.opacity = Math.max(0.1, Math.min(0.8, p.opacity));

        // 边界检测与循环
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        // 绘制粒子核心
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

        // 绘制粒子发光效果
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = p.opacity * 0.3;
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    // 阶段定时器：显示 logo
    const logoTimer = setTimeout(() => setPhase('logo'), 400);
    // 阶段定时器：开始淡出
    const fadeTimer = setTimeout(() => setPhase('fadeout'), 2200);
    // 阶段定时器：完成并回调
    const completeTimer = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      onComplete();
    }, 3000);

    // 清理函数
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(logoTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
      window.removeEventListener('resize', resize);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${phase === 'fadeout' ? 'splash-fadeout' : ''}`}>
      {/* 粒子动画画布 */}
      <canvas ref={canvasRef} className="splash-canvas" />
      {/* Logo 和文字内容 */}
      <div className={`splash-content ${phase === 'logo' || phase === 'fadeout' ? 'splash-content-visible' : ''}`}>
        <div className="splash-logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h1 className="splash-title">VRChat 导航站</h1>
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
}
