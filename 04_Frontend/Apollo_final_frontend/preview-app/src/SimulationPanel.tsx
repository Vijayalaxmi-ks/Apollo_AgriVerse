import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  PlayCircle, RefreshCw, Thermometer, Droplets, Wind, Sun, 
  CloudRain, Leaf, Activity, Layers, Sprout, PauseCircle
} from 'lucide-react';

// Reusable Custom Slider
const CustomSlider = ({ label, icon: Icon, min, max, value, unit, onChange, colorClass }: any) => (
  <div className="flex flex-col gap-2">
    <div className="flex justify-between items-center text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <Icon size={14} className={colorClass} /> {label}
      </div>
      <span className="font-mono font-bold text-white">{value} {unit}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-[9px] text-slate-500 font-mono">{min}</span>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-1 bg-[#1e2d40] rounded-lg appearance-none cursor-pointer accent-${colorClass.split('-')[1]}-500`}
      />
      <span className="text-[9px] text-slate-500 font-mono">{max}</span>
    </div>
  </div>
);

export default function SimulationPanel() {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Simulation State
  const [isPlaying, setIsPlaying] = useState(true);
  const [simulationDay, setSimulationDay] = useState(0); // 0 to 365
  
  // Environment Params
  const [envParams, setEnvParams] = useState({
    temp: 29, humidity: 65, rainfall: 12, solar: 820, wind: 18, co2: 420
  });
  const [soilParams, setSoilParams] = useState({
    ph: 6.5, ec: 1.2, om: 2.8, n: 62, p: 48, k: 72
  });

  // 3D Object Refs for animation
  const vineGroup = useRef<THREE.Group | null>(null);
  const leavesRef = useRef<THREE.Mesh[]>([]);
  const grapesRef = useRef<THREE.Mesh[]>([]);
  const stemRef = useRef<THREE.Mesh | null>(null);

  // THREE.JS SETUP
  useEffect(() => {
    if (!mountRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1017');

    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 100);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Soil Base
    const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(2, 2.2, 0.5, 32),
        new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1 })
    );
    soil.position.y = -0.25;
    scene.add(soil);

    // Vine Structure (starts small)
    const vGroup = new THREE.Group();
    scene.add(vGroup);
    vineGroup.current = vGroup;

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.05, 0.1, 1, 8);
    // Shift origin to bottom
    stemGeo.translate(0, 0.5, 0);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    vGroup.add(stem);
    stemRef.current = stem;

    // Create Leaves (Hidden initially)
    const leafGeo = new THREE.PlaneGeometry(0.5, 0.5);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, side: THREE.DoubleSide });
    for(let i=0; i<40; i++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat.clone());
        leaf.position.set((Math.random()-0.5)*2, Math.random()*3, (Math.random()-0.5)*2);
        leaf.rotation.set(Math.random(), Math.random(), 0);
        leaf.scale.set(0,0,0); // Hidden
        vGroup.add(leaf);
        leavesRef.current.push(leaf);
    }

    // Create Grapes (Hidden initially)
    const grapeMat = new THREE.MeshStandardMaterial({ color: 0x6b21a8, roughness: 0.2 });
    for(let i=0; i<30; i++) {
        const grape = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), grapeMat.clone());
        grape.position.set((Math.random()-0.5)*1.5, Math.random()*2 + 1, (Math.random()-0.5)*1.5);
        grape.scale.set(0,0,0); // Hidden
        vGroup.add(grape);
        grapesRef.current.push(grape);
    }

    let animationId: number;
    const animate = () => {
        animationId = requestAnimationFrame(animate);
        vGroup.rotation.y += 0.005; // Slow spin to view all sides
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

    return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', handleResize);
        if (mountRef.current) mountRef.current.innerHTML = '';
        renderer.dispose();
    };
  }, []);

  // Growth Engine & Reaction Logic
  useEffect(() => {
     let interval: any;
     if (isPlaying) {
         interval = setInterval(() => {
             setSimulationDay(prev => {
                 if (prev >= 365) return 0; // Loop lifecycle
                 return prev + 1;
             });
         }, 50); // 50ms per day = ~18 seconds per year
     }
     return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
     // Apply Growth and Stress to 3D Models based on Day and Sliders
     if (!stemRef.current || leavesRef.current.length === 0) return;

     // Calculate Stress Factor based on Environment
     // Ideal: Temp ~25, Rain ~50. 
     // Stress = 0 to 1
     let stress = 0;
     if (envParams.temp > 35) stress += (envParams.temp - 35) * 0.05;
     if (envParams.temp < 15) stress += (15 - envParams.temp) * 0.05;
     if (envParams.rainfall < 10) stress += 0.4;
     if (soilParams.n < 30) stress += 0.3;
     stress = Math.min(1, Math.max(0, stress));

     const progress = simulationDay / 365; // 0 to 1

     // 1. Stem Growth
     // Reaches max height at day 100
     const stemScale = Math.min(1, simulationDay / 100) * (1 - stress*0.3);
     stemRef.current.scale.set(stemScale, stemScale * 3, stemScale);

     // 2. Leaf Growth (Vegetative Phase: Day 30 to 150)
     const leafGrowthPhase = Math.max(0, Math.min(1, (simulationDay - 30) / 120));
     // Leaves die off after day 300
     const leafDeathPhase = Math.max(0, Math.min(1, (simulationDay - 300) / 65));
     
     leavesRef.current.forEach((leaf, i) => {
         // Stagger leaf growth
         const startOffset = (i / leavesRef.current.length) * 0.5;
         let currentScale = 0;
         if (leafGrowthPhase > startOffset) {
             currentScale = Math.min(1, (leafGrowthPhase - startOffset) * 2);
         }
         currentScale *= (1 - leafDeathPhase); // Shrink/fall off at end of year
         currentScale *= (1 - stress * 0.5); // Stunted by stress

         leaf.scale.set(currentScale, currentScale, currentScale);

         // Color reacts to stress and age
         const mat = leaf.material as THREE.MeshStandardMaterial;
         if (leafDeathPhase > 0) {
             mat.color.setHex(0xa16207); // Brown/Autumn
         } else if (stress > 0.5) {
             mat.color.setHex(0xeab308); // Yellowing (Chlorosis)
         } else {
             mat.color.setHex(0x22c55e); // Healthy Green
         }

         // Drooping (wilting) due to stress
         leaf.rotation.x = stress * Math.PI / 2; 
     });

     // 3. Grape Growth (Fruiting Phase: Day 120 to 250)
     const fruitPhase = Math.max(0, Math.min(1, (simulationDay - 120) / 130));
     grapesRef.current.forEach((grape, i) => {
         // Grapes only grow if stress is low
         if (stress > 0.8) {
             grape.scale.set(0,0,0);
             return;
         }
         let gScale = fruitPhase * (1 - stress * 0.4);
         
         // Harvest at day 250
         if (simulationDay > 250) gScale = 0;

         grape.scale.set(gScale, gScale, gScale);
         
         // Color change: Green to Purple
         const mat = grape.material as THREE.MeshStandardMaterial;
         if (fruitPhase < 0.7) {
             mat.color.setHex(0x84cc16); // Unripe Green
         } else {
             mat.color.setHex(0x6b21a8); // Ripe Purple
         }
     });

  }, [simulationDay, envParams, soilParams]);


  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#0b131e] p-6 custom-scrollbar">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-6 border-b border-[#1e2d40] pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <Sprout size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide uppercase">3D Lifecycle Simulation</h2>
            <p className="text-xs text-slate-400">Real-time procedural growth engine reacting to environmental stimulants</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-[500px]">
        
        {/* LEFT: SLIDERS */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
          
          <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 shadow-lg">
            <h3 className="text-white text-xs font-bold tracking-wide uppercase mb-5">Atmospheric Stimulants</h3>
            <div className="flex flex-col gap-4">
              <CustomSlider label="Temperature" icon={Thermometer} min={10} max={45} value={envParams.temp} unit="°C" colorClass="text-orange-400" onChange={(v: number) => setEnvParams({...envParams, temp: v})} />
              <CustomSlider label="Rainfall / Irrigation" icon={CloudRain} min={0} max={200} value={envParams.rainfall} unit="mm" colorClass="text-blue-400" onChange={(v: number) => setEnvParams({...envParams, rainfall: v})} />
              <CustomSlider label="Solar Radiation" icon={Sun} min={0} max={1200} value={envParams.solar} unit="W/m²" colorClass="text-amber-400" onChange={(v: number) => setEnvParams({...envParams, solar: v})} />
            </div>
            <div className="mt-4 text-[10px] text-slate-500 bg-[#0a1017] p-2 rounded border border-[#1e2d40]">
              <span className="text-amber-400 font-bold">Try this:</span> Push Temperature above 35°C and drop Rainfall below 10mm to watch the 3D plant wilt and turn yellow in real-time.
            </div>
          </div>

          <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 shadow-lg">
            <h3 className="text-white text-xs font-bold tracking-wide uppercase mb-5">Soil & Nutrient Settings</h3>
            <div className="flex flex-col gap-4">
              <CustomSlider label="Nitrogen (N)" icon={Layers} min={0} max={200} value={soilParams.n} unit="kg/ha" colorClass="text-emerald-400" onChange={(v: number) => setSoilParams({...soilParams, n: v})} />
              <CustomSlider label="Phosphorus (P)" icon={Layers} min={0} max={100} value={soilParams.p} unit="kg/ha" colorClass="text-rose-400" onChange={(v: number) => setSoilParams({...soilParams, p: v})} />
              <CustomSlider label="Soil pH" icon={Activity} min={4.0} max={9.0} value={soilParams.ph} unit="" colorClass="text-cyan-400" onChange={(v: number) => setSoilParams({...soilParams, ph: v})} />
            </div>
          </div>

        </div>

        {/* RIGHT: 3D VIEWPORT & TIMELINE */}
        <div className="col-span-12 xl:col-span-8 flex flex-col bg-[#16202d] rounded-xl border border-[#1e2d40] shadow-lg overflow-hidden relative">
            
            {/* 3D Canvas */}
            <div className="flex-1 relative bg-gradient-to-b from-[#0a1017] to-[#16202d]">
                <div ref={mountRef} className="absolute inset-0 cursor-move" />
                
                {/* Overlay Data */}
                <div className="absolute top-4 left-4 glass-panel p-3 rounded-lg border border-[#1e2d40] bg-[#0f1722]/80 backdrop-blur pointer-events-none">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">Growth Stage</div>
                    <div className="text-xl font-bold text-white mt-1">
                        {simulationDay < 30 ? 'Germination' :
                         simulationDay < 120 ? 'Vegetative Growth' :
                         simulationDay < 250 ? 'Fruiting & Ripening' : 'Harvest / Dormancy'}
                    </div>
                </div>

                <div className="absolute top-4 right-4 glass-panel p-3 rounded-lg border border-[#1e2d40] bg-[#0f1722]/80 backdrop-blur pointer-events-none text-right">
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">Yield Prediction</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">
                        {envParams.temp > 35 || soilParams.n < 30 ? 'Low (Stressed)' : 'High (Optimal)'}
                    </div>
                </div>
            </div>

            {/* Timeline Scrubber */}
            <div className="h-24 bg-[#0a1017] border-t border-[#1e2d40] p-4 flex flex-col justify-center">
                <div className="flex items-center gap-4 mb-2">
                    <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white transition shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                    >
                        {isPlaying ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                    </button>
                    <div className="flex-1">
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                            <span>Day 0</span>
                            <span className="text-white font-bold">Current: Day {Math.floor(simulationDay)}</span>
                            <span>Day 365 (1 Year)</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" max="365" 
                            value={simulationDay}
                            onChange={(e) => {
                                setSimulationDay(Number(e.target.value));
                                setIsPlaying(false);
                            }}
                            className="w-full h-2 bg-[#1e2d40] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </div>

        </div>

      </div>

    </div>
  );
}
