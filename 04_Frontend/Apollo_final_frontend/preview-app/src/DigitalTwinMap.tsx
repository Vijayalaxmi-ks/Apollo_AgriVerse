import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Map, Leaf, Layers, Beaker, ChevronRight, ArrowLeft, Play, Pause,
  Sun, Cloud, CloudRain, Moon, Activity, Sprout, Volume2, VolumeX
} from 'lucide-react';
import type { SimState, TwinLevel, WeatherMode, FieldInfo } from './simulation';
import {
  FIELDS, STAGE_RANGES, stepSimulation, weatherGrowthModifier
} from './simulation';

interface Props {
  sim: SimState;
  setSim: React.Dispatch<React.SetStateAction<SimState>>;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  level: TwinLevel;
  setLevel: (l: TwinLevel) => void;
  selectedField: string;
  setSelectedField: (id: string) => void;
  mode: 'auto' | 'manual';
  setMode: (m: 'auto' | 'manual') => void;
}

function getField(id: string): FieldInfo {
  return FIELDS.find((f) => f.id === id) || FIELDS[1];
}

/** Procedural farm-soil texture (clumpy, not smooth) */
function makeSoilTexture(base = '#b8956a', dark = '#7a5a3a', light = '#d4b896'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // speckles & clumps
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 2.8;
    ctx.fillStyle = Math.random() > 0.45 ? dark : light;
    ctx.globalAlpha = 0.25 + Math.random() * 0.45;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // faint furrows
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 10 + Math.random() * 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x < size; x += 16) {
      ctx.lineTo(x, y + (Math.random() - 0.5) * 4);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.needsUpdate = true;
  return tex;
}

const SOIL_TEX = makeSoilTexture('#c4a574', '#8b6914', '#e0c9a0');
const SOIL_TEX_DARK = makeSoilTexture('#a67c52', '#6b4423', '#c4a574');
const SOIL_TEX_PATH = makeSoilTexture('#b8956a', '#8d6e4a', '#d7c09a');

/* Shared materials — reuse across all vines to cut GPU cost */
const MAT = {
  // Photo-matched soil with rough farm texture
  soil: new THREE.MeshLambertMaterial({ map: SOIL_TEX, color: 0xffffff }),
  soilDark: new THREE.MeshLambertMaterial({ map: SOIL_TEX_DARK, color: 0xffffff }),
  soilPath: new THREE.MeshLambertMaterial({ map: SOIL_TEX_PATH, color: 0xffffff }),
  grassEdge: new THREE.MeshLambertMaterial({ color: 0x5a8f3e }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x6b4423 }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x3d9e4a, side: THREE.DoubleSide }),
  leafDark: new THREE.MeshLambertMaterial({ color: 0x2d7a38, side: THREE.DoubleSide }),
  // Bright yellow — BasicMaterial so color stays vivid in any light
  flower: new THREE.MeshBasicMaterial({ color: 0xffd54f }),
  flowerCore: new THREE.MeshBasicMaterial({ color: 0xfff8e1 }),
  grapeGreen: new THREE.MeshLambertMaterial({ color: 0x8bc34a }),
  grapeMid: new THREE.MeshLambertMaterial({ color: 0x9c27b0 }),
  grapePurple: new THREE.MeshLambertMaterial({ color: 0x6a1b9a }),
  post: new THREE.MeshLambertMaterial({ color: 0x5d4037 }),
  wire: new THREE.MeshLambertMaterial({ color: 0x757575 }),
  // Agricultural mulching paper / plastic film
  mulch: new THREE.MeshLambertMaterial({
    color: 0x2a2a2a,
    transparent: true,
    opacity: 0.92,
  }),
  mulchSilver: new THREE.MeshLambertMaterial({
    color: 0xb0bec5,
    transparent: true,
    opacity: 0.88,
  }),
  gel: new THREE.MeshLambertMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.6,
  }),
};

const GEO = {
  leaf: new THREE.PlaneGeometry(0.38, 0.48),
  berry: new THREE.SphereGeometry(0.07, 6, 6),
  flower: new THREE.SphereGeometry(0.09, 6, 6),
  gel: new THREE.SphereGeometry(1, 8, 8),
  post: new THREE.CylinderGeometry(0.04, 0.05, 1.6, 5),
};

/**
 * Lightweight vine by phenology — fewer meshes for smoother frame rate
 */
function buildVine(day: number, scale = 1, opts?: { harvested?: boolean }): THREE.Group {
  const g = new THREE.Group();
  const harvested = opts?.harvested ?? day >= 140;

  if (day < 15) {
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2), MAT.soilDark);
    mound.position.y = 0.02;
    g.add(mound);
    if (day >= 4) {
      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.022, 0.1 + day * 0.025, 4),
        new THREE.MeshLambertMaterial({ color: day < 10 ? 0xd4c4a0 : 0x66bb6a })
      );
      tip.position.y = 0.14 + day * 0.015;
      g.add(tip);
    }
    if (day >= 10) {
      const cot = new THREE.Mesh(GEO.leaf, MAT.leaf);
      cot.scale.setScalar(0.4);
      cot.position.y = 0.32;
      cot.rotation.x = -0.5;
      g.add(cot);
    }
    g.scale.setScalar(scale);
    return g;
  }

  const h = Math.min(2.4, 0.4 + ((day - 15) / 135) * 2.2);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, h, 5), MAT.trunk);
  trunk.position.y = h / 2;
  g.add(trunk);

  // Leaves — capped count for performance
  const nLeaves = day < 30 ? 6 : day < 60 ? 10 : 14;
  for (let i = 0; i < nLeaves; i++) {
    const leaf = new THREE.Mesh(GEO.leaf, i % 2 === 0 ? MAT.leaf : MAT.leafDark);
    const a = (i / nLeaves) * Math.PI * 2;
    const r = 0.3 + (i % 3) * 0.1;
    leaf.position.set(Math.cos(a) * r, h * 0.4 + (i % 4) * 0.12, Math.sin(a) * r);
    leaf.rotation.set(0.4, a, 0.2);
    g.add(leaf);
  }

  // Flowers — bright yellow clusters, clearly visible in field view
  if (day >= 45 && day < 70) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const y = h * 0.58 + (i % 3) * 0.1;
      const r = 0.48;
      // outer bright petal blob
      const fl = new THREE.Mesh(GEO.flower, MAT.flower);
      fl.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      fl.scale.setScalar(1.6);
      g.add(fl);
      // lighter core for contrast
      const core = new THREE.Mesh(GEO.flower, MAT.flowerCore);
      core.position.set(Math.cos(a) * r, y + 0.02, Math.sin(a) * r);
      core.scale.setScalar(0.85);
      g.add(core);
    }
  }

  // Fruit clusters — hang clearly below canopy (visible in field/plant views)
  if (day >= 65 && !harvested) {
    const mat = day >= 110 ? MAT.grapePurple : day >= 80 ? MAT.grapeMid : MAT.grapeGreen;
    const clusters = day >= 110 ? 4 : day >= 80 ? 3 : 3;
    const berriesPer = day >= 110 ? 8 : day >= 80 ? 7 : 6;
    for (let c = 0; c < clusters; c++) {
      const a = (c / clusters) * Math.PI * 2 + 0.2;
      const cx = Math.cos(a) * 0.38;
      const cz = Math.sin(a) * 0.38;
      const cy = h * 0.35;
      for (let b = 0; b < berriesPer; b++) {
        const berry = new THREE.Mesh(GEO.berry, mat);
        const t = b / berriesPer;
        berry.position.set(
          cx + Math.cos(b * 2.1) * 0.06 * (1 - t * 0.5),
          cy - t * 0.55,
          cz + Math.sin(b * 2.1) * 0.06 * (1 - t * 0.5)
        );
        berry.scale.setScalar(day >= 110 ? 1.25 : day >= 80 ? 1.1 : 0.95);
        g.add(berry);
      }
    }
  }

  g.scale.setScalar(scale);
  return g;
}

