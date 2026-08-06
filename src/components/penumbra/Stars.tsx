import { memo, useEffect, useMemo, useState } from 'react';

const STAR_CHARS = ['✦', '✧', '·'];

interface StarSpec {
  id: number;
  x: number;
  y: number;
  char: string;
  size: number;
  delay: number;
  duration: number;
}

interface StarsProps {
  density?: number;
  className?: string;
}

function generateStars(density: number, width: number, height: number): StarSpec[] {
  const area = width * height;
  const count = Math.max(24, Math.min(180, Math.round((area / 10000) * density)));
  const stars: StarSpec[] = [];

  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      char: STAR_CHARS[Math.floor(Math.random() * STAR_CHARS.length)],
      size: 0.55 + Math.random() * 0.9,
      delay: Math.random() * 2.4,
      duration: 1.6 + Math.random() * 2.2,
    });
  }

  return stars;
}

/**
 * Twinkling starfield, faithfully mirroring the Antumbra TUI background.
 * Renders behind content (absolute fill, pointer-events disabled).
 */
export const Stars = memo<StarsProps>(({ density = 1.0, className = '' }) => {
  const [stars, setStars] = useState<StarSpec[]>([]);

  useEffect(() => {
    const regenerate = () => {
      setStars(
        generateStars(density, window.innerWidth, window.innerHeight)
      );
    };
    regenerate();

    window.addEventListener('resize', regenerate);
    return () => window.removeEventListener('resize', regenerate);
  }, [density]);

  const rendered = useMemo(
    () =>
      stars.map((star) => (
        <span
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            fontSize: `${Math.round(star.size * 11)}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        >
          {star.char}
        </span>
      )),
    [stars]
  );

  return <div className={`starfield ${className}`}>{rendered}</div>;
});

Stars.displayName = 'Stars';
