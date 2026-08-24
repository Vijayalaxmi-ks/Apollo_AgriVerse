import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Map, Leaf, Layers, Beaker, ChevronRight, ArrowLeft, Play, Pause,
  Sun, Cloud, CloudRain, Moon, Activity, Sprout, Volume2, VolumeX
} from 'lucide-react';
import type { SimState, TwinLevel, WeatherMode, FieldInfo, SoilClassId, GrapeVarietyId } from './simulation';
import {
  FIELDS, STAGE_RANGES, stepSimulation, weatherGrowthModifier,
  SOIL_CLASSES, getSoilClass, GRAPE_VARIETIES, getGrapeVariety,
  recommendVarietiesForSoil, varietyFitLevel, plantMetrics, yieldPrediction,
} from './simulation';

/** Per-field soil map: Field A/B/C/D → soil class */
export type FieldSoilMap = Record<string, SoilClassId>;
export type FieldVarietyMap = Record<string, GrapeVarietyId>;

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
  fieldSoilMap: FieldSoilMap;
  setFieldSoil: (fieldId: string, soilId: SoilClassId) => void;
  fieldVarietyMap: FieldVarietyMap;
  setFieldVariety: (fieldId: string, varietyId: GrapeVarietyId) => void;
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

/** Distinct farm-road / path material — cool gray gravel, never matches soil classes */
const PATH_TEX = makeSoilTexture('#6b7280', '#4b5563', '#9ca3af');

/* Per soil-class materials so each field can show a different soil color */
function buildSoilMats(id: SoilClassId) {
  const sc = getSoilClass(id);
  const padTex = makeSoilTexture(sc.base, sc.dark, sc.light);
  const rowTex = makeSoilTexture(sc.light, sc.base, sc.dark);
  return {
    pad: new THREE.MeshLambertMaterial({ map: padTex, color: sc.tint }),
    row: new THREE.MeshLambertMaterial({ map: rowTex, color: sc.tint }),
    fillColor: sc.tint,
    darkHex: parseInt(sc.dark.replace('#', ''), 16),
  };
}

const SOIL_MATS: Record<SoilClassId, ReturnType<typeof buildSoilMats>> = {
  black: buildSoilMats('black'),
  alluvial: buildSoilMats('alluvial'),
  red: buildSoilMats('red'),
  lateritic: buildSoilMats('lateritic'),
  alkaline: buildSoilMats('alkaline'),
};

/* Shared materials — reuse across all vines to cut GPU cost */
const MAT = {
  // Fallback / ground (updated to active field soil when drilling in)
  soil: new THREE.MeshLambertMaterial({ map: SOIL_TEX, color: 0xffffff }),
  soilDark: new THREE.MeshLambertMaterial({ map: SOIL_TEX_DARK, color: 0xffffff }),
  /** Farm roads & inter-row paths — cool gray, distinct from every soil class */
  soilPath: new THREE.MeshLambertMaterial({ map: PATH_TEX, color: 0x9ca3af }),
  grassEdge: new THREE.MeshLambertMaterial({ color: 0x5a8f3e }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x6b4423 }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x3d9e4a, side: THREE.DoubleSide }),
  leafDark: new THREE.MeshLambertMaterial({ color: 0x2d7a38, side: THREE.DoubleSide }),
  // Bright yellow — BasicMaterial so color stays vivid in any light
  flower: new THREE.MeshBasicMaterial({ color: 0xffeb3b }),
  flowerCore: new THREE.MeshBasicMaterial({ color: 0xfffde7 }),
  grapeGreen: new THREE.MeshBasicMaterial({ color: 0xc8e86a }),
  grapeMid: new THREE.MeshBasicMaterial({ color: 0xb71c1c }),
  grapePurple: new THREE.MeshBasicMaterial({ color: 0x2e1a47 }),
  peduncle: new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
  post: new THREE.MeshLambertMaterial({ color: 0x6d4c41 }),
  wire: new THREE.MeshLambertMaterial({ color: 0x90a4ae }),
  // Agricultural mulching paper — dark grey plastic film (clear vs soil)
  mulch: new THREE.MeshLambertMaterial({
    color: 0x4b5563,
    transparent: false,
    opacity: 1,
  }),
  mulchSilver: new THREE.MeshLambertMaterial({
    color: 0x4b5563,
    transparent: false,
    opacity: 1,
  }),
  gel: new THREE.MeshLambertMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.6,
  }),
};

/** Per-variety berry materials: early (green) → mid → ripe */
const VARIETY_BERRY_MATS: Record<
  GrapeVarietyId,
  { early: THREE.MeshBasicMaterial; mid: THREE.MeshBasicMaterial; ripe: THREE.MeshBasicMaterial }
> = {
  thompson: {
    early: new THREE.MeshBasicMaterial({ color: 0xb8e05a }),
    mid: new THREE.MeshBasicMaterial({ color: 0xc8e050 }),
    ripe: new THREE.MeshBasicMaterial({ color: 0xd4ee6f }),
  },
  tas_a_ganesh: {
    early: new THREE.MeshBasicMaterial({ color: 0xc0e86a }),
    mid: new THREE.MeshBasicMaterial({ color: 0xd0e868 }),
    ripe: new THREE.MeshBasicMaterial({ color: 0xe0f07a }),
  },
  sharad: {
    early: new THREE.MeshBasicMaterial({ color: 0xc8e86a }),
    mid: new THREE.MeshBasicMaterial({ color: 0x9c27b0 }),
    ripe: new THREE.MeshBasicMaterial({ color: 0x4a148c }),
  },
  manjari_naveen: {
    early: new THREE.MeshBasicMaterial({ color: 0xb0d85a }),
    mid: new THREE.MeshBasicMaterial({ color: 0xb8d96a }),
    ripe: new THREE.MeshBasicMaterial({ color: 0xc6e377 }),
  },
  manjari_shyama: {
    early: new THREE.MeshBasicMaterial({ color: 0xc8e86a }),
    mid: new THREE.MeshBasicMaterial({ color: 0x6a1b9a }),
    ripe: new THREE.MeshBasicMaterial({ color: 0x1a0a2e }),
  },
};