/** Simple hydrogel (Lambert — no expensive physical material) */
function makeHydrogel(size = 0.18, swollen = true): THREE.Mesh {
  const gel = new THREE.Mesh(GEO.gel, MAT.gel);
  gel.scale.setScalar(size);
  gel.userData.isHydrogel = true;
  gel.userData.swollen = swollen;
  return gel;
}

function makeRover(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
  body.position.y = 0.35;
  g.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  cab.position.set(0.15, 0.55, 0);
  g.add(cab);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
  [[-0.3, -0.25], [-0.3, 0.25], [0.3, -0.25], [0.3, 0.25]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 10), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.15, z);
    g.add(w);
  });
  // sensor mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0x64748b }));
  mast.position.set(-0.2, 0.7, 0);
  g.add(mast);
  return g;
}

function makeDrone(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.35), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  g.add(body);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
  [[0.25, 0.25], [0.25, -0.25], [-0.25, 0.25], [-0.25, -0.25]].forEach(([x, z]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), armMat);
    arm.position.set(x, 0.02, z);
    g.add(arm);
    const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.7 }));
    prop.position.set(x, 0.06, z);
    g.add(prop);
  });
  return g;
}

/** More realistic cow: rounded body, neck, head, ears, horns, tail, udder */
function makeCow(): THREE.Group {
  const g = new THREE.Group();
  const hide = new THREE.MeshLambertMaterial({ color: 0xf5f0e8 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2a2420 });
  const pink = new THREE.MeshLambertMaterial({ color: 0xe8a0a0 });
  const hornMat = new THREE.MeshLambertMaterial({ color: 0xd4c4a0 });

  // torso (elongated sphere-like)
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), hide);
  body.scale.set(1.55, 0.95, 0.85);
  body.position.set(0, 0.72, 0);
  g.add(body);

  // rear haunch
  const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), hide);
  haunch.scale.set(0.9, 1.05, 1.0);
  haunch.position.set(-0.45, 0.7, 0);
  g.add(haunch);

  // chest
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), hide);
  chest.scale.set(1.0, 1.0, 0.95);
  chest.position.set(0.42, 0.68, 0);
  g.add(chest);

  // neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.28, 8), hide);
  neck.position.set(0.62, 0.88, 0);
  neck.rotation.z = -0.55;
  g.add(neck);

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hide);
  head.scale.set(1.15, 0.9, 0.75);
  head.position.set(0.82, 1.02, 0);
  g.add(head);

  // snout
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), pink);
  snout.scale.set(1.2, 0.7, 0.85);
  snout.position.set(1.02, 0.95, 0);
  g.add(snout);

  // ears
  [[0.12, 1], [-0.12, -1]].forEach(([z, side]) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), hide);
    ear.scale.set(0.5, 1.1, 0.7);
    ear.position.set(0.72, 1.12, z);
    ear.rotation.z = side * 0.4;
    g.add(ear);
  });

  // small horns
  [[0.08, 1], [-0.08, -1]].forEach(([z]) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 5), hornMat);
    horn.position.set(0.78, 1.22, z);
    horn.rotation.z = z > 0 ? 0.25 : -0.25;
    g.add(horn);
  });

  // eyes
  [[0.08, 1], [-0.08, -1]].forEach(([z]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), dark);
    eye.position.set(0.92, 1.06, z);
    g.add(eye);
  });

  // legs — slightly bent proportions
  const legPositions: [number, number][] = [
    [0.32, 0.14], [0.32, -0.14], [-0.38, 0.14], [-0.38, -0.14],
  ];
  legPositions.forEach(([x, z]) => {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.28, 6), hide);
    upper.position.set(x, 0.42, z);
    g.add(upper);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.22, 6), dark);
    lower.position.set(x, 0.18, z);
    g.add(lower);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.06, 6), dark);
    hoof.position.set(x, 0.05, z);
    g.add(hoof);
  });

  // udder
  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), pink);
  udder.scale.set(1.1, 0.8, 0.9);
  udder.position.set(-0.15, 0.38, 0);
  g.add(udder);

  // tail
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.55, 5), hide);
  tail.position.set(-0.72, 0.85, 0);
  tail.rotation.z = 0.5;
  g.add(tail);
  const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), dark);
  tuft.position.set(-0.95, 0.62, 0);
  g.add(tuft);

  // black patches
  for (let i = 0; i < 5; i++) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 6), dark);
    spot.position.set(
      (Math.random() - 0.5) * 0.7,
      0.65 + Math.random() * 0.25,
      (Math.random() > 0.5 ? 1 : -1) * (0.28 + Math.random() * 0.08)
    );
    spot.scale.set(1.2, 0.7, 0.5);
    g.add(spot);
  }

  g.userData.isCow = true;
  return g;
}

/** Irrigation water motor / pump unit with spray particles */
function makeWaterMotor(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: 0x546e7a });
  const blue = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const tankBlue = new THREE.MeshLambertMaterial({ color: 0x0277bd });

  // base plate
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), dark);
  base.position.y = 0.04;
  g.add(base);

  // water tank
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.7, 10), tankBlue);
  tank.position.set(-0.15, 0.42, 0);
  g.add(tank);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 10), metal);
  lid.position.set(-0.15, 0.78, 0);
  g.add(lid);

  // motor housing
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.28, 0.32), metal);
  motor.position.set(0.35, 0.22, 0);
  g.add(motor);

  // outlet pipe
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), dark);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(0.55, 0.35, 0);
  g.add(pipe);

  // riser + sprinkler head
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.9, 6), blue);
  riser.position.set(0.75, 0.55, 0);
  g.add(riser);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), metal);
  head.position.set(0.75, 1.0, 0);
  g.add(head);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.12, 6), dark);
  nozzle.position.set(0.75, 1.08, 0);
  g.add(nozzle);

  // spray particle system (animated in loop)
  const sprayCount = 48;
  const sprayPos = new Float32Array(sprayCount * 3);
  const sprayVel: number[] = [];
  for (let i = 0; i < sprayCount; i++) {
    sprayPos[i * 3] = 0;
    sprayPos[i * 3 + 1] = 0;
    sprayPos[i * 3 + 2] = 0;
    sprayVel.push(Math.random());
  }
  const sprayGeo = new THREE.BufferGeometry();
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const spray = new THREE.Points(
    sprayGeo,
    new THREE.PointsMaterial({
      color: 0x81d4fa,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  spray.position.set(0.75, 1.1, 0);
  spray.visible = true;
  g.add(spray);

  g.userData.isWaterMotor = true;
  g.userData.spray = spray;
  g.userData.sprayVel = sprayVel;
  g.userData.sprayCount = sprayCount;
  g.userData.pumping = true;
  return g;
}

/** Procedural farm ambience: rover motor + cattle moo (Web Audio) */
function createFarmAudio() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  let roverOsc: OscillatorNode | null = null;
  let roverGain: GainNode | null = null;
  let cattleTimer: number | null = null;
  let started = false;

  const startRoverHum = () => {
    if (roverOsc) return;
    roverOsc = ctx.createOscillator();
    roverGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    roverOsc.type = 'sawtooth';
    roverOsc.frequency.value = 55;
    roverGain.gain.value = 0.09;
    roverOsc.connect(filter);
    filter.connect(roverGain);
    roverGain.connect(ctx.destination);
    roverOsc.start();
  };

  const stopRoverHum = () => {
    try {
      roverOsc?.stop();
    } catch {
      /* ignore */
    }
    roverOsc = null;
    roverGain = null;
  };

  const playMoo = () => {
    if (ctx.state === 'closed') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 280;
    filter.Q.value = 2;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.55);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.9);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.15);
  };

  return {
    resume: async () => {
      if (ctx.state === 'suspended') await ctx.resume();
      if (!started) {
        started = true;
        startRoverHum();
        cattleTimer = window.setInterval(() => {
          if (Math.random() > 0.2) playMoo();
        }, 4500 + Math.random() * 3500);
        // first moo shortly after enable
        window.setTimeout(() => playMoo(), 800);
        window.setTimeout(() => playMoo(), 2200);
      }
    },
    setMuted: (muted: boolean) => {
      if (roverGain) roverGain.gain.value = muted ? 0 : 0.09;
    },
    dispose: () => {
      stopRoverHum();
      if (cattleTimer) window.clearInterval(cattleTimer);
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    },
  };
}

