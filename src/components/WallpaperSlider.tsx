import { useEffect, useState } from 'react';
import { WALLPAPERS, WALLPAPER_INTERVAL_MS } from '@/data/wallpapers';

export default function WallpaperSlider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (WALLPAPERS.length <= 1) return;
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % WALLPAPERS.length);
    }, WALLPAPER_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="wallpaper-slider" aria-hidden="true">
      {WALLPAPERS.map((w, i) => (
        <div
          key={w.id}
          className={`wallpaper-slide ${i === active ? 'wallpaper-slide-active' : ''}`}
          style={{ background: w.background }}
        />
      ))}
      <div className="wallpaper-overlay" />
    </div>
  );
}