function berryMatForVariety(varietyId: GrapeVarietyId | string, day: number): THREE.Material {
  const mats = VARIETY_BERRY_MATS[varietyId as GrapeVarietyId] || VARIETY_BERRY_MATS.thompson;
  if (day >= 115) return mats.ripe;
  if (day >= 90) return mats.mid;
  return mats.early;
}

const GEO = {
  leaf: new THREE.PlaneGeometry(0.48, 0.58),
  // Medium base sphere — scaled into a neat oval grape in makeGrapeCluster
  berry: new THREE.SphereGeometry(0.042, 8, 8),
  petal: new THREE.CircleGeometry(0.11, 8),
  flowerCore: new THREE.SphereGeometry(0.055, 8, 8),
  gel: new THREE.SphereGeometry(1, 8, 8),
  post: new THREE.CylinderGeometry(0.055, 0.07, 2.15, 6),
  stem: new THREE.CylinderGeometry(0.01, 0.014, 0.28, 5),
};

/** One neat star-shaped flower bloom (5 petals + bright center) */
function makeFlowerBloom(size = 1): THREE.Group {
  const bloom = new THREE.Group();
  const core = new THREE.Mesh(GEO.flowerCore, MAT.flowerCore);
  core.scale.setScalar(size);
  bloom.add(core);
  for (let p = 0; p < 5; p++) {
    const petal = new THREE.Mesh(GEO.petal, MAT.flower);
    const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
    petal.position.set(Math.cos(a) * 0.1 * size, Math.sin(a) * 0.1 * size, 0);
    petal.scale.setScalar(0.85 * size);
    petal.lookAt(petal.position.x * 2, petal.position.y * 2, 0.4);
    bloom.add(petal);
  }
  return bloom;
}

/**
 * Medium hanging bunch — clear oval grapes, readable on farm/field vines.
 */
function makeGrapeCluster(
  mat: THREE.Material,
  size = 1,
  rows = 5
): THREE.Group {
  const bunch = new THREE.Group();
  const stem = new THREE.Mesh(GEO.stem, MAT.peduncle);
  stem.position.y = 0.05 * size;
  stem.scale.set(size * 0.85, size * 0.95, size * 0.85);
  bunch.add(stem);

  for (let row = 0; row < rows; row++) {
    const t = row / Math.max(1, rows - 1);
    const ringR = (0.075 - t * 0.045) * size;
    const y = -row * 0.07 * size;
    const count = Math.max(1, Math.round(5 - t * 3));
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + row * 0.28;
      const berry = new THREE.Mesh(GEO.berry, mat);
      berry.position.set(Math.cos(a) * ringR, y, Math.sin(a) * ringR);
      // Medium oval grape — taller than wide, clearly visible
      const s = size * (0.75 - t * 0.06);
      berry.scale.set(s * 0.95, s * 1.55, s * 0.95);
      bunch.add(berry);
    }
  }
  const tip = new THREE.Mesh(GEO.berry, mat);
  tip.position.y = -rows * 0.07 * size;
  tip.scale.set(0.55 * size, 0.9 * size, 0.55 * size);
  bunch.add(tip);
  return bunch;
}

/**
 * Trellis-trained grapevine (photo style):
 * trunk climbs wooden post → ties into overhead wire → cordons + dense canopy → hanging clusters
 */
function buildVine(
  day: number,
  scale = 1,
  opts?: { harvested?: boolean; dense?: boolean; varietyId?: GrapeVarietyId | string }
): THREE.Group {
  const g = new THREE.Group();
  const harvested = opts?.harvested ?? day >= 140;
  const dense = opts?.dense ?? false;
  const varietyId = opts?.varietyId || 'thompson';

  // Young plant — short shoot from soil mound
  if (day < 15) {
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 6, 5, 0, Math.PI * 2, 0, Math.PI / 2),
      MAT.soilDark
    );
    mound.position.y = 0.02;
    g.add(mound);
    if (day >= 4) {
      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.02, 0.12 + day * 0.03, 4),
        new THREE.MeshLambertMaterial({ color: day < 10 ? 0xd4c4a0 : 0x66bb6a })
      );
      tip.position.y = 0.12 + day * 0.012;
      g.add(tip);
    }
    if (day >= 10) {
      const cot = new THREE.Mesh(GEO.leaf, MAT.leaf);
      cot.scale.setScalar(0.35);
      cot.position.y = 0.28;
      cot.rotation.x = -0.6;
      g.add(cot);
    }
    g.scale.setScalar(scale);
    return g;
  }

  // Trunk reaches trellis wire height
  const trunkH = Math.min(1.65, 0.6 + ((day - 15) / 110) * 1.05);
  const cordonLen = Math.min(1.35, 0.4 + ((day - 20) / 90) * 1.0);
  const canopyY = trunkH;

  // Woody trunk (slightly tapered) — climbs the support
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.065, trunkH, 6),
    MAT.trunk
  );
  trunk.position.y = trunkH / 2;
  g.add(trunk);

  // Small tie / branch to wire
  if (day >= 22) {
    const tie = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, 0.22, 4),
      MAT.trunk
    );
    tie.position.set(0.08, canopyY - 0.05, 0);
    tie.rotation.z = -0.7;
    g.add(tie);
  }

  // Horizontal cordons along the wire (row direction = X)
  if (day >= 25) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.028, cordonLen * 2, 5),
      MAT.trunk
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.y = canopyY;
    g.add(arm);
    // secondary arm for width
    const cross = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.018, 0.65, 5),
      MAT.trunk
    );
    cross.rotation.x = Math.PI / 2;
    cross.position.y = canopyY + 0.02;
    g.add(cross);
  }

  // Overhead canopy — leaves stay ABOVE the fruit zone so clusters stay visible
  const nLeaves = dense
    ? (day < 30 ? 10 : 18)
    : (day < 30 ? 8 : day < 55 ? 14 : 18);
  for (let i = 0; i < nLeaves; i++) {
    const leaf = new THREE.Mesh(GEO.leaf, i % 2 === 0 ? MAT.leaf : MAT.leafDark);
    const along = ((i % 12) / 11 - 0.5) * cordonLen * 2.0;
    // keep leaves mostly on top / outer — open a channel under canopy for fruit
    const side = (i % 2 === 0 ? 1 : -1) * (0.28 + (i % 3) * 0.08);
    const up = canopyY + 0.14 + (i % 4) * 0.07;
    leaf.position.set(along, up, side);
    leaf.rotation.set(-1.05 + (i % 3) * 0.1, along * 0.2, side * 0.25);
    leaf.scale.setScalar(0.9 + (i % 3) * 0.12);
    g.add(leaf);
  }
  if (day >= 35) {
    for (let i = 0; i < (dense ? 10 : 8); i++) {
      const leaf = new THREE.Mesh(GEO.leaf, MAT.leaf);
      const along = ((i / 9) - 0.5) * cordonLen * 1.7;
      leaf.position.set(along, canopyY + 0.32, (i % 2 === 0 ? 0.12 : -0.12));
      leaf.rotation.set(-1.2, 0.12, 0);
      leaf.scale.setScalar(1.0);
      g.add(leaf);
    }
  }

  // Medium size — readable on farm/field without becoming blobs
  const visBoost = dense ? 1.35 : 1.15;

  // Flowers — medium star blooms under canopy
  if (day >= 45 && day < 72) {
    const nFl = dense ? 3 : 2;
    for (let i = 0; i < nFl; i++) {
      const along = ((i / Math.max(1, nFl - 1)) - 0.5) * cordonLen * 0.9;
      const side = i % 2 === 0 ? 0.06 : -0.06;
      const baseY = canopyY - 0.14;
      const stem = new THREE.Mesh(GEO.stem, MAT.peduncle);
      stem.position.set(along, baseY + 0.07, side);
      stem.scale.setScalar(0.85);
      g.add(stem);
      const bloom = makeFlowerBloom(0.7 * visBoost);
      bloom.position.set(along, baseY, side);
      bloom.rotation.x = 0.45;
      g.add(bloom);
    }
  }

  // Fruit — medium oval grape bunches hanging under canopy
  if (day >= 65 && !harvested) {
    const mat = berryMatForVariety(varietyId, day);
    const clusters = dense ? 3 : 2;
    const rows = day >= 100 ? 5 : 4;
    for (let c = 0; c < clusters; c++) {
      const along = ((c / Math.max(1, clusters - 1)) - 0.5) * cordonLen * 0.9;
      const side = (c % 2 === 0 ? 1 : -1) * 0.1;
      const topY = canopyY - 0.1;
      const bunch = makeGrapeCluster(mat, visBoost, rows);
      bunch.position.set(along, topY, side);
      g.add(bunch);
    }
  }

  g.scale.setScalar(scale);
  return g;
}

