import React from 'react';

/**
 * RiskOrb3D: Lightweight, High-Performance 3D Holographic Threat Gauge.
 * Uses hardware-accelerated CSS 3D perspectives, gyroscopic orbital rings,
 * glowing plasma core, and precision SVG radar telemetry without Three.js / WebGL.
 */
const RiskOrb3D = ({ score = 50, size = 160, label = 'Threat Level' }) => {
  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  // Color theme dynamically assigned by threat level
  let theme = {
    primary: '#10B981',        // Emerald / Safe
    secondary: '#00D4FF',      // Cyan
    glow: 'rgba(16, 185, 129, 0.45)',
    glowCyan: 'rgba(0, 212, 255, 0.35)',
    plasmaBg: 'radial-gradient(circle at 35% 35%, rgba(16, 185, 129, 0.45), rgba(0, 212, 255, 0.2) 50%, rgba(6, 10, 24, 0.85) 90%)',
    border: 'rgba(16, 185, 129, 0.5)',
    status: 'SYSTEM SAFE',
    speed: '12s',
  };

  if (clampedScore >= 80) {
    theme = {
      primary: '#F43F5E',      // Crimson / Critical Alert
      secondary: '#FB7185',
      glow: 'rgba(244, 63, 94, 0.65)',
      glowCyan: 'rgba(244, 63, 94, 0.45)',
      plasmaBg: 'radial-gradient(circle at 35% 35%, rgba(244, 63, 94, 0.6), rgba(225, 29, 72, 0.3) 50%, rgba(15, 6, 18, 0.9) 90%)',
      border: 'rgba(244, 63, 94, 0.7)',
      status: 'CRITICAL ALERT',
      speed: '4s',
    };
  } else if (clampedScore >= 60) {
    theme = {
      primary: '#F97316',      // Orange / High Risk
      secondary: '#FBBF24',
      glow: 'rgba(249, 115, 22, 0.55)',
      glowCyan: 'rgba(251, 191, 36, 0.35)',
      plasmaBg: 'radial-gradient(circle at 35% 35%, rgba(249, 115, 22, 0.55), rgba(245, 158, 11, 0.25) 50%, rgba(18, 10, 6, 0.9) 90%)',
      border: 'rgba(249, 115, 22, 0.6)',
      status: 'HIGH RISK',
      speed: '6s',
    };
  } else if (clampedScore >= 35) {
    theme = {
      primary: '#F59E0B',      // Amber / Moderate
      secondary: '#FCD34D',
      glow: 'rgba(245, 158, 11, 0.5)',
      glowCyan: 'rgba(0, 212, 255, 0.25)',
      plasmaBg: 'radial-gradient(circle at 35% 35%, rgba(245, 158, 11, 0.5), rgba(217, 119, 6, 0.2) 50%, rgba(12, 10, 20, 0.85) 90%)',
      border: 'rgba(245, 158, 11, 0.5)',
      status: 'MODERATE',
      speed: '8s',
    };
  }

  // SVG Gauge calculations
  const strokeWidth = 7;
  const radius = (size * 0.82) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size, perspective: '700px' }}
    >
      {/* ── 1. Deep Holographic Glow ────────────────────────────── */}
      <div
        className="absolute inset-2 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-80"
        style={{ backgroundColor: theme.glow }}
      />

      {/* ── 2. Gyroscopic 3D Orbital Ring 1 ─────────────────────── */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          border: `1.5px dashed ${theme.primary}`,
          opacity: 0.65,
          transformStyle: 'preserve-3d',
          animation: `spinX ${theme.speed} linear infinite`,
          boxShadow: `0 0 14px ${theme.glow}`,
        }}
      >
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
          style={{
            backgroundColor: theme.primary,
            boxShadow: `0 0 10px ${theme.primary}, 0 0 20px ${theme.primary}`,
          }}
        />
      </div>

      {/* ── 3. Gyroscopic 3D Orbital Ring 2 ─────────────────────── */}
      <div
        className="absolute inset-1 rounded-full pointer-events-none"
        style={{
          border: `1.5px dotted ${theme.secondary}`,
          opacity: 0.5,
          transformStyle: 'preserve-3d',
          animation: `spinY ${theme.speed} linear infinite reverse`,
          boxShadow: `0 0 12px ${theme.glowCyan}`,
        }}
      />

      {/* ── 4. Central Glowing Plasma Sphere & HUD ──────────────── */}
      <div
        className="absolute rounded-full flex items-center justify-center overflow-hidden border transition-all duration-500 shadow-2xl"
        style={{
          width: size * 0.72,
          height: size * 0.72,
          background: theme.plasmaBg,
          borderColor: theme.border,
          boxShadow: `inset 0 0 20px ${theme.glow}, 0 0 25px ${theme.glow}`,
        }}
      >
        {/* Holographic Mesh Grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, ${theme.primary} 1px, transparent 1px)`,
            backgroundSize: '10px 10px',
          }}
        />

        {/* Cyber Scanning Sweep */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: `linear-gradient(180deg, transparent 40%, ${theme.primary} 50%, transparent 60%)`,
            animation: 'scanSweep 2.5s ease-in-out infinite',
          }}
        />

        {/* Center Score & Status */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center">
          <span
            className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight leading-none"
            style={{
              color: '#FFFFFF',
              textShadow: `0 0 10px ${theme.primary}, 0 0 20px ${theme.primary}`,
            }}
          >
            {clampedScore}
          </span>
          <span
            className="text-[8px] sm:text-[9px] font-mono font-extrabold tracking-widest uppercase mt-1 px-1.5 py-0.5 rounded-full border"
            style={{
              color: theme.primary,
              backgroundColor: 'rgba(0,0,0,0.5)',
              borderColor: theme.border,
              boxShadow: `0 0 8px ${theme.glow}`,
            }}
          >
            {theme.status}
          </span>
        </div>
      </div>

      {/* ── 5. Outer SVG Telemetry Radar Gauge ───────────────────── */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 transform -rotate-90 pointer-events-none"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.primary}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{
            filter: `drop-shadow(0 0 8px ${theme.primary})`,
          }}
        />

        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          const rad = (angle * Math.PI) / 180;
          const tickRadius = radius + 11;
          const x1 = size / 2 + (tickRadius - 3) * Math.cos(rad);
          const y1 = size / 2 + (tickRadius - 3) * Math.sin(rad);
          const x2 = size / 2 + tickRadius * Math.cos(rad);
          const y2 = size / 2 + tickRadius * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i % 3 === 0 ? theme.primary : 'rgba(255,255,255,0.2)'}
              strokeWidth={i % 3 === 0 ? 1.5 : 1}
              opacity={i % 3 === 0 ? 0.9 : 0.4}
            />
          );
        })}
      </svg>

      <style>{`
        @keyframes spinX {
          0% { transform: rotateX(68deg) rotateZ(0deg); }
          100% { transform: rotateX(68deg) rotateZ(360deg); }
        }
        @keyframes spinY {
          0% { transform: rotateY(68deg) rotateZ(0deg); }
          100% { transform: rotateY(68deg) rotateZ(360deg); }
        }
        @keyframes scanSweep {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default RiskOrb3D;
