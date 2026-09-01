import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * RiskOrb3D: 3D Procedural Holographic Threat Gauge.
 * Dynamically transforms color, turbulence, and orbital rings based on 0-100 risk score.
 */
const RiskOrb3D = ({ score = 50, size = 120, label = 'Threat Level' }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 4.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Determine colors based on score
    let orbColor = 0x10b981; // Green
    let ringColor = 0x34d399;
    let speed = 1.0;

    if (score >= 80) {
      orbColor = 0xf43f5e; // Crimson
      ringColor = 0xfb7185;
      speed = 3.2;
    } else if (score >= 60) {
      orbColor = 0xf97316; // Orange
      ringColor = 0xfba74b;
      speed = 2.2;
    } else if (score >= 35) {
      orbColor = 0xf59e0b; // Amber
      ringColor = 0xfcd34d;
      speed = 1.5;
    }

    // Core Orb with wireframe + solid glow
    const sphereGeo = new THREE.IcosahedronGeometry(1.2, 3);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: orbColor,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    const orb = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(orb);

    // Inner glowing nucleus
    const innerGeo = new THREE.SphereGeometry(0.85, 16, 16);
    const innerMat = new THREE.MeshBasicMaterial({
      color: orbColor,
      transparent: true,
      opacity: 0.35,
    });
    const innerNucleus = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerNucleus);

    // Orbital Gyroscopic Rings
    const ringGeo = new THREE.TorusGeometry(1.6, 0.025, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      transparent: true,
      opacity: 0.7,
    });

    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    const ring2 = new THREE.Mesh(ringGeo, ringMat);
    ring2.rotation.x = Math.PI / 2;

    scene.add(ring1);
    scene.add(ring2);

    let animationId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime() * speed;

      orb.rotation.y = t * 0.5;
      orb.rotation.x = t * 0.3;

      ring1.rotation.x = t * 0.8;
      ring1.rotation.y = t * 0.4;

      ring2.rotation.y = t * 0.7;
      ring2.rotation.z = t * 0.5;

      const pulse = 1 + Math.sin(t * 2) * 0.08;
      innerNucleus.scale.set(pulse, pulse, pulse);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [score, size]);

  const riskTier =
    score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';

  const textColor =
    score >= 80
      ? 'text-rose'
      : score >= 60
      ? 'text-amber'
      : score >= 35
      ? 'text-yellow-400'
      : 'text-emerald';

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
      <div ref={mountRef} style={{ width: size, height: size }} className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-lg font-mono font-extrabold ${textColor}`}>{Math.round(score)}</span>
        </div>
      </div>
      <div className="text-center mt-1">
        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">{label}</span>
        <span className={`text-xs font-bold font-mono uppercase ${textColor}`}>{riskTier} RISK</span>
      </div>
    </div>
  );
};

export default RiskOrb3D;