/** Continuous overhead canopy strip between posts (photo tunnel effect).
 *  Leaves sit high so hanging fruit/flowers under the vines stay readable.
 *  Tagged so it stays hidden at germination and appears from vegetative growth. */
function addCanopyStrip(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  length: number,
  width = 0.9
) {
  const leafCount = Math.max(6, Math.floor(length * 2.2));
  for (let i = 0; i < leafCount; i++) {
    const leaf = new THREE.Mesh(GEO.leaf, i % 2 === 0 ? MAT.leaf : MAT.leafDark);
    const t = i / Math.max(1, leafCount - 1);
    leaf.position.set(
      x + (t - 0.5) * length,
      y + 0.08 + (i % 3) * 0.04,
      z + ((i % 2 === 0 ? 1 : -1) * width * 0.4)
    );
    leaf.rotation.set(-1.05, t * 0.4, (i % 2) * 0.25);
    leaf.scale.setScalar(1.0);
    leaf.userData.isCanopyStrip = true;
    leaf.visible = false; // shown only from vegetative growth (day >= 20)
    parent.add(leaf);
  }
}

/** Simple hydrogel (Lambert — no expensive physical material) */
function makeHydrogel(size = 0.18, swollen = true): THREE.Mesh {
  const gel = new THREE.Mesh(GEO.gel, MAT.gel);
  gel.scale.setScalar(size);
  gel.userData.isHydrogel = true;
  gel.userData.swollen = swollen;
  return gel;
}