export default function DigitalTwinMap({
  sim, setSim, isPlaying, setIsPlaying, level, setLevel,
  selectedField, setSelectedField, mode, setMode,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef(0);
  const groupsRef = useRef<{
    farm: THREE.Group;
    field: THREE.Group;
    plant: THREE.Group;
    soil: THREE.Group;
    ground: THREE.Mesh;
    sun: THREE.Mesh;
    moon: THREE.Mesh;
    clouds: THREE.Group;
    rain: THREE.Points | null;
    hydrogels: THREE.Mesh[];
    rovers: THREE.Group[];
    drones: THREE.Group[];
    cattle: THREE.Group[];
    vines: THREE.Group[];
    motors: THREE.Group[];
  } | null>(null);
  const clockRef = useRef(0);
  const audioRef = useRef<ReturnType<typeof createFarmAudio>>(null);
  const [soundOn, setSoundOn] = useState(false);

  // Farm audio: rover hum + cattle moos (starts on user gesture)
  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    audioRef.current?.setMuted(!soundOn);
  }, [soundOn]);

  const toggleSound = async () => {
    if (!audioRef.current) {
      audioRef.current = createFarmAudio();
    }
    if (!soundOn) {
      await audioRef.current?.resume();
      setSoundOn(true);
    } else {
      audioRef.current?.setMuted(true);
      setSoundOn(false);
    }
  };

  // Auto-grow on the map when playing (SimulationHub has its own loop on the Simulation tab)
  useEffect(() => {
    if (!isPlaying || mode !== 'auto') return;
    const t = window.setInterval(() => {
      setSim((prev) => {
        if (prev.day >= 150) {
          setIsPlaying(false);
          return prev;
        }
        return stepSimulation(prev);
      });
    }, 600);
    return () => window.clearInterval(t);
  }, [isPlaying, mode, setSim, setIsPlaying]);

  // Weather change handler — updates env, hydrogel swell/shrink, growth rate, and sun/moon path
  const setWeather = useCallback((w: WeatherMode) => {
    setSim((prev) => {
      const tod =
        w === 'night' ? 'night' as const
        : w === 'sun' ? 'noon' as const
        : w === 'cloudy' ? 'afternoon' as const
        : 'morning' as const;
      return stepSimulation(
        { ...prev, day: Math.max(0, prev.day - 1), weather: w, timeOfDay: tod },
        undefined,
        w
      );
    });
  }, [setSim]);

  const setTimeOfDay = useCallback((tod: 'morning' | 'noon' | 'afternoon' | 'night') => {
    setSim((prev) => ({
      ...prev,
      timeOfDay: tod,
      weather: tod === 'night' ? 'night' : prev.weather === 'night' ? 'sun' : prev.weather,
    }));
  }, [setSim]);

  // Three.js scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    // Clear blue sky like the vineyard photo
    scene.background = new THREE.Color(0x7ec8e3);
    scene.fog = new THREE.Fog(0x9fd4e8, 55, 140);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, 35, 45);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false; // major FPS win
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights — bright outdoor look like the photo
    const amb = new THREE.AmbientLight(0xfff8f0, 0.65);
    scene.add(amb);
    const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.15);
    sunLight.position.set(25, 45, 15);
    scene.add(sunLight);
    const fill = new THREE.DirectionalLight(0xb0c4de, 0.25);
    fill.position.set(-20, 20, -10);
    scene.add(fill);

    // Ground — photo-matched warm brown earth (not green)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      MAT.soil
    );
    ground.rotation.x = -Math.PI / 2;
    ground.name = 'mainGround';
    scene.add(ground);

    // Subtle grass patches at farm edges
    const grassRing = new THREE.Mesh(
      new THREE.RingGeometry(28, 42, 32),
      MAT.grassEdge
    );
    grassRing.rotation.x = -Math.PI / 2;
    grassRing.position.y = 0.01;
    scene.add(grassRing);

    // Groups
    const farmGroup = new THREE.Group();
    const fieldGroup = new THREE.Group();
    const plantGroup = new THREE.Group();
    const soilGroup = new THREE.Group();
    scene.add(farmGroup, fieldGroup, plantGroup, soilGroup);

    // --- FARM: realistic vineyard rows on brown soil ---
    const vineList: THREE.Group[] = [];
    const hydrogels: THREE.Mesh[] = [];
    const motors: THREE.Group[] = [];
    FIELDS.forEach((f) => {
      // Field base — tilled brown soil (photo color)
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(f.w, 0.08, f.d),
        MAT.soilDark
      );
      pad.position.set(f.x, 0.04, f.z);
      pad.userData.fieldId = f.id;
      pad.userData.isFieldPad = true;
      farmGroup.add(pad);

      // Slightly lighter soil path down the center of each field
      const centerPath = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.03, f.d - 0.5),
        MAT.soilPath
      );
      centerPath.position.set(f.x, 0.09, f.z);
      farmGroup.add(centerPath);

      // Small hydrogels — scale driven later by weather / saturation
      for (let i = 0; i < 6; i++) {
        const gel = makeHydrogel(0.06);
        gel.position.set(
          f.x + (Math.random() - 0.5) * (f.w - 2),
          0.08 + Math.random() * 0.05,
          f.z + (Math.random() - 0.5) * (f.d - 2)
        );
        gel.userData.baseScale = 0.06;
        farmGroup.add(gel);
        hydrogels.push(gel);
      }

      // Vineyard rows: posts + wires + vines along rows (like the photo)
      const rows = 4;
      const vinesPerRow = 5;
      for (let r = 0; r < rows; r++) {
        const vz = f.z - f.d / 2 + 1.4 + r * ((f.d - 2.8) / (rows - 1));

        // trellis posts at row ends
        [-1, 1].forEach((side) => {
          const post = new THREE.Mesh(GEO.post, MAT.post);
          post.position.set(f.x + side * (f.w / 2 - 1.2), 0.8, vz);
          farmGroup.add(post);
        });

        // Soil under the row + mulching paper on top (plants grow through / above it)
        const rowDirt = new THREE.Mesh(
          new THREE.BoxGeometry(f.w - 1.5, 0.025, 0.7),
          MAT.soilPath
        );
        rowDirt.position.set(f.x, 0.09, vz);
        farmGroup.add(rowDirt);

        // Mulch film strip along the row (low to ground so canopy stays visible)
        const mulchStrip = new THREE.Mesh(
          new THREE.BoxGeometry(f.w - 1.6, 0.02, 0.85),
          r % 2 === 0 ? MAT.mulch : MAT.mulchSilver
        );
        mulchStrip.position.set(f.x, 0.115, vz);
        mulchStrip.userData.isMulch = true;
        farmGroup.add(mulchStrip);

        // Slight wrinkle / edge of paper for realism
        const mulchEdge = new THREE.Mesh(
          new THREE.BoxGeometry(f.w - 1.6, 0.015, 0.06),
          MAT.mulch
        );
        mulchEdge.position.set(f.x, 0.125, vz + 0.4);
        farmGroup.add(mulchEdge);

        for (let c = 0; c < vinesPerRow; c++) {
          const vx = f.x - f.w / 2 + 1.8 + c * ((f.w - 3.6) / (vinesPerRow - 1));
          // Vine sits on mulch so growth (trunk, leaves, fruit) stays clearly visible
          const vine = buildVine(0, 0.42);
          vine.position.set(vx, 0.13, vz);
          vine.userData.isVine = true;
          vine.userData.baseScale = 0.42;
          farmGroup.add(vine);
          vineList.push(vine);
        }
      }

      // Water motor / pump at the edge of each field
      const motor = makeWaterMotor();
      motor.position.set(f.x + f.w / 2 - 1.2, 0, f.z + f.d / 2 - 1.0);
      motor.rotation.y = -Math.PI / 2;
      motor.scale.setScalar(1.15);
      motor.userData.fieldId = f.id;
      farmGroup.add(motor);
      motors.push(motor);
    });

    // Main farm roads — warm packed earth
    const path1 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, 52), MAT.soilPath);
    path1.position.set(0, 0.06, 0);
    farmGroup.add(path1);
    const path2 = new THREE.Mesh(new THREE.BoxGeometry(52, 0.04, 2.8), MAT.soilPath);
    path2.position.set(0, 0.06, 0);
    farmGroup.add(path2);

    // One rover per field — patrols inside that field only
    const rovers: THREE.Group[] = [];
    FIELDS.forEach((f, i) => {
      const rover = makeRover();
      const margin = 2.2;
      const halfW = f.w / 2 - margin;
      const halfD = f.d / 2 - margin;
      rover.position.set(f.x + (Math.random() - 0.5) * halfW, 0, f.z + (Math.random() - 0.5) * halfD);
      rover.rotation.y = Math.random() * Math.PI * 2;
      rover.userData.fieldId = f.id;
      rover.userData.fieldCenter = { x: f.x, z: f.z };
      rover.userData.fieldHalfW = halfW;
      rover.userData.fieldHalfD = halfD;
      rover.userData.patrolPhase = i * 1.7;
      rover.userData.patrolSpeed = 0.35 + (i % 3) * 0.08;
      farmGroup.add(rover);
      rovers.push(rover);
    });
    // Extra rover in largest fields (A & B) for coverage
    ;[FIELDS[0], FIELDS[1]].forEach((f, i) => {
      const rover = makeRover();
      const margin = 2.2;
      const halfW = f.w / 2 - margin;
      const halfD = f.d / 2 - margin;
      rover.position.set(f.x - halfW * 0.4, 0, f.z + halfD * 0.3);
      rover.userData.fieldId = f.id;
      rover.userData.fieldCenter = { x: f.x, z: f.z };
      rover.userData.fieldHalfW = halfW;
      rover.userData.fieldHalfD = halfD;
      rover.userData.patrolPhase = 3.5 + i;
      rover.userData.patrolSpeed = 0.4;
      farmGroup.add(rover);
      rovers.push(rover);
    });

    // Drones
    const drones: THREE.Group[] = [];
    [[0, 12, 0], [15, 10, -10], [-12, 11, 8]].forEach(([x, y, z]) => {
      const drone = makeDrone();
      drone.position.set(x, y, z);
      farmGroup.add(drone);
      drones.push(drone);
    });

    // Cattle — scattered around farm edges / pastures
    const cattle: THREE.Group[] = [];
    const cattleSpots: [number, number, number?][] = [
      [20, 18], [22, 15], [24, 17], [19, 13],
      [-22, 16], [-24, 14], [-20, 19], [-23, 12],
      [18, -20], [21, -18], [16, -22], [23, -21],
      [-18, -19], [-21, -17], [-16, -21],
      [26, 5], [27, -4], [-26, 6], [-27, -5],
      [12, 24], [-10, 25], [8, -26], [-8, -25],
    ];
    cattleSpots.forEach(([x, z], i) => {
      const cow = makeCow();
      cow.position.set(x, 0, z);
      cow.rotation.y = Math.random() * Math.PI * 2;
      cow.scale.setScalar(0.82 + (i % 5) * 0.04);
      farmGroup.add(cow);
      cattle.push(cow);
    });

    // Sun — large bright disc in sky (visible from farm camera)
    // Sun — large enough to read in farm + field cameras
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe066 })
    );
    sunMesh.position.set(12, 28, -18);
    sunMesh.renderOrder = 2;
    scene.add(sunMesh);
    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.4, depthWrite: false })
    );
    sunMesh.add(sunGlow);

    // Moon — clearly visible at night
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.6, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf0f4ff })
    );
    moonMesh.position.set(10, 26, -16);
    moonMesh.visible = false;
    moonMesh.renderOrder = 2;
    scene.add(moonMesh);
    const moonGlow = new THREE.Mesh(
      new THREE.SphereGeometry(4, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xa5b4fc, transparent: true, opacity: 0.3, depthWrite: false })
    );
    moonMesh.add(moonGlow);

    // Clouds (show for cloudy / rain)
    const cloudGroup = new THREE.Group();
    cloudGroup.visible = false;
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: 0.88,
      roughness: 1,
    });
    const cloudPositions = [
      [-14, 22, -6], [6, 24, 8], [16, 21, -10], [-4, 25, 12], [12, 23, 4], [-18, 22, 6],
    ];
    cloudPositions.forEach(([cx, cy, cz]) => {
      const cloud = new THREE.Group();
      [[0, 0, 0], [1.8, 0.2, 0.3], [-1.6, 0.15, -0.2], [0.5, 0.5, -0.8], [-0.4, 0.4, 0.9]].forEach(([ox, oy, oz]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.4 + Math.random() * 0.6, 10, 10), cloudMat);
        puff.position.set(ox, oy, oz);
        cloud.add(puff);
      });
      cloud.position.set(cx, cy, cz);
      cloud.scale.setScalar(1.4 + Math.random() * 0.5);
      cloudGroup.add(cloud);
    });
    scene.add(cloudGroup);

    // Rain particles
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 800;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 60;
      rainPos[i * 3 + 1] = Math.random() * 40;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xa5d8ff, size: 0.12, transparent: true, opacity: 0.6 }));
    rain.visible = false;
    scene.add(rain);

    // --- FIELD group: denser vines + mulching paper rows ---
    // Field soil base
    const fieldSoil = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.06, 18),
      MAT.soilDark
    );
    fieldSoil.position.y = 0.02;
    fieldGroup.add(fieldSoil);

    for (let r = 0; r < 8; r++) {
      const rowZ = -7 + r * 2;

      // Continuous mulching paper strip for this row
      const fieldMulch = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.025, 1.15),
        r % 2 === 0 ? MAT.mulch : MAT.mulchSilver
      );
      fieldMulch.position.set(0, 0.08, rowZ);
      fieldMulch.userData.isMulch = true;
      fieldGroup.add(fieldMulch);

      // Paper edge fold
      const fieldMulchEdge = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.02, 0.08),
        MAT.mulch
      );
      fieldMulchEdge.position.set(0, 0.095, rowZ + 0.52);
      fieldGroup.add(fieldMulchEdge);

      for (let c = 0; c < 10; c++) {
        // Plants grow above the mulch sheet
        const vine = buildVine(0, 0.7);
        vine.position.set(-9 + c * 2, 0.12, rowZ);
        vine.userData.isVine = true;
        vine.userData.baseScale = 0.7;
        fieldGroup.add(vine);
        vineList.push(vine);
      }
    }
    // drip irrigation pipes (above mulch, along rows)
    for (let r = 0; r < 8; r++) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 20, 6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 0.2, -7 + r * 2);
      fieldGroup.add(pipe);
    }
    // Field-view water motor (larger, front-right)
    const fieldMotor = makeWaterMotor();
    fieldMotor.position.set(8.5, 0, 6);
    fieldMotor.rotation.y = -Math.PI * 0.65;
    fieldMotor.scale.setScalar(1.6);
    fieldGroup.add(fieldMotor);
    motors.push(fieldMotor);
    fieldGroup.visible = false;

    // --- PLANT group: single detailed vine ---
    const mainVine = buildVine(0, 1.8);
    mainVine.userData.isVine = true;
    mainVine.userData.baseScale = 1.8;
    plantGroup.add(mainVine);
    vineList.push(mainVine);
    // mulch pad
    const plantMulch = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.08, 3),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
    );
    plantMulch.position.y = 0.04;
    plantGroup.add(plantMulch);
    plantGroup.visible = false;

    // --- SOIL group: cutaway like Apollo AgriVerse blueprint ---
    // Solid soil volume (opaque brown) with open front face effect via position
    const soilMatDark = new THREE.MeshLambertMaterial({ map: SOIL_TEX_DARK });
    const soilMatMid = new THREE.MeshLambertMaterial({ map: SOIL_TEX });
    // back wall
    const soilBack = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 0.25), soilMatDark);
    soilBack.position.set(0, -1.4, -2.9);
    soilGroup.add(soilBack);
    // left / right walls
    const soilLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.6, 5.8), soilMatDark);
    soilLeft.position.set(-3.0, -1.4, 0);
    soilGroup.add(soilLeft);
    const soilRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.6, 5.8), soilMatMid);
    soilRight.position.set(3.0, -1.4, 0);
    soilGroup.add(soilRight);
    // floor
    const soilFloor = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 5.8), soilMatDark);
    soilFloor.position.set(0, -3.15, 0);
    soilGroup.add(soilFloor);
    // inner soil fill — light so roots + bubble hydrogels stay visible
    const soilFill = new THREE.Mesh(
      new THREE.BoxGeometry(5.7, 3.2, 5.4),
      new THREE.MeshStandardMaterial({
        color: 0x8b6914,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      })
    );
    soilFill.position.set(0, -1.5, 0.1);
    soilGroup.add(soilFill);

    // Mulch surface on top — only BACK half so front is an open cutaway into the soil
    const mulchTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.12, 3.2),
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.55 })
    );
    mulchTop.position.set(0, 0.28, -1.3); // rear half only
    soilGroup.add(mulchTop);
    // front mulch strip (thin edge of the cut)
    const mulchFront = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.1, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xd4d4d4, roughness: 0.5 })
    );
    mulchFront.position.set(0, 0.26, 0.35);
    soilGroup.add(mulchFront);
    // cut edge (shows soil thickness under mulch)
    const cutEdge = new THREE.Mesh(
      new THREE.BoxGeometry(6.0, 0.35, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x6b4423 })
    );
    cutEdge.position.set(0, 0.05, 0.5);
    soilGroup.add(cutEdge);

    // Roots + hydrogel BUBBLES attached on the roots (blueprint style)
    const rootMat = new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.65 });
    const origin = new THREE.Vector3(0, 0.12, 0);

    const addRootWithBubbles = (from: THREE.Vector3, to: THREE.Vector3, radius = 0.032, bubbleCount = 4) => {
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      if (len < 0.05) return;
      const root = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.7, radius, len, 6),
        rootMat
      );
      root.position.copy(from.clone().add(to).multiplyScalar(0.5));
      root.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      root.userData.isRoot = true;
      soilGroup.add(root);

      // glass bubble hydrogels strung along THIS root (attached to surface)
      for (let k = 0; k < bubbleCount; k++) {
        const t = (k + 0.55) / (bubbleCount + 0.2);
        const pos = from.clone().lerp(to, t);
        const side = new THREE.Vector3(dir.z, 0, -dir.x);
        if (side.lengthSq() < 0.001) side.set(1, 0, 0);
        side.normalize();
        pos.addScaledVector(side, radius * 1.6 * (k % 2 === 0 ? 1 : -1));
        const gel = makeHydrogel(0.045 + Math.random() * 0.025, true);
        gel.position.copy(pos);
        gel.userData.baseScale = 0.05;
        soilGroup.add(gel);
        hydrogels.push(gel);
      }
    };

    // primary roots from plant base with bubbles on each segment
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.12;
      const mid = new THREE.Vector3(
        Math.cos(a) * (0.75 + (i % 3) * 0.18),
        -0.8 - (i % 3) * 0.12,
        Math.sin(a) * (0.7 + (i % 3) * 0.16)
      );
      const tip = new THREE.Vector3(
        Math.cos(a) * (1.65 + (i % 4) * 0.22),
        -1.85 - (i % 5) * 0.18,
        Math.sin(a) * (1.55 + (i % 4) * 0.2)
      );
      addRootWithBubbles(origin, mid, 0.038, 4);
      addRootWithBubbles(mid, tip, 0.026, 5);

      // side branch with more bubbles
      const branch = tip.clone().add(
        new THREE.Vector3(Math.cos(a + 0.7) * 0.5, -0.4, Math.sin(a + 0.7) * 0.48)
      );
      addRootWithBubbles(tip, branch, 0.016, 3);
    }

    // deeper fine roots + small bubbles
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.35;
      const deepFrom = new THREE.Vector3(Math.cos(a) * 0.55, -1.35, Math.sin(a) * 0.5);
      const deep = new THREE.Vector3(Math.cos(a) * 1.0, -2.55, Math.sin(a) * 0.95);
      addRootWithBubbles(deepFrom, deep, 0.015, 4);
    }

    // surface plant for soil view (stage-driven: germination → full plant)
    const soilVine = buildVine(0, 1.15);
    soilVine.position.y = 0.4;
    soilVine.userData.isVine = true;
    soilVine.userData.baseScale = 1.15;
    soilGroup.add(soilVine);
    vineList.push(soilVine);
    soilGroup.visible = false;

    groupsRef.current = {
      farm: farmGroup, field: fieldGroup, plant: plantGroup, soil: soilGroup,
      ground, sun: sunMesh, moon: moonMesh, clouds: cloudGroup, rain, hydrogels, rovers, drones, cattle, vines: vineList,
      motors,
    };

    // Click fields on farm via raycast
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const onClick = (e: MouseEvent) => {
      if (!mount || !cameraRef.current || !groupsRef.current) return;
      if (!groupsRef.current.farm.visible) return;
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const pads = groupsRef.current.farm.children.filter(
        (c) => (c as THREE.Mesh).userData?.isFieldPad
      );
      const hits = raycaster.intersectObjects(pads, false);
      if (hits.length > 0) {
        const id = hits[0].object.userData.fieldId as string;
        if (id) {
          setSelectedField(id);
          setLevel('field');
        }
      }
    };
    mount.addEventListener('click', onClick);

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      clockRef.current += 0.016;
      const t = clockRef.current;
      const g = groupsRef.current;
      if (!g) return;

      // drone hover
      g.drones.forEach((d, i) => {
        d.position.y = 10 + Math.sin(t * 1.2 + i) * 0.8;
        d.rotation.y += 0.02;
      });
      // slow cloud drift
      if (g.clouds.visible) {
        g.clouds.children.forEach((c, i) => {
          c.position.x += Math.sin(t * 0.08 + i) * 0.008;
        });
      }
      // Rovers patrol inside their assigned field bounds
      g.rovers.forEach((r, i) => {
        const cx = (r.userData.fieldCenter as { x: number; z: number } | undefined)?.x ?? 0;
        const cz = (r.userData.fieldCenter as { x: number; z: number } | undefined)?.z ?? 0;
        const halfW = (r.userData.fieldHalfW as number) ?? 6;
        const halfD = (r.userData.fieldHalfD as number) ?? 5;
        const phase = (r.userData.patrolPhase as number) || i;
        const speed = (r.userData.patrolSpeed as number) || 0.4;

        if (r.userData.harvestMode) {
          // Stay in field while "picking"
          const hp = (r.userData.harvestPhase as number) || 0;
          r.position.x = cx + Math.sin(t * 0.55 + hp) * halfW * 0.85;
          r.position.z = cz + Math.cos(t * 0.4 + hp) * halfD * 0.85;
          r.position.y = Math.abs(Math.sin(t * 2.2 + hp)) * 0.25;
          r.rotation.y = t * 0.5 + hp;
        } else {
          // Figure-8 / oval path within the field
          const px = Math.sin(t * speed + phase) * halfW * 0.9;
          const pz = Math.sin(t * speed * 0.7 + phase * 1.3) * halfD * 0.9;
          const nx = cx + px;
          const nz = cz + pz;
          const dx = nx - r.position.x;
          const dz = nz - r.position.z;
          r.position.x = nx;
          r.position.z = nz;
          r.position.y = 0;
          if (Math.abs(dx) + Math.abs(dz) > 0.001) {
            r.rotation.y = Math.atan2(dx, dz);
          }
        }
      });
      // cattle slow walk + gentle head bob
      g.cattle.forEach((c, i) => {
        c.position.x += Math.sin(t * 0.15 + i * 2) * 0.008;
        c.position.z += Math.cos(t * 0.12 + i) * 0.005;
        c.rotation.y += Math.sin(t * 0.1 + i) * 0.002;
      });

      // water motor spray animation
      g.motors?.forEach((motor) => {
        const spray = motor.userData.spray as THREE.Points | undefined;
        if (!spray || !motor.userData.pumping) return;
        const pos = spray.geometry.attributes.position as THREE.BufferAttribute;
        const count = (motor.userData.sprayCount as number) || pos.count;
        for (let i = 0; i < count; i++) {
          let x = pos.getX(i);
          let y = pos.getY(i);
          let z = pos.getZ(i);
          // arc outward from nozzle
          const life = ((t * 2.2 + i * 0.17) % 1.2);
          const ang = (i / count) * Math.PI * 1.6 - 0.8;
          const dist = life * 2.8;
          x = Math.cos(ang) * dist * 0.85;
          z = Math.sin(ang) * dist * 0.85;
          y = Math.sin(life * Math.PI) * 1.4 - life * 0.9;
          if (life > 1.05) {
            x = 0; y = 0; z = 0;
          }
          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
        // slow nozzle spin
        spray.rotation.y = t * 1.5;
      });
      // light hydrogel pulse (every other bead only — cheaper)
      for (let i = 0; i < g.hydrogels.length; i += 2) {
        const h = g.hydrogels[i];
        const base = (h.userData.baseScale as number) || 1;
        h.scale.setScalar(base * (0.94 + Math.sin(t * 1.6 + i) * 0.06));
      }
      // rain fall
      if (g.rain && g.rain.visible) {
        const pos = g.rain.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - 0.35;
          if (y < 0) y = 40;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mount || !cameraRef.current || !rendererRef.current) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w < 2 || h < 2) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h, false);
      rendererRef.current.domElement.style.width = '100%';
      rendererRef.current.domElement.style.height = '100%';
    };
    window.addEventListener('resize', onResize);
    // Expand canvas when sidebar / summary panels hide (layout change without window resize)
    const ro = new ResizeObserver(() => onResize());
    ro.observe(mount);
    // Initial layout after panels settle
    requestAnimationFrame(() => onResize());

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      mount.removeEventListener('click', onClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  // Sync view level + camera
  useEffect(() => {
    const g = groupsRef.current;
    const cam = cameraRef.current;
    if (!g || !cam) return;

    g.farm.visible = level === 'farm';
    g.field.visible = level === 'field';
    g.plant.visible = level === 'plant';
    g.soil.visible = level === 'soil';
    // hide main ground so underground cutaway is not covered
    g.ground.visible = level !== 'soil';

    if (level === 'farm') {
      cam.position.set(0, 28, 38);
      cam.lookAt(0, 2, 0);
      cam.fov = 50;
      cam.updateProjectionMatrix();
    } else if (level === 'field') {
      // Slightly elevated so canopy flowers/fruit + sky (sun/moon) stay in frame
      cam.position.set(0, 12, 18);
      cam.lookAt(0, 1.2, 0);
      cam.fov = 48;
      cam.updateProjectionMatrix();
    } else if (level === 'plant') {
      cam.position.set(3.2, 2.8, 5.2);
      cam.lookAt(0, 1.1, 0);
      cam.fov = 50;
      cam.updateProjectionMatrix();
    } else {
      // side-on cutaway: see mulch top + full underground roots & hydrogel bubbles
      cam.position.set(7.5, 2.2, 6.5);
      cam.lookAt(0, -1.2, 0);
      cam.fov = 50;
      cam.updateProjectionMatrix();
    }
  }, [level]);

  // Rebuild vines only when phenology stage changes (not every day — big FPS win)
  const stageKey = sim.stage;
  useEffect(() => {
    const g = groupsRef.current;
    if (!g) return;
    const day = sim.day;
    const harvested = day >= 140;
    const nextList: THREE.Group[] = [];
    g.vines.forEach((oldVine) => {
      const parent = oldVine.parent;
      if (!parent) return;
      const pos = oldVine.position.clone();
      const baseScale = (oldVine.userData.baseScale as number) || 0.42;
      // Dispose old children to free GPU memory
      oldVine.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          // shared geos/mats — don't dispose those
        }
      });
      parent.remove(oldVine);
      const next = buildVine(day, baseScale, { harvested });
      next.position.copy(pos);
      next.userData.isVine = true;
      next.userData.baseScale = baseScale;
      parent.add(next);
      nextList.push(next);
    });
    g.vines = nextList;

    if (harvested && g.rovers.length) {
      g.rovers.forEach((r, i) => {
        r.userData.harvestMode = true;
        r.userData.harvestPhase = i * 0.4;
      });
    } else {
      g.rovers.forEach((r) => {
        r.userData.harvestMode = false;
      });
    }
  }, [stageKey]);

  // Sync 3D weather with Weather Summary (sim.weather) — buttons still change it
  useEffect(() => {
    const g = groupsRef.current;
    const scene = sceneRef.current;
    if (!g || !scene) return;

    // Same source of truth as the right-panel Weather Summary
    const w = sim.weather || 'sun';
    const tod = sim.timeOfDay || 'noon';

    // background / fog + sky objects
    if (w === 'night' || tod === 'night') {
      scene.background = new THREE.Color(0x0a0e1a);
      scene.fog = new THREE.Fog(0x0a0e1a, 30, 90);
      g.sun.visible = false;
      g.moon.visible = true;
      g.clouds.visible = false;
    } else if (w === 'rain') {
      scene.background = new THREE.Color(0x5a6a7a);
      scene.fog = new THREE.Fog(0x5a6a7a, 25, 80);
      g.sun.visible = true;
      g.moon.visible = false;
      g.clouds.visible = true;
    } else if (w === 'cloudy') {
      scene.background = new THREE.Color(0x9eb4c8);
      scene.fog = new THREE.Fog(0x9eb4c8, 35, 100);
      g.sun.visible = true;
      g.moon.visible = false;
      g.clouds.visible = true;
    } else {
      // default clear sky — matches Weather Summary
      scene.background = new THREE.Color(0x87ceeb);
      scene.fog = new THREE.Fog(0x87ceeb, 40, 120);
      g.sun.visible = true;
      g.moon.visible = false;
      g.clouds.visible = false;
    }

    // Place sun/moon where farm + field cameras can both see them
    const isNight = w === 'night' || tod === 'night';
    if (isNight) {
      g.moon.position.set(8, 18, -14);
      g.moon.visible = true;
      g.sun.visible = false;
    } else {
      g.moon.visible = false;
      g.sun.visible = true;
      if (tod === 'morning') g.sun.position.set(-14, 14, -12);
      else if (tod === 'afternoon') g.sun.position.set(16, 14, -10);
      else g.sun.position.set(10, 20, -16); // noon / clear sun
      // Keep a minimum size so it's readable in field close-up
      g.sun.scale.setScalar(1.15);
    }

    // Match key light to sun position
    const sunLight = scene.children.find((c) => (c as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight | undefined;
    if (sunLight && g.sun.visible) {
      sunLight.position.copy(g.sun.position);
      sunLight.intensity = w === 'rain' ? 0.5 : w === 'cloudy' ? 0.75 : 1.25;
    } else if (sunLight) {
      sunLight.intensity = 0.2;
    }

    // rain particles
    if (g.rain) g.rain.visible = w === 'rain';

    // Hydrogels: small base size, swell with saturation + rain, shrink in sun/heat
    // Also grow slightly with plant development stage
    const sat = sim.env.hydrogelSat / 100;
    const stageBoost =
      sim.stage === 'germination' ? 0.85 :
      sim.stage === 'vegetative' ? 0.95 :
      sim.stage === 'flowering' || sim.stage === 'fruit_set' ? 1.05 :
      sim.stage === 'berry' || sim.stage === 'ripening' ? 1.1 :
      1.0;
    const weatherBoost = w === 'rain' ? 1.25 : w === 'sun' ? 0.75 : w === 'cloudy' ? 0.95 : 0.7;
    const gelScale = (0.05 + sat * 0.09) * stageBoost * weatherBoost;
    g.hydrogels.forEach((h) => {
      h.userData.baseScale = gelScale;
      h.scale.setScalar(gelScale);
      const mat = h.material as THREE.MeshLambertMaterial;
      if (mat) {
        mat.opacity = 0.4 + sat * 0.35;
        mat.color.setHex(w === 'rain' ? 0x4fc3f7 : w === 'sun' ? 0x90caf9 : 0x7dd3fc);
      }
    });
  }, [sim.weather, sim.timeOfDay, sim.env.hydrogelSat, sim.stage]);

  const field = getField(selectedField);
  const stageMeta = STAGE_RANGES.find((s) => s.id === sim.stage)!;

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-[#0b131e]">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[#1e2d40] bg-[#0f1722] flex-wrap z-10">
        <div className="flex items-center gap-2">
          {level !== 'farm' && (
            <button type="button" onClick={() => setLevel(level === 'soil' ? 'plant' : level === 'plant' ? 'field' : 'farm')}
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white border border-[#1e2d40] rounded-lg px-2 py-1">
              <ArrowLeft size={12} /> Back
            </button>
          )}
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <button type="button" onClick={() => setLevel('farm')} className="hover:text-emerald-400">Farm</button>
            {level !== 'farm' && <><ChevronRight size={12} /><button type="button" onClick={() => setLevel('field')} className="hover:text-emerald-400">{field.name}</button></>}
            {(level === 'plant' || level === 'soil') && <><ChevronRight size={12} /><button type="button" onClick={() => setLevel('plant')} className="hover:text-emerald-400">Plant</button></>}
            {level === 'soil' && <><ChevronRight size={12} /><span className="text-emerald-400">Soil</span></>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {([
            { id: 'farm' as TwinLevel, label: 'Farm', icon: Map },
            { id: 'field' as TwinLevel, label: 'Field', icon: Layers },
            { id: 'plant' as TwinLevel, label: 'Plant', icon: Leaf },
            { id: 'soil' as TwinLevel, label: 'Soil', icon: Beaker },
          ]).map((b) => (
            <button key={b.id} type="button" onClick={() => setLevel(b.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                level === b.id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'bg-[#16202d] text-slate-400 border border-transparent hover:border-[#1e2d40]'
              }`}>
              <b.icon size={13} />{b.label}
            </button>
          ))}
        </div>
        {/* Weather buttons — sky, rain, hydrogel size & growth */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 mr-1">WEATHER</span>
          {([
            { id: 'sun' as WeatherMode, icon: Sun, label: 'Sun' },
            { id: 'cloudy' as WeatherMode, icon: Cloud, label: 'Cloud' },
            { id: 'rain' as WeatherMode, icon: CloudRain, label: 'Rain' },
            { id: 'night' as WeatherMode, icon: Moon, label: 'Night' },
          ]).map((w) => (
            <button key={w.id} type="button" onClick={() => setWeather(w.id)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold border transition ${
                sim.weather === w.id ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-[#16202d] text-slate-400 border-transparent hover:border-[#1e2d40]'
              }`}>
              <w.icon size={12} />{w.label}
            </button>
          ))}
        </div>
        {/* Time of day — sun east / overhead / west, moon at night */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 mr-1">TIME</span>
          {([
            { id: 'morning' as const, label: 'AM' },
            { id: 'noon' as const, label: 'Noon' },
            { id: 'afternoon' as const, label: 'PM' },
            { id: 'night' as const, label: 'Night' },
          ]).map((t) => (
            <button key={t.id} type="button" onClick={() => setTimeOfDay(t.id)}
              className={`rounded-lg px-2 py-1 text-[10px] font-semibold border transition ${
                sim.timeOfDay === t.id ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-[#16202d] text-slate-400 border-transparent hover:border-[#1e2d40]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden w-full">
        {/* 3D canvas — fills available space when panels/summary are hidden */}
        <div className="flex-1 relative min-w-0 min-h-0 overflow-hidden w-full">
          <div ref={mountRef} className="absolute inset-0 w-full h-full" />
          {/* Field pick overlay on farm */}
          {level === 'farm' && (
            <div className="absolute inset-0 pointer-events-none">
              {FIELDS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="absolute pointer-events-auto border-2 border-emerald-400/60 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 transition text-left px-2 py-1"
                  style={{
                    left: `${50 + f.x * 1.35}%`,
                    top: `${48 + f.z * 1.25}%`,
                    transform: 'translate(-50%, -50%)',
                    minWidth: 90,
                  }}
                  onClick={() => { setSelectedField(f.id); setLevel('field'); }}
                >
                  <div className="text-[11px] font-bold text-white">{f.name}</div>
                  <div className="text-[9px] text-emerald-300">{f.acres} ac · {f.health}%</div>
                </button>
              ))}
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/50 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 pointer-events-none">
            3D Digital Twin · Rovers · Drones · Cattle · {sim.timeOfDay}
          </div>
        </div>

        {/* Context panel – field-aware */}
        <div className="w-64 shrink-0 border-l border-[#1e2d40] bg-[#0f1722] p-4 overflow-y-auto space-y-3">
          <h3 className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            {level === 'farm' && 'Farm Summary'}
            {level === 'field' && `${field.name} Summary`}
            {level === 'plant' && 'Plant Details'}
            {level === 'soil' && 'Soil & Hydrogels'}
          </h3>

          {level === 'farm' && (
            <div className="space-y-2 text-[11px]">
              <Row label="Total Area" value="9.50 Acres" />
              <Row label="Total Plants" value="4,320" />
              <Row label="Active Fields" value="4" />
              <Row label="Grape Variety" value="Thompson Seedless" />
              <Row label="Avg. Soil Moisture" value={`${sim.env.soilMoisture.toFixed(0)}%`} />
              <Row label="Crop Health" value={`${sim.healthIndex}%`} />
              <Row label="Next Irrigation" value={sim.irrigationNeed ? 'Required' : 'Not Required'} accent={!sim.irrigationNeed} />
              <Row label="Growth Rate" value={`${(sim.growthRate * 100).toFixed(0)}%`} />
            </div>
          )}

          {level === 'field' && (
            <div className="space-y-2 text-[11px]">
              <Row label="Field" value={field.name} />
              <Row label="Area" value={`${field.acres} Acres`} />
              <Row label="Plants" value={field.plants.toLocaleString()} />
              <Row label="Health" value={`${field.health}%`} />
              <Row label="Variety" value={field.variety} />
              <Row label="Soil Type" value={field.soilType} />
              <Row label="Soil Moisture" value={`${field.soilMoisture}%`} />
              <Row label="Row Spacing" value={field.rowSpacing} />
              <Row label="Plant Spacing" value={field.plantSpacing} />
              <Row label="Last Irrigation" value={field.lastIrrigation} />
              <Row label="Est. Yield" value={`${field.yieldEst} t/ac`} />
              <Row label="Stage" value={stageMeta.label} />
            </div>
          )}

          {level === 'plant' && (
            <div className="space-y-2 text-[11px]">
              <Row label="Variety" value="Thompson Seedless" />
              <Row label="Plant Age" value={`${sim.day} Days`} />
              <Row label="Stage" value={stageMeta.label} />
              <Row label="Height" value={`${sim.plantHeightCm} cm`} />
              <Row label="Canopy" value={`${sim.canopySpreadM} m`} />
              <Row label="Berry Size" value={`${sim.berrySizeMm} mm`} />
              <Row label="Health" value={`${sim.healthIndex}%`} />
              <Row label="Stress" value={sim.stressHeat + sim.stressWater > 0.4 ? 'Elevated' : 'Low'} accent={sim.stressHeat + sim.stressWater <= 0.4} />
              <div className="pt-1">
                <div className="text-[10px] text-slate-500 mb-1">Stage Progress</div>
                <div className="h-2 rounded-full bg-[#1e2d40] overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sim.stageProgress}%` }} />
                </div>
              </div>
            </div>
          )}

          {level === 'soil' && (
            <div className="space-y-2 text-[11px]">
              <Row label="Soil Moisture" value={`${sim.env.soilMoisture.toFixed(0)}%`} />
              <Row label="Hydrogel Sat." value={`${sim.env.hydrogelSat.toFixed(0)}%`} />
              <Row label="Temperature" value={`${sim.env.temperature}°C`} />
              <Row label="pH" value={sim.env.soilPh.toFixed(1)} />
              <Row label="Hydrogel Eff." value={`${sim.hydrogelEfficiency}%`} />
              <Row label="Mulch Cover" value={`${sim.mulchCoverage}%`} />
              <Row label="Weather" value={sim.weather} />
              <p className="text-[10px] text-slate-500 pt-2">Hydrogel size scales with saturation. Rain fills gels; sun shrinks them.</p>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-[#1e2d40]">
            {level === 'farm' && <NavBtn label="Open Field B" onClick={() => { setSelectedField('B'); setLevel('field'); }} />}
            {level === 'field' && (
              <>
                <NavBtn label="Plant View" onClick={() => setLevel('plant')} />
                <NavBtn label="Soil & Hydrogels" onClick={() => setLevel('soil')} />
              </>
            )}
            {level === 'plant' && <NavBtn label="Soil & Hydrogels" onClick={() => setLevel('soil')} />}
            {level === 'soil' && <NavBtn label="Back to Plant" onClick={() => setLevel('plant')} muted />}
          </div>

          {/* Field switcher */}
          {level === 'field' && (
            <div className="pt-2 border-t border-[#1e2d40]">
              <div className="text-[10px] text-slate-500 mb-2">Switch Field</div>
              <div className="grid grid-cols-2 gap-1">
                {FIELDS.map((f) => (
                  <button key={f.id} type="button" onClick={() => setSelectedField(f.id)}
                    className={`text-[10px] rounded-lg px-2 py-1.5 border ${selectedField === f.id ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-[#1e2d40] text-slate-400'}`}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom strip — always above canvas */}
      <div className="shrink-0 border-t border-[#1e2d40] bg-[#0f1722] px-4 py-2.5 flex items-center gap-4 flex-wrap z-10 relative">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMode('auto')}
            className={`text-[11px] px-2.5 py-1 rounded-md font-semibold ${mode === 'auto' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 border border-transparent'}`}>Auto Grow</button>
          <button type="button" onClick={() => setMode('manual')}
            className={`text-[11px] px-2.5 py-1 rounded-md font-semibold ${mode === 'manual' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 border border-transparent'}`}>Manual</button>
        </div>
        <button type="button" onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => void toggleSound()}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold border transition ${
            soundOn
              ? 'bg-sky-600/20 border-sky-500/40 text-sky-300'
              : 'bg-[#16202d] border-[#1e2d40] text-slate-400 hover:text-slate-200'
          }`}
          title="Rover motor + cattle sounds"
        >
          {soundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
          {soundOn ? 'Sound On' : 'Sound'}
        </button>
        <div className="flex-1 min-w-[120px]">
          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
            <span>Day {sim.day} / 150</span>
            <span className="text-emerald-400">{stageMeta.emoji} {stageMeta.label}</span>
          </div>
          <input type="range" min={0} max={150} value={sim.day}
            onChange={(e) => {
              const day = Number(e.target.value);
              setSim((prev) => stepSimulation({ ...prev, day: Math.max(0, day - 1) }));
            }}
            className="w-full h-1.5 accent-emerald-500" />
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>🌡 {sim.env.temperature}°C</span>
          <span>💧 {sim.env.soilMoisture.toFixed(0)}%</span>
          <span>🧪 Gel {sim.env.hydrogelSat.toFixed(0)}%</span>
          <span>♥ {sim.healthIndex}%</span>
          <span>📈 {(sim.growthRate * 100).toFixed(0)}% grow</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between border-b border-[#1e2d40]/60 pb-1.5">
      <span className="text-slate-400">{label}</span>
      <span className={accent ? 'text-emerald-400 font-medium' : 'text-white'}>{value}</span>
    </div>
  );
}

function NavBtn({ label, onClick, muted }: { label: string; onClick: () => void; muted?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left text-[11px] rounded-lg px-3 py-2 border transition ${
        muted ? 'border-[#1e2d40] text-slate-400 hover:text-white' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
      }`}>{label}</button>
  );
}
