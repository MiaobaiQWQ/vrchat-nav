import { useEffect, useState, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string;
}

interface LoadingItem {
  text: string;
  duration: number;
}

const loadingItems: LoadingItem[] = [
  { text: '初始化导航系统...', duration: 600 },
  { text: '加载官方文档...', duration: 400 },
  { text: '获取社区资源...', duration: 450 },
  { text: '加载开发工具...', duration: 350 },
  { text: '准备改模教程...', duration: 500 },
  { text: '渲染界面组件...', duration: 400 },
  { text: '准备就绪！', duration: 300 }
];

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'particles' | 'logo' | 'loading' | 'fadeout'>('particles');
  const [currentLoadingIndex, setCurrentLoadingIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

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

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.y += p.speedY;
        p.x += p.speedX;
        p.opacity += (Math.random() - 0.5) * 0.02;
        p.opacity = Math.max(0.1, Math.min(0.8, p.opacity));

        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();

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

    const logoTimer = setTimeout(() => setPhase('logo'), 400);

    const startLoadingTimer = setTimeout(() => {
      setPhase('loading');

      let index = 0;
      const loadNext = () => {
        if (index < loadingItems.length) {
          setCurrentLoadingIndex(index);
          setProgress(((index + 1) / loadingItems.length) * 100);
          index++;
          setTimeout(loadNext, loadingItems[index - 1].duration);
        } else {
          setTimeout(() => setPhase('fadeout'), 500);
        }
      };
      loadNext();
    }, 1200);

    const completeTimer = setTimeout(() => {
      cancelAnimationFrame(rafRef.current);
      onComplete();
    }, 1200 + loadingItems.reduce((sum, item) => sum + item.duration, 0) + 1000);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(logoTimer);
      clearTimeout(startLoadingTimer);
      clearTimeout(completeTimer);
      window.removeEventListener('resize', resize);
    };
  }, [onComplete]);

  return (
    <div className={`splash-screen ${phase === 'fadeout' ? 'splash-fadeout' : ''}`}>
      <canvas ref={canvasRef} className="splash-canvas" />
      <div className={`splash-content ${phase === 'logo' || phase === 'loading' || phase === 'fadeout' ? 'splash-content-visible' : ''}`}>
        <div className="splash-logo">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h1 className="splash-title">VRChat 导航站</h1>

        <div className={`splash-loading-info ${phase === 'loading' || phase === 'fadeout' ? 'splash-loading-info-visible' : ''}`}>
          <div className="splash-loading-text">
            {loadingItems[currentLoadingIndex]?.text || ''}
          </div>
          <div className="splash-loader">
            <div className="splash-loader-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="splash-progress-text">{Math.round(progress)}%</div>
        </div>
      </div>
    </div>
  );
}
