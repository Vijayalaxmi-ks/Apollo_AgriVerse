import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area
} from 'recharts';
import { 
  Home, CloudRain, Droplets, Leaf, Layers, LineChart as ChartIcon, 
  Target, PlayCircle, BarChart2, Bell, FileText, Settings,
  Wind, Droplet, Sun, Calendar, ChevronRight, Plus, Minus, 
  RefreshCw, Crosshair, Box, AlertTriangle, CheckCircle2, ChevronDown, User
} from 'lucide-react';

/* =================================================================================
 * MOCK DATA
 * ================================================================================= */

const SIDEBAR_ITEMS = [
  { id: 'twin', icon: Home, label: 'Digital Twin', subLabel: 'Farm Overview' },
  { id: 'weather', icon: CloudRain, label: 'Weather Intelligence' },
  { id: 'soil', icon: Droplets, label: 'Intelligent Soil' },
  { id: 'lifecycle', icon: Leaf, label: 'Grape Lifecycle' },
  { id: 'hydrogels', icon: Droplet, label: 'Intelligent Hydrogels' },
  { id: 'mulching', icon: Layers, label: 'Smart Mulching' },
  { id: 'predictions', icon: ChartIcon, label: 'Predictions' },
  { id: 'recommendations', icon: Target, label: 'Recommendations' },
  { id: 'simulation', icon: PlayCircle, label: 'Simulation' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics' },
  { id: 'alerts', icon: Bell, label: 'Alerts' },
  { id: 'reports', icon: FileText, label: 'Reports' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

const METRICS_DATA = [
  { label: 'Soil Health Score', value: '78', suffix: '/100', status: 'Good', data: [60, 65, 70, 75, 72, 78, 80] },
  { label: 'Crop Health Index', value: '87', suffix: '%', status: 'Healthy', data: [80, 82, 85, 84, 86, 87, 88] },
  { label: 'Water Use Efficiency', value: '2.6', suffix: ' kg/m³', status: 'Good', data: [2.1, 2.2, 2.4, 2.3, 2.5, 2.6, 2.7] },
  { label: 'Yield Prediction', value: '4.8', suffix: ' tons/acre', status: 'Effective', data: [4.2, 4.3, 4.4, 4.6, 4.7, 4.8, 4.8] },
  { label: 'Hydrogel Efficiency', value: '73', suffix: '%', status: 'Effective', data: [50, 55, 60, 65, 70, 73, 75] },
  { label: 'Mulch Efficiency', value: '85', suffix: '%', status: 'Effective', data: [70, 75, 80, 82, 84, 85, 86] },
];

const RAINFALL_FORECAST = [
  { day: 'Tue', val: 5 }, { day: 'Wed', val: 12 }, { day: 'Thu', val: 8 },
  { day: 'Fri', val: 10 }, { day: 'Sat', val: 15 }, { day: 'Sun', val: 6 }, { day: 'Mon', val: 4 }
];

/* =================================================================================
 * COMPONENTS
 * ================================================================================= */

const TopBar = () => (
  <header className="h-16 bg-[#0f1722] border-b border-[#1e2d40] flex items-center justify-between px-6 shrink-0 z-20">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500">
        <span className="text-emerald-500 font-bold text-lg">🍇</span>
      </div>
      <div>
        <h1 className="font-bold text-white tracking-wide text-sm">APOLLO AGRIVERSE</h1>
        <p className="text-[10px] text-slate-400">AI-Powered Digital Twin for Smart Grape Farming</p>
      </div>
    </div>

    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2 bg-[#16202d] border border-emerald-500/30 px-3 py-1.5 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase">Simulation Mode</span>
      </div>

      <div className="h-8 w-[1px] bg-[#1e2d40]"></div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <CloudRain size={16} className="text-blue-400" />
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold">28°C</span>
            <span className="text-slate-400 text-[9px]">Partly Cloudy</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Droplet size={16} className="text-cyan-400" />
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold">12 mm</span>
            <span className="text-slate-400 text-[9px]">Rainfall (24h)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain size={16} className="text-blue-400" />
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold">65%</span>
            <span className="text-slate-400 text-[9px]">Humidity</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind size={16} className="text-slate-300" />
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold">18 km/h</span>
            <span className="text-slate-400 text-[9px]">Wind Speed</span>
          </div>
        </div>
      </div>

      <div className="h-8 w-[1px] bg-[#1e2d40]"></div>

      <div className="flex items-center gap-3 bg-[#16202d] px-3 py-1.5 rounded-lg border border-[#1e2d40] cursor-pointer hover:bg-[#1c293a] transition">
        <Calendar size={14} className="text-slate-400" />
        <div className="flex flex-col">
          <span className="text-white text-xs font-bold">20 May 2025</span>
          <span className="text-slate-400 text-[9px]">10:30 AM</span>
        </div>
        <ChevronRight size={14} className="text-slate-500 ml-2" />
      </div>

      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold border-2 border-[#0f1722] cursor-pointer">
        AG
      </div>
    </div>
  </header>
);

const DigitalTwinMap = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    
    // Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.005);

    // Camera (Isometric angle)
    const camera = new THREE.PerspectiveCamera(45, mountRef.current.clientWidth / mountRef.current.clientHeight, 1, 1000);
    camera.position.set(40, 35, 40);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Terrain Base
    const terrainGeo = new THREE.PlaneGeometry(200, 200, 32, 32);
    const pos = terrainGeo.attributes.position;
    for(let i=0; i<pos.count; i++) {
        // Subtle rolling hills
        pos.setZ(i, Math.sin(pos.getX(i)*0.05) * Math.cos(pos.getY(i)*0.05) * 5);
    }
    terrainGeo.computeVertexNormals();
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.8 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Create 4 Highlighted Fields
    const fieldMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, transparent: true, opacity: 0.4 });
    const fieldBorderMat = new THREE.LineBasicMaterial({ color: 0x22c55e, linewidth: 2 });
    
    const createField = (x: number, z: number, w: number, h: number) => {
        const geo = new THREE.PlaneGeometry(w, h);
        const mesh = new THREE.Mesh(geo, fieldMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.5, z); // Slightly above terrain
        scene.add(mesh);

        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, fieldBorderMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.51, z);
        scene.add(line);
    };

    createField(-15, -15, 20, 15); // Field A
    createField(10, -10, 18, 20);  // Field B
    createField(15, 15, 15, 15);   // Field C
    createField(-10, 15, 22, 12);  // Field D

    // Lake
    const lakeGeo = new THREE.CircleGeometry(15, 32);
    const lakeMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1, metalness: 0.8 });
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(30, 0.2, 30);
    scene.add(lake);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Slow rotation for presentation effect
      scene.rotation.y += 0.0005;

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
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-[#16202d] rounded-xl overflow-hidden border border-[#1e2d40] shadow-lg flex flex-col">
      {/* Map Header Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-10 pointer-events-none">
        <div>
          <h2 className="text-white text-lg font-bold tracking-wide">DIGITAL TWIN - FARM OVERVIEW</h2>
          <p className="text-slate-400 text-xs">Real-time simulation of your grape farm ecosystem</p>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          {['Farm View', 'Field View', 'Plant View', 'Soil View'].map((view, i) => (
            <button key={view} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${i === 0 ? 'bg-[#10b981] text-white' : 'bg-[#1e2d40] text-slate-300 hover:bg-[#2a3f5a]'}`}>
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Container */}
      <div ref={mountRef} className="absolute inset-0 z-0"></div>

      {/* HTML Overlays (Field Tags) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          {/* Mock positioned tags to match image */}
          <div className="absolute top-1/3 left-1/3 -translate-x-20 bg-[#0f1722]/80 backdrop-blur border border-[#22c55e] p-2 rounded-lg pointer-events-auto cursor-pointer hover:bg-[#1e2d40] transition">
              <div className="flex justify-between items-center gap-4"><span className="text-white font-bold text-xs">Field A</span><ChevronDown size={12} className="text-slate-400"/></div>
              <div className="text-slate-300 text-[10px]">2.30 Acres</div>
              <div className="text-[#22c55e] text-[10px] flex items-center gap-1 mt-1"><CheckCircle2 size={10}/> Health 88%</div>
          </div>
          <div className="absolute top-1/4 right-1/2 translate-x-10 bg-[#0f1722]/80 backdrop-blur border border-[#22c55e] p-2 rounded-lg pointer-events-auto cursor-pointer hover:bg-[#1e2d40] transition">
              <div className="flex justify-between items-center gap-4"><span className="text-white font-bold text-xs">Field B</span><ChevronDown size={12} className="text-slate-400"/></div>
              <div className="text-slate-300 text-[10px]">2.45 Acres</div>
              <div className="text-[#22c55e] text-[10px] flex items-center gap-1 mt-1"><CheckCircle2 size={10}/> Health 85%</div>
          </div>
          <div className="absolute bottom-1/3 right-1/3 translate-x-10 bg-[#0f1722]/80 backdrop-blur border border-[#22c55e] p-2 rounded-lg pointer-events-auto cursor-pointer hover:bg-[#1e2d40] transition">
              <div className="flex justify-between items-center gap-4"><span className="text-white font-bold text-xs">Field C</span><ChevronDown size={12} className="text-slate-400"/></div>
              <div className="text-slate-300 text-[10px]">2.15 Acres</div>
              <div className="text-[#22c55e] text-[10px] flex items-center gap-1 mt-1"><CheckCircle2 size={10}/> Health 82%</div>
          </div>
          <div className="absolute bottom-1/4 left-1/2 -translate-x-10 bg-[#0f1722]/80 backdrop-blur border border-[#22c55e] p-2 rounded-lg pointer-events-auto cursor-pointer hover:bg-[#1e2d40] transition">
              <div className="flex justify-between items-center gap-4"><span className="text-white font-bold text-xs">Field D</span><ChevronDown size={12} className="text-slate-400"/></div>
              <div className="text-slate-300 text-[10px]">2.60 Acres</div>
              <div className="text-[#22c55e] text-[10px] flex items-center gap-1 mt-1"><CheckCircle2 size={10}/> Health 90%</div>
          </div>
      </div>

      {/* Map Left Controls */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
        {[Crosshair, Plus, Minus, RefreshCw, Target, Box].map((Icon, i) => (
            <button key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f1722]/80 backdrop-blur border border-[#1e2d40] text-slate-300 hover:bg-[#10b981] hover:text-white transition ${i===5 ? 'text-[#10b981] font-bold text-xs' : ''}`}>
                {i === 5 ? '3D' : <Icon size={16} />}
            </button>
        ))}
      </div>

      {/* Map Bottom Layers Menu */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-[#0f1722]/80 backdrop-blur p-2 rounded-xl border border-[#1e2d40]">
        {[
            { icon: Droplet, label: 'Irrigation Zones', color: 'text-blue-400' },
            { icon: CloudRain, label: 'Soil Moisture', color: 'text-cyan-400' },
            { icon: Layers, label: 'Nutrient Map', color: 'text-amber-400' },
            { icon: Leaf, label: 'Crop Health', color: 'text-emerald-400' },
            { icon: Droplets, label: 'Hydrogel Zones', color: 'text-indigo-400' },
            { icon: Box, label: 'Mulch Coverage', color: 'text-orange-400' }
        ].map((item, i) => (
            <button key={i} className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-[#1e2d40] transition min-w-[80px]">
                <item.icon size={20} className={item.color} />
                <span className="text-[10px] text-slate-300 font-medium text-center">{item.label}</span>
            </button>
        ))}
      </div>
    </div>
  );
};

const MainDashboard = () => (
  <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-[#0b131e]">
    
    {/* Center Column: Map & Bottom Metrics */}
    <div className="flex-1 flex flex-col gap-4 min-w-0">
      
      {/* 3D MAP */}
      <div className="flex-1 relative">
        <DigitalTwinMap />
      </div>

      {/* BOTTOM ROW: Key Metrics & Quick Actions */}
      <div className="h-48 shrink-0 flex gap-4">
        
        {/* Key Metrics */}
        <div className="flex-1 bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col">
          <h3 className="text-white text-xs font-bold tracking-wide mb-3 uppercase">Key Metrics</h3>
          <div className="flex gap-4 flex-1">
            {METRICS_DATA.map((metric, i) => (
              <div key={i} className="flex-1 flex flex-col justify-between p-3 rounded-lg bg-[#0f1722] border border-[#1e2d40]">
                <div>
                  <div className="text-[10px] text-slate-400 leading-tight mb-1">{metric.label}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-light text-white">{metric.value}</span>
                    <span className="text-[10px] text-slate-500">{metric.suffix}</span>
                  </div>
                  <div className="text-[10px] text-[#10b981] mt-1">{metric.status}</div>
                </div>
                <div className="h-10 w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metric.data.map((val, idx) => ({ name: idx, val }))}>
                      <Line type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="w-80 shrink-0 bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col">
          <h3 className="text-white text-xs font-bold tracking-wide mb-3 uppercase">Quick Actions</h3>
          <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1">
            {[
              { icon: PlayCircle, label: 'Run Simulation', color: 'text-cyan-400' },
              { icon: Droplet, label: 'Irrigation Plan', color: 'text-blue-400' },
              { icon: Leaf, label: 'Nutrient Advisor', color: 'text-emerald-400' },
              { icon: FileText, label: 'Generate Report', color: 'text-slate-300' }
            ].map((action, i) => (
              <button key={i} className="flex flex-col items-center justify-center gap-2 rounded-lg bg-[#0f1722] border border-[#1e2d40] hover:bg-[#1c293a] transition cursor-pointer">
                <action.icon size={20} className={action.color} />
                <span className="text-[10px] text-slate-300 text-center px-2">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>

    {/* Right Sidebar: Summaries & Weather */}
    <div className="w-80 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
      
      {/* Farm Summary */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5">
        <h3 className="text-white text-xs font-bold tracking-wide mb-4 uppercase">Farm Summary</h3>
        <div className="space-y-3 text-xs">
          {[
            { icon: Target, label: 'Total Area', val: '9.50 Acres' },
            { icon: Leaf, label: 'Total Plants', val: '4,320' },
            { icon: Box, label: 'Active Fields', val: '4' },
            { icon: Droplet, label: 'Grape Variety', val: 'Thompson Seedless' },
            { icon: Droplets, label: 'Average Soil Moisture', val: '62%' },
            { icon: CheckCircle2, label: 'Crop Health Index', val: '87%' },
            { icon: Droplet, label: 'Water Availability', val: 'Good', valColor: 'text-[#10b981]' },
            { icon: Calendar, label: 'Next Irrigation', val: 'Not Required', valColor: 'text-[#10b981]' },
            { icon: CloudRain, label: 'Rainfall Forecast (3 Days)', val: '18 mm' }
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400">
                <item.icon size={14} className="text-emerald-500/70"/>
                <span>{item.label}</span>
              </div>
              <span className={`font-medium ${item.valColor || 'text-white'}`}>{item.val}</span>
            </div>
          ))}
        </div>
        <button className="w-full mt-5 py-2 rounded-lg border border-[#1e2d40] text-slate-300 text-xs hover:bg-[#1c293a] transition">
          View Full Summary
        </button>
      </div>

      {/* Weather Summary */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5">
        <h3 className="text-white text-xs font-bold tracking-wide mb-4 uppercase">Weather Summary</h3>
        
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Sun size={36} className="text-amber-400" />
            <div>
              <div className="text-3xl font-light text-white leading-none">28°C</div>
              <div className="text-[10px] text-slate-400 mt-1">Partly Cloudy</div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-[10px]">
            <div className="flex justify-between w-16"><span className="text-slate-400">Min</span><span className="text-white">21°C</span></div>
            <div className="flex justify-between w-16"><span className="text-slate-400">Max</span><span className="text-red-400">31°C</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-[#0f1722] p-2 rounded flex flex-col items-center justify-center border border-[#1e2d40]">
                <CloudRain size={12} className="text-blue-400 mb-1"/>
                <span className="text-[9px] text-slate-400 mb-1 text-center">Rainfall (24h)</span>
                <span className="text-xs text-white">12 mm</span>
            </div>
            <div className="bg-[#0f1722] p-2 rounded flex flex-col items-center justify-center border border-[#1e2d40]">
                <Droplets size={12} className="text-cyan-400 mb-1"/>
                <span className="text-[9px] text-slate-400 mb-1 text-center">Humidity</span>
                <span className="text-xs text-white">65%</span>
            </div>
            <div className="bg-[#0f1722] p-2 rounded flex flex-col items-center justify-center border border-[#1e2d40]">
                <Wind size={12} className="text-slate-300 mb-1"/>
                <span className="text-[9px] text-slate-400 mb-1 text-center">Wind</span>
                <span className="text-xs text-white">18 km/h</span>
            </div>
        </div>

        <div>
            <div className="flex justify-between text-[10px] mb-2">
                <span className="text-slate-400">Rainfall Forecast (7 Days)</span>
                <span className="text-slate-500">(mm)</span>
            </div>
            <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={RAINFALL_FORECAST}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748b'}} />
                        <Tooltip cursor={{fill: '#1e2d40'}} contentStyle={{backgroundColor: '#0f1722', border: 'none', borderRadius: '4px', fontSize: '10px', color: '#fff'}}/>
                        <Bar dataKey="val" fill="#3b82f6" radius={[2,2,0,0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <button className="w-full mt-4 py-2 rounded-lg border border-[#1e2d40] text-slate-300 text-xs hover:bg-[#1c293a] transition">
          View Weather Intelligence
        </button>
      </div>

      {/* Recent Alerts */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-xs font-bold tracking-wide uppercase">Recent Alerts</h3>
            <span className="text-[10px] text-emerald-400 cursor-pointer hover:underline">View All</span>
        </div>
        
        <div className="space-y-4 flex-1">
            <div className="flex gap-3">
                <div className="mt-0.5"><AlertTriangle size={14} className="text-orange-400"/></div>
                <div className="flex-1">
                    <div className="text-[11px] text-white leading-tight">High temperature expected</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Field B</div>
                </div>
                <div className="text-[9px] text-slate-500">10 min ago</div>
            </div>
            <div className="flex gap-3">
                <div className="mt-0.5"><Leaf size={14} className="text-yellow-400"/></div>
                <div className="flex-1">
                    <div className="text-[11px] text-white leading-tight">Low nitrogen in Zone B2</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Field B</div>
                </div>
                <div className="text-[9px] text-slate-500">35 min ago</div>
            </div>
            <div className="flex gap-3">
                <div className="mt-0.5"><CloudRain size={14} className="text-blue-400"/></div>
                <div className="flex-1">
                    <div className="text-[11px] text-white leading-tight">Rainfall expected in 18 hrs</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Farm</div>
                </div>
                <div className="text-[9px] text-slate-500">1 hr ago</div>
            </div>
        </div>
      </div>

    </div>
  </div>
);


// These act as detailed views when clicking sidebar items
const DetailPanel = ({ title, icon: Icon, children }: any) => (
    <div className="flex-1 flex flex-col p-8 bg-[#0b131e] overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
            <Icon size={28} className="text-emerald-500" />
            <h2 className="text-2xl font-light text-white">{title}</h2>
        </div>
        <div className="flex-1 bg-[#16202d] border border-[#1e2d40] rounded-2xl p-8 flex items-center justify-center">
             <div className="text-center max-w-md">
                 <Icon size={48} className="text-slate-600 mx-auto mb-4" />
                 <h3 className="text-lg text-slate-300 mb-2">{title} Module Active</h3>
                 <p className="text-sm text-slate-500">This module is part of the Digital Twin ecosystem. Data flows seamlessly between this panel and the central Farm Overview to provide holistic insights.</p>
             </div>
        </div>
    </div>
);


export default function App() {
  const [activeTab, setActiveTab] = useState('twin');

  return (
    <div className="flex h-screen w-screen bg-[#060B12] text-white font-sans overflow-hidden">
      
      {/* Left Sidebar */}
      <aside className="w-64 shrink-0 bg-[#0f1722] border-r border-[#1e2d40] flex flex-col z-30">
        <div className="h-16 shrink-0"></div> {/* Spacer for TopBar */}
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="flex flex-col gap-1 px-3">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all text-left group ${
                    isActive 
                    ? 'bg-gradient-to-r from-emerald-500/20 to-transparent border-l-2 border-emerald-500' 
                    : 'hover:bg-[#16202d] border-l-2 border-transparent'
                  }`}
                >
                  <item.icon size={18} className={isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'} />
                  <div className="flex flex-col">
                    <span className={`text-sm ${isActive ? 'text-emerald-400 font-medium' : 'text-slate-300 group-hover:text-white'}`}>
                      {item.label}
                    </span>
                    {item.subLabel && isActive && (
                      <span className="text-[10px] text-slate-400 mt-0.5">{item.subLabel}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Status Ring */}
        <div className="p-4 border-t border-[#1e2d40] flex flex-col items-center">
            <h4 className="text-[10px] text-slate-400 uppercase tracking-widest mb-4 w-full text-left pl-2">Farm Status</h4>
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* SVG Circle Chart */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1e2d40" strokeWidth="6" fill="none" />
                    <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="6" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.87)} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <div className="text-3xl font-light text-white flex items-baseline">
                        87<span className="text-sm text-slate-400 ml-0.5">%</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-4 text-[#10b981]">
                <CheckCircle2 size={14}/>
                <span className="text-sm font-medium">Healthy</span>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
        {/* View Router */}
        {activeTab === 'twin' && <MainDashboard />}
        {activeTab === 'weather' && <DetailPanel title="Weather Intelligence" icon={CloudRain} />}
        {activeTab === 'soil' && <DetailPanel title="Intelligent Soil" icon={Droplets} />}
        {activeTab === 'lifecycle' && <DetailPanel title="Grape Lifecycle" icon={Leaf} />}
        {activeTab === 'hydrogels' && <DetailPanel title="Intelligent Hydrogels" icon={Droplet} />}
        {activeTab === 'mulching' && <DetailPanel title="Smart Mulching" icon={Layers} />}
        {/* Catch all for others */}
        {['predictions', 'recommendations', 'simulation', 'analytics', 'alerts', 'reports', 'settings'].includes(activeTab) && (
            <DetailPanel title={SIDEBAR_ITEMS.find(i => i.id === activeTab)?.label} icon={SIDEBAR_ITEMS.find(i => i.id === activeTab)?.icon} />
        )}

      </div>
    </div>
  );
}