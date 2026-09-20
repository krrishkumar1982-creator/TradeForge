import React, { useEffect, useRef } from 'react';

export const CinematicSpaceBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    window.addEventListener('resize', handleResize);

    // Micro-particles setup
    interface Particle {
      x: number;
      y: number;
      size: number;
      alpha: number;
      baseAlpha: number;
      speedY: number;
      speedX: number;
      pulseSpeed: number;
    }

    const particles: Particle[] = [];
    const initParticles = () => {
      particles.length = 0;
      const count = Math.min(65, Math.floor(width / 25));
      for (let i = 0; i < count; i++) {
        const baseAlpha = Math.random() * 0.45 + 0.1;
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: Math.random() * 1.5 + 0.6,
          alpha: baseAlpha,
          baseAlpha,
          speedY: -(Math.random() * 0.25 + 0.08),
          speedX: (Math.random() - 0.5) * 0.15,
          pulseSpeed: Math.random() * 0.02 + 0.01,
        });
      }
    };
    initParticles();

    // Wireframe wave grid parameters
    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Deep Space Base Gradient (#02040A to #070B16)
      const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
      baseGrad.addColorStop(0, '#02040A');
      baseGrad.addColorStop(0.35, '#040712');
      baseGrad.addColorStop(0.7, '#060B18');
      baseGrad.addColorStop(1, '#02040A');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Soft Atmospheric Radial Nebulas (Blue Behind Hero, Purple Behind Card)
      // Left Blue Nebula Bloom (behind hero text)
      const heroGlowX = width * 0.28;
      const heroGlowY = height * 0.45;
      const heroRadius = Math.min(width, height) * 0.55;
      const heroGrad = ctx.createRadialGradient(heroGlowX, heroGlowY, 0, heroGlowX, heroGlowY, heroRadius);
      heroGrad.addColorStop(0, 'rgba(37, 99, 255, 0.16)');
      heroGrad.addColorStop(0.4, 'rgba(30, 64, 175, 0.08)');
      heroGrad.addColorStop(0.75, 'rgba(15, 23, 42, 0.03)');
      heroGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
      ctx.fillStyle = heroGrad;
      ctx.fillRect(0, 0, width, height);

      // Right Purple Nebula Bloom (behind login card)
      const cardGlowX = width * 0.76;
      const cardGlowY = height * 0.52;
      const cardRadius = Math.min(width, height) * 0.52;
      const cardGrad = ctx.createRadialGradient(cardGlowX, cardGlowY, 0, cardGlowX, cardGlowY, cardRadius);
      cardGrad.addColorStop(0, 'rgba(139, 92, 246, 0.14)');
      cardGrad.addColorStop(0.35, 'rgba(99, 102, 241, 0.08)');
      cardGrad.addColorStop(0.7, 'rgba(76, 29, 149, 0.02)');
      cardGrad.addColorStop(1, 'rgba(2, 4, 10, 0)');
      ctx.fillStyle = cardGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Render Micro-Particles
      particles.forEach((p) => {
        if (!prefersReducedMotion) {
          p.y += p.speedY;
          p.x += p.speedX;
          if (p.y < -10) p.y = height + 10;
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }

        const alpha = p.baseAlpha + Math.sin(time * 2 + p.x) * 0.15;
        ctx.fillStyle = `rgba(186, 215, 255, ${Math.max(0.05, Math.min(0.8, alpha))})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Undulating 3D Market Wireframe Terrain at Bottom
      // Draws smooth 3D market topology ribbon lines across bottom third
      const waveBaseY = height * 0.74;
      const ribbonCount = 8;
      const numPoints = 40;
      const stepX = width / (numPoints - 1);

      ctx.save();
      for (let r = 0; r < ribbonCount; r++) {
        const ribbonProgress = r / ribbonCount;
        const currentYOffset = waveBaseY + ribbonProgress * (height * 0.24);
        const waveAlpha = (1 - ribbonProgress * 0.55) * 0.28;

        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          const px = i * stepX;
          const distFromLeft = px / width;

          // Double sine wave modulated by horizontal position to simulate market peaks & troughs
          const wave1 = Math.sin(px * 0.004 + time * 0.4 + r * 0.6) * 38;
          const wave2 = Math.cos(px * 0.007 - time * 0.25 + r * 0.4) * 22;
          const taper = Math.sin(distFromLeft * Math.PI); // Tapers at edges
          const py = currentYOffset + (wave1 + wave2) * taper;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }

        // Color transition from vibrant cyan to electric blue/purple
        const isAccent = r === 2 || r === 5;
        ctx.strokeStyle = isAccent
          ? `rgba(56, 189, 248, ${waveAlpha * 1.5})`
          : `rgba(37, 99, 255, ${waveAlpha})`;
        ctx.lineWidth = isAccent ? 1.4 : 1.0;
        ctx.stroke();
      }

      // Vertical wireframe ribs connecting the waves for the 3D topographical mesh feel
      const ribCount = 26;
      for (let k = 0; k < ribCount; k++) {
        const px = (k / (ribCount - 1)) * width;
        const distFromLeft = px / width;
        const taper = Math.sin(distFromLeft * Math.PI);

        ctx.beginPath();
        for (let r = 0; r < ribbonCount; r++) {
          const ribbonProgress = r / ribbonCount;
          const currentYOffset = waveBaseY + ribbonProgress * (height * 0.24);
          const wave1 = Math.sin(px * 0.004 + time * 0.4 + r * 0.6) * 38;
          const wave2 = Math.cos(px * 0.007 - time * 0.25 + r * 0.4) * 22;
          const py = currentYOffset + (wave1 + wave2) * taper;

          if (r === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = 'rgba(70, 110, 255, 0.12)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();

      if (!prefersReducedMotion) {
        time += 0.012;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 selection:bg-transparent">
      {/* 1. Dynamic Canvas Layer: Deep space gradient, micro-particles & 3D wireframe market terrain */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 2. Scalable High-Fidelity SVG Layer: Orbital Arc + Candlestick Silhouettes */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1600 900"
      >
        <defs>
          {/* Orbital Neon Arc Outer Glow Filter */}
          <filter id="orbitalGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur2" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="35" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Candlestick Soft Glow Filter */}
          <filter id="candleGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Arc Rim Gradient: Cyan to Electric Blue to Violet */}
          <linearGradient id="arcNeonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.95" />
            <stop offset="30%" stopColor="#2563FF" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#7C3AED" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6D4AFF" stopOpacity="0.05" />
          </linearGradient>

          {/* Candle Up (Cyan/Emerald) Gradient */}
          <linearGradient id="candleUpGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.65" />
          </linearGradient>

          {/* Candle Down (Purple/Magenta) Gradient */}
          <linearGradient id="candleDownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C084FC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7E22CE" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* ----------------------------------------------------------------- */}
        {/* A. Atmospheric Grand Orbital Arc (Loops around Hero & into Center) */}
        {/* ----------------------------------------------------------------- */}
        <g opacity="0.9">
          {/* Outer diffused atmospheric halo */}
          <ellipse
            cx="640"
            cy="360"
            rx="520"
            ry="460"
            fill="none"
            stroke="url(#arcNeonGradient)"
            strokeWidth="18"
            strokeDasharray="950 1500"
            strokeDashoffset="-280"
            filter="url(#orbitalGlow)"
            opacity="0.35"
          />

          {/* Core crisp glowing neon edge line */}
          <ellipse
            cx="640"
            cy="360"
            rx="520"
            ry="460"
            fill="none"
            stroke="#60A5FA"
            strokeWidth="3.2"
            strokeDasharray="920 1550"
            strokeDashoffset="-280"
            filter="url(#orbitalGlow)"
            opacity="0.85"
          />

          {/* High-intensity focal spark highlight at upper crest */}
          <ellipse
            cx="640"
            cy="360"
            rx="520"
            ry="460"
            fill="none"
            stroke="#E0F2FE"
            strokeWidth="1.6"
            strokeDasharray="320 2100"
            strokeDashoffset="-420"
            opacity="0.95"
          />
        </g>

        {/* ----------------------------------------------------------------- */}
        {/* B. Subtle Candlestick Silhouettes in Center & Background */}
        {/* ----------------------------------------------------------------- */}
        <g opacity="0.32" filter="url(#candleGlow)">
          {/* Cluster 1: Left Background (behind hero right side) */}
          {/* Candle 1 (Down - Purple) */}
          <line x1="260" y1="380" x2="260" y2="470" stroke="#C084FC" strokeWidth="1.5" />
          <rect x="254" y="400" width="12" height="45" rx="1.5" fill="url(#candleDownGrad)" />

          {/* Candle 2 (Down - Purple) */}
          <line x1="285" y1="410" x2="285" y2="500" stroke="#C084FC" strokeWidth="1.5" />
          <rect x="279" y="430" width="12" height="50" rx="1.5" fill="url(#candleDownGrad)" />

          {/* Candle 3 (Up - Cyan) */}
          <line x1="310" y1="420" x2="310" y2="495" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="304" y="440" width="12" height="35" rx="1.5" fill="url(#candleUpGrad)" />

          {/* Cluster 2: Center Midground (between hero and login card) */}
          {/* Candle 4 (Down - Purple) */}
          <line x1="720" y1="320" x2="720" y2="430" stroke="#C084FC" strokeWidth="1.5" />
          <rect x="714" y="340" width="12" height="60" rx="1.5" fill="url(#candleDownGrad)" />

          {/* Candle 5 (Down - Purple) */}
          <line x1="745" y1="360" x2="745" y2="465" stroke="#C084FC" strokeWidth="1.5" />
          <rect x="739" y="380" width="12" height="55" rx="1.5" fill="url(#candleDownGrad)" />

          {/* Candle 6 (Up - Cyan) */}
          <line x1="770" y1="310" x2="770" y2="440" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="764" y="335" width="12" height="70" rx="1.5" fill="url(#candleUpGrad)" />

          {/* Candle 7 (Up - Cyan) */}
          <line x1="795" y1="270" x2="795" y2="390" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="789" y="295" width="12" height="65" rx="1.5" fill="url(#candleUpGrad)" />

          {/* Candle 8 (Up - Cyan tall rally) */}
          <line x1="820" y1="230" x2="820" y2="360" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="814" y="250" width="12" height="80" rx="1.5" fill="url(#candleUpGrad)" />

          {/* Candle 9 (Down - Purple pullback) */}
          <line x1="845" y1="280" x2="845" y2="370" stroke="#C084FC" strokeWidth="1.5" />
          <rect x="839" y="300" width="12" height="40" rx="1.5" fill="url(#candleDownGrad)" />

          {/* Cluster 3: Far Right Background (behind HUD stats & card rim) */}
          {/* Candle 10 (Up - Cyan) */}
          <line x1="1330" y1="280" x2="1330" y2="390" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="1324" y="305" width="12" height="60" rx="1.5" fill="url(#candleUpGrad)" />

          {/* Candle 11 (Up - Cyan) */}
          <line x1="1355" y1="240" x2="1355" y2="360" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="1349" y="260" width="12" height="75" rx="1.5" fill="url(#candleUpGrad)" />

          {/* Candle 12 (Down - Purple) */}
          <line x1="1380" y1="290" x2="1380" y2="400" stroke="#C084FC" strokeWidth="1.5" />
          <rect x="1374" y="315" width="12" height="50" rx="1.5" fill="url(#candleDownGrad)" />

          {/* Candle 13 (Up - Cyan) */}
          <line x1="1405" y1="260" x2="1405" y2="370" stroke="#38BDF8" strokeWidth="1.5" />
          <rect x="1399" y="280" width="12" height="60" rx="1.5" fill="url(#candleUpGrad)" />
        </g>
      </svg>

      {/* 3. Subtle Vignette & Dark Edge Shading for Perfect Contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02040A]/70 via-transparent to-[#02040A]/90 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(2,4,10,0.85)_100%)] pointer-events-none" />
    </div>
  );
};
