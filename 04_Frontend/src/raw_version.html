<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apollo AgriVerse | Advanced Digital Twin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        oxford: '#081D3A', // Chatake Brand Primary
                        oldgold: '#CFB53B', // Chatake Brand Accent
                        glass: 'rgba(8, 29, 58, 0.7)'
                    },
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        mono: ['Roboto Mono', 'monospace']
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Roboto+Mono:wght@400;600&display=swap');
        
        body { 
            font-family: 'Inter', sans-serif; 
            overflow: hidden; 
            background-color: #040d1a; 
            color: #e2e8f0;
        }
        .glass-panel { 
            background: linear-gradient(135deg, rgba(8, 29, 58, 0.8) 0%, rgba(4, 13, 26, 0.9) 100%);
            backdrop-filter: blur(12px); 
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1); 
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
        }
        .chart-container { position: relative; width: 100%; height: 160px; }
        .radar-container { position: relative; width: 100%; height: 180px; display: flex; justify-content: center; }
        
        canvas { cursor: crosshair; outline: none; }
        
        /* Custom Scrollbar for data panels */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: #CFB53B; border-radius: 4px; }
        
        .pulse-ring {
            animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(2.5); opacity: 0; }
        }
        .scan-line {
            width: 100%; height: 2px; background: rgba(207, 181, 59, 0.5);
            position: absolute; top: 0; left: 0; z-index: 10;
            animation: scan 4s linear infinite;
        }
        @keyframes scan {
            0% { top: 0; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 100%; opacity: 0; }
        }
    </style>
