'use client';

import React from 'react';

interface SpaceOrbitAnimationProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SpaceOrbitAnimation({ size = 'lg', className = '' }: SpaceOrbitAnimationProps) {
  // Container dimensions
  const outerBoxSizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32',
    xl: 'w-44 h-44',
  };

  // Outer ring dimensions
  const outerRingSizes = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-28 h-28',
    xl: 'w-40 h-40',
  };

  // Middle ring dimensions
  const middleRingSizes = {
    sm: 'w-7 h-7',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  // Inner ring dimensions
  const innerRingSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  // Core flare dimensions
  const coreSizes = {
    sm: 'h-2 w-2 shadow-[0_0_8px_#38BDF8]',
    md: 'h-3.5 w-3.5 shadow-[0_0_14px_#38BDF8]',
    lg: 'h-5 w-5 shadow-[0_0_20px_#38BDF8]',
    xl: 'h-7 w-7 shadow-[0_0_28px_#38BDF8]',
  };

  // Satellite node dimensions
  const satNode = {
    sm: 'h-1.5 w-1.5 -top-1 left-3',
    md: 'h-2.5 w-2.5 -top-1.5 left-5',
    lg: 'h-3.5 w-3.5 -top-2 left-9',
    xl: 'h-4 w-4 -top-2 left-12',
  };

  return (
    <div className={`relative flex items-center justify-center ${outerBoxSizes[size]} ${className}`}>
      {/* Background Cosmic Nebula Glow */}
      <div className="absolute inset-0 rounded-full bg-[#38BDF8]/15 blur-xl animate-nebula pointer-events-none" />

      {/* 1. Outer Slow Rotating Orbit Ring */}
      <div className={`absolute rounded-full border border-[#38BDF8]/25 animate-space-spin-slow ${outerRingSizes[size]}`}>
        <span className={`absolute rounded-full bg-[#38BDF8] shadow-[0_0_12px_#38BDF8] ${satNode[size]}`} />
      </div>

      {/* 2. Middle Counter-Rotating Elliptical Orbit Ring */}
      <div className={`absolute rounded-full border border-dashed border-[#0284C7]/40 animate-space-spin-reverse ${middleRingSizes[size]}`}>
        <span className={`absolute rounded-full bg-[#0284C7] shadow-[0_0_10px_#0284C7] ${satNode[size]} -bottom-1.5 right-4`} />
      </div>

      {/* 3. Inner Fast Orbit Ring */}
      <div className={`absolute rounded-full border border-[#38BDF8]/35 animate-space-spin ${innerRingSizes[size]}`}>
        <span className="absolute -top-1 right-1 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#FFF]" />
      </div>

      {/* 4. Central Stellar Pulsing Core */}
      <div className={`relative rounded-full bg-[#38BDF8] animate-space-pulse ${coreSizes[size]}`}>
        <span className="absolute inset-0 rounded-full bg-white/60 animate-ping" />
      </div>

      {/* 5. Floating Star Constellation Particles */}
      <span className="absolute -top-4 -right-3 h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_6px_#FFF] animate-star-twinkle" style={{ animationDelay: '0.2s' }} />
      <span className="absolute -bottom-3 -left-4 h-1.5 w-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8] animate-star-twinkle" style={{ animationDelay: '0.9s' }} />
      <span className="absolute top-2 -left-6 h-1 w-1 rounded-full bg-white/80 animate-star-twinkle" style={{ animationDelay: '1.6s' }} />
      <span className="absolute -bottom-4 right-4 h-1 w-1 rounded-full bg-[#0284C7] animate-star-twinkle" style={{ animationDelay: '2.3s' }} />
      <span className="absolute top-1/2 -right-6 h-1 w-1 rounded-full bg-white/60 animate-star-twinkle" style={{ animationDelay: '2.8s' }} />
    </div>
  );
}
