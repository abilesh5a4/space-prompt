'use client';

import React, { useEffect, useRef } from 'react';

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate ~60 subtle stars
    const starCount = 65;
    const stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.2 + 0.3, // 0.3px - 1.5px
      alpha: Math.random() * 0.45 + 0.15, // Low opacity 0.15 - 0.6
      speedY: (Math.random() * 0.12 + 0.03) * (prefersReducedMotion ? 0 : 1),
      speedX: (Math.random() * 0.04 - 0.02) * (prefersReducedMotion ? 0 : 1),
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Move star slowly downward
        if (!prefersReducedMotion) {
          star.y += star.speedY;
          star.x += star.speedX;

          if (star.y > height) star.y = 0;
          if (star.x > width) star.x = 0;
          if (star.x < 0) star.x = width;

          // Subtle twinkle
          star.alpha += star.twinkleSpeed * star.twinkleDir;
          if (star.alpha >= 0.65) {
            star.alpha = 0.65;
            star.twinkleDir = -1;
          } else if (star.alpha <= 0.1) {
            star.alpha = 0.1;
            star.twinkleDir = 1;
          }
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(242, 242, 242, ${star.alpha})`;
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-60"
      aria-hidden="true"
    />
  );
}