/** Simple bee for entomophily (insect pollination) during flowering */
function makeBee(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xf9a825 })
  );
  body.scale.set(1.2, 0.85, 0.9);
  g.add(body);
  const stripe = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x3e2723 })
  );
  stripe.scale.set(0.7, 0.9, 0.95);
  stripe.position.x = 0.02;
  g.add(stripe);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x212121 })
  );
  head.position.x = -0.09;
  g.add(head);
  const wingMat = new THREE.MeshBasicMaterial({
    color: 0x90caf9,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
  });
  const wingL = new THREE.Mesh(new THREE.CircleGeometry(0.07, 8), wingMat);
  wingL.position.set(-0.02, 0.08, 0.06);
  wingL.rotation.x = -0.6;
  g.add(wingL);
  const wingR = new THREE.Mesh(new THREE.CircleGeometry(0.07, 8), wingMat);
  wingR.position.set(-0.02, 0.08, -0.06);
  wingR.rotation.x = 0.6;
  g.add(wingR);
  g.userData.isBee = true;
  g.userData.wingL = wingL;
  g.userData.wingR = wingR;
  g.userData.phase = Math.random() * Math.PI * 2;
  g.userData.radius = 0.6 + Math.random() * 1.2;
  g.userData.speed = 0.8 + Math.random() * 0.8;
  g.userData.baseY = 1.4 + Math.random() * 0.5;
  return g;
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
  fieldSoilMap, setFieldSoil,
  fieldVarietyMap, setFieldVariety,
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
    bees: THREE.Group[];
    /** Field pads + row dirt keyed by field id for live soil recolor */
    fieldPads: Record<string, THREE.Mesh[]>;
    fieldSoilMesh: THREE.Mesh | null;
  } | null>(null);
  const clockRef = useRef(0);
  const audioRef = useRef<ReturnType<typeof createFarmAudio>>(null);
  const [soundOn, setSoundOn] = useState(false);
  /** Local soil-cutaway materials that are not the shared MAT.* (need live color updates) */
  const soilExtraMatsRef = useRef<{
    dark: THREE.MeshLambertMaterial;
    mid: THREE.MeshLambertMaterial;
    fill: THREE.MeshStandardMaterial;
    cut: THREE.MeshStandardMaterial;
  } | null>(null);

  const activeSoilId = fieldSoilMap[selectedField] || fieldSoilMap['B'] || 'alluvial';
  const activeSoil = getSoilClass(activeSoilId);
  const activeVarietyId = fieldVarietyMap[selectedField] || 'thompson';
  const activeVariety = getGrapeVariety(activeVarietyId);
  const soilRecommendations = recommendVarietiesForSoil(activeSoilId);
  const activeVarietyScore = activeVariety.soilScore[activeSoilId as SoilClassId] ?? 50;
  const activeVarietyFit = varietyFitLevel(activeVarietyScore);

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
        return stepSimulation(prev, undefined, undefined, activeVarietyId);
      });
    }, 600);
    return () => window.clearInterval(t);
  }, [isPlaying, mode, setSim, setIsPlaying, activeVarietyId]);

  // Recompute plant metrics / yield when selected crop (variety) changes
  useEffect(() => {
    setSim((prev) => {
      const growth = prev.growthRate || 0.8;
      const metrics = plantMetrics(prev.day, growth, activeVarietyId);
      return {
        ...prev,
        plantHeightCm: metrics.height,
        canopySpreadM: metrics.canopy,
        berrySizeMm: metrics.berry,
        yieldTons: yieldPrediction(prev.day, prev.healthIndex, growth, activeVarietyId),
      };
    });
  }, [activeVarietyId, setSim]);

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
        w,
        activeVarietyId
      );
    });
  }, [setSim, activeVarietyId]);

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

    // --- FARM: realistic vineyard rows; each field pad uses its own soil material ---
    const vineList: THREE.Group[] = [];
    const hydrogels: THREE.Mesh[] = [];
    const motors: THREE.Group[] = [];
    const bees: THREE.Group[] = [];
    const fieldPads: Record<string, THREE.Mesh[]> = {};
    FIELDS.forEach((f) => {
      const soilId = (fieldSoilMap[f.id] || 'alluvial') as SoilClassId;
      const sm = SOIL_MATS[soilId] || SOIL_MATS.alluvial;
      fieldPads[f.id] = [];

      // Field base — color follows this field's soil class
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(f.w, 0.08, f.d),
        sm.pad
      );
      pad.position.set(f.x, 0.04, f.z);
      pad.userData.fieldId = f.id;
      pad.userData.isFieldPad = true;
      pad.userData.soilMesh = true;
      farmGroup.add(pad);
      fieldPads[f.id].push(pad);

      // Center service path — cool gray gravel (MAT.soilPath), never a soil color
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

      // Vineyard rows: wooden posts + wires + mulch + vines climbing supports + continuous canopy
      const rows = 4;
      const vinesPerRow = 5;
      for (let r = 0; r < rows; r++) {
        const vz = f.z - f.d / 2 + 1.4 + r * ((f.d - 2.8) / (rows - 1));

        // Wooden trellis posts along the row
        for (let p = 0; p < 4; p++) {
          const px = f.x - f.w / 2 + 1.4 + p * ((f.w - 2.8) / 3);
          const post = new THREE.Mesh(GEO.post, MAT.post);
          post.position.set(px, 1.05, vz);
          farmGroup.add(post);
        }
        // Double wire (upper + mid) like commercial trellis
        [1.7, 1.35].forEach((wy) => {
          const wire = new THREE.Mesh(
            new THREE.CylinderGeometry(0.014, 0.014, f.w - 2.0, 4),
            MAT.wire
          );
          wire.rotation.z = Math.PI / 2;
          wire.position.set(f.x, wy, vz);
          farmGroup.add(wire);
        });

        // Soil under the row
        const rowDirt = new THREE.Mesh(
          new THREE.BoxGeometry(f.w - 1.2, 0.03, 1.35),
          sm.row
        );
        rowDirt.position.set(f.x, 0.08, vz);
        rowDirt.userData.soilMesh = true;
        farmGroup.add(rowDirt);
        fieldPads[f.id].push(rowDirt);

        // Wide dark-grey mulch film
        const mulchStrip = new THREE.Mesh(
          new THREE.BoxGeometry(f.w - 1.4, 0.028, 1.2),
          MAT.mulch
        );
        mulchStrip.position.set(f.x, 0.11, vz);
        mulchStrip.userData.isMulch = true;
        farmGroup.add(mulchStrip);

        const mulchEdge = new THREE.Mesh(
          new THREE.BoxGeometry(f.w - 1.4, 0.02, 0.05),
          MAT.mulch
        );
        mulchEdge.position.set(f.x, 0.125, vz + 0.58);
        farmGroup.add(mulchEdge);

        // Continuous canopy strip between vines (photo tunnel)
        addCanopyStrip(farmGroup, f.x, 1.75, vz, f.w - 2.5, 0.85);

        for (let c = 0; c < vinesPerRow; c++) {
          const vx = f.x - f.w / 2 + 1.8 + c * ((f.w - 3.6) / (vinesPerRow - 1));
          const vid = fieldVarietyMap[f.id] || 'thompson';
          const vine = buildVine(100, 0.72, { dense: true, varietyId: vid });
          vine.position.set(vx, 0.12, vz);
          vine.userData.isVine = true;
          vine.userData.baseScale = 0.72;
          vine.userData.dense = true;
          vine.userData.fieldId = f.id;
          vine.userData.varietyId = vid;
          farmGroup.add(vine);
          vineList.push(vine);

          // Entomophily bees near flowers (visible only in flowering stage)
          if (c % 2 === 0) {
            const bee = makeBee();
            bee.position.set(vx, 1.5, vz);
            bee.userData.homeX = vx;
            bee.userData.homeZ = vz;
            bee.visible = false;
            farmGroup.add(bee);
            bees.push(bee);
          }
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
    // Field soil base — material swapped live to selected field's soil class
    const fieldSoil = new THREE.Mesh(
      new THREE.BoxGeometry(22, 0.06, 18),
      SOIL_MATS.alluvial.pad
    );
    fieldSoil.position.y = 0.02;
    fieldGroup.add(fieldSoil);

    for (let r = 0; r < 8; r++) {
      const rowZ = -7 + r * 2;

      // Wide continuous mulch bed — dark grey film clearly over soil
      const fieldMulch = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.03, 1.4),
        MAT.mulch
      );
      fieldMulch.position.set(0, 0.09, rowZ);
      fieldMulch.userData.isMulch = true;
      fieldGroup.add(fieldMulch);

      // Paper edge fold
      const fieldMulchEdge = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.022, 0.07),
        MAT.mulch
      );
      fieldMulchEdge.position.set(0, 0.11, rowZ + 0.68);
      fieldGroup.add(fieldMulchEdge);

      // Wooden posts + double wires
      for (let p = 0; p < 6; p++) {
        const post = new THREE.Mesh(GEO.post, MAT.post);
        post.position.set(-9 + p * 3.6, 1.1, rowZ);
        fieldGroup.add(post);
      }
      [1.75, 1.4].forEach((wy) => {
        const fWire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.016, 0.016, 19.5, 4),
          MAT.wire
        );
        fWire.rotation.z = Math.PI / 2;
        fWire.position.set(0, wy, rowZ);
        fieldGroup.add(fWire);
      });

      // Continuous canopy over the row
      addCanopyStrip(fieldGroup, 0, 1.85, rowZ, 18.5, 1.0);

      for (let c = 0; c < 10; c++) {
        const vine = buildVine(100, 0.95, { dense: true, varietyId: 'thompson' });
        vine.position.set(-9 + c * 2, 0.12, rowZ);
        vine.userData.isVine = true;
        vine.userData.baseScale = 0.95;
        vine.userData.dense = true;
        vine.userData.varietyId = 'thompson';
        fieldGroup.add(vine);
        vineList.push(vine);

        if (c % 3 === 0) {
          const bee = makeBee();
          bee.position.set(-9 + c * 2, 1.7, rowZ);
          bee.userData.homeX = -9 + c * 2;
          bee.userData.homeZ = rowZ;
          bee.visible = false;
          fieldGroup.add(bee);
          bees.push(bee);
        }
      }
    }
    // drip irrigation pipes (on mulch surface)
    for (let r = 0; r < 8; r++) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 20, 6),
        new THREE.MeshStandardMaterial({ color: 0x1e293b })
      );
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, 0.14, -7 + r * 2);
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

    // --- PLANT group: detailed canopy vine on clear mulch bed ---
    const mainVine = buildVine(100, 1.7, { dense: true, varietyId: 'thompson' });
    mainVine.userData.isVine = true;
    mainVine.userData.baseScale = 1.7;
    mainVine.userData.dense = true;
    mainVine.userData.varietyId = 'thompson';
    plantGroup.add(mainVine);
    vineList.push(mainVine);
    // Entomophily bees at plant scale
    for (let bi = 0; bi < 3; bi++) {
      const bee = makeBee();
      bee.scale.setScalar(1.4);
      bee.position.set((bi - 1) * 0.5, 1.6, 0.2);
      bee.userData.homeX = (bi - 1) * 0.5;
      bee.userData.homeZ = 0.2;
      bee.visible = false;
      plantGroup.add(bee);
      bees.push(bee);
    }
    // Wide mulch pad under plant (photo-style bed)
    const plantMulch = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.06, 2.2),
      MAT.mulch
    );
    plantMulch.position.set(0, 0.05, 0);
    plantGroup.add(plantMulch);
    // soil edges beside mulch
    const plantSoilL = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.05, 2.2),
      MAT.soilDark
    );
    plantSoilL.position.set(-2.3, 0.04, 0);
    plantGroup.add(plantSoilL);
    const plantSoilR = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.05, 2.2),
      MAT.soilDark
    );
    plantSoilR.position.set(2.3, 0.04, 0);
    plantGroup.add(plantSoilR);
    // trellis post + wire near plant
    const plantPost = new THREE.Mesh(GEO.post, MAT.post);
    plantPost.position.set(0.9, 1.05, 0);
    plantGroup.add(plantPost);
    const plantWire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 3.5, 4),
      MAT.wire
    );
    plantWire.rotation.z = Math.PI / 2;
    plantWire.position.set(0, 1.7, 0);
    plantGroup.add(plantWire);
    plantGroup.visible = false;

    // --- SOIL group: cutaway like Apollo AgriVerse blueprint ---
    // Solid soil volume with open front face; maps follow selected soil class
    const soilMatDark = new THREE.MeshLambertMaterial({ map: SOIL_TEX_DARK.clone() });
    const soilMatMid = new THREE.MeshLambertMaterial({ map: SOIL_TEX.clone() });
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
    const soilFillMat = new THREE.MeshStandardMaterial({
      color: 0x8b6914,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const soilFill = new THREE.Mesh(new THREE.BoxGeometry(5.7, 3.2, 5.4), soilFillMat);
    soilFill.position.set(0, -1.5, 0.1);
    soilGroup.add(soilFill);

    // Mulch surface on top — only BACK half so front is an open cutaway into the soil
    // Same uniform grey as farm / field / plant mulch
    const mulchTop = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.12, 3.2),
      MAT.mulch
    );
    mulchTop.position.set(0, 0.28, -1.3); // rear half only
    soilGroup.add(mulchTop);
    // front mulch strip (thin edge of the cut)
    const mulchFront = new THREE.Mesh(
      new THREE.BoxGeometry(6.2, 0.1, 0.35),
      MAT.mulch
    );
    mulchFront.position.set(0, 0.26, 0.35);
    soilGroup.add(mulchFront);
    // cut edge (shows soil thickness under mulch)
    const cutEdgeMat = new THREE.MeshStandardMaterial({ color: 0x6b4423 });
    const cutEdge = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.35, 0.08), cutEdgeMat);
    cutEdge.position.set(0, 0.05, 0.5);
    soilGroup.add(cutEdge);

    soilExtraMatsRef.current = {
      dark: soilMatDark,
      mid: soilMatMid,
      fill: soilFillMat,
      cut: cutEdgeMat,
    };

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
    const soilVine = buildVine(95, 1.15, { varietyId: 'thompson' });
    soilVine.position.y = 0.28;
    soilVine.userData.isVine = true;
    soilVine.userData.baseScale = 1.15;
    soilVine.userData.varietyId = 'thompson';
    soilGroup.add(soilVine);
    vineList.push(soilVine);
    soilGroup.visible = false;

    groupsRef.current = {
      farm: farmGroup, field: fieldGroup, plant: plantGroup, soil: soilGroup,
      ground, sun: sunMesh, moon: moonMesh, clouds: cloudGroup, rain, hydrogels, rovers, drones, cattle, vines: vineList,
      motors,
      bees,
      fieldPads,
      fieldSoilMesh: fieldSoil,
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
      // Entomophily: bees orbit flower zone during flowering
      if (g.bees) {
        g.bees.forEach((bee, i) => {
          if (!bee.visible) return;
          const phase = (bee.userData.phase as number) + t * (bee.userData.speed as number);
          const r = bee.userData.radius as number;
          const hx = (bee.userData.homeX as number) || 0;
          const hz = (bee.userData.homeZ as number) || 0;
          const by = (bee.userData.baseY as number) || 1.5;
          bee.position.x = hx + Math.cos(phase) * r;
          bee.position.z = hz + Math.sin(phase) * r;
          bee.position.y = by + Math.sin(phase * 2.2) * 0.15;
          bee.rotation.y = phase + Math.PI / 2;
          const wingL = bee.userData.wingL as THREE.Mesh | undefined;
          const wingR = bee.userData.wingR as THREE.Mesh | undefined;
          if (wingL) wingL.rotation.x = -0.5 + Math.sin(t * 28 + i) * 0.35;
          if (wingR) wingR.rotation.x = 0.5 - Math.sin(t * 28 + i) * 0.35;
        });
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

  // Apply per-field soil materials on farm pads + selected-field soil on field/cutaway views
  useEffect(() => {
    const g = groupsRef.current;
    if (!g) return;

    // Farm view: each field pad / row dirt uses that field's soil class
    Object.entries(g.fieldPads).forEach(([fid, meshes]) => {
      const sid = (fieldSoilMap[fid] || 'alluvial') as SoilClassId;
      const sm = SOIL_MATS[sid] || SOIL_MATS.alluvial;
      meshes.forEach((mesh, idx) => {
        mesh.material = idx === 0 ? sm.pad : sm.row;
      });
    });

    // Field-level base + ground + soil cutaway follow the currently selected field
    const sid = (fieldSoilMap[selectedField] || 'alluvial') as SoilClassId;
    const sm = SOIL_MATS[sid] || SOIL_MATS.alluvial;
    const sc = getSoilClass(sid);
    if (g.fieldSoilMesh) {
      g.fieldSoilMesh.material = sm.pad;
    }
    // Main ground plane uses a neutral mix (alluvial) so farm roads stay readable
    if (g.ground) {
      g.ground.material = MAT.soil;
    }

    const extra = soilExtraMatsRef.current;
    if (extra) {
      const mid = makeSoilTexture(sc.base, sc.dark, sc.light);
      const dark = makeSoilTexture(sc.dark, '#0f0a08', sc.base);
      if (extra.dark.map) extra.dark.map.dispose();
      if (extra.mid.map) extra.mid.map.dispose();
      extra.dark.map = dark;
      extra.mid.map = mid;
      extra.dark.color.setHex(sc.tint);
      extra.mid.color.setHex(sc.tint);
      extra.dark.needsUpdate = true;
      extra.mid.needsUpdate = true;
      extra.fill.color.setHex(sm.fillColor);
      extra.fill.needsUpdate = true;
      extra.cut.color.setHex(sm.darkHex);
      extra.cut.needsUpdate = true;
    }
  }, [fieldSoilMap, selectedField]);

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
      // High enough to see fields, low enough to read canopy + mulch
      cam.position.set(0, 22, 32);
      cam.lookAt(0, 1.5, 0);
      cam.fov = 48;
      cam.updateProjectionMatrix();
    } else if (level === 'field') {
      // Looking down the row tunnel: posts, mulch, hanging fruit
      cam.position.set(0, 3.2, 12);
      cam.lookAt(0, 1.2, -2);
      cam.fov = 52;
      cam.updateProjectionMatrix();
    } else if (level === 'plant') {
      // Side-low: trunk on post, canopy, hanging clusters, mulch
      cam.position.set(3.2, 1.45, 3.8);
      cam.lookAt(0, 0.95, 0);
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
    // Continuous green canopy only from vegetative growth onward (not germination)
    const showCanopy = day >= 20 && sim.stage !== 'germination';
    const nextList: THREE.Group[] = [];
    g.vines.forEach((oldVine) => {
      const parent = oldVine.parent;
      if (!parent) return;
      const pos = oldVine.position.clone();
      const baseScale = (oldVine.userData.baseScale as number) || 0.42;
      const dense = !!(oldVine.userData.dense);
      const fieldId = oldVine.userData.fieldId as string | undefined;
      // Farm vines follow their field's variety; field/plant follow selected field
      const varietyId = (fieldId
        ? fieldVarietyMap[fieldId]
        : fieldVarietyMap[selectedField]) || oldVine.userData.varietyId || 'thompson';
      parent.remove(oldVine);
      const next = buildVine(day, baseScale, { harvested, dense, varietyId });
      next.position.copy(pos);
      next.userData.isVine = true;
      next.userData.baseScale = baseScale;
      next.userData.dense = dense;
      next.userData.fieldId = fieldId;
      next.userData.varietyId = varietyId;
      parent.add(next);
      nextList.push(next);
    });
    g.vines = nextList;

    // Toggle row canopy strips (farm + field) with stage
    [g.farm, g.field, g.plant, g.soil].forEach((group) => {
      group.traverse((obj) => {
        if (obj.userData?.isCanopyStrip) {
          obj.visible = showCanopy;
        }
      });
    });

    // Entomophily bees visible only during flowering & pollination
    const showBees = sim.stage === 'flowering';
    if (g.bees) {
      g.bees.forEach((bee) => {
        bee.visible = showBees;
      });
    }

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
  }, [stageKey, sim.day, fieldVarietyMap, selectedField]);

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
              {FIELDS.map((f) => {
                const sid = fieldSoilMap[f.id] || 'alluvial';
                const sc = getSoilClass(sid);
                const vv = getGrapeVariety(fieldVarietyMap[f.id] || 'thompson');
                return (
                  <button
                    key={f.id}
                    type="button"
                    className="absolute pointer-events-auto border-2 rounded-lg bg-black/40 hover:bg-black/55 transition text-left px-2 py-1"
                    style={{
                      left: `${50 + f.x * 1.35}%`,
                      top: `${48 + f.z * 1.25}%`,
                      transform: 'translate(-50%, -50%)',
                      minWidth: 108,
                      borderColor: sc.base,
                    }}
                    onClick={() => { setSelectedField(f.id); setLevel('field'); }}
                  >
                    <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm border border-white/30" style={{ background: sc.base }} />
                      {f.name}
                    </div>
                    <div className="text-[9px] text-slate-200">{sc.shortLabel} · {f.acres} ac</div>
                    <div className="text-[8px] text-violet-200 truncate">{vv.label}</div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-black/55 rounded-lg px-3 py-1.5 text-[10px] text-slate-300 pointer-events-none">
            <div className="flex items-center gap-2 flex-wrap">
              {FIELDS.map((f) => {
                const sc = getSoilClass(fieldSoilMap[f.id] || 'alluvial');
                return (
                  <span key={f.id} className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm border border-white/25" style={{ background: sc.base }} />
                    {f.id}:{sc.shortLabel}
                  </span>
                );
              })}
              <span className="text-slate-500">· paths gray gravel · {sim.timeOfDay}</span>
            </div>
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
              <Row label="Avg. Soil Moisture" value={`${sim.env.soilMoisture.toFixed(0)}%`} />
              <Row label="Crop Health" value={`${sim.healthIndex}%`} />
              <Row label="Next Irrigation" value={sim.irrigationNeed ? 'Required' : 'Not Required'} accent={!sim.irrigationNeed} />
              <Row label="Growth Rate" value={`${(sim.growthRate * 100).toFixed(0)}%`} />

              <div className="pt-2 border-t border-[#1e2d40]">
                <div className="text-[10px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wide">
                  Soil & variety by field
                </div>
                <p className="text-[9px] text-slate-500 mb-2">
                  Set soil per field; AI ranks varieties for that soil. Paths stay cool gray gravel.
                </p>
                <div className="space-y-2.5">
                  {FIELDS.map((f) => {
                    const sid = fieldSoilMap[f.id] || 'alluvial';
                    const sc = getSoilClass(sid);
                    const vid = fieldVarietyMap[f.id] || 'thompson';
                    const vv = getGrapeVariety(vid);
                    const top = recommendVarietiesForSoil(sid)[0];
                    return (
                      <div key={f.id} className="rounded-lg border border-[#1e2d40] bg-[#0b131e] p-2">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm border border-white/20" style={{ background: sc.base }} />
                            {f.name}
                          </span>
                          <span className="text-[9px] text-slate-400">{sc.shortLabel}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {SOIL_CLASSES.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              title={s.label}
                              onClick={() => setFieldSoil(f.id, s.id)}
                              className={`w-5 h-5 rounded border transition ${
                                sid === s.id
                                  ? 'border-white ring-1 ring-emerald-400 scale-110'
                                  : 'border-black/40 opacity-75 hover:opacity-100'
                              }`}
                              style={{ background: s.base }}
                            />
                          ))}
                        </div>
                        <div className="text-[9px] text-slate-500 mb-1">Variety</div>
                        <select
                          value={vid}
                          onChange={(e) => setFieldVariety(f.id, e.target.value as GrapeVarietyId)}
                          className="w-full text-[10px] rounded-md bg-[#16202d] border border-[#1e2d40] text-slate-200 px-1.5 py-1 mb-1"
                        >
                          {GRAPE_VARIETIES.map((v) => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                          ))}
                        </select>
                        <div className="text-[9px] text-slate-400 leading-snug">
                          Selected: <span className="text-white font-semibold">{vv.label}</span>
                          {top && (
                            <> · Suggest: <span className="text-emerald-300 font-semibold">{top.variety.label}</span> ({top.fit})</>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {level === 'field' && (
            <div className="space-y-2 text-[11px]">
              <Row label="Field" value={field.name} />
              <Row label="Area" value={`${field.acres} Acres`} />
              <Row label="Plants" value={field.plants.toLocaleString()} />
              <Row label="Health" value={`${field.health}%`} />
              <Row label="Soil Type" value={activeSoil.shortLabel} />
              <Row label="Variety" value={activeVariety.label} />
              <Row
                label="Soil–variety fit"
                value={`${activeVarietyFit} (${activeVarietyScore})`}
                accent={activeVarietyFit === 'Best' || activeVarietyFit === 'Good'}
              />

              <div className="rounded-lg border border-[#1e2d40] bg-[#0b131e] p-2">
                <div className="text-[9px] text-slate-500 mb-1.5">Set soil for {field.name}</div>
                <div className="grid grid-cols-1 gap-1">
                  {SOIL_CLASSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFieldSoil(selectedField, s.id)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border text-left transition ${
                        activeSoilId === s.id
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                          : 'border-[#1e2d40] bg-[#16202d] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/30" style={{ background: s.base }} />
                      <span className="text-[10px] font-semibold leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-violet-500/30 bg-[#0b131e] p-2">
                <div className="text-[9px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wide">
                  Grape variety · {field.name}
                </div>
                <div className="grid grid-cols-1 gap-1 mb-2">
                  {GRAPE_VARIETIES.map((v) => {
                    const score = v.soilScore[activeSoilId as SoilClassId] ?? 50;
                    const fit = varietyFitLevel(score);
                    const on = activeVarietyId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setFieldVariety(selectedField, v.id)}
                        className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border text-left transition ${
                          on
                            ? 'border-violet-400/50 bg-violet-500/15 text-violet-100'
                            : 'border-[#1e2d40] bg-[#16202d] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className={`text-[9px] font-bold w-9 shrink-0 ${
                          fit === 'Best' ? 'text-emerald-400' : fit === 'Good' ? 'text-lime-400' : fit === 'Fair' ? 'text-amber-400' : 'text-rose-400'
                        }`}>{fit}</span>
                        <span className="text-[10px] font-semibold leading-tight flex-1">{v.label}</span>
                        <span className="text-[9px] text-slate-500">{score}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[9px] text-slate-500 mb-1 font-semibold uppercase">AI pick for {activeSoil.shortLabel}</div>
                <div className="space-y-1">
                  {soilRecommendations.slice(0, 3).map((r, i) => (
                    <button
                      key={r.variety.id}
                      type="button"
                      onClick={() => setFieldVariety(selectedField, r.variety.id)}
                      className="w-full flex items-center gap-2 rounded-md px-2 py-1 border border-[#1e2d40] bg-[#16202d] hover:border-emerald-500/40 text-left"
                    >
                      <span className="text-[9px] font-bold text-emerald-400 w-4">{i + 1}</span>
                      <span className="text-[10px] text-white font-semibold flex-1">{r.variety.label}</span>
                      <span className="text-[9px] text-slate-400">{r.fit} · {r.score}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 mt-1.5 leading-snug">{activeVariety.notes}</p>
              </div>

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
              <Row label="Variety" value={activeVariety.label} />
              <Row label="Market" value={activeVariety.market} />
              <Row label="Soil" value={activeSoil.shortLabel} />
              <Row
                label="Soil–variety fit"
                value={`${activeVarietyFit} (${activeVarietyScore})`}
                accent={activeVarietyFit === 'Best' || activeVarietyFit === 'Good'}
              />
              <div className="rounded-lg border border-[#1e2d40] bg-[#0b131e] p-2">
                <div className="text-[9px] text-slate-500 mb-1">Change variety</div>
                <select
                  value={activeVarietyId}
                  onChange={(e) => setFieldVariety(selectedField, e.target.value as GrapeVarietyId)}
                  className="w-full text-[10px] rounded-md bg-[#16202d] border border-[#1e2d40] text-slate-200 px-1.5 py-1"
                >
                  {GRAPE_VARIETIES.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-500 mt-1.5 leading-snug">{activeVariety.notes}</p>
              </div>
              <Row label="Plant Age" value={`${sim.day} Days`} />
              <Row label="Stage" value={stageMeta.label} />
              {sim.stage === 'flowering' && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[10px] text-amber-100 leading-snug">
                  <span className="font-bold text-amber-300">Entomophily</span>
                  {' '}— pollination by insects (bees). Pollen moves from anther to stigma; watch bees on the vine canopy.
                </div>
              )}
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
              <div className="pb-1">
                <div className="text-[10px] text-slate-500 mb-1.5 font-semibold uppercase tracking-wide">
                  Soil type · {field.name}
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {SOIL_CLASSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFieldSoil(selectedField, s.id)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 border text-left transition ${
                        activeSoilId === s.id
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                          : 'border-[#1e2d40] bg-[#16202d] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/30"
                        style={{ background: s.base }}
                      />
                      <span className="text-[10px] font-semibold leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {(() => {
                const sc = activeSoil;
                return (
                  <div className="rounded-lg border border-[#1e2d40] bg-[#0b131e] p-2 space-y-1.5 text-[10px]">
                    <div className="text-slate-300 leading-snug">{sc.description}</div>
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      <div><span className="text-slate-500">Water hold</span><div className="text-sky-300 font-semibold">{sc.waterHolding}</div></div>
                      <div><span className="text-slate-500">Drainage</span><div className="text-amber-300 font-semibold">{sc.drainage}</div></div>
                      <div><span className="text-slate-500">pH range</span><div className="text-lime-300 font-semibold">{sc.phRange}</div></div>
                      <div><span className="text-slate-500">Texture</span><div className="text-white font-medium leading-snug">{sc.textureNote}</div></div>
                    </div>
                  </div>
                );
              })()}
              <div className="rounded-lg border border-violet-500/30 bg-[#0b131e] p-2">
                <div className="text-[9px] text-slate-500 mb-1 font-semibold uppercase">
                  Variety for {field.name}
                </div>
                <Row label="Current" value={activeVariety.label} />
                <Row
                  label="Fit on this soil"
                  value={`${activeVarietyFit} (${activeVarietyScore})`}
                  accent={activeVarietyFit === 'Best' || activeVarietyFit === 'Good'}
                />
                <div className="text-[9px] text-slate-500 mt-1.5 mb-1">Recommended for {activeSoil.shortLabel}</div>
                {soilRecommendations.slice(0, 3).map((r, i) => (
                  <button
                    key={r.variety.id}
                    type="button"
                    onClick={() => setFieldVariety(selectedField, r.variety.id)}
                    className={`w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 mb-0.5 border text-left ${
                      activeVarietyId === r.variety.id
                        ? 'border-violet-400/40 bg-violet-500/10'
                        : 'border-[#1e2d40] bg-[#16202d] hover:border-emerald-500/30'
                    }`}
                  >
                    <span className="text-[9px] text-emerald-400 font-bold w-3">{i + 1}</span>
                    <span className="text-[10px] text-white font-semibold flex-1">{r.variety.label}</span>
                    <span className="text-[9px] text-slate-400">{r.fit}</span>
                  </button>
                ))}
              </div>
              <Row label="Soil Moisture" value={`${sim.env.soilMoisture.toFixed(0)}%`} />
              <Row label="Hydrogel Sat." value={`${sim.env.hydrogelSat.toFixed(0)}%`} />
              <Row label="Temperature" value={`${sim.env.temperature}°C`} />
              <Row label="pH" value={sim.env.soilPh.toFixed(1)} />
              <Row label="Hydrogel Eff." value={`${sim.hydrogelEfficiency}%`} />
              <Row label="Mulch Cover" value={`${sim.mulchCoverage}%`} />
              <Row label="Weather" value={sim.weather} />
              <p className="text-[10px] text-slate-500 pt-1">
                Soil color & variety recommendations follow the field you select. Mulch is uniform grey.
              </p>
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
              setSim((prev) => stepSimulation({ ...prev, day: Math.max(0, day - 1) }, undefined, undefined, activeVarietyId));
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
