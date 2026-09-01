import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * FraudNetworkCanvas3D: High-performance Three.js WebGL 3D constellation.
 * Visualizes a living 3D graph of financial accounts, devices, merchants, and pulsating fraud rings
 * with interactive cursor parallax and particle energy pulses.
 */
const FraudNetworkCanvas3D = ({ className = '', interactive = true, density = 45 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060814, 0.0018);

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
    camera.position.z = 220;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Node Categories & Palettes
    const nodeTypes = [
      { color: 0x00d4ff, name: 'account', size: 2.4 },  // Cyber Cyan
      { color: 0xa78bfa, name: 'device', size: 2.0 },   // Hologram Purple
      { color: 0xf59e0b, name: 'merchant', size: 2.2 }, // Amber Merchant
      { color: 0xf43f5e, name: 'fraud_ring', size: 3.2 },// Crimson Threat
      { color: 0x10b981, name: 'safe_acc', size: 1.8 }, // Emerald Safe
    ];

    // Generate 3D Nodes
    const nodeCount = density;
    const nodes = [];
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const sphereGeo = new THREE.SphereGeometry(1, 16, 16);

    for (let i = 0; i < nodeCount; i++) {
      const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      const isRisky = type.name === 'fraud_ring';

      const mat = new THREE.MeshBasicMaterial({
        color: type.color,
        transparent: true,
        opacity: isRisky ? 0.95 : 0.75,
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      const scale = type.size * (isRisky ? 1.4 : 1.0);
      mesh.scale.set(scale, scale, scale);

      // Distribute in a 3D cloud with dense cluster core
      const radius = 60 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      mesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
      mesh.position.y = radius * Math.sin(phi) * Math.sin(theta);
      mesh.position.z = radius * Math.cos(phi) * 0.7;

      mesh.userData = {
        baseY: mesh.position.y,
        speed: 0.005 + Math.random() * 0.015,
        type: type.name,
        isRisky,
      };

      nodeGroup.add(mesh);
      nodes.push(mesh);

      // Add Pulsing Glow Ring around Fraud Nodes
      if (isRisky) {
        const ringGeo = new THREE.RingGeometry(scale * 1.5, scale * 2.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xf43f5e,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        mesh.add(ring);
      }
    }

    // Connect Nodes with 3D Relationship Edges
    const lineCoords = [];
    const lineColors = [];
    const maxDistance = 45;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dist = nodes[i].position.distanceTo(nodes[j].position);
        if (dist < maxDistance) {
          lineCoords.push(
            nodes[i].position.x, nodes[i].position.y, nodes[i].position.z,
            nodes[j].position.x, nodes[j].position.y, nodes[j].position.z
          );

          const isFraudLink = nodes[i].userData.isRisky || nodes[j].userData.isRisky;
          const c = isFraudLink ? new THREE.Color(0xf43f5e) : new THREE.Color(0x00d4ff);
          lineColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
        }
      }
    }

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineCoords, 3));
    linesGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const linesMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });

    const lineMesh = new THREE.LineSegments(linesGeo, linesMat);
    nodeGroup.add(lineMesh);

    // Particle Starfield Background
    const starsCount = 350;
    const starCoords = [];
    for (let i = 0; i < starsCount; i++) {
      starCoords.push(
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 400
      );
    }
    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starCoords, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0x64748b,
      size: 1.2,
      transparent: true,
      opacity: 0.5,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // Mouse Parallax Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const onMouseMove = (e) => {
      mouseX = (e.clientX - width / 2) * 0.0008;
      mouseY = (e.clientY - height / 2) * 0.0008;
    };

    if (interactive) {
      window.addEventListener('mousemove', onMouseMove);
    }

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera interpolation toward mouse
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;

      nodeGroup.rotation.y = elapsedTime * 0.08 + targetX * 1.5;
      nodeGroup.rotation.x = Math.sin(elapsedTime * 0.05) * 0.1 + targetY * 1.5;
      stars.rotation.y = elapsedTime * 0.01;

      // Pulse nodes
      nodes.forEach((node) => {
        if (node.userData.isRisky) {
          const pulse = 1 + Math.sin(elapsedTime * 4) * 0.2;
          node.scale.set(pulse * 4, pulse * 4, pulse * 4);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (interactive) window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [density, interactive]);

  return <div ref={containerRef} className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`} />;
};

export default FraudNetworkCanvas3D;
