import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Sun, CloudRain, Cloud, CheckCircle2, AlertTriangle, Target, Activity, BrainCircuit, Eye, EyeOff } from 'lucide-react';

export default function DigitalTwinMap() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<0 | 1 | 2>(0); // 0: Macro, 1: Meso, 2: Micro
  const [weather, setWeather] = useState<'normal' | 'sun' | 'rain'>('normal');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // References to THREE objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const targetCamPos = useRef(new THREE.Vector3(60, 45, 60));
  const targetCamLook = useRef(new THREE.Vector3(0, 0, 0));
  const currentCamLook = useRef(new THREE.Vector3(0, 0, 0));
  
  const macroGroupRef = useRef<THREE.Group | null>(null);
  const mesoGroupRef = useRef<THREE.Group | null>(null);
  const microGroupRef = useRef<THREE.Group | null>(null);
  const wetMaterials = useRef<THREE.MeshPhysicalMaterial[]>([]);
  const rainSystem = useRef<THREE.Points | null>(null);
  const sunRays = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#040d1a');
    scene.fog = new THREE.FogExp2('#040d1a', 0.012);

    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    cameraRef.current = camera;
    
    camera.position.set(60, 45, 60);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);

    // LIGHTING
    const hemiLight = new THREE.HemisphereLight(0x4a6b8c, 0x2b1c10, 0.6);
    scene.add(hemiLight);
    
    const dirLight = new THREE.DirectionalLight(0xffeedd, 2.0);
    dirLight.position.set(30, 40, -10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096; 
    dirLight.shadow.mapSize.height = 4096;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 150;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const blueFill = new THREE.PointLight(0x06b6d4, 1.5, 100);
    blueFill.position.set(-20, 15, 20);
    scene.add(blueFill);

    // MASTER GROUPS
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
    // 1. MACRO VIEW (FARM)
    // ==========================================
    const terrainSize = 100;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 256, 256);
    const posAttribute = terrainGeo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
        const x = posAttribute.getX(i);
        const y = posAttribute.getY(i);
        const ridge = Math.sin(x * 1.5) * 0.3;
        const noise = (Math.sin(x * 0.5 + y * 0.8) + Math.cos(y * 1.2)) * 0.15;
        posAttribute.setZ(i, ridge + noise);
    }
    terrainGeo.computeVertexNormals();
    
    const soilMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x2d1b11, roughness: 0.85, metalness: 0.05, clearcoat: 0.05, clearcoatRoughness: 0.8
    });
    wetMaterials.current.push(soilMat);

    const terrain = new THREE.Mesh(terrainGeo, soilMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    macroGroup.add(terrain);

    const lake = new THREE.Mesh(
        new THREE.CircleGeometry(12, 64),
        new THREE.MeshPhysicalMaterial({ color: 0x1E4F66, roughness: 0.0, transmission: 0.8, ior: 1.33, clearcoat: 1.0 })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(30, 0.2, 25);
    macroGroup.add(lake);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.9 });
    const canopyMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x22c55e, emissive: 0x064e3b, emissiveIntensity: 0.2, roughness: 0.6, clearcoat: 0.2, transmission: 0.1
    });
    wetMaterials.current.push(canopyMat);
    
    for(let r=-12; r<12; r++){
        const x = r * 3;
        if(Math.abs(x) < 5 || (x > 15 && x < 20)) continue; 
        
        for(let p=-30; p<=30; p+=6) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5), postMat);
            post.position.set(x, 1.25, p);
            post.castShadow = true;
            macroGroup.add(post);
        }
        const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 60, 4, 4, 32), canopyMat);
        const cp = canopy.geometry.attributes.position;
        for(let i=0; i<cp.count; i++){
            cp.setX(i, cp.getX(i) + Math.sin(cp.getZ(i)*3)*0.2); 
        }
        canopy.geometry.computeVertexNormals();
        canopy.position.set(x, 1.2, 0);
        canopy.castShadow = true;
        macroGroup.add(canopy);
    }

    // ==========================================
    // 2. MESO VIEW (CROP DETAIL)
    // ==========================================
    const cropCenter = new THREE.Vector3(-8, 1.5, 5);
    const leafGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x4ade80, side: THREE.DoubleSide, roughness: 0.4, clearcoat: 0.3, transmission: 0.2 });
    wetMaterials.current.push(leafMat);

    for(let i=0; i<80; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(
            cropCenter.x + (Math.random()-0.5)*1.5,
            cropCenter.y + (Math.random()-0.5)*1.5,
            cropCenter.z + (Math.random()-0.5)*1.5
        );
        leaf.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
        leaf.castShadow = true;
        mesoGroup.add(leaf);
    }

    const grapeMat = new THREE.MeshPhysicalMaterial({ color: 0x6b21a8, roughness: 0.1, clearcoat: 0.8, transmission: 0.4, ior: 1.5 });
    wetMaterials.current.push(grapeMat);
    for(let c=0; c<3; c++) {
        const clusterCenter = new THREE.Vector3(cropCenter.x + (Math.random()-0.5), cropCenter.y - 0.5, cropCenter.z + (Math.random()-0.5));
        for(let g=0; g<20; g++) {
            const grape = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), grapeMat);
            grape.position.set(
                clusterCenter.x + (Math.random()-0.5)*0.3,
                clusterCenter.y - (g*0.03), 
                clusterCenter.z + (Math.random()-0.5)*0.3
            );
            mesoGroup.add(grape);
        }
    }
    mesoGroup.visible = false;

    // ==========================================
    // 3. MICRO VIEW (SOIL & HYDROGEL)
    // ==========================================
    const microCenter = new THREE.Vector3(-8, -1.0, 5);
    const blockGeo = new THREE.BoxGeometry(4, 3, 4);
    const blockMat = new THREE.MeshPhysicalMaterial({ color: 0x1c100b, roughness: 0.95 });
    const block = new THREE.Mesh(blockGeo, blockMat);
    block.position.copy(microCenter);
    microGroup.add(block);

    const rootMat = new THREE.LineBasicMaterial({ color: 0xeaddcf, linewidth: 2 });
    for(let i=0; i<30; i++) {
        const points = [];
        let cur = new THREE.Vector3(microCenter.x, microCenter.y + 1.5, microCenter.z);
        points.push(cur.clone());
        for(let s=0; s<5; s++) {
            cur.x += (Math.random()-0.5)*0.8;
            cur.y -= Math.random()*0.4 + 0.1;
            cur.z += (Math.random()-0.5)*0.8;
            points.push(cur.clone());
        }
        microGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), rootMat));
    }

    const gelGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const gelMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x06b6d4, emissive: 0x0891b2, emissiveIntensity: 1.5, transmission: 0.9, clearcoat: 1.0 
    });
    for(let i=0; i<80; i++) {
        const gel = new THREE.Mesh(gelGeo, gelMat);
        gel.position.set(
            microCenter.x + (Math.random()-0.5)*3.8,
            microCenter.y + (Math.random()-0.5)*2.8,
            microCenter.z + (Math.random()-0.5)*3.8
        );
        microGroup.add(gel);
    }
    microGroup.visible = false;

    // ==========================================
    // WEATHER SYSTEMS
    // ==========================================
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 15000;
    const rainPos = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount*3; i+=3) {
        rainPos[i] = (Math.random() - 0.5) * 100;
        rainPos[i+1] = Math.random() * 60;
        rainPos[i+2] = (Math.random() - 0.5) * 100;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.1, transparent: true, opacity: 0 });
    const rain = new THREE.Points(rainGeo, rainMat);
    rainSystem.current = rain;
    scene.add(rain);

    const rayGeo = new THREE.CylinderGeometry(5, 30, 80, 32, 1, true);
    const rayMat = new THREE.MeshBasicMaterial({ 
        color: 0xfde047, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending 
    });
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set(0, 30, 0);
    ray.rotation.z = Math.PI / 6;
    sunRays.current = ray;
    scene.add(ray);

    // ==========================================
    // ANIMATION
    // ==========================================
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      camera.position.lerp(targetCamPos.current, 0.05);
      currentCamLook.current.lerp(targetCamLook.current, 0.05);
      camera.lookAt(currentCamLook.current);

      if (rainSystem.current && !Array.isArray(rainSystem.current.material) && (rainSystem.current.material as THREE.PointsMaterial).opacity > 0) {
          const positions = rainSystem.current.geometry.attributes.position.array as Float32Array;
          for(let i=1; i<rainCount*3; i+=3) {
              positions[i] -= 30 * delta;
              if (positions[i] < 0) {
                  positions[i] = 60;
              }
          }
          rainSystem.current.geometry.attributes.position.needsUpdate = true;
      }

      if (sunRays.current && !Array.isArray(sunRays.current.material) && (sunRays.current.material as THREE.MeshBasicMaterial).opacity > 0) {
          sunRays.current.rotation.y = time * 0.1;
      }

      if (zoomLevel === 0 && !isAnimating) {
         macroGroup.rotation.y = Math.sin(time * 0.05) * 0.1;
      } else {
         macroGroup.rotation.y = THREE.MathUtils.lerp(macroGroup.rotation.y, 0, 0.05);
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if (!mountRef.current) return;
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

      const handleZoom = (level: 0 | 1 | 2) => {
      setZoomLevel(level);
      const macro = macroGroupRef.current;
      const meso = mesoGroupRef.current;
      const micro = microGroupRef.current;
      if (level === 0) {
         targetCamPos.current.set(60, 45, 60);
         targetCamLook.current.set(0, 0, 0);
         if(macro) macro.visible = true;
         if(meso) meso.visible = false;
         if(micro) micro.visible = false;
      } else if (level === 1) {
         targetCamPos.current.set(-10, 2.5, 10);
         targetCamLook.current.set(-8, 1.5, 5);
         if(macro) macro.visible = true;
         if(meso) meso.visible = true;
         if(micro) micro.visible = false;
      } else if (level === 2) {
         targetCamPos.current.set(-10, -0.5, 10);
         targetCamLook.current.set(-8, -1.0, 5);
         if(macro) macro.visible = false;
         if(meso) meso.visible = false;
         if(micro) micro.visible = true;
      }
  };

  const handleWeather = (w: 'normal' | 'sun' | 'rain') => {
      setWeather(w);
      if (!rainSystem.current || !sunRays.current) return;
      
      wetMaterials.current.forEach(mat => {
          if (w === 'rain') {
              mat.roughness = Math.max(0.1, mat.roughness - 0.4); 
              mat.clearcoat = 1.0;
          } else {
              mat.roughness = Math.min(0.9, mat.roughness + 0.4); 
              mat.clearcoat = 0.2;
          }
          mat.needsUpdate = true;
      });

      if (w === 'rain') {
          if (rainSystem.current && !Array.isArray(rainSystem.current.material)) {
              (rainSystem.current.material as THREE.PointsMaterial).opacity = 0.6;
          }
          if (sunRays.current && !Array.isArray(sunRays.current.material)) {
              (sunRays.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
          if (sceneRef.current && sceneRef.current.fog instanceof THREE.FogExp2) {
              sceneRef.current.fog.color.setHex(0x1a2436);
          }
      } else if (w === 'sun') {
          if (rainSystem.current && !Array.isArray(rainSystem.current.material)) {
              (rainSystem.current.material as THREE.PointsMaterial).opacity = 0;
          }
          if (sunRays.current && !Array.isArray(sunRays.current.material)) {
              (sunRays.current.material as THREE.MeshBasicMaterial).opacity = 0.15;
          }
          if (sceneRef.current && sceneRef.current.fog instanceof THREE.FogExp2) {
              sceneRef.current.fog.color.setHex(0x2a2118);
          }
      } else {
          if (rainSystem.current && !Array.isArray(rainSystem.current.material)) {
              (rainSystem.current.material as THREE.PointsMaterial).opacity = 0;
          }
          if (sunRays.current && !Array.isArray(sunRays.current.material)) {
              (sunRays.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
          if (sceneRef.current && sceneRef.current.fog instanceof THREE.FogExp2) {
              sceneRef.current.fog.color.setHex(0x040d1a);
          }
      }
  };

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current) mountRef.current.innerHTML = '';
      renderer.dispose();
    };
  }, []);






    const handleZoom = (level: 0 | 1 | 2) => {
      setZoomLevel(level);
      const macro = macroGroupRef.current;
      const meso = mesoGroupRef.current;
      const micro = microGroupRef.current;
      if (level === 0) {
         targetCamPos.current.set(60, 45, 60);
         targetCamLook.current.set(0, 0, 0);
         if(macro) macro.visible = true;
         if(meso) meso.visible = false;
         if(micro) micro.visible = false;
      } else if (level === 1) {
         targetCamPos.current.set(-10, 2.5, 10);
         targetCamLook.current.set(-8, 1.5, 5);
         if(macro) macro.visible = true;
         if(meso) meso.visible = true;
         if(micro) micro.visible = false;
      } else if (level === 2) {
         targetCamPos.current.set(-10, -0.5, 10);
         targetCamLook.current.set(-8, -1.0, 5);
         if(macro) macro.visible = false;
         if(meso) meso.visible = false;
         if(micro) micro.visible = true;
      }
  };

  const handleWeather = (w: 'normal' | 'sun' | 'rain') => {
      setWeather(w);
      if (!rainSystem.current || !sunRays.current) return;
      
      wetMaterials.current.forEach(mat => {
          if (w === 'rain') {
              mat.roughness = Math.max(0.1, mat.roughness - 0.4); 
              mat.clearcoat = 1.0;
          } else {
              mat.roughness = Math.min(0.9, mat.roughness + 0.4); 
              mat.clearcoat = 0.2;
          }
          mat.needsUpdate = true;
      });

      if (w === 'rain') {
          if (rainSystem.current && !Array.isArray(rainSystem.current.material)) {
              (rainSystem.current.material as THREE.PointsMaterial).opacity = 0.6;
          }
          if (sunRays.current && !Array.isArray(sunRays.current.material)) {
              (sunRays.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
          if (sceneRef.current && sceneRef.current.fog instanceof THREE.FogExp2) {
              sceneRef.current.fog.color.setHex(0x1a2436);
          }
      } else if (w === 'sun') {
          if (rainSystem.current && !Array.isArray(rainSystem.current.material)) {
              (rainSystem.current.material as THREE.PointsMaterial).opacity = 0;
          }
          if (sunRays.current && !Array.isArray(sunRays.current.material)) {
              (sunRays.current.material as THREE.MeshBasicMaterial).opacity = 0.15;
          }
          if (sceneRef.current && sceneRef.current.fog instanceof THREE.FogExp2) {
              sceneRef.current.fog.color.setHex(0x2a2118);
          }
      } else {
          if (rainSystem.current && !Array.isArray(rainSystem.current.material)) {
              (rainSystem.current.material as THREE.PointsMaterial).opacity = 0;
          }
          if (sunRays.current && !Array.isArray(sunRays.current.material)) {
              (sunRays.current.material as THREE.MeshBasicMaterial).opacity = 0;
          }
          if (sceneRef.current && sceneRef.current.fog instanceof THREE.FogExp2) {
              sceneRef.current.fog.color.setHex(0x040d1a);
          }
      }
  };

    return (
    <div className="relative w-full h-full bg-[#040d1a] overflow-hidden text-slate-200 font-sans">
      
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 cursor-crosshair z-0" />
      
      {/* Scan Line Animation */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-[#CFB53B]/50 z-10 pointer-events-none" style={{ animation: 'scan 4s linear infinite' }} />
      <style>{`
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
        .glass-panel {
            background: linear-gradient(135deg, rgba(8, 29, 58, 0.8) 0%, rgba(4, 13, 26, 0.9) 100%);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
        }
      `}</style>

      {/* LEFT SIDEBAR OVERLAY */}
      {!showLeftPanel && <button onClick={() => setShowLeftPanel(true)} className="absolute left-4 top-4 z-30 p-3 glass-panel rounded-full text-white hover:text-cyan-400 border border-white/10 shadow-lg transition-all"><Eye size={20}/></button>}
      <div className={`absolute left-0 top-0 h-full w-72 glass-panel p-4 flex flex-col gap-4 z-20 overflow-y-auto border-r border-white/10 transition-transform duration-500 ${showLeftPanel ? "translate-x-0" : "-translate-x-full"}`}>
          
          <div className="bg-black/20 p-4 rounded-xl border border-white/5 border-t-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <div className="flex justify-between items-center mb-3">
              <h2 className="text-[10px] text-cyan-400 uppercase tracking-widest flex items-center gap-2 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Sensor-Mulch Telemetry
              </h2>
              <button onClick={() => setShowLeftPanel(false)} className="text-slate-400 hover:text-white p-1"><EyeOff size={16}/></button>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  <div className="p-2 bg-[#081D3A]/50 rounded flex flex-col border border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                      <span className="text-[9px] text-slate-400">Film Temp</span>
                      <span className="text-white text-lg">38.5°C</span>
                  </div>
                  <div className="p-2 bg-[#081D3A]/50 rounded flex flex-col border border-white/5">
                      <span className="text-[9px] text-slate-400">Ambient</span>
                      <span className="text-slate-300 text-lg">34.2°C</span>
                  </div>
                  <div className="p-2 bg-[#081D3A]/50 rounded flex flex-col border border-white/5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                      <span className="text-[9px] text-slate-400">Moisture Gr.</span>
                      <span className="text-white text-lg">+2.4%</span>
                  </div>
                  <div className="p-2 bg-[#081D3A]/50 rounded flex flex-col border border-white/5">
                      <span className="text-[9px] text-slate-400">Thermal Gr.</span>
                      <span className="text-white text-lg">Δ 4.3°C</span>
                  </div>
              </div>
          </div>

          <div className="bg-black/20 p-4 rounded-xl border border-white/5 mt-auto transition-opacity duration-500" style={{ opacity: zoomLevel === 0 ? 1 : 0.4 }}>
              <h3 className="font-mono font-bold text-white text-sm mb-1 tracking-wider uppercase">Macro Level: Field Topology</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                  High-level digital twin of the 12.5-hectare plot. Topography simulated via Perlin noise. Real-time mapping of moisture gradients across furrows.
              </p>
          </div>
      </div>


      {/* RIGHT SIDEBAR OVERLAY */}
      {!showRightPanel && <button onClick={() => setShowRightPanel(true)} className="absolute right-4 top-4 z-30 p-3 glass-panel rounded-full text-white hover:text-cyan-400 border border-white/10 shadow-lg transition-all"><Eye size={20}/></button>}
      <div className={`absolute right-0 top-0 h-full w-80 glass-panel p-4 flex flex-col gap-4 z-20 overflow-y-auto border-l border-white/10 transition-transform duration-500 ${showRightPanel ? "translate-x-0" : "translate-x-full"}`}>
          
          {/* Atmospheric Controls */}
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center mb-3">
              <h2 className="text-[10px] text-slate-400 uppercase tracking-widest">Atmospheric Controls</h2>
              <button onClick={() => setShowRightPanel(false)} className="text-slate-400 hover:text-white p-1"><EyeOff size={16}/></button>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => handleWeather('sun')} className={`flex-1 p-2 rounded text-[10px] font-mono transition shadow-lg flex items-center justify-center gap-1 ${weather === 'sun' ? 'bg-orange-500/30 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20'}`}>
                      <Sun size={12}/> SUN
                  </button>
                  <button onClick={() => handleWeather('normal')} className={`flex-1 p-2 rounded text-[10px] font-mono transition shadow-lg flex items-center justify-center gap-1 ${weather === 'normal' ? 'bg-slate-500/30 border-white text-white' : 'bg-slate-500/10 border-white/30 text-slate-300 hover:bg-slate-500/20'}`}>
                      <Cloud size={12}/> NORM
                  </button>
                  <button onClick={() => handleWeather('rain')} className={`flex-1 p-2 rounded text-[10px] font-mono transition shadow-lg flex items-center justify-center gap-1 ${weather === 'rain' ? 'bg-blue-500/30 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'}`}>
                      <CloudRain size={12}/> RAIN
                  </button>
              </div>
          </div>

          {/* Navigation Controls */}
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <h2 className="text-[10px] text-slate-400 uppercase tracking-widest mb-3">Twin Spatial Resolution</h2>
              <div className="flex flex-col gap-2">
                  <button onClick={() => handleZoom(0)} className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${zoomLevel === 0 ? 'border border-[#CFB53B] bg-[#CFB53B]/20 text-[#CFB53B]' : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/30'}`}>
                      <span className="font-mono font-bold text-sm">01 / MACRO</span>
                      <div className={`text-[9px] font-light ml-auto ${zoomLevel === 0 ? 'text-[#CFB53B]' : 'text-slate-300'}`}>FARM GRID</div>
                  </button>
                  <button onClick={() => handleZoom(1)} className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${zoomLevel === 1 ? 'border border-[#CFB53B] bg-[#CFB53B]/20 text-[#CFB53B]' : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/30'}`}>
                      <span className="font-mono font-bold text-sm">02 / MESO</span>
                      <div className={`text-[9px] font-light ml-auto ${zoomLevel === 1 ? 'text-[#CFB53B]' : 'text-slate-300'}`}>CROP HEALTH</div>
                  </button>
                  <button onClick={() => handleZoom(2)} className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition-all ${zoomLevel === 2 ? 'border border-[#CFB53B] bg-[#CFB53B]/20 text-[#CFB53B]' : 'border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/30'}`}>
                      <span className="font-mono font-bold text-sm">03 / MICRO</span>
                      <div className={`text-[9px] font-light ml-auto ${zoomLevel === 2 ? 'text-[#CFB53B]' : 'text-slate-300'}`}>SOIL & GELS</div>
                  </button>
              </div>
          </div>

          {/* ML Engine Output */}
          <div className="flex-1 bg-black/40 p-4 rounded-xl border border-white/10 flex flex-col relative overflow-hidden">
              <h2 className="text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Predictive Engine v2.1
              </h2>
              
              <div className="font-mono text-[10px] text-emerald-400 mb-2">{'>'} MODEL: Random_Forest_Regressor</div>
              <div className="font-mono text-[10px] text-cyan-400 mb-4">{'>'} CONFIDENCE: 94.8%</div>
              
              <div className="flex-1">
                  <div className={`p-3 rounded mb-3 border transition-colors duration-500 ${zoomLevel === 2 ? 'bg-purple-900/20 border-purple-500/50' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                      <p className={`text-xs font-bold mb-1 ${zoomLevel === 2 ? 'text-purple-400' : 'text-emerald-400'}`}>
                         {zoomLevel === 2 ? 'HYDROGEL OPTIMIZATION ACTIVE' : 'CROP STRESS: NORMAL'}
                      </p>
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                         {zoomLevel === 2 
                            ? 'Simulated PINN indicates Bayesian Optimization required. Adjusting MBA cross-linker by +2.5%.'
                            : 'Simulated PINN analysis indicates bulk soil moisture is stable. Hydrogel matrix is releasing water at 0.15 mL/hr.'}
                      </p>
                  </div>
              </div>

              <div className="border-t border-white/10 pt-3 mt-auto font-mono text-[9px] space-y-2">
                  <div className="flex justify-between">
                      <span className="text-slate-400">Pred. Wilt Probability:</span>
                      <span className="text-emerald-400">1.2%</span>
                  </div>
                  <div className="flex justify-between">
                      <span className="text-slate-400">Next Auto-Irrigation:</span>
                      <span className="text-slate-200">22:00 HRS (Vol: 0L)</span>
                  </div>
              </div>
          </div>
      </div>
      
    </div>
  );
}



