/**
 * Grape vine 3D scene — vanilla Three.js (no @react-three/fiber required).
 * Stage-driven: buds, canopy, flowers, fruit clusters match Digital Twin phase.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export type VinePhase =
  | 'dormant_bud'
  | 'bud_break'
  | 'vegetative'
  | 'flowering'
  | 'fruit_set'
  | 'berry'
  | 'veraison'
  | 'ripening'
  | 'harvest'
  | 'post_harvest'
  | 'dormancy';

const ORDER: VinePhase[] = [
  'dormant_bud',
  'bud_break',
  'vegetative',
  'flowering',
  'fruit_set',
  'berry',
  'veraison',
  'ripening',
  'harvest',
  'post_harvest',
  'dormancy',
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeLeafShapeGeo() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.15, 0.15, 0.35, 0.2, 0.4, 0.45);
  s.bezierCurveTo(0.55, 0.4, 0.7, 0.5, 0.62, 0.7);
  s.bezierCurveTo(0.8, 0.75, 0.85, 0.95, 0.6, 1.05);
  s.bezierCurveTo(0.5, 1.25, 0.2, 1.3, 0, 1.15);
  s.bezierCurveTo(-0.2, 1.3, -0.5, 1.25, -0.6, 1.05);
  s.bezierCurveTo(-0.85, 0.95, -0.8, 0.75, -0.62, 0.7);
  s.bezierCurveTo(-0.7, 0.5, -0.55, 0.4, -0.4, 0.45);
  s.bezierCurveTo(-0.35, 0.2, -0.15, 0.15, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 20);
  geo.translate(0, -0.1, 0);
  geo.computeVertexNormals();
  return geo;
}

function buildBunch(
  mode: 'flower' | 'set' | 'green' | 'mixed' | 'ripe',
  ripe: THREE.Color,
  mid: THREE.Color,
  seed: number,
): THREE.Group {
  const g = new THREE.Group();
  const rnd = mulberry32(seed);
  const greenBerry = new THREE.Color('#8fb84a');
  const flowerCol = new THREE.Color('#c7d98a');

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.2, 6),
    new THREE.MeshStandardMaterial({ color: '#5b7a2e', roughness: 0.8 }),
  );
  stem.position.y = 0.08;
  g.add(stem);

  const rows = mode === 'flower' ? 9 : 10;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);
    const ringR = (0.42 - t * 0.34) * (mode === 'flower' ? 0.5 : 1);
    const count = Math.max(1, Math.round(6 - t * 4));
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + row * 0.7 + rnd() * 0.5;
      const jitter = rnd() * 0.05;
      const r =
        (mode === 'flower' ? 0.045 : mode === 'set' ? 0.07 : 0.14 - t * 0.03) + rnd() * 0.015;
      const kind = rnd();
      let col = greenBerry;
      if (mode === 'flower') col = flowerCol;
      else if (mode === 'ripe') col = ripe;
      else if (mode === 'mixed') col = kind > 0.55 ? ripe : kind > 0.35 ? mid : greenBerry;

      const berry = new THREE.Mesh(
        new THREE.SphereGeometry(r, 12, 12),
        new THREE.MeshPhysicalMaterial({
          color: col,
          roughness: mode === 'ripe' || mode === 'mixed' ? 0.25 : 0.4,
          metalness: 0,
          clearcoat: mode === 'ripe' ? 0.6 : 0.25,
          clearcoatRoughness: 0.4,
        }),
      );
      berry.position.set(
        Math.cos(a) * (ringR + jitter),
        -row * 0.13 - rnd() * 0.03,
        Math.sin(a) * (ringR + jitter),
      );
      berry.castShadow = true;
      g.add(berry);
    }
  }
  return g;
}

function buildVine(phase: VinePhase, ripeHex: number, midHex: number): THREE.Group {
  const idx = Math.max(0, ORDER.indexOf(phase));
  const root = new THREE.Group();
  root.position.y = -1.2;

  const woodMat = new THREE.MeshStandardMaterial({ color: '#5a3d2b', roughness: 0.9 });
  const ripe = new THREE.Color(ripeHex);
  const mid = new THREE.Color(midHex);
  const autumn = phase === 'post_harvest' || phase === 'dormancy';
  const leafColor = new THREE.Color(autumn ? '#b8892f' : '#3f8f36');
  const leafGeo = makeLeafShapeGeo();
  const leafMat = new THREE.MeshStandardMaterial({
    color: leafColor,
    roughness: 0.55,
    side: THREE.DoubleSide,
  });

  const hasCanopy = idx >= 2 && phase !== 'dormancy';
  const sparse = phase === 'post_harvest';
  const showBuds = phase === 'dormant_bud' || phase === 'bud_break';

  const bunchMode: 'flower' | 'set' | 'green' | 'mixed' | 'ripe' | null =
    phase === 'flowering'
      ? 'flower'
      : phase === 'fruit_set'
        ? 'set'
        : phase === 'berry'
          ? 'green'
          : phase === 'veraison'
            ? 'mixed'
            : phase === 'ripening' || phase === 'harvest'
              ? 'ripe'
              : null;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.5, 12), woodMat);
  trunk.position.y = 0.75;
  trunk.castShadow = true;
  root.add(trunk);

  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 1), woodMat);
  head.position.y = 1.55;
  head.castShadow = true;
  root.add(head);

  if (hasCanopy || bunchMode || showBuds) {
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 1.2, 8), woodMat);
    armL.position.set(-0.55, 1.7, 0.1);
    armL.rotation.z = 0.5;
    armL.castShadow = true;
    root.add(armL);
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, 1.2, 8), woodMat);
    armR.position.set(0.55, 1.75, -0.05);
    armR.rotation.z = -0.55;
    armR.castShadow = true;
    root.add(armR);
  }

  if (showBuds) {
    const budMat = new THREE.MeshStandardMaterial({
      color: phase === 'bud_break' ? '#7dce6a' : '#6b5b3a',
      emissive: phase === 'bud_break' ? '#1a3a12' : '#000000',
      emissiveIntensity: phase === 'bud_break' ? 0.35 : 0,
      roughness: 0.6,
    });
    const spots = [
      [-0.35, 1.85, 0.15],
      [0.4, 1.9, -0.1],
      [0.05, 1.7, 0.2],
    ];
    spots.forEach((p, i) => {
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.08 + i * 0.01, 10, 10), budMat);
      bud.position.set(p[0], p[1], p[2]);
      root.add(bud);
      if (phase === 'bud_break') {
        const tip = new THREE.Mesh(
          new THREE.ConeGeometry(0.05, 0.18, 8),
          new THREE.MeshStandardMaterial({ color: '#6ecf5b' }),
        );
        tip.position.set(p[0], p[1] + 0.14, p[2]);
        root.add(tip);
      }
    });
  }

  if (hasCanopy) {
    const rnd = mulberry32(42 + idx);
    const n = sparse ? 6 : phase === 'vegetative' ? 9 : 14;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rnd() * 0.6;
      const rad = 0.7 + rnd() * 1.1;
      const y = 1.7 + rnd() * 1.7;
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.scale.setScalar(0.7 + rnd() * 0.5);
      leaf.position.set(Math.cos(a) * rad, y, Math.sin(a) * rad * 0.7);
      leaf.rotation.set(-0.4 + rnd() * 0.6, a + Math.PI / 2, -0.5 + rnd() * 1.0);
      leaf.castShadow = true;
      root.add(leaf);
    }
  }

  if (bunchMode) {
    const rnd = mulberry32(7 + idx);
    const spots: [number, number, number][] = [
      [-0.75, 1.75, 0.25],
      [0.7, 1.9, -0.15],
      [0.05, 1.5, 0.35],
    ];
    const count =
      phase === 'flowering' || phase === 'fruit_set' ? 3 : phase === 'harvest' ? 1 : 2;
    spots.slice(0, count).forEach((p, i) => {
      const bunch = buildBunch(bunchMode, ripe, mid, 100 + i * 17 + idx);
      bunch.position.set(p[0], p[1], p[2]);
      bunch.scale.setScalar(0.85 + rnd() * 0.4);
      root.add(bunch);
    });
  }

  return root;
}

export default function VineScene({
  phase,
  ripeHex,
  midHex,
}: {
  phase: VinePhase;
  ripeHex: number;
  midHex: number;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = Math.max(280, el.clientWidth || 480);
    const h = Math.max(240, el.clientHeight || 360);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c1812);
    scene.fog = new THREE.Fog(0x0c1812, 8, 20);

    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 40);
    camera.position.set(3.2, 1.6, 4.6);
    camera.lookAt(0, 0.5, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    el.innerHTML = '';
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xcfe6d8, 0.4));
    scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x2a3a1e, 0.9));
    const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
    sun.position.set(5, 8, 4);
    sun.castShadow = true;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8ec5ff, 0.55);
    fill.position.set(-4, 2, -3);
    scene.add(fill);

    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.9, 0.5, 48),
      new THREE.MeshStandardMaterial({ color: 0x4a3327, roughness: 1 }),
    );
    soil.position.y = -1.35;
    soil.receiveShadow = true;
    scene.add(soil);
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(2.55, 48),
      new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 }),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = -1.09;
    top.receiveShadow = true;
    scene.add(top);

    const vine = buildVine(phase, ripeHex, midHex);
    scene.add(vine);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      frame += 0.008;
      vine.rotation.y = Math.sin(frame * 0.35) * 0.12;
      camera.position.x = 3.2 * Math.cos(frame * 0.2);
      camera.position.z = 4.6 * Math.sin(frame * 0.2) + 1.5;
      camera.lookAt(0, 0.5, 0);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / Math.max(1, nh);
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      el.innerHTML = '';
    };
  }, [phase, ripeHex, midHex]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
}