</head>
<body class="antialiased">

    <!-- HEADER: Farm Metadata -->
    <header class="h-16 border-b border-white/10 glass-panel flex items-center justify-between px-6 z-50 relative">
        <div class="flex items-center gap-4">
            <div class="relative w-10 h-10 rounded flex items-center justify-center bg-oxford border border-oldgold">
                <span class="text-oldgold font-bold text-xl relative z-10">C</span>
                <div class="absolute inset-0 rounded border border-oldgold pulse-ring"></div>
            </div>
            <div>
                <h1 class="font-bold text-lg leading-tight tracking-wide text-white">Chatake Innoworks <span class="text-oldgold font-light">| Apollo AgriVerse</span></h1>
                <div class="flex gap-3 text-[10px] uppercase tracking-widest text-slate-400 font-mono mt-0.5">
                    <span><span class="text-emerald-400">●</span> Solapur, MH</span>
                    <span>Zone: B-4 (Black Cotton Soil)</span>
                    <span>Lat: 17.6599° N</span>
                </div>
            </div>
        </div>
        <div class="flex gap-6 items-center">
            <div class="flex flex-col items-end hidden md:flex">
                <span class="text-[10px] uppercase tracking-widest text-slate-400">Total Acreage / Crop</span>
                <span class="text-sm font-mono text-cyan-300">12.5 Ha / Glycine max (Soybean)</span>
            </div>
            <div class="h-8 w-[1px] bg-white/20"></div>
            <div class="flex flex-col items-end">
                <span class="text-[10px] font-bold text-emerald-400 px-2 py-0.5 bg-emerald-400/10 rounded border border-emerald-400/20">SYSTEM OPTIMAL</span>
                <span class="text-xs font-mono text-slate-300 mt-1" id="current-time">00:00:00</span>
            </div>
        </div>
    </header>

    <main class="flex h-[calc(100vh-64px)] w-full overflow-hidden relative">
        
        <!-- LEFT SIDEBAR: Environmental & Soil Telemetry -->
        <aside class="w-80 h-full p-4 flex flex-col gap-4 z-40 overflow-y-auto relative glass-panel border-r border-white/10">
            <!-- Microclimate Stats -->
            <section class="bg-black/20 p-4 rounded-xl border border-white/5 shadow-[0_0_15px_rgba(6,182,212,0.1)] border-t-cyan-500/50">
                <h2 class="text-[10px] text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2 font-bold">
                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> Sensor-Mulch Telemetry
                </h2>
                <div class="grid grid-cols-2 gap-2 font-mono text-sm">
                    <div class="p-2 bg-oxford/50 rounded flex flex-col border border-white/5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                        <span class="text-[9px] text-slate-400">Film Surface Temp</span>
                        <span class="text-white text-lg" id="val-mulch-temp">38.5°C</span>
                    </div>
                    <div class="p-2 bg-oxford/50 rounded flex flex-col border border-white/5">
                        <span class="text-[9px] text-slate-400">Ambient Air</span>
                        <span class="text-slate-300 text-lg" id="val-temp">34.2°C</span>
                    </div>
                    <div class="p-2 bg-oxford/50 rounded flex flex-col border border-white/5 relative overflow-hidden">
                        <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                        <span class="text-[9px] text-slate-400">Sub-Film Moisture Gr.</span>
                        <span class="text-white text-lg" id="val-moisture-grad">+2.4% /cm</span>
                    </div>
                    <div class="p-2 bg-oxford/50 rounded flex flex-col border border-white/5">
                        <span class="text-[9px] text-slate-400">Thermal Gradient</span>
                        <span class="text-white text-lg" id="val-thermal-grad">Δ 4.3°C</span>
                    </div>
                </div>
            </section>

            <section class="bg-black/20 p-4 rounded-xl border border-white/5">
                <div class="flex justify-between items-end mb-2">
                    <h2 class="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-blue-500"></span> Hydrology Dynamics
                    </h2>
                    <span class="text-xs font-mono text-cyan-400" id="val-moisture">Moisture: 32.4%</span>
                </div>
                <div class="chart-container">
                    <canvas id="moistureChart"></canvas>
                </div>
                <div class="flex justify-between text-[9px] font-mono mt-2 text-slate-400">
                    <span class="text-emerald-400">■ Soil Moisture</span>
                    <span class="text-cyan-400">■ Hydrogel Saturation</span>
                </div>
            </section>

            <section class="bg-black/20 p-4 rounded-xl border border-white/5 flex-1">
                <div class="flex justify-between items-end mb-2">
                    <h2 class="text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-oldgold"></span> NPK & pH Profiling
                    </h2>
                    <span class="text-xs font-mono text-oldgold" id="val-ph">pH: 6.8</span>
                </div>
                <div class="radar-container">
                    <canvas id="npkChart"></canvas>
                </div>
            </section>
        </aside>

        <!-- CENTER VIEWPORT: 3D Twin Engine -->
        <section class="flex-1 relative bg-black overflow-hidden" id="viewport-container">
            <!-- 3D Canvas -->
            <div id="three-container" class="absolute inset-0"></div>
            <div class="scan-line"></div>
            
            <!-- Contextual HUD overlay -->
            <div id="info-overlay" class="absolute top-6 left-6 max-w-sm glass-panel p-5 rounded-xl pointer-events-none border-l-4 border-l-oldgold transition-opacity duration-500">
                <h3 class="font-mono font-bold text-white text-sm mb-1 tracking-wider uppercase" id="info-title">Macro Level: Field Topology</h3>
                <p class="text-xs text-slate-300 leading-relaxed font-light" id="info-desc">
                    High-level digital twin of the 12.5-hectare plot. Topography simulated via Perlin noise. Real-time mapping of moisture gradients across furrows.
                </p>
            </div>

            <!-- Micro interaction hint -->
            <div id="micro-hint" class="absolute bottom-10 left-1/2 -translate-x-1/2 glass-panel border border-cyan-500/50 text-cyan-300 px-6 py-3 rounded-full text-xs font-mono tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-bounce hidden cursor-pointer transition hover:bg-cyan-900/50">
                TARGET HYDROGEL SPHERE DETECTED. CLICK FOR ML OPTIMIZATION.
            </div>
        </section>

        <!-- RIGHT SIDEBAR: ML Brain & Navigation -->
        <aside class="w-80 h-full p-4 flex flex-col gap-4 z-40 overflow-y-auto relative glass-panel border-l border-white/10">
            
            <section class="bg-black/20 p-4 rounded-xl border border-white/5">
                <h2 class="text-[10px] text-slate-400 uppercase tracking-widest mb-3">Atmospheric Controls</h2>
                <div class="flex gap-2">
                    <button onclick="setWeather('sun')" id="btn-sun" class="btn-weather flex-1 p-2 rounded bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-mono hover:bg-orange-500/30 transition shadow-[0_0_10px_rgba(249,115,22,0)] hover:shadow-[0_0_10px_rgba(249,115,22,0.3)]">☀ SUN</button>
                    <button onclick="setWeather('normal')" id="btn-normal" class="btn-weather flex-1 p-2 rounded bg-slate-500/10 border border-white/50 text-white text-[10px] font-mono hover:bg-slate-500/30 transition">⛅ NORM</button>
                    <button onclick="setWeather('rain')" id="btn-rain" class="btn-weather flex-1 p-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono hover:bg-blue-500/30 transition shadow-[0_0_10px_rgba(59,130,246,0)] hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]">🌧 RAIN</button>
                </div>
            </section>

            <!-- Navigation Controls -->
            <section class="bg-black/20 p-4 rounded-xl border border-white/5">
                <h2 class="text-[10px] text-slate-400 uppercase tracking-widest mb-3">Twin Spatial Resolution</h2>
                <div class="flex flex-col gap-2">
                    <button onclick="setView('macro')" id="btn-macro" class="btn-nav active w-full p-3 rounded-lg text-left flex items-center gap-3 border border-oldgold/50 bg-oldgold/10 transition-all text-oldgold hover:bg-oldgold/20">
                        <span class="font-mono font-bold text-sm">01 / MACRO</span>
                        <div class="text-[9px] font-light text-slate-300 ml-auto">FARM GRID</div>
                    </button>
                    <button onclick="setView('meso')" id="btn-meso" class="btn-nav w-full p-3 rounded-lg text-left flex items-center gap-3 border border-white/10 bg-white/5 transition-all text-slate-400 hover:text-white hover:border-white/30">
                        <span class="font-mono font-bold text-sm">02 / MESO</span>
                        <div class="text-[9px] font-light text-slate-300 ml-auto">CROP HEALTH</div>
                    </button>
                    <button onclick="setView('micro')" id="btn-micro" class="btn-nav w-full p-3 rounded-lg text-left flex items-center gap-3 border border-white/10 bg-white/5 transition-all text-slate-400 hover:text-white hover:border-white/30">
                        <span class="font-mono font-bold text-sm">03 / MICRO</span>
                        <div class="text-[9px] font-light text-slate-300 ml-auto">SOIL & GELS</div>
                    </button>
                </div>
            </section>

            <!-- ML Engine Output -->
            <section class="flex-1 bg-black/40 p-4 rounded-xl border border-white/10 flex flex-col relative overflow-hidden">
                <div class="absolute top-0 right-0 p-2 opacity-10">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <h2 class="text-[10px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Predictive Engine v2.1
                </h2>
                
                <div class="font-mono text-[10px] text-emerald-400 mb-2">> MODEL: Random_Forest_Regressor</div>
                <div class="font-mono text-[10px] text-cyan-400 mb-4">> CONFIDENCE: 94.8%</div>
                
                <div id="ml-status" class="flex-1">
                    <div class="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded mb-3">
                        <p class="text-xs font-bold text-emerald-400 mb-1">CROP STRESS: NORMAL</p>
                        <p class="text-[10px] text-slate-300 leading-relaxed">
                            Simulated PINN (Physics-Informed Neural Network) analysis indicates bulk soil moisture is stable. Hydrogel matrix is releasing water at 0.15 mL/hr, perfectly offsetting current evapotranspiration.
                        </p>
                    </div>
                </div>

                <div class="border-t border-white/10 pt-3 mt-auto font-mono text-[9px] space-y-2">
                    <div class="flex justify-between">
                        <span class="text-slate-400">Pred. Wilt Probability:</span>
                        <span class="text-emerald-400">1.2%</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">Next Auto-Irrigation:</span>
                        <span class="text-slate-200">22:00 HRS (Volume: 0L)</span>
                    </div>
                </div>
            </section>
        </aside>
    </main>

    <!-- FORMULA MODAL -->
    <div id="formula-modal" class="fixed inset-0 z-[100] hidden items-center justify-center bg-black/80 backdrop-blur-md">
        <div class="bg-oxford border border-cyan-500/50 rounded-2xl p-8 max-w-lg w-full shadow-[0_0_40px_rgba(6,182,212,0.2)] mx-4 relative overflow-hidden">
            <!-- Decorative tech background -->
            <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#06b6d4 1px, transparent 1px); background-size: 20px 20px;"></div>
            
            <div class="relative z-10">
                <div class="flex justify-between items-start mb-4">
                    <h2 class="text-lg font-bold text-white font-mono tracking-wider flex items-center gap-3">
                        <span class="text-cyan-400">⚛</span> AI Material Optimization
                    </h2>
                    <button onclick="closeModal()" class="text-slate-400 hover:text-white">✕</button>
                </div>
                
                <p class="text-[11px] text-slate-300 mb-6 font-light">
                    The Digital Twin uses Bayesian Optimization to maximize the objective function of the stimuli-responsive hydrogel.
                </p>
                
                <div class="bg-black/50 p-5 rounded-xl font-mono text-xs text-white mb-6 border border-cyan-500/30 shadow-inner">
                    <p class="text-center mb-4 text-cyan-300 font-bold text-sm">max E(x) = w₁S(x) + w₂R(x) - w₃D(x)</p>
                    <div class="space-y-3 pt-4 border-t border-white/10">
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">Swelling Capacity S(x):</span> 
                            <span class="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">+84.2%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">Release Profile R(x):</span> 
                            <span class="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded">+76.5%</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">Degradation Rate D(x):</span> 
                            <span class="text-rose-400 font-bold bg-rose-400/10 px-2 py-0.5 rounded">-2.1%</span>
                        </div>
                    </div>
                </div>

                <div class="p-4 bg-oldgold/10 border border-oldgold/30 rounded-xl mb-6">
                    <p class="text-xs leading-relaxed text-slate-200">
                        <strong class="text-oldgold font-mono tracking-wider">AI RECOMMENDATION:</strong><br> 
                        Synthesize next batch by increasing polyacrylamide cross-linking density by <span class="text-cyan-400 font-bold">3.2%</span>. This restricts rapid swelling but extends moisture release duration by <span class="text-emerald-400 font-bold">14.5 hours</span> during peak thermal stress.
                    </p>
                </div>

                <button onclick="closeModal()" class="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-mono font-bold tracking-widest transition shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                    APPLY FORMULA TO TWIN
                </button>
            </div>
        </div>
    </div>

    <script>
        // --- 1. STATE & DATA GENERATOR ---
        let currentView = 'macro';
        let isEmergency = false;
        
        const state = {
            timeLabel: [],
            moisture: [],
            hydrogel: [],
            npk: [112, 45, 88], // N, P, K
            ph: 6.82,
            temp: 34.2,
            stress: 0
        };

        // Initialize historical data
        for(let i=0; i<15; i++) {
            state.timeLabel.push('');
            state.moisture.push(35 - (i * 0.1));
            state.hydrogel.push(80 - (i * 0.2));
        }

        // --- 2. CHART.JS SETUP ---
        Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
        Chart.defaults.font.family = "'Roboto Mono', monospace";
        
        // Chart 1: Moisture vs Hydrogel
        const ctxMoisture = document.getElementById('moistureChart').getContext('2d');
        const moistureChart = new Chart(ctxMoisture, {
            type: 'line',
            data: {
                labels: state.timeLabel,
                datasets: [
                    {
                        label: 'Moisture %',
                        data: state.moisture,
                        borderColor: '#34d399', // Emerald 400
                        backgroundColor: 'rgba(52, 211, 153, 0.1)',
                        borderWidth: 1.5,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Hydrogel %',
                        data: state.hydrogel,
                        borderColor: '#22d3ee', // Cyan 400
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { display: false },
                    y: { 
                        min: 10, max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { font: { size: 9 }, stepSize: 30 }
                    }
                }
            }
        });

        // Chart 2: NPK Radar
        const ctxNpk = document.getElementById('npkChart').getContext('2d');
        const npkChart = new Chart(ctxNpk, {
            type: 'radar',
            data: {
                labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
                datasets: [{
                    data: state.npk,
                    backgroundColor: 'rgba(207, 181, 59, 0.2)', // Old Gold
                    borderColor: '#CFB53B',
                    pointBackgroundColor: '#CFB53B',
                    pointBorderColor: '#fff',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        pointLabels: { font: { size: 9, family: "'Roboto Mono', monospace" }, color: '#94a3b8' },
                        ticks: { display: false, min: 0, max: 150 }
                    }
                }
            }
        });

        // --- 3. ADVANCED THREE.JS DIGITAL TWIN ENGINE ---
        const container = document.getElementById('three-container');
        const scene = new THREE.Scene();
        // Rich dark background with fog for depth
        scene.background = new THREE.Color(0x040d1a);
        scene.fog = new THREE.FogExp2(0x040d1a, 0.02);

        const camera = new THREE.PerspectiveCamera(60, container.offsetWidth / container.offsetHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1; // Slightly brighter for realism
        container.appendChild(renderer.domElement);

        // Rich deep twilight/dawn atmosphere
        scene.background = new THREE.Color(0x0a1128);
        scene.fog = new THREE.FogExp2(0x0a1128, 0.015);

        // Lighting (Cinematic Golden Hour / Smart Farm aesthetic)
        // Hemisphere light simulates sky (cool blue) and ground (warm brown) bounce light
        const hemiLight = new THREE.HemisphereLight(0x4a6b8c, 0x2b1c10, 0.6);
        scene.add(hemiLight);
        
        // Main Sun (Warm, directional)
        const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
        dirLight.position.set(30, 40, -10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 4096; // High-res shadows
        dirLight.shadow.mapSize.height = 4096;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        dirLight.shadow.camera.left = -40;
        dirLight.shadow.camera.right = 40;
        dirLight.shadow.camera.top = 40;
        dirLight.shadow.camera.bottom = -40;
        dirLight.shadow.bias = -0.0005; // Prevent shadow acne
        scene.add(dirLight);

        // Tech Fill Light (Cyan glow representing the digital twin scanning)
        const blueFillLight = new THREE.PointLight(0x06b6d4, 1.2, 80);
        blueFillLight.position.set(-20, 10, 20);
        scene.add(blueFillLight);

        let currentWeather = 'normal';
        
        // 1. Rain System (Fast moving line segments)
        const rainCount = 4000;
        const rainGeoLines = new THREE.BufferGeometry();
        const rainLinePos = new Float32Array(rainCount * 6); // 2 points per raindrop
        for(let i=0; i<rainCount; i++) {
            let x = (Math.random() - 0.5) * 80;
            let y = Math.random() * 80 - 10;
            let z = (Math.random() - 0.5) * 80;
            rainLinePos[i*6] = x;
            rainLinePos[i*6+1] = y;
            rainLinePos[i*6+2] = z;
            rainLinePos[i*6+3] = x;
            rainLinePos[i*6+4] = y - (1.0 + Math.random()*1.5); // Streak length
            rainLinePos[i*6+5] = z;
        }
        rainGeoLines.setAttribute('position', new THREE.BufferAttribute(rainLinePos, 3));
        const rainMat = new THREE.LineBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.3 });
        const rainSystem = new THREE.LineSegments(rainGeoLines, rainMat);
        rainSystem.visible = false;
        scene.add(rainSystem);

        // 2. Volumetric Sun Rays (Additive Blending)
        const sunRayGeo = new THREE.CylinderGeometry(8, 45, 100, 32, 1, true);
        const sunRayMat = new THREE.MeshBasicMaterial({ 
            color: 0xffcc77, 
            transparent: true, 
            opacity: 0.08, 
            blending: THREE.AdditiveBlending, 
            side: THREE.DoubleSide,
            depthWrite: false 
        });
        const sunRays = new THREE.Mesh(sunRayGeo, sunRayMat);
        sunRays.position.set(15, 30, 0);
        sunRays.rotation.x = Math.PI / 5;
        sunRays.rotation.z = -Math.PI / 6;
        sunRays.visible = false;
        scene.add(sunRays);

        const particleGeo = new THREE.BufferGeometry();
        const particleCount = 1500;
        const posArray = new Float32Array(particleCount * 3);
        for(let i = 0; i < particleCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 80; 
        }
        particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particleMat = new THREE.PointsMaterial({
            color: 0x06b6d4,
            size: 0.06,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // --- 3A. PROCEDURAL MACRO FARM (Field & Rows) ---
        const macroGroup = new THREE.Group();
        
        // Procedural Terrain (High-res Wavy Plane for Furrows)
        const terrainSize = 70;
        const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 256, 256);
        const posAttribute = terrainGeo.attributes.position;
        
        // Math to create realistic agricultural furrows (rows)
        const furrowFrequency = 1.5; 
        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);
            
            // Primary furrows along the X axis
            const ridge = Math.sin(x * furrowFrequency) * 0.3;
            // Secondary organic noise (perlin-like) for realism
            const noise = Math.sin(x * 0.5 + y * 0.8) * 0.15 + Math.cos(y * 1.2) * 0.1;
            
            posAttribute.setZ(i, ridge + noise);
        }
        terrainGeo.computeVertexNormals();
        
        // Rich, moist soil material using MeshPhysicalMaterial
        const terrainMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x241710,     // Deep rich brown
            roughness: 0.7,      // Mostly rough dirt
            metalness: 0.02,
            clearcoat: 0.15,     // Simulates moisture/wetness sheen on the soil
            clearcoatRoughness: 0.6,
            flatShading: false
        });
        const terrain = new THREE.Mesh(terrainGeo, terrainMat);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        macroGroup.add(terrain);

        // Subtle digital grid overlay mapped to the terrain contours
        const gridHelper = new THREE.GridHelper(terrainSize, 40, 0x06b6d4, 0xffffff);
        gridHelper.material.opacity = 0.08;
        gridHelper.material.transparent = true;
        gridHelper.position.y = 0.05;
        macroGroup.add(gridHelper);

        // Procedural Sensor-Integrated Mulching Film (Draped over crop rows)
        const mulchFilmMat = new THREE.MeshPhysicalMaterial({
            color: 0x111111,     // Dark protective plastic
            roughness: 0.2,
            metalness: 0.1,
            clearcoat: 0.9,      // Glossy sheen of plastic
            clearcoatRoughness: 0.1,
            side: THREE.DoubleSide
        });
        
        // ADDED: The digital sensor grid overlay for the mulch film tracking gradients
        const mulchGridMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4, // Cyan tech glow
            wireframe: true,
            transparent: true,
            opacity: 0.15,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const mulchGrids = [];
        
        const rowCount = 22;
        const plantsPerRow = 45;

        for(let r=0; r<rowCount; r++){
            const n = r - (rowCount/2);
            const baseX = (Math.PI/2 + 2*Math.PI*n) / furrowFrequency;
            
            // Create a plane for each strip of mulch paper
            const stripGeo = new THREE.PlaneGeometry(1.4, terrainSize, 4, 128);
            stripGeo.rotateX(-Math.PI/2);
            const pos = stripGeo.attributes.position;
            
            for(let i=0; i<pos.count; i++) {
                let x = pos.getX(i) + baseX;
                let z = pos.getZ(i);
                
                // Match the exact terrain height mathematics so it hugs the soil
                const ridge = Math.sin(x * furrowFrequency) * 0.3;
                const noise = Math.sin(x * 0.5 + z * 0.8) * 0.15 + Math.cos(z * 1.2) * 0.1;
                
                // Arch the mulch slightly over the ridge crest
                const localX = pos.getX(i); 
                const arch = Math.cos((localX / 1.4) * Math.PI) * 0.1; 
                
                pos.setY(i, ridge + noise + arch + 0.02); // Float slightly above dirt
                pos.setX(i, localX); // Keep local X relative to the strip center
            }
            stripGeo.computeVertexNormals();
            const strip = new THREE.Mesh(stripGeo, mulchFilmMat);
            strip.position.x = baseX;
            strip.receiveShadow = true;
            macroGroup.add(strip);
            
            // ADDED: Embed the sensor grid mesh exactly over the plastic strip
            const stripGrid = new THREE.Mesh(stripGeo, mulchGridMat);
            stripGrid.position.x = baseX;
            macroGroup.add(stripGrid);
            mulchGrids.push(stripGrid);
        }

        // Procedural Crop Rows (Lush organic canopy)
        const cropGeo = new THREE.IcosahedronGeometry(0.35, 1);
        // Distort the sphere to look leafy and varied
        const cropPos = cropGeo.attributes.position;
        for(let i=0; i<cropPos.count; i++) {
            cropPos.setY(i, cropPos.getY(i) * 1.5); // Stretch upward
            cropPos.setX(i, cropPos.getX(i) + (Math.random() - 0.5)*0.1); // Add random leaf jaggedness
            cropPos.setZ(i, cropPos.getZ(i) + (Math.random() - 0.5)*0.1);
        }
        cropGeo.computeVertexNormals();
        
        // Waxy, vibrant green material mimicking healthy leaves catching sunlight
        const cropMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x16a34a, 
            emissive: 0x064e3b,
            emissiveIntensity: 0.15,
            roughness: 0.4, 
            metalness: 0.05,
            clearcoat: 0.1, // Waxy leaf reflection
        });
        const instancedCrops = new THREE.InstancedMesh(cropGeo, cropMat, rowCount * plantsPerRow);
        
        const cropAnimData = []; 
        let instanceIdx = 0;
        const dummy = new THREE.Object3D();
        
        // Plant crops exactly on the crests of the procedural furrows
        for (let r = 0; r < rowCount; r++) {
            // Find the X coordinate that aligns with the peak of the sine wave (furrow)
            // Math.sin(x * furrowFrequency) = 1  =>  x * furrowFrequency = PI/2 + 2*PI*n
            const n = r - (rowCount/2);
            const x = (Math.PI/2 + 2*Math.PI*n) / furrowFrequency; 

            for (let p = 0; p < plantsPerRow; p++) {
                const z = -30 + (p * 1.35) + (Math.random() * 0.2); // Slight random spacing
                
                // Calculate terrain height at this specific (x, z)
                const ridge = Math.sin(x * furrowFrequency) * 0.3;
                const noise = Math.sin(x * 0.5 + z * 0.8) * 0.15 + Math.cos(z * 1.2) * 0.1;
                const y = ridge + noise + 0.25; // Sit on top of the soil
                
                const scale = 0.7 + Math.random() * 0.6; // Varied plant sizes
                const phase = (x + z) * 0.5 + Math.random(); // Fluid wind phase
                cropAnimData.push({ x, y, z, scale, phase });
                
                dummy.position.set(x, y, z);
                dummy.rotation.y = Math.random() * Math.PI * 2;
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                
                // Slight color variations for realism (some lighter, some darker green)
                const color = new THREE.Color();
                color.setHSL(0.33 + (Math.random() * 0.06), 0.7 + (Math.random()*0.2), 0.3 + (Math.random()*0.15));
                instancedCrops.setColorAt(instanceIdx, color);
                instancedCrops.setMatrixAt(instanceIdx, dummy.matrix);
                instanceIdx++;
            }
        }
        instancedCrops.castShadow = true;
        instancedCrops.receiveShadow = true;
        macroGroup.add(instancedCrops);

        // Surface Hydrogels (Scattered glowing dots inside the furrows)
        const surfaceGelGeo = new THREE.SphereGeometry(0.06, 12, 12);
        const surfaceGelMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x06b6d4, 
            emissive: 0x0891b2,
            emissiveIntensity: 0.8,
            transparent: true, 
            opacity: 0.9,
            clearcoat: 1.0
        });
        const hydrogelCount = 600;
        const instancedSurfaceGels = new THREE.InstancedMesh(surfaceGelGeo, surfaceGelMat, hydrogelCount);
        const surfaceGelData = [];
        
        for (let i = 0; i < hydrogelCount; i++) {
            const x = (Math.random() - 0.5) * 65;
            const z = (Math.random() - 0.5) * 65;
            
            // Place gels slightly lower, resting on/in the soil
            const ridge = Math.sin(x * furrowFrequency) * 0.3;
            const noise = Math.sin(x * 0.5 + z * 0.8) * 0.15 + Math.cos(z * 1.2) * 0.1;
            const y = ridge + noise + 0.02; 

            surfaceGelData.push({x, y, z, phase: Math.random() * Math.PI * 2});
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            instancedSurfaceGels.setMatrixAt(i, dummy.matrix);
        }
        macroGroup.add(instancedSurfaceGels);
        scene.add(macroGroup);

        const mesoGroup = new THREE.Group();
        
        // Highly realistic organic curved stem using CatmullRomCurve3
        const stemCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.08, 1, -0.05),
            new THREE.Vector3(-0.04, 2.5, 0.08),
            new THREE.Vector3(0, 4, 0)
        ]);
        const stemGeo = new THREE.TubeGeometry(stemCurve, 32, 0.08, 12, false);
        const stemMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x059669, 
            roughness: 0.7, 
            clearcoat: 0.1,
            metalness: 0.0 
        });
        const mesoStem = new THREE.Mesh(stemGeo, stemMat);
        mesoStem.castShadow = true;
        mesoGroup.add(mesoStem);

        // Internal Nutrient/Water Flow Animation
        const flowDots = [];
        const flowGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const flowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        for(let i=0; i<12; i++) {
            const dot = new THREE.Mesh(flowGeo, flowMat);
            dot.userData = { 
                speed: 0.015 + Math.random() * 0.015, 
                offset: (Math.random()-0.5)*0.06,
                progress: Math.random() 
            };
            mesoGroup.add(dot);
            flowDots.push(dot);
        }

        // Procedurally crafted realistic leaf blade (curved in 3D space)
        const leafGeo = new THREE.PlaneGeometry(1.2, 3.5, 15, 15);
        const leafPos = leafGeo.attributes.position;
        for(let i=0; i<leafPos.count; i++) {
            let x = leafPos.getX(i);
            let y = leafPos.getY(i);
            
            // Central crease (V-shape along the spine)
            let z = -Math.pow(x * 1.8, 2) * 0.4;
            // Gravity droop (bending downward over length)
            z -= Math.pow(y + 1.75, 2) * 0.08; 
            
            // Natural leaf tapering (wide in middle, pinched at tips)
            let widthScale = Math.sin(((y + 1.75) / 3.5) * Math.PI);
            // Add a tiny bit of organic waviness to the edges
            let wave = Math.sin(y * 10) * 0.02 * (Math.abs(x));

            leafPos.setX(i, x * widthScale * 1.2);
            leafPos.setZ(i, z + wave);
        }
        leafGeo.computeVertexNormals();
        
        const mesoLeafMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x15803d, // Deep organic green
            emissive: 0x064e3b,
            emissiveIntensity: 0.2,
            roughness: 0.35, 
            metalness: 0.0,
            clearcoat: 0.6, // Simulates the waxy, reflective cuticle of a real leaf
            clearcoatRoughness: 0.25,
            side: THREE.DoubleSide 
        });
        
        const mesoLeaves = [];
        // Attach leaves naturally along the curved stem
        for(let i=0; i<9; i++) {
            const leaf = new THREE.Mesh(leafGeo, mesoLeafMat);
            // Distribute along stem height
            const t = (i + 1) / 10; 
            const pt = stemCurve.getPoint(t);
            leaf.position.copy(pt);
            
            // Spiral phyllotaxis (Golden Angle ~137.5 degrees)
            const angle = i * 2.4; 
            leaf.rotation.y = angle;
            
            // Base drooping angle
            leaf.rotation.x = Math.PI / 3;
            
            // Push out slightly from stem center
            leaf.position.x += Math.sin(angle) * 0.05;
            leaf.position.z += Math.cos(angle) * 0.05;
            
            // Smaller leaves at top, larger at bottom
            const s = 1.3 - (t * 0.6);
            leaf.scale.set(s, s, s);
            
            leaf.castShadow = true;
            leaf.receiveShadow = true;
            mesoGroup.add(leaf);
            mesoLeaves.push({ mesh: leaf, baseRotX: leaf.rotation.x, phase: i });
        }
        mesoGroup.visible = false;
        scene.add(mesoGroup);

        // --- 3C. PROCEDURAL MICRO SOIL (Underground & Gels) ---
        const microGroup = new THREE.Group();
        
        // Create a cutaway diorama to clearly see roots and gels (like the blueprint image)
        const dirtMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 1, flatShading: true });
        
        // Sensor-Integrated Mulching Layer (Glossy top film with embedded tech grid)
        const dioramaMulchMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x0a0a0a, 
            roughness: 0.3, 
            metalness: 0.2, 
            clearcoat: 1.0, 
            clearcoatRoughness: 0.1 
        }); 
        
        // Top Mulch Layer
        const topGeo = new THREE.BoxGeometry(6, 0.05, 6);
        const topMesh = new THREE.Mesh(topGeo, dioramaMulchMat);
        topMesh.position.y = 0.0;
        topMesh.receiveShadow = true;
        microGroup.add(topMesh);

        // The digital sensor grid printed onto the mulching paper
        const sensorGrid = new THREE.GridHelper(6, 15, 0x06b6d4, 0x06b6d4);
        sensorGrid.position.y = 0.03;
        sensorGrid.material.opacity = 0.6;
        sensorGrid.material.transparent = true;
        microGroup.add(sensorGrid);

        // Back Soil Wall
        const backGeo = new THREE.BoxGeometry(6, 4, 0.2);
        const backMesh = new THREE.Mesh(backGeo, dirtMat);
        backMesh.position.set(0, -2, -3);
        backMesh.receiveShadow = true;
        microGroup.add(backMesh);

        // Left Soil Wall
        const leftGeo = new THREE.BoxGeometry(0.2, 4, 6);
        const leftMesh = new THREE.Mesh(leftGeo, dirtMat);
        leftMesh.position.set(-3, -2, 0);
        leftMesh.receiveShadow = true;
        microGroup.add(leftMesh);

        // Roots (Fibrous, branching down)
        const rootMat = new THREE.MeshStandardMaterial({ color: 0xb99976, roughness: 0.9 });
        for(let r=0; r<10; r++) {
            const points = [];
            let currentX = (Math.random() - 0.5) * 2.0;
            let currentY = -0.1; 
            let currentZ = (Math.random() - 0.5) * 2.0;
            points.push(new THREE.Vector3(currentX, currentY, currentZ));
            
            for(let p=0; p<5; p++) {
                currentX += (Math.random() - 0.5) * 1.5;
                currentY -= 0.5 + Math.random() * 0.5;
                currentZ += (Math.random() - 0.5) * 1.5;
                // Keep roots within the open diorama area
                currentX = Math.max(-2.5, Math.min(2.5, currentX));
                currentZ = Math.max(-2.5, Math.min(2.5, currentZ));
                points.push(new THREE.Vector3(currentX, currentY, currentZ));
            }
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.03 - (r*0.001), 8, false);
            const root = new THREE.Mesh(tubeGeo, rootMat);
            root.castShadow = true;
            microGroup.add(root);
        }

        // Animated Underground Hydrogels (Clear blue spheres like the blueprint)
        const gels = [];
        const gelGeo = new THREE.SphereGeometry(0.18, 32, 32);
        // Bright blue, highly visible material mimicking the water-swollen beads
        const gelMat = new THREE.MeshPhysicalMaterial({ 
            color: 0x3b82f6, // Bright blue
            emissive: 0x1d4ed8, // Deep blue glow
            emissiveIntensity: 0.6,
            transparent: true, 
            opacity: 0.95,
            roughness: 0.2,
            metalness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        for(let i=0; i<30; i++) {
            const gel = new THREE.Mesh(gelGeo, gelMat);
            // Distribute them in the open space of the cutaway
            gel.position.set(
                (Math.random() - 0.5) * 4.5,
                - (Math.random() * 3.5) - 0.4,
                (Math.random() - 0.5) * 4.5
            );
            gel.userData = { 
                id: i, 
                baseScale: 0.5 + Math.random() * 0.8, // Varying sizes (swollen vs contracted)
                phase: Math.random() * Math.PI * 2 
            };
            gel.name = "hydrogel";
            gel.castShadow = true;
            microGroup.add(gel);
            gels.push(gel);
        }

        // Add some small soil aggregates (rocks/clods) floating in the matrix
        const rockGeo = new THREE.DodecahedronGeometry(0.1);
        const rockMat = new THREE.MeshStandardMaterial({color: 0x4a3219, roughness: 1, flatShading: true});
        for(let i=0; i<30; i++) {
             const rock = new THREE.Mesh(rockGeo, rockMat);
             rock.position.set(
                (Math.random() - 0.5) * 4.8,
                - (Math.random() * 3.5) - 0.2,
                (Math.random() - 0.5) * 4.8
            );
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.scale.setScalar(0.4 + Math.random() * 0.6);
            microGroup.add(rock);
        }
        
        microGroup.visible = false;
        scene.add(microGroup);

        // --- 4. CAMERA ANIMATION & UI TRANSITIONS ---
        const views = {
            macro: { pos: { x: 25, y: 20, z: 25 }, look: { x: 0, y: 0, z: 0 } }, // Adjusted for better view
            meso: { pos: { x: 4, y: 3, z: 4 }, look: { x: 0, y: 2, z: 0 } },
            micro: { pos: { x: 0, y: -1.5, z: 7 }, look: { x: 0, y: -2, z: 0 } }
        };

        function animateCamera(target) {
            const duration = 1500;
            const startPos = { ...camera.position };
            const startLook = new THREE.Vector3();
            camera.getWorldDirection(startLook);
            startLook.multiplyScalar(10).add(camera.position); 
            
            const targetLook = new THREE.Vector3(target.look.x, target.look.y, target.look.z);
            const startTime = performance.now();

            function update(time) {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);

                camera.position.x = startPos.x + (target.pos.x - startPos.x) * ease;
                camera.position.y = startPos.y + (target.pos.y - startPos.y) * ease;
                camera.position.z = startPos.z + (target.pos.z - startPos.z) * ease;
                
                const currentLook = new THREE.Vector3();
                currentLook.lerpVectors(startLook, targetLook, ease);
                camera.lookAt(currentLook);

                if (progress < 1) requestAnimationFrame(update);
            }
            requestAnimationFrame(update);
        }

        function setView(mode) {
            currentView = mode;
            document.querySelectorAll('.btn-nav').forEach(b => {
                b.classList.remove('active', 'border-oldgold/50', 'bg-oldgold/10', 'text-oldgold');
                b.classList.add('border-white/10', 'bg-white/5', 'text-slate-400');
            });
            const activeBtn = document.getElementById('btn-' + mode);
            activeBtn.classList.remove('border-white/10', 'bg-white/5', 'text-slate-400');
            activeBtn.classList.add('active', 'border-oldgold/50', 'bg-oldgold/10', 'text-oldgold');
            
            const title = document.getElementById('info-title');
            const desc = document.getElementById('info-desc');
            const hint = document.getElementById('micro-hint');

            if (mode === 'macro') {
                title.innerText = "Macro Level: Field Topology";
                desc.innerHTML = "High-level digital twin of the 12.5-hectare plot. Topography simulated via mathematical noise. <strong>Sensor-integrated mulching films (dark plastic strips)</strong> blanket the crop rows to lock in moisture and collect surface telemetry.";
                macroGroup.visible = true;
                mesoGroup.visible = false;
                microGroup.visible = false;
                hint.classList.add('hidden');
            } else if (mode === 'meso') {
                title.innerText = "Meso Level: Crop Physiology";
                desc.innerHTML = "Focusing on individual stress markers of <em>Glycine max</em>. <br><br>Internal nutrient flow visualization shows active water transfer from subsurface hydrogels to the plant stem.";
                macroGroup.visible = false;
                mesoGroup.visible = true;
                microGroup.visible = true; 
                hint.classList.add('hidden');
            } else if (mode === 'micro') {
                title.innerText = "Micro Level: Subsurface Matrix";
                desc.innerHTML = "Cross-section of the rhizosphere. Visualizing subsurface intelligent hydrogels and the <strong>cyan-gridded surface mulching system</strong>. Hydrogels swell and pulse dynamically based on the simulated hydrology model.";
                macroGroup.visible = false;
                mesoGroup.visible = true;
                microGroup.visible = true;
                hint.classList.remove('hidden');
            }

            animateCamera(views[mode]);
        }

        camera.position.set(views.macro.pos.x, views.macro.pos.y, views.macro.pos.z);
        camera.lookAt(0, 0, 0);

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        container.addEventListener('mousedown', (e) => {
            if (currentView !== 'micro') return;
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(gels);
            if (intersects.length > 0) {
                document.getElementById('formula-modal').style.display = 'flex';
                const clickedGel = intersects[0].object;
                const origEmissive = clickedGel.material.emissiveIntensity;
                clickedGel.material.emissiveIntensity = 3.0;
                setTimeout(() => { clickedGel.material.emissiveIntensity = origEmissive; }, 600);
            }
        });

        function closeModal() {
            document.getElementById('formula-modal').style.display = 'none';
        }

        window.setWeather = function(type) {
            currentWeather = type;
            
            // UI Button styling updates
            document.querySelectorAll('.btn-weather').forEach(b => {
                b.classList.remove('border-white/50', 'text-white', 'shadow-[0_0_10px_rgba(249,115,22,0.3)]', 'shadow-[0_0_10px_rgba(59,130,246,0.3)]');
                if(b.id === 'btn-sun') b.classList.add('border-orange-500/30', 'text-orange-400');
                if(b.id === 'btn-normal') b.classList.add('border-slate-500/30', 'text-slate-300');
                if(b.id === 'btn-rain') b.classList.add('border-blue-500/30', 'text-blue-400');
            });

            if (type === 'rain') {
                document.getElementById('btn-rain').classList.remove('border-blue-500/30', 'text-blue-400');
                document.getElementById('btn-rain').classList.add('border-white/50', 'text-white', 'shadow-[0_0_10px_rgba(59,130,246,0.3)]');
                
                rainSystem.visible = true;
                sunRays.visible = false;
                
                // Dark, stormy lighting
                dirLight.intensity = 0.4; 
                hemiLight.intensity = 0.9;
                scene.background.setHex(0x1a2436);
                scene.fog.color.setHex(0x1a2436);
                
                // Wet, glossy soil and mulch physics
                terrainMat.clearcoat = 1.0;
                terrainMat.roughness = 0.3;
                dirtMat.roughness = 0.4;
                mulchFilmMat.clearcoat = 1.0;
                mulchFilmMat.roughness = 0.05;
                
                // Force instant data reaction (Flash Flood)
                state.moisture[state.moisture.length-1] = 95.0;
                state.hydrogel[state.hydrogel.length-1] = 100.0;
                state.temp = 22.0;
                
            } else if (type === 'sun') {
                document.getElementById('btn-sun').classList.remove('border-orange-500/30', 'text-orange-400');
                document.getElementById('btn-sun').classList.add('border-white/50', 'text-white', 'shadow-[0_0_10px_rgba(249,115,22,0.3)]');

                rainSystem.visible = false;
                sunRays.visible = true;
                
                // Harsh, glaring sunlight
                dirLight.intensity = 2.8; 
                hemiLight.intensity = 0.4;
                scene.background.setHex(0x040d1a);
                scene.fog.color.setHex(0x040d1a);
                
                // Bone-dry, matte soil and dusty mulch physics
                terrainMat.clearcoat = 0.0;
                terrainMat.roughness = 0.95;
                dirtMat.roughness = 1.0;
                mulchFilmMat.clearcoat = 0.2;
                mulchFilmMat.roughness = 0.6;
                
                // Force instant data reaction (Flash Drought)
                state.moisture[state.moisture.length-1] = 12.0;
                state.temp = 42.0;
                
            } else {
                document.getElementById('btn-normal').classList.remove('border-slate-500/30', 'text-slate-300');
                document.getElementById('btn-normal').classList.add('border-white/50', 'text-white');

                rainSystem.visible = false;
                sunRays.visible = false;
                
                // Standard Golden Hour
                dirLight.intensity = 1.8;
                hemiLight.intensity = 0.6;
                scene.background.setHex(0x0a1128);
                scene.fog.color.setHex(0x0a1128);
                
                // Normal moist soil and clean mulch
                terrainMat.clearcoat = 0.15;
                terrainMat.roughness = 0.7;
                dirtMat.roughness = 1.0;
                mulchFilmMat.clearcoat = 0.9;
                mulchFilmMat.roughness = 0.2;
            }
            updateData(); // Refresh charts immediately
        };

        // Enhanced Animation Loop for life-like movement
        const clock = new THREE.Clock();
        function animate() {
            requestAnimationFrame(animate);
            const time = clock.getElapsedTime();

            // 1. Global Atmosphere (Particles drifting upwards/around)
            const positions = particles.geometry.attributes.position.array;
            for(let i=0; i<particleCount; i++) {
                positions[i*3 + 1] += 0.01; // Move up
                positions[i*3] += Math.sin(time + i)*0.005; // Drift x
                if(positions[i*3 + 1] > 30) positions[i*3 + 1] = -10; // Reset
            }
            particles.geometry.attributes.position.needsUpdate = true;

            if (currentWeather === 'rain' && rainSystem.visible) {
                const rainPositions = rainSystem.geometry.attributes.position.array;
                for(let i=0; i<rainCount; i++) {
                    // Make raindrops fall rapidly
                    rainPositions[i*6 + 1] -= 3.0; 
                    rainPositions[i*6 + 4] -= 3.0; 
                    if(rainPositions[i*6 + 1] < -5) {
                        // Reset to top once they hit the ground
                        rainPositions[i*6 + 1] += 80; 
                        rainPositions[i*6 + 4] += 80; 
                    }
                }
                rainSystem.geometry.attributes.position.needsUpdate = true;
            }
            if (currentWeather === 'sun' && sunRays.visible) {
                // Slowly rotate sunbeams for a mesmerizing heat effect
                sunRays.rotation.y += 0.001;
                // Pulsate opacity slightly
                sunRays.material.opacity = 0.06 + (Math.sin(time * 1.5) * 0.02);
            }

            // 2. Macro Farm Animations
            if(macroGroup.visible) {
                camera.position.x += Math.sin(time * 0.3) * 0.02; // Smooth hover
                
                // ADDED: Pulsing sensor data-gathering effect on the mulching film
                const mulchPulse = 0.05 + Math.abs(Math.sin(time * 1.5)) * 0.2;
                mulchGridMat.opacity = mulchPulse;
                
                // Swaying crops (Wind effect on instanced mesh)
                for(let i=0; i<cropAnimData.length; i++) {
                    const d = cropAnimData[i];
                    // Calculate a slight bending offset
                    const swayX = Math.sin(time * 1.5 + d.phase) * 0.15;
                    const swayZ = Math.cos(time * 1.2 + d.phase) * 0.15;
                    dummy.position.set(d.x + swayX, d.y, d.z + swayZ);
                    
                    // Add slight rotation to match the sway
                    dummy.rotation.x = swayZ * 0.5;
                    dummy.rotation.z = -swayX * 0.5;
                    dummy.scale.set(d.scale, d.scale, d.scale);
                    dummy.updateMatrix();
                    instancedCrops.setMatrixAt(i, dummy.matrix);
                }
                instancedCrops.instanceMatrix.needsUpdate = true;

                // Pulsing Surface Hydrogels
                for(let i=0; i<surfaceGelData.length; i++) {
                    const d = surfaceGelData[i];
                    const pulse = 1.0 + Math.sin(time * 3 + d.phase) * 0.4;
                    dummy.position.set(d.x, d.y, d.z);
                    dummy.scale.set(pulse, pulse, pulse);
                    dummy.updateMatrix();
                    instancedSurfaceGels.setMatrixAt(i, dummy.matrix);
                }
                instancedSurfaceGels.instanceMatrix.needsUpdate = true;
            }
            
            // 3. Meso Crop Animations
            if(mesoGroup.visible) {
                // Organic wind effect on leaves
                mesoLeaves.forEach((leafData) => {
                    // Complex sine wave mapping for realistic fluttering and bending
                    leafData.mesh.rotation.x = leafData.baseRotX + Math.sin(time * 2.5 + leafData.phase) * 0.08;
                    leafData.mesh.rotation.z = Math.cos(time * 1.8 + leafData.phase) * 0.04;
                });

                // Nutrient Flow Animation moving organically up the curved stem
                flowDots.forEach((dot) => {
                    dot.userData.progress += dot.userData.speed * 0.5;
                    if(dot.userData.progress > 1) dot.userData.progress = 0;
                    
                    // Map the dot directly onto the CatmullRomCurve3 stem path
                    const pt = stemCurve.getPoint(dot.userData.progress);
                    
                    // Add slight orbiting offset around the stem
                    const orbitX = Math.sin(time * 5 + dot.userData.progress * 20) * 0.04 + dot.userData.offset;
                    const orbitZ = Math.cos(time * 5 + dot.userData.progress * 20) * 0.04 + dot.userData.offset;
                    
                    dot.position.set(pt.x + orbitX, pt.y, pt.z + orbitZ);
                });
            }

            // 4. Micro Hydrogel Animations
            if(microGroup.visible) {
                const gelScaleRatio = state.moisture[state.moisture.length-1] / 35; 
                gels.forEach((g) => {
                    // Fluid floating motion
                    g.position.y += Math.sin(time * 1.5 + g.userData.phase) * 0.002;
                    g.position.x += Math.cos(time * 1.0 + g.userData.phase) * 0.001;
                    
                    // Pulsating volume
                    const s = g.userData.baseScale * (0.8 + (gelScaleRatio * 0.4)) + (Math.sin(time * 4 + g.userData.phase) * 0.08);
                    g.scale.set(s, s, s);
                });
            }
            
            renderer.render(scene, camera);
        }
        animate();

        // Handle Resizing
        window.addEventListener('resize', () => {
            camera.aspect = container.offsetWidth / container.offsetHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.offsetWidth, container.offsetHeight);
        });

        // --- 5. DATA SIMULATION & ML ENGINE ---
        function updateData() {
            // 1. Generate Synthetic Data
            // Moisture drops naturally, occasionally spikes (simulated rain/irrigation)
            let lastMoisture = state.moisture[state.moisture.length - 1];
            let newMoisture = lastMoisture - (Math.random() * 0.3); 
            
            let lastGel = state.hydrogel[state.hydrogel.length - 1];
            // Gel releases water to soil if soil gets dry
            let newGel = lastGel;
            if(newMoisture < 25) {
                newMoisture += 0.5; // Soil gains water from gel
                newGel -= 0.8;      // Gel shrinks faster
            } else {
                newGel -= 0.1; // Slow degradation/evaporation
            }

            // Cap values
            newMoisture = Math.max(5, newMoisture);
            newGel = Math.max(5, newGel);

            // NPK fluctuations
            state.npk = state.npk.map(v => Math.max(0, v + (Math.random() - 0.6) * 2));
            
            // Randomize minor microclimate data
            const newTemp = parseFloat((34 + (Math.random() - 0.5) * 1.5).toFixed(1));
            const newEt = parseFloat((4.0 + (Math.random() * 0.5)).toFixed(1));

            // ADDED: Sensor-Mulch dynamic data processing (thermal/moisture gradients)
            let newMulchTemp = newTemp + 4.5 + (Math.random() * 1.2); 
            let newThermalGrad = newMulchTemp - newTemp;
            let newMoistureGrad = 1.5 + (state.moisture[state.moisture.length-1] * 0.05) + Math.random();

            if (currentWeather === 'sun') {
                newMulchTemp += 8.0; 
                newThermalGrad += 8.0;
                newMoistureGrad -= 1.0;
            } else if (currentWeather === 'rain') {
                newMulchTemp -= 3.0; 
                newThermalGrad -= 3.0;
                newMoistureGrad += 3.0;
            }

            // 2. Update Charts & Data Arrays
            state.moisture.push(newMoisture);
            state.moisture.shift();
            state.hydrogel.push(newGel);
            state.hydrogel.shift();
            
            moistureChart.update();
            
            npkChart.data.datasets[0].data = state.npk;
            npkChart.update();

            // 3. Update DOM UI
            document.getElementById('val-moisture').innerText = `Moisture: ${newMoisture.toFixed(1)}%`;
            document.getElementById('val-ph').innerText = `pH: ${(6.8 + Math.random()*0.1).toFixed(2)}`;
            document.getElementById('val-temp').innerText = `${newTemp}°C`;
            document.getElementById('val-et').innerText = `${newEt} mm/d`;
            
            // ADDED: Update Mulch UI
            if (document.getElementById('val-mulch-temp')) {
                document.getElementById('val-mulch-temp').innerText = `${newMulchTemp.toFixed(1)}°C`;
                document.getElementById('val-moisture-grad').innerText = `+${newMoistureGrad.toFixed(2)}% /cm`;
                document.getElementById('val-thermal-grad').innerText = `Δ ${newThermalGrad.toFixed(1)}°C`;
            }
            
            const now = new Date();
            document.getElementById('current-time').innerText = now.toLocaleTimeString('en-US', { hour12: false });

            // 4. ML Engine Logic (Anomaly Detection & Alerting)
            const mlStatus = document.getElementById('ml-status');
            
            if (newMoisture < 20) {
                if(!isEmergency) {
                    isEmergency = true;
                    // Update ML UI Text
                    mlStatus.innerHTML = `
                        <div class="p-3 bg-rose-900/30 border border-rose-500/50 rounded mb-3 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                            <p class="text-xs font-bold text-rose-400 mb-1 animate-pulse">⚠ CRITICAL: STRESS DETECTED</p>
                            <p class="text-[10px] text-slate-300 leading-relaxed mb-3">
                                Random Forest anomaly detected. Soil matric potential has dropped below safe thresholds. Hydrogel reserves are depleted.
                            </p>
                            <button onclick="triggerIrrigation()" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-mono text-[10px] py-2 rounded transition">
                                EXECUTE EMERGENCY IRRIGATION
                            </button>
                        </div>
                    `;
                    // Change 3D visuals to show stress
                    mesoLeafMat.color.setHex(0xd97706); // Yellow/Amber wilted leaves
                    terrainMat.color.setHex(0x1a110a); // Dry darker dirt
                }
            } else if (newMoisture > 28 && isEmergency) {
                // Recovered
                isEmergency = false;
                mlStatus.innerHTML = `
                    <div class="p-3 bg-emerald-900/20 border border-emerald-500/30 rounded mb-3">
                        <p class="text-xs font-bold text-emerald-400 mb-1">CROP STRESS: NORMAL</p>
                        <p class="text-[10px] text-slate-300 leading-relaxed">
                            Simulated PINN analysis indicates bulk soil moisture is stable. Hydrogel matrix is releasing water at 0.15 mL/hr, perfectly offsetting current evapotranspiration.
                        </p>
                    </div>
                `;
                // Revert 3D visuals
                mesoLeafMat.color.setHex(0x10b981); // Healthy green
                terrainMat.color.setHex(0x1e160f); // Normal dirt
            }
        }

        // Global function attached to the generated button
        window.triggerIrrigation = function() {
            // Artificially spike the data to simulate watering
            const lastIdx = state.moisture.length - 1;
            state.moisture[lastIdx] = 45.0; 
            state.hydrogel[lastIdx] = 95.0; // Gels swell up instantly
            updateData(); // Force immediate update
        };

        // Run simulation loop every 2 seconds
        setInterval(updateData, 2000);

    </script>
</body>
</html>