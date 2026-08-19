const fs = require('fs');

const content = `import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Sun, CloudRain, Cloud, CheckCircle2, AlertTriangle, Target, Activity, BrainCircuit, Eye, EyeOff, Layers, Droplet } from 'lucide-react';

export const FIELDS = [
  { id: 'A', name: 'Field A', center: new THREE.Vector3(-30, 0, -30), color: 0x22c55e, health: '88%', area: '2.30 Acres', moisture: 62 },
  { id: 'B', name: 'Field B', center: new THREE.Vector3(30, 0, -30), color: 0x22c55e, health: '85%', area: '2.45 Acres', moisture: 58 },
  { id: 'C', name: 'Field C', center: new THREE.Vector3(30, 0, 30), color: 0x22c55e, health: '82%', area: '2.15 Acres', moisture: 55 },
  { id: 'D', name: 'Field D', center: new THREE.Vector3(-30, 0, 30), color: 0x22c55e, health: '90%', area: '2.60 Acres', moisture: 68 },
];

export interface DigitalTwinMapProps {
  zoomLevel: 0 | 1 | 2 | 3;
  setZoomLevel: (z: 0 | 1 | 2 | 3) => void;
  activeField: string;
  setActiveField: (f: string) => void;
}

export default function DigitalTwinMap({ zoomLevel, setZoomLevel, activeField, setActiveField }: DigitalTwinMapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [weather, setWeather] = useState<'normal' | 'sun' | 'rain'>('normal');
  const [timeOfDay, setTimeOfDay] = useState<number>(10);
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  // References to THREE objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCamPos = useRef(new THREE.Vector3(80, 60, 80));
  const targetCamLook = useRef(new THREE.Vector3(0, 0, 0));
  const currentCamLook = useRef(new THREE.Vector3(0, 0, 0));
  
  const macroGroupRef = useRef<THREE.Group | null>(null);
  const mesoGroupRef = useRef<THREE.Group | null>(null);
  const microGroupRef = useRef<THREE.Group | null>(null);
  
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  
  // Animation refs
  const instancedCropsRef = useRef<THREE.InstancedMesh | null>(null);
  const cropAnimDataRef = useRef<any[]>([]);
  const mesoLeavesRef = useRef<any[]>([]);
  const flowDotsRef = useRef<any[]>([]);
  const stemCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const hydrogelsRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0a1128');
    scene.fog = new THREE.FogExp2('#0a1128', 0.012);

    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.copy(targetCamPos.current);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mountRef.current.appendChild(renderer.domElement);

    // LIGHTING
    const hemiLight = new THREE.HemisphereLight(0x4a6b8c, 0x2b1c10, 0.6);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;
    
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const macroGroup = new THREE.Group();
    const mesoGroup = new THREE.Group();
    const microGroup = new THREE.Group();
    
    scene.add(macroGroup);
    scene.add(mesoGroup);
    scene.add(microGroup);
    macroGroupRef.current = macroGroup;
    mesoGroupRef.current = mesoGroup;
    microGroupRef.current = microGroup;

    // ==========================================
    // 1. MACRO VIEW (PROCEDURAL FIELDS)
    // ==========================================
    const soilMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x241710, roughness: 0.7, metalness: 0.02, clearcoat: 0.15, clearcoatRoughness: 0.6
    });
    const mulchFilmMat = new THREE.MeshPhysicalMaterial({
        color: 0x111111, roughness: 0.2, metalness: 0.1, clearcoat: 0.9, clearcoatRoughness: 0.1, side: THREE.DoubleSide
    });
    
    // Create base instance geometry for crops
    const cropGeo = new THREE.IcosahedronGeometry(0.5, 2);
    const cropPos = cropGeo.attributes.position;
    for(let i=0; i<cropPos.count; i++) {
        cropPos.setY(i, cropPos.getY(i) * 1.5); 
        cropPos.setX(i, cropPos.getX(i) + (Math.random() - 0.5)*0.1); 
        cropPos.setZ(i, cropPos.getZ(i) + (Math.random() - 0.5)*0.1);
    }
    cropGeo.computeVertexNormals();
    const cropMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x16a34a, emissive: 0x064e3b, emissiveIntensity: 0.15, roughness: 0.4, clearcoat: 0.1
    });

    // Create 4 fields
    const furrowFreq = 1.5;
    const rowCount = 20;
    const plantsPerRow = 40;
    const totalCrops = 4 * rowCount * plantsPerRow;
    const instancedCrops = new THREE.InstancedMesh(cropGeo, cropMat, totalCrops);
    instancedCrops.castShadow = true;
    instancedCrops.receiveShadow = true;
    instancedCropsRef.current = instancedCrops;
    
    let instanceIdx = 0;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    FIELDS.forEach((field) => {
        // Procedural Terrain
        const terrainSize = 40;
        const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 128, 128);
        const posAttr = terrainGeo.attributes.position;
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            const ridge = Math.sin(x * furrowFreq) * 0.3;
            const noise = Math.sin(x * 0.5 + y * 0.8) * 0.15 + Math.cos(y * 1.2) * 0.1;
            posAttr.setZ(i, ridge + noise);
        }
        terrainGeo.computeVertexNormals();
        
        const terrain = new THREE.Mesh(terrainGeo, soilMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.position.copy(field.center);
        terrain.receiveShadow = true;
        macroGroup.add(terrain);

        // Mulch strips
        for(let r=0; r<rowCount; r++){
            const n = r - (rowCount/2);
            const baseX = (Math.PI/2 + 2*Math.PI*n) / furrowFreq;
            
            const stripGeo = new THREE.PlaneGeometry(1.4, terrainSize, 4, 64);
            stripGeo.rotateX(-Math.PI/2);
            const stripPos = stripGeo.attributes.position;
            
            for(let i=0; i<stripPos.count; i++) {
                let localX = stripPos.getX(i);
                let z = stripPos.getZ(i);
                const absoluteX = localX + baseX;
                const ridge = Math.sin(absoluteX * furrowFreq) * 0.3;
                const noise = Math.sin(absoluteX * 0.5 + z * 0.8) * 0.15 + Math.cos(z * 1.2) * 0.1;
                const arch = Math.cos((localX / 1.4) * Math.PI) * 0.1; 
                stripPos.setY(i, ridge + noise + arch + 0.02); 
            }
            stripGeo.computeVertexNormals();
            const strip = new THREE.Mesh(stripGeo, mulchFilmMat);
            strip.position.copy(field.center);
            strip.position.x += baseX;
            strip.receiveShadow = true;
            macroGroup.add(strip);

            // Populate instanced crops on this row
            for (let p = 0; p < plantsPerRow; p++) {
                const z = -18 + (p * 0.9) + (Math.random() * 0.1); 
                const absoluteX = baseX;
                const ridge = Math.sin(absoluteX * furrowFreq) * 0.3;
                const noise = Math.sin(absoluteX * 0.5 + z * 0.8) * 0.15 + Math.cos(z * 1.2) * 0.1;
                const y = ridge + noise + 0.25; 
                
                const scale = 0.6 + Math.random() * 0.4;
                const phase = (absoluteX + z) * 0.5 + Math.random();
                
                const finalX = field.center.x + absoluteX;
                const finalY = field.center.y + y;
                const finalZ = field.center.z + z;

                cropAnimDataRef.current.push({ x: finalX, y: finalY, z: finalZ, scale, phase });
                
                dummy.position.set(finalX, finalY, finalZ);
                dummy.rotation.y = Math.random() * Math.PI * 2;
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                
                color.setHSL(0.33 + (Math.random() * 0.06), 0.7 + (Math.random()*0.2), 0.3 + (Math.random()*0.15));
                instancedCrops.setColorAt(instanceIdx, color);
                instancedCrops.setMatrixAt(instanceIdx, dummy.matrix);
                instanceIdx++;
            }
        }
    });
    macroGroup.add(instancedCrops);

    // ==========================================
    // 2. MESO VIEW (GRAPE VINE)
    // ==========================================
    // Thicker woody trunk
    const stemCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.2, 1.5, -0.2),
        new THREE.Vector3(-0.1, 3.0, 0.2),
        new THREE.Vector3(0.1, 4.5, -0.1),
        new THREE.Vector3(0, 5.5, 0)
    ]);
    stemCurveRef.current = stemCurve;
    const stemGeo = new THREE.TubeGeometry(stemCurve, 64, 0.18, 12, false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3219, roughness: 1.0, bumpScale: 0.05 });
    const mesoStem = new THREE.Mesh(stemGeo, stemMat);
    mesoStem.castShadow = true;
    mesoGroup.add(mesoStem);

    // Nutrient Flow Animation
    const flowGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const flowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    for(let i=0; i<15; i++) {
        const dot = new THREE.Mesh(flowGeo, flowMat);
        dot.userData = { speed: 0.01 + Math.random() * 0.01, offset: (Math.random()-0.5)*0.12, progress: Math.random() };
        mesoGroup.add(dot);
        flowDotsRef.current.push(dot);
    }

    // Grape-like leaves (broad, lobed)
    const leafGeo = new THREE.PlaneGeometry(2.0, 2.5, 15, 15);
    const leafPos = leafGeo.attributes.position;
    for(let i=0; i<leafPos.count; i++) {
        let x = leafPos.getX(i);
        let y = leafPos.getY(i);
        let z = -Math.pow(x * 1.2, 2) * 0.3; // Crease
        z -= Math.pow(y + 1.25, 2) * 0.1; // Droop
        let widthScale = Math.sin(((y + 1.25) / 2.5) * Math.PI);
        let wave = Math.sin(y * 15) * 0.05 * (Math.abs(x));
        leafPos.setX(i, x * widthScale * 1.5);
        leafPos.setZ(i, z + wave);
    }
    leafGeo.computeVertexNormals();
    const mesoLeafMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x15803d, roughness: 0.4, clearcoat: 0.3, side: THREE.DoubleSide 
    });
    
    for(let i=0; i<14; i++) {
        const leaf = new THREE.Mesh(leafGeo, mesoLeafMat);
        const t = (i + 1) / 15; 
        const pt = stemCurve.getPoint(t);
        leaf.position.copy(pt);
        const angle = i * 2.4; 
        leaf.rotation.y = angle;
        leaf.rotation.x = Math.PI / 3;
        leaf.position.x += Math.sin(angle) * 0.15;
        leaf.position.z += Math.cos(angle) * 0.15;
        const s = 1.0 - (t * 0.4);
        leaf.scale.set(s, s, s);
        leaf.castShadow = true;
        mesoGroup.add(leaf);
        mesoLeavesRef.current.push({ mesh: leaf, baseRotX: leaf.rotation.x, phase: i });
    }

    // Grape Bunches
    const grapeGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const grapeMat = new THREE.MeshPhysicalMaterial({ color: 0x8b5cf6, roughness: 0.2, clearcoat: 0.8, transmission: 0.2 });
    for(let b=0; b<3; b++) {
        const bunch = new THREE.Group();
        for(let g=0; g<40; g++) {
            const grape = new THREE.Mesh(grapeGeo, grapeMat);
            const radius = 0.4 * (1 - (g/40)); // Cone shape
            const y = -(g/40) * 1.5;
            const theta = g * 2.4;
            grape.position.set(Math.sin(theta)*radius, y, Math.cos(theta)*radius);
            bunch.add(grape);
        }
        const t = 0.3 + (b * 0.2);
        const pt = stemCurve.getPoint(t);
        bunch.position.copy(pt);
        bunch.position.x += 0.3;
        bunch.position.z += 0.3;
        mesoGroup.add(bunch);
    }
    mesoGroup.visible = false;

    // ==========================================
    // 3. MICRO VIEW (SOIL DIORAMA)
    // ==========================================
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1, flatShading: true });
    const dioramaMulchMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: 0.3, clearcoat: 1.0 }); 
    
    // Top Mulch
    const topMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 8), dioramaMulchMat);
    topMesh.receiveShadow = true;
    microGroup.add(topMesh);
    
    // Grid overlay
    const sensorGrid = new THREE.GridHelper(8, 20, 0x06b6d4, 0x06b6d4);
    sensorGrid.position.y = 0.06;
    sensorGrid.material.opacity = 0.6;
    sensorGrid.material.transparent = true;
    microGroup.add(sensorGrid);

    // Walls
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 0.2), dirtMat);
    backMesh.position.set(0, -3, -4);
    backMesh.receiveShadow = true;
    microGroup.add(backMesh);

    const leftMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6, 8), dirtMat);
    leftMesh.position.set(-4, -3, 0);
    leftMesh.receiveShadow = true;
    microGroup.add(leftMesh);

    // Fibrous Roots
    const rootMat = new THREE.MeshStandardMaterial({ color: 0xb99976, roughness: 0.9 });
    for(let r=0; r<15; r++) {
        const points = [];
        let currentX = (Math.random() - 0.5) * 2.5;
        let currentY = -0.1; 
        let currentZ = (Math.random() - 0.5) * 2.5;
        points.push(new THREE.Vector3(currentX, currentY, currentZ));
        
        for(let p=0; p<6; p++) {
            currentX += (Math.random() - 0.5) * 2.0;
            currentY -= 0.6 + Math.random() * 0.6;
            currentZ += (Math.random() - 0.5) * 2.0;
            currentX = Math.max(-3.5, Math.min(3.5, currentX));
            currentZ = Math.max(-3.5, Math.min(3.5, currentZ));
            points.push(new THREE.Vector3(currentX, currentY, currentZ));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 0.05 - (r*0.002), 8, false);
        const root = new THREE.Mesh(tubeGeo, rootMat);
        root.castShadow = true;
        microGroup.add(root);
    }

    // Glowing Hydrogels
    const gelGeo = new THREE.SphereGeometry(0.2, 32, 32);
    const gelMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.6, transparent: true, opacity: 0.95, clearcoat: 1.0
    });
    for(let i=0; i<40; i++) {
        const gel = new THREE.Mesh(gelGeo, gelMat);
        gel.position.set((Math.random() - 0.5) * 7.0, - (Math.random() * 5.0) - 0.5, (Math.random() - 0.5) * 7.0);
        gel.userData = { id: i, baseScale: 0.6 + Math.random() * 0.6, phase: Math.random() * Math.PI * 2 };
        gel.castShadow = true;
        microGroup.add(gel);
        hydrogelsRef.current.push(gel);
    }

    // Floating Soil Rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.15);
    const rockMat = new THREE.MeshStandardMaterial({color: 0x4a3219, roughness: 1, flatShading: true});
    for(let i=0; i<40; i++) {
         const rock = new THREE.Mesh(rockGeo, rockMat);
         rock.position.set((Math.random() - 0.5) * 7.0, - (Math.random() * 5.0) - 0.5, (Math.random() - 0.5) * 7.0);
         rock.rotation.set(Math.random(), Math.random(), Math.random());
         rock.scale.setScalar(0.4 + Math.random() * 0.8);
         microGroup.add(rock);
    }
    microGroup.visible = false;

    // ==========================================
    // ANIMATION LOOP
    // ==========================================
    const clock = new THREE.Clock();
    let animationId: number;

    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        
        // Camera Lerp
        camera.position.lerp(targetCamPos.current, 0.05);
        currentCamLook.current.lerp(targetCamLook.current, 0.05);
        camera.lookAt(currentCamLook.current);

        // Day/Night Dynamics (Simple orbit based on timeOfDay prop)
        const hourAngle = ((timeOfDay - 6) / 12) * Math.PI; // 6am = 0, 12pm = PI/2, 6pm = PI
        dirLight.position.x = Math.cos(hourAngle) * 80;
        dirLight.position.y = Math.sin(hourAngle) * 80;
        
        // Macro Animations
        if(macroGroup.visible && instancedCropsRef.current) {
            for(let i=0; i<cropAnimDataRef.current.length; i++) {
                const d = cropAnimDataRef.current[i];
                const swayX = Math.sin(time * 1.5 + d.phase) * 0.15;
                const swayZ = Math.cos(time * 1.2 + d.phase) * 0.15;
                dummy.position.set(d.x + swayX, d.y, d.z + swayZ);
                dummy.rotation.x = swayZ * 0.2;
                dummy.rotation.z = -swayX * 0.2;
                dummy.scale.set(d.scale, d.scale, d.scale);
                dummy.updateMatrix();
                instancedCropsRef.current.setMatrixAt(i, dummy.matrix);
            }
            instancedCropsRef.current.instanceMatrix.needsUpdate = true;
        }

        // Meso Animations
        if(mesoGroup.visible && stemCurveRef.current) {
            mesoLeavesRef.current.forEach((leafData) => {
                leafData.mesh.rotation.x = leafData.baseRotX + Math.sin(time * 2.5 + leafData.phase) * 0.08;
                leafData.mesh.rotation.z = Math.cos(time * 1.8 + leafData.phase) * 0.04;
            });
            flowDotsRef.current.forEach((dot) => {
                dot.userData.progress += dot.userData.speed * 0.5;
                if(dot.userData.progress > 1) dot.userData.progress = 0;
                const pt = stemCurveRef.current!.getPoint(dot.userData.progress);
                const orbitX = Math.sin(time * 5 + dot.userData.progress * 20) * 0.06 + dot.userData.offset;
                const orbitZ = Math.cos(time * 5 + dot.userData.progress * 20) * 0.06 + dot.userData.offset;
                dot.position.set(pt.x + orbitX, pt.y, pt.z + orbitZ);
            });
        }

        // Micro Animations
        if(microGroup.visible) {
            hydrogelsRef.current.forEach((g) => {
                g.position.y += Math.sin(time * 1.5 + g.userData.phase) * 0.002;
                g.position.x += Math.cos(time * 1.0 + g.userData.phase) * 0.001;
                const s = g.userData.baseScale * 0.8 + (Math.sin(time * 4 + g.userData.phase) * 0.1);
                g.scale.set(s, s, s);
            });
        }

        renderer.render(scene, camera);
    };
    animate();

    return () => {
        cancelAnimationFrame(animationId);
        renderer.dispose();
    };
  }, []);

  // Update target positions when zoomLevel changes
  useEffect(() => {
      const macro = macroGroupRef.current;
      const meso = mesoGroupRef.current;
      const micro = microGroupRef.current;
      const f = FIELDS.find(f => f.id === activeField) || FIELDS[0];
      
      if (zoomLevel === 0) {
         targetCamPos.current.set(90, 80, 90);
         targetCamLook.current.set(0, 0, 0);
         if(macro) macro.visible = true;
         if(meso) meso.visible = false;
         if(micro) micro.visible = false;
      } else if (zoomLevel === 1) {
         targetCamPos.current.set(f.center.x + 15, 12, f.center.z + 15);
         targetCamLook.current.set(f.center.x, 0, f.center.z);
         if(macro) macro.visible = true;
         if(meso) meso.visible = false;
         if(micro) micro.visible = false;
      } else if (zoomLevel === 2) {
         if(meso) meso.position.copy(f.center);
         targetCamPos.current.set(f.center.x - 5, 4.5, f.center.z + 7);
         targetCamLook.current.set(f.center.x, 2.5, f.center.z);
         if(macro) macro.visible = true;
         if(meso) meso.visible = true;
         if(micro) micro.visible = false;
      } else if (zoomLevel === 3) {
         if(micro) micro.position.copy(f.center);
         targetCamPos.current.set(f.center.x - 10, -1.0, f.center.z + 9);
         targetCamLook.current.set(f.center.x, -2.5, f.center.z);
         if(macro) macro.visible = false;
         if(meso) meso.visible = false;
         if(micro) micro.visible = true;
      }
  }, [zoomLevel, activeField]);

  return (
    <div className="w-full h-full relative rounded-xl border border-[#1e2d40] overflow-hidden bg-[#0a1128] shadow-2xl">
      <div ref={mountRef} className="absolute inset-0 z-0"></div>

      {/* Top Left Status */}
      <div className="absolute top-4 left-4 z-20 flex gap-2 pointer-events-auto">
        <button onClick={() => setWeather('normal')} className={\`px-3 py-1.5 rounded flex items-center gap-1 text-[10px] font-mono transition-all \${weather === 'normal' ? 'bg-slate-500/30 border border-white/50 text-white' : 'bg-[#0f1722]/80 border border-[#1e2d40] text-slate-400'}\`}>⛅ NORM</button>
        <button onClick={() => setWeather('sun')} className={\`px-3 py-1.5 rounded flex items-center gap-1 text-[10px] font-mono transition-all \${weather === 'sun' ? 'bg-orange-500/30 border border-orange-500/50 text-orange-400' : 'bg-[#0f1722]/80 border border-[#1e2d40] text-slate-400'}\`}>☀️ SUN</button>
        <button onClick={() => setWeather('rain')} className={\`px-3 py-1.5 rounded flex items-center gap-1 text-[10px] font-mono transition-all \${weather === 'rain' ? 'bg-blue-500/30 border border-blue-500/50 text-blue-400' : 'bg-[#0f1722]/80 border border-[#1e2d40] text-slate-400'}\`}>🌧️ RAIN</button>
      </div>

      {/* Top Right Navigation */}
      <div className="absolute top-4 right-4 z-20 flex gap-2 pointer-events-auto bg-black/40 backdrop-blur-md rounded-full p-1 border border-white/10">
          <button onClick={() => setZoomLevel(0)} className={\`px-4 py-1.5 rounded-full text-xs font-bold transition-all \${zoomLevel === 0 ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'}\`}>Farm View</button>
          <button onClick={() => setZoomLevel(1)} className={\`px-4 py-1.5 rounded-full text-xs font-bold transition-all \${zoomLevel === 1 ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'}\`}>Field View</button>
          <button onClick={() => setZoomLevel(2)} className={\`px-4 py-1.5 rounded-full text-xs font-bold transition-all \${zoomLevel === 2 ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'}\`}>Plant View</button>
          <button onClick={() => setZoomLevel(3)} className={\`px-4 py-1.5 rounded-full text-xs font-bold transition-all \${zoomLevel === 3 ? 'bg-emerald-500 text-white' : 'text-slate-300 hover:text-white'}\`}>Soil View</button>
      </div>

      {/* Simulated Time Slider */}
      <div className="absolute top-20 right-4 z-20 bg-black/60 backdrop-blur-md rounded-xl p-4 border border-white/10 w-48 pointer-events-auto">
         <h4 className="text-[9px] text-slate-400 tracking-widest uppercase mb-2">Simulated Time</h4>
         <input type="range" min="0" max="24" value={timeOfDay} onChange={(e) => setTimeOfDay(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"/>
         <div className="text-center mt-2 font-mono font-bold text-sm text-white">{timeOfDay}:00 HRS</div>
      </div>

      {/* Field Indicators (Only in Farm View) */}
      {zoomLevel === 0 && FIELDS.map(field => (
        <div key={field.id} className="absolute z-10 pointer-events-auto" style={{ 
            left: \`calc(50% + \${(field.center.x * 2.5)}px)\`, 
            top: \`calc(50% + \${(field.center.z * 1.5)}px)\`
        }}>
            <button onClick={() => { setActiveField(field.id); setZoomLevel(1); }} className="group flex flex-col items-center">
               <div className="w-8 h-8 rounded-full bg-black/50 border border-emerald-500/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:bg-emerald-500/20 transition-all group-hover:scale-110">
                   <Target size={16} className="text-emerald-400"/>
               </div>
               <div className="mt-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="text-white font-bold text-xs">{field.name}</div>
                   <div className="text-[9px] text-emerald-400">Health: {field.health}</div>
               </div>
            </button>
        </div>
      ))}
    </div>
  );
}
\`;

fs.writeFileSync('E:/Apollo_AgriVerse/preview-app/src/DigitalTwinMap.tsx', content);
console.log('DigitalTwinMap.tsx overwritten successfully');
