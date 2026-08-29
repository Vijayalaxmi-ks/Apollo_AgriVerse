import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, CartesianGrid, Legend, ComposedChart
} from 'recharts';
import { 
  Home, CloudRain, Droplets, Leaf, Layers, LineChart as ChartIcon, 
  Target, PlayCircle, BarChart2, Bell, FileText, Settings,
  Wind, Droplet, Sun, Calendar, ChevronRight, Plus, Minus, 
  RefreshCw, Crosshair, Box, AlertTriangle, CheckCircle2, ChevronDown, 
  Thermometer, Activity, ArrowUpRight, ArrowDownRight, Beaker, Sprout
} from 'lucide-react';


const MOCK_TELEMETRY = {
  currentDay: 12,
  totalDays: 30,
  weather: { temp: 28, humidity: 65, rainfall24h: 2.4, wind: 12, et: 4.6, uv: 6, forecastRain: 12.5 },
  soil: { moisture: 62, n: 62, p: 42, k: 68, ph: 6.4, temp: 24.5, ec: 1.2, om: 2.8, rzMoisture: 65 },
  hydrogel: { capacity: 850, stored: 620, saturation: 73, releaseRate: 18, estRemaining: 34 },
  mulch: { coverage: 85, surfaceTemp: 27, surfaceMoisture: 58, evaporationReduced: 41, waterSaved: 18 },
  crop: { stage: 'Flowering', dayInStage: 12, totalStageDays: 18, health: 88, expectedYield: 4.8 }
};

const FORECAST_DATA = [
  { day: 'Tue', rain: 2.4, temp: 28 }, { day: 'Wed', rain: 12.5, temp: 25 }, { day: 'Thu', rain: 4.2, temp: 26 },
  { day: 'Fri', rain: 0, temp: 29 }, { day: 'Sat', rain: 0, temp: 31 }, { day: 'Sun', rain: 1.2, temp: 30 }, { day: 'Mon', rain: 0, temp: 29 }
];

const HYDROGEL_DATA = Array.from({ length: 7 }).map((_, i) => ({
  day: `May ${14 + i}`,
  absorbed: Math.floor(Math.random() * 200 + 400),
  released: Math.floor(Math.random() * 150 + 200),
  soilMoisture: Math.floor(Math.random() * 20 + 50)
}));


// Circular Progress Gauge
const CircularGauge = ({ value, label, subLabel, color = '#10b981' }: { value: number, label: string, subLabel?: string, color?: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 flex items-center justify-center mb-2">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} stroke="#1e2d40" strokeWidth="8" fill="none" />
          <circle 
            cx="50" cy="50" r={radius} stroke={color} strokeWidth="8" fill="none" 
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{value}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {subLabel && <span className={`text-[10px] mt-0.5 ${color.includes('rose') || color.includes('red') ? 'text-rose-400' : 'text-emerald-400'}`}>{subLabel}</span>}
    </div>
  );
};

// Panel Header
const PanelHeader = ({ title, icon: Icon, subtitle }: any) => (
  <div className="flex justify-between items-end mb-6 border-b border-[#1e2d40] pb-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
        <Icon size={24} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide uppercase">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2 bg-[#16202d] border border-[#1e2d40] px-3 py-1.5 rounded-full">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <span className="text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase">Simulation Active</span>
    </div>
  </div>
);


const WeatherPanel = () => (
  <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e]">
    <PanelHeader title="Weather Intelligence" icon={CloudRain} subtitle="7-Day Microclimate Forecast & Impact Analysis" />
    
    <div className="grid grid-cols-3 gap-6 mb-6">
      {/* Current Weather */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6 col-span-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-5xl font-light text-white mb-2">{MOCK_TELEMETRY.weather.temp}°C</div>
            <div className="text-sm text-slate-400">Partly Cloudy</div>
          </div>
          <Sun size={64} className="text-amber-400" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0f1722] p-3 rounded-lg border border-[#1e2d40]">
            <div className="flex items-center gap-2 text-slate-400 mb-1"><Droplets size={14}/> <span className="text-xs">Humidity</span></div>
            <div className="text-lg text-white font-medium">{MOCK_TELEMETRY.weather.humidity}%</div>
          </div>
          <div className="bg-[#0f1722] p-3 rounded-lg border border-[#1e2d40]">
            <div className="flex items-center gap-2 text-slate-400 mb-1"><Wind size={14}/> <span className="text-xs">Wind Speed</span></div>
            <div className="text-lg text-white font-medium">{MOCK_TELEMETRY.weather.wind} km/h</div>
          </div>
          <div className="bg-[#0f1722] p-3 rounded-lg border border-[#1e2d40]">
            <div className="flex items-center gap-2 text-slate-400 mb-1"><Sun size={14}/> <span className="text-xs">UV Index</span></div>
            <div className="text-lg text-white font-medium">{MOCK_TELEMETRY.weather.uv} (High)</div>
          </div>
          <div className="bg-[#0f1722] p-3 rounded-lg border border-[#1e2d40]">
            <div className="flex items-center gap-2 text-slate-400 mb-1"><Thermometer size={14}/> <span className="text-xs">Evapotranspiration</span></div>
            <div className="text-lg text-white font-medium">{MOCK_TELEMETRY.weather.et} mm</div>
          </div>
        </div>
      </div>

      {/* Forecast Chart */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6 col-span-2 flex flex-col">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">7 Day Forecast</h3>
        <div className="flex-1 w-full min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={FORECAST_DATA}>
              <CartesianGrid stroke="#1e2d40" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip contentStyle={{backgroundColor: '#0f1722', border: '1px solid #1e2d40', borderRadius: '8px'}} />
              <Legend wrapperStyle={{fontSize: '12px'}}/>
              <Bar yAxisId="left" dataKey="rain" name="Rainfall (mm)" fill="#3b82f6" radius={[4,4,0,0]} barSize={30} />
              <Line yAxisId="right" type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    {/* Impact Analysis */}
    <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6">
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Weather Impact on Farm Ecosystem</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3 p-4 bg-[#0f1722] rounded-lg border border-[#1e2d40]">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-white text-sm font-medium mb-1">No irrigation required for next 24 hours</h4>
            <p className="text-xs text-slate-400">Current soil moisture and hydrogel retention are sufficient to handle today's evapotranspiration rate.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
          <CloudRain className="text-blue-400 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-white text-sm font-medium mb-1">Rainfall expected in 18 hours</h4>
            <p className="text-xs text-blue-200/70">12.5mm of rain forecasted. Intelligent hydrogels are currently at 73% capacity and can absorb excess.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SoilPanel = () => (
  <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e]">
    <PanelHeader title="Intelligent Soil" icon={Layers} subtitle="Dynamic NPK, Moisture, and Root-Zone Telemetry" />
    
    <div className="grid grid-cols-3 gap-6 mb-6">
      
      {/* Nutrient Status */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6 col-span-2">
         <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wide">Macronutrient Status</h3>
         <div className="flex justify-around items-center">
            <CircularGauge value={MOCK_TELEMETRY.soil.n} label="Nitrogen (N)" subLabel="Adequate" color="#3b82f6" />
            <CircularGauge value={MOCK_TELEMETRY.soil.p} label="Phosphorus (P)" subLabel="Low" color="#f43f5e" />
            <CircularGauge value={MOCK_TELEMETRY.soil.k} label="Potassium (K)" subLabel="Adequate" color="#8b5cf6" />
            <CircularGauge value={MOCK_TELEMETRY.soil.moisture} label="Moisture" subLabel="Optimal" color="#10b981" />
         </div>
      </div>

      {/* AI Soil Advisor */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide flex items-center gap-2">
          <Activity size={16} className="text-emerald-400"/> AI Soil Advisor
        </h3>
        <div className="space-y-4">
          <div className="flex gap-3">
             <div className="w-1.5 rounded-full bg-rose-500"></div>
             <div>
               <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Needs</div>
               <div className="text-sm text-white">Add 25 kg/ha Phosphorus</div>
             </div>
          </div>
          <div className="flex gap-3">
             <div className="w-1.5 rounded-full bg-emerald-500"></div>
             <div>
               <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Enough</div>
               <div className="text-sm text-white">Nitrogen levels are sufficient</div>
             </div>
          </div>
          <div className="flex gap-3">
             <div className="w-1.5 rounded-full bg-amber-500"></div>
             <div>
               <div className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">Excess</div>
               <div className="text-sm text-white">Potassium is slightly high</div>
             </div>
          </div>
          <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
             <div className="text-xs text-emerald-400 uppercase tracking-wider font-bold mb-1">Action</div>
             <div className="text-sm text-emerald-100">Monitor moisture. No irrigation needed.</div>
          </div>
        </div>
      </div>

    </div>

    {/* Soil Parameters Table */}
    <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6">
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Detailed Soil Parameters (Zone B-4)</h3>
      <div className="grid grid-cols-4 gap-4">
        {[
          { l: 'Soil Moisture', v: '62%', s: 'Optimal' },
          { l: 'Temperature', v: '24.5°C', s: 'Optimal' },
          { l: 'Electrical Conductivity', v: '1.2 dS/m', s: 'Normal' },
          { l: 'Organic Matter', v: '2.8%', s: 'Good' },
          { l: 'Root Zone Moisture', v: '65%', s: 'Optimal' },
          { l: 'Soil pH', v: '6.4', s: 'Optimal' },
          { l: 'Microbial Activity', v: '70%', s: 'Good' },
          { l: 'Soil Type', v: 'Loamy', s: 'Fixed' }
        ].map((item, i) => (
          <div key={i} className="bg-[#0f1722] p-4 rounded-lg border border-[#1e2d40]">
            <div className="text-xs text-slate-400 mb-1">{item.l}</div>
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-medium text-white">{item.v}</span>
              <span className="text-[10px] text-emerald-400">{item.s}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LifecyclePanel = () => (
  <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e]">
    <PanelHeader title="Grape Plant Lifecycle" icon={Leaf} subtitle="Phenological Stage Tracking & Requirements" />
    
    <div className="grid grid-cols-12 gap-6 h-full">
      {/* Timeline Menu */}
      <div className="col-span-3 bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col gap-2">
        <h3 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Lifecycle Stages</h3>
        {[
          { num: 1, name: 'Germination', days: '1 - 15 days', active: false },
          { num: 2, name: 'Vegetative Growth', days: '16 - 60 days', active: false },
          { num: 3, name: 'Flowering', days: '61 - 90 days', active: true },
          { num: 4, name: 'Fruit Set', days: '91 - 115 days', active: false },
          { num: 5, name: 'Berry Development', days: '116 - 160 days', active: false },
          { num: 6, name: 'Ripening', days: '161 - 200 days', active: false },
          { num: 7, name: 'Harvesting', days: '201 - 230 days', active: false },
        ].map(stage => (
          <div key={stage.num} className={`flex items-center gap-3 p-3 rounded-lg border ${stage.active ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-[#0f1722] border-[#1e2d40] opacity-50'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stage.active ? 'bg-emerald-500 text-white' : 'bg-[#1e2d40] text-slate-400'}`}>
              {stage.num}
            </div>
            <div>
              <div className={`text-sm font-medium ${stage.active ? 'text-emerald-400' : 'text-slate-300'}`}>{stage.name}</div>
              <div className="text-[10px] text-slate-500">{stage.days}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Current Stage Details */}
      <div className="col-span-9 flex flex-col gap-6">
        <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-8 flex gap-8">
           <div className="flex-1">
             <div className="text-sm text-slate-400 uppercase tracking-widest mb-2">Current Stage</div>
             <h2 className="text-4xl font-light text-emerald-400 mb-2">Flowering <span className="text-lg text-slate-500">(Stage 3 of 7)</span></h2>
             <p className="text-sm text-slate-300 mb-6">Day in Stage: {MOCK_TELEMETRY.crop.dayInStage} / {MOCK_TELEMETRY.crop.totalStageDays}</p>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0f1722] p-4 rounded-lg border border-[#1e2d40]">
                  <div className="text-xs text-slate-400 mb-2 uppercase">Stage Requirements</div>
                  <ul className="space-y-2 text-sm text-white">
                    <li className="flex justify-between"><span>🌡 Temperature</span> <span className="text-emerald-400">20 - 28°C</span></li>
                    <li className="flex justify-between"><span>💧 Soil Moisture</span> <span className="text-emerald-400">60 - 70%</span></li>
                    <li className="flex justify-between"><span>☀ Sunlight</span> <span className="text-emerald-400">6 - 8 hrs/day</span></li>
                  </ul>
                </div>
                <div className="bg-[#0f1722] p-4 rounded-lg border border-[#1e2d40]">
                  <div className="text-xs text-slate-400 mb-2 uppercase">Time Remaining</div>
                  <div className="text-3xl font-light text-white mb-1">6 Days</div>
                  <div className="text-xs text-slate-500">Until Next Stage (Fruit Set)</div>
                </div>
             </div>
           </div>
           
           <div className="w-1/3 bg-[#0f1722] rounded-lg border border-[#1e2d40] overflow-hidden relative">
              {/* Fallback pattern since we can't load external images reliably in pure generated code */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#10b981 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                 <Sprout size={64} className="text-emerald-500 mb-4" />
                 <span className="text-emerald-400 font-mono text-sm border border-emerald-500/50 px-3 py-1 rounded-full bg-emerald-900/30">Vitis vinifera L.</span>
              </div>
           </div>
        </div>

        <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6 flex-1">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Stage Impact & Benefits</h3>
          <div className="flex gap-4">
            <div className="flex-1 bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-lg text-center">
              <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={24}/>
              <h4 className="text-sm text-white font-medium mb-1">Better Pollination</h4>
              <p className="text-xs text-emerald-200/70">Ideal temp and moisture leading to optimal fruit set.</p>
            </div>
            <div className="flex-1 bg-emerald-900/10 border border-emerald-500/20 p-4 rounded-lg text-center">
              <Target className="mx-auto text-emerald-500 mb-2" size={24}/>
              <h4 className="text-sm text-white font-medium mb-1">Higher Fruit Set</h4>
              <p className="text-xs text-emerald-200/70">Expected +12% yield based on current health.</p>
            </div>
            <div className="flex-1 bg-rose-900/10 border border-rose-500/20 p-4 rounded-lg text-center opacity-50">
              <AlertTriangle className="mx-auto text-rose-500 mb-2" size={24}/>
              <h4 className="text-sm text-white font-medium mb-1">Fungal Risk</h4>
              <p className="text-xs text-rose-200/70">Currently low. Would trigger if humidity &gt; 80%.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const HydrogelPanel = () => (
  <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e]">
    <PanelHeader title="Intelligent Hydrogels" icon={Beaker} subtitle="Water Dynamics & Polymer Optimization" />
    
    <div className="grid grid-cols-3 gap-6 mb-6">
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6">
        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wide">Hydrogel Status</h3>
        <div className="flex items-center gap-6">
          <CircularGauge value={MOCK_TELEMETRY.hydrogel.saturation} label="Saturation" color="#06b6d4" />
          <div className="flex-1 space-y-3 text-sm">
            <div className="flex justify-between border-b border-[#1e2d40] pb-2">
              <span className="text-slate-400">Capacity</span>
              <span className="text-white font-mono">{MOCK_TELEMETRY.hydrogel.capacity} mL</span>
            </div>
            <div className="flex justify-between border-b border-[#1e2d40] pb-2">
              <span className="text-slate-400">Stored Water</span>
              <span className="text-cyan-400 font-mono">{MOCK_TELEMETRY.hydrogel.stored} mL</span>
            </div>
            <div className="flex justify-between border-b border-[#1e2d40] pb-2">
              <span className="text-slate-400">Release Rate</span>
              <span className="text-white font-mono">{MOCK_TELEMETRY.hydrogel.releaseRate} mL/hr</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Est. Remaining</span>
              <span className="text-emerald-400 font-mono font-bold">{MOCK_TELEMETRY.hydrogel.estRemaining} hrs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6 col-span-2">
         <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Water Dynamics (Last 7 Days)</h3>
         <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HYDROGEL_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d40" vertical={false} />
                <XAxis dataKey="day" tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill: '#64748b', fontSize: 10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{backgroundColor: '#0f1722', border: 'none', borderRadius: '4px'}} />
                <Legend wrapperStyle={{fontSize: '10px'}}/>
                <Area type="monotone" dataKey="absorbed" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Water Absorbed (mL)" />
                <Area type="monotone" dataKey="released" stackId="2" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} name="Water Released (mL)" />
              </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6">
       <div className="bg-blue-900/10 rounded-xl border border-blue-500/30 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-blue-400 mb-1 uppercase tracking-wide">Irrigation Recommendation</h3>
            <div className="text-2xl font-bold text-white mb-2">NO IRRIGATION REQUIRED</div>
            <p className="text-sm text-blue-200/70">Rainfall + hydrogel stored water can satisfy root-zone demand for ~30 hours.</p>
          </div>
          <Droplets size={48} className="text-blue-500 opacity-50" />
       </div>
       
       <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6">
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wide flex items-center gap-2">
            <Target size={14}/> Hydrogel Optimization Lab (Simulated)
          </h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#0f1722] p-3 rounded border border-[#1e2d40]">
               <div className="text-[10px] text-slate-400 uppercase">Current Efficiency</div>
               <div className="text-lg text-emerald-400 font-bold">High (Optimal)</div>
             </div>
             <div className="bg-[#0f1722] p-3 rounded border border-[#1e2d40]">
               <div className="text-[10px] text-slate-400 uppercase">Irrigation Reduced</div>
               <div className="text-lg text-white font-bold">3.1 mm <span className="text-[10px] text-slate-400 font-normal">This Week</span></div>
             </div>
          </div>
          <button className="w-full mt-4 py-2 border border-cyan-500/50 bg-cyan-900/20 text-cyan-400 text-xs font-mono rounded hover:bg-cyan-900/40 transition">
             RUN FORMULA OPTIMIZER
          </button>
       </div>
    </div>
  </div>
);

const MulchingPanel = () => (
  <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e]">
    <PanelHeader title="Smart Mulching System" icon={Layers} subtitle="Sensor-Integrated Film Telemetry & Comparison" />
    
    <div className="grid grid-cols-2 gap-6 mb-6">
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6 flex flex-col justify-center items-center">
        <CircularGauge value={MOCK_TELEMETRY.mulch.coverage} label="Mulch Coverage" color="#f59e0b" />
        <div className="mt-6 flex justify-around w-full text-center">
           <div>
             <div className="text-xs text-slate-400 mb-1">Mulch Type</div>
             <div className="text-sm text-white font-medium">Silver-Black Film</div>
           </div>
           <div>
             <div className="text-xs text-slate-400 mb-1">Condition</div>
             <div className="text-sm text-emerald-400 font-medium">Good</div>
           </div>
        </div>
      </div>
      
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6">
        <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wide">Mulch Impact Metrics</h3>
        <div className="space-y-4">
           <div className="flex justify-between items-center border-b border-[#1e2d40] pb-3">
             <span className="text-slate-400 text-sm">Soil Surface Temp.</span>
             <span className="text-white font-mono text-lg">{MOCK_TELEMETRY.mulch.surfaceTemp}°C</span>
           </div>
           <div className="flex justify-between items-center border-b border-[#1e2d40] pb-3">
             <span className="text-slate-400 text-sm">Surface Moisture</span>
             <span className="text-cyan-400 font-mono text-lg">{MOCK_TELEMETRY.mulch.surfaceMoisture}%</span>
           </div>
           <div className="flex justify-between items-center border-b border-[#1e2d40] pb-3">
             <span className="text-slate-400 text-sm">Evaporation Reduced</span>
             <span className="text-emerald-400 font-mono text-lg">{MOCK_TELEMETRY.mulch.evaporationReduced}%</span>
           </div>
           <div className="flex justify-between items-center">
             <span className="text-slate-400 text-sm">Water Saved</span>
             <span className="text-blue-400 font-mono text-lg">{MOCK_TELEMETRY.mulch.waterSaved}%</span>
           </div>
        </div>
      </div>
    </div>

    <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-6">
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wide">Mulch Comparison (With vs Without)</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#1e2d40] text-slate-400">
            <th className="pb-3 font-medium">Parameter</th>
            <th className="pb-3 font-medium">Without Mulch</th>
            <th className="pb-3 font-medium">With Mulch</th>
            <th className="pb-3 font-medium">Improvement</th>
          </tr>
        </thead>
        <tbody className="text-white">
          <tr className="border-b border-[#1e2d40]/50">
            <td className="py-4">Soil Temp (°C)</td>
            <td className="py-4 text-slate-400">36°C</td>
            <td className="py-4">{MOCK_TELEMETRY.mulch.surfaceTemp}°C</td>
            <td className="py-4 text-emerald-400 flex items-center gap-1"><ArrowDownRight size={14}/> 9°C</td>
          </tr>
          <tr className="border-b border-[#1e2d40]/50">
            <td className="py-4">Evaporation (mm/day)</td>
            <td className="py-4 text-slate-400">5.2 mm/day</td>
            <td className="py-4">3.1 mm/day</td>
            <td className="py-4 text-emerald-400 flex items-center gap-1"><ArrowDownRight size={14}/> 40%</td>
          </tr>
          <tr className="border-b border-[#1e2d40]/50">
            <td className="py-4">Soil Moisture (%)</td>
            <td className="py-4 text-slate-400">35%</td>
            <td className="py-4">{MOCK_TELEMETRY.mulch.surfaceMoisture}%</td>
            <td className="py-4 text-emerald-400 flex items-center gap-1"><ArrowUpRight size={14}/> 23%</td>
          </tr>
          <tr>
            <td className="py-4">Irrigation Need</td>
            <td className="py-4 text-rose-400">High</td>
            <td className="py-4 text-emerald-400">Low</td>
            <td className="py-4 text-emerald-400 flex items-center gap-1"><ArrowDownRight size={14}/> 45%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);


const DigitalTwinMap = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060B12); // Match dashboard background

    const camera = new THREE.PerspectiveCamera(40, mountRef.current.clientWidth / mountRef.current.clientHeight, 1, 1000);
    // Isometric angle targeting the center
    camera.position.set(50, 40, 50);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Terrain Base
    const terrainGeo = new THREE.PlaneGeometry(120, 120, 32, 32);
    const terrainMat = new THREE.MeshStandardMaterial({ color: 0x1A2F1C, roughness: 0.9 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Lake
    const lakeGeo = new THREE.CircleGeometry(15, 32);
    const lakeMat = new THREE.MeshStandardMaterial({ color: 0x1E4F66, roughness: 0.1, metalness: 0.8 });
    const lake = new THREE.Mesh(lakeGeo, lakeMat);
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(30, 0.1, 30);
    scene.add(lake);

    // Fields
    const fieldMat = new THREE.MeshStandardMaterial({ color: 0x2A5126, transparent: true, opacity: 0.8 });
    const borderMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
    
    const createField = (x: number, z: number, w: number, h: number) => {
        const geo = new THREE.PlaneGeometry(w, h);
        const mesh = new THREE.Mesh(geo, fieldMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.2, z);
        scene.add(mesh);

        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, borderMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(x, 0.25, z);
        scene.add(line);
        
        // Add some mock crop rows
        const rowMat = new THREE.LineBasicMaterial({ color: 0x163D18 });
        for(let r=-(h/2)+1; r<(h/2); r+=1.5) {
            const rowGeo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-(w/2)+1, 0, r), new THREE.Vector3((w/2)-1, 0, r)
            ]);
            const row = new THREE.Line(rowGeo, rowMat);
            row.rotation.x = -Math.PI / 2;
            row.position.set(x, 0.22, z);
            scene.add(row);
        }
    };

    createField(-20, -15, 30, 25); // Field A
    createField(15, -20, 25, 20);  // Field B
    createField(15, 10, 20, 15);   // Field C
    createField(-15, 20, 25, 20);  // Field D

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      scene.rotation.y += 0.0005; // Slow rotation
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

  return (
    <div className="relative w-full h-full bg-[#16202d] rounded-xl overflow-hidden border border-[#1e2d40] shadow-lg flex flex-col">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 z-0"></div>

      {/* HTML Overlays - UI over 3D Map */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <h2 className="text-white text-lg font-bold tracking-wide">DIGITAL TWIN - FARM OVERVIEW</h2>
        <p className="text-slate-400 text-xs">Real-time simulation of your grape farm ecosystem</p>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {['Farm View', 'Field View', 'Plant View', 'Soil View'].map((view, i) => (
          <button key={view} className={`px-4 py-1.5 rounded-lg text-xs font-bold border ${i === 0 ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400' : 'bg-[#0f1722]/80 border-[#1e2d40] text-slate-300 hover:bg-[#1c293a]'}`}>
            {view}
          </button>
        ))}
      </div>

      {/* Simulated Field Tags */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div className="absolute top-1/3 left-1/4 -translate-x-10 bg-[#0f1722]/80 backdrop-blur border border-emerald-500/50 p-2 rounded-lg pointer-events-auto">
              <div className="text-white font-bold text-xs">Field A</div>
              <div className="text-slate-300 text-[10px]">Thompson / 2.30 Ac</div>
              <div className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Health 88%</div>
          </div>
          <div className="absolute top-1/4 right-1/3 bg-[#0f1722]/80 backdrop-blur border border-emerald-500/50 p-2 rounded-lg pointer-events-auto">
              <div className="text-white font-bold text-xs">Field B</div>
              <div className="text-slate-300 text-[10px]">Pinot Noir / 2.45 Ac</div>
              <div className="text-emerald-400 text-[10px] mt-1 flex items-center gap-1"><CheckCircle2 size={10}/> Health 85%</div>
          </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-10">
        {[Plus, Minus, RefreshCw, Box].map((Icon, i) => (
            <button key={i} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#0f1722]/90 backdrop-blur border border-[#1e2d40] text-slate-300 hover:text-white transition">
                <Icon size={16} />
            </button>
        ))}
      </div>

      {/* Bottom Map Layers */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-[#0f1722]/90 backdrop-blur p-2 rounded-xl border border-[#1e2d40]">
        {[
            { icon: Droplet, label: 'Irrigation Zones', color: 'text-blue-400' },
            { icon: CloudRain, label: 'Soil Moisture', color: 'text-cyan-400' },
            { icon: Layers, label: 'Nutrient Map', color: 'text-amber-400' },
            { icon: Leaf, label: 'Crop Health', color: 'text-emerald-400' },
            { icon: Beaker, label: 'Hydrogel Zones', color: 'text-indigo-400' }
        ].map((item, i) => (
            <button key={i} className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg hover:bg-[#1e2d40] transition">
                <item.icon size={18} className={item.color} />
                <span className="text-[9px] text-slate-300 font-medium uppercase tracking-wider">{item.label}</span>
            </button>
        ))}
      </div>
    </div>
  );
};


const MainDashboard = () => (
  <div className="flex-1 flex overflow-hidden p-6 gap-6 bg-[#0b131e]">
    
    {/* Center Column: 3D Map & Key Metrics */}
    <div className="flex-1 flex flex-col gap-6 min-w-0">
      
      {/* 3D Map Area */}
      <div className="flex-1 relative">
        <DigitalTwinMap />
      </div>

      {/* Bottom Metrics Row */}
      <div className="h-40 shrink-0 flex gap-6">
        <div className="flex-1 bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-xs font-bold tracking-wide uppercase">System Telemetry Highlights</h3>
            <span className="text-[10px] text-emerald-400 cursor-pointer">View All Data →</span>
          </div>
          <div className="flex gap-4">
            {[
              { l: 'Avg Soil Moisture', v: '62%', s: 'Optimal', c: 'text-emerald-400' },
              { l: 'Crop Health Index', v: '88%', s: 'Good', c: 'text-emerald-400' },
              { l: 'Water Saved', v: '18%', s: 'vs Conv.', c: 'text-blue-400' },
              { l: 'Yield Pred.', v: '4.8t', s: '/acre', c: 'text-white' }
            ].map((metric, i) => (
              <div key={i} className="flex-1 bg-[#0f1722] border border-[#1e2d40] rounded-lg p-3">
                <div className="text-[10px] text-slate-400 mb-1">{metric.l}</div>
                <div className={`text-xl font-light ${metric.c}`}>{metric.v}</div>
                <div className="text-[9px] text-slate-500 mt-1">{metric.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Right Column: Summaries & Weather */}
    <div className="w-[320px] shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 pb-6 custom-scrollbar">
      
      {/* Farm Overview Card */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5">
        <h3 className="text-white text-sm font-bold tracking-wide mb-4 uppercase">Farm Overview</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-[#1e2d40] pb-2"><span className="text-slate-400">Total Area</span><span className="text-white">20.5 Acres</span></div>
          <div className="flex justify-between border-b border-[#1e2d40] pb-2"><span className="text-slate-400">Active Fields</span><span className="text-white">4</span></div>
          <div className="flex justify-between border-b border-[#1e2d40] pb-2"><span className="text-slate-400">Total Plants</span><span className="text-white">4,320</span></div>
          <div className="flex justify-between border-b border-[#1e2d40] pb-2"><span className="text-slate-400">Grape Variety</span><span className="text-white">Mixed</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Irrigation Status</span><span className="text-emerald-400 font-medium">Optimal</span></div>
        </div>
      </div>

      {/* Mini Weather Card */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5">
        <h3 className="text-white text-sm font-bold tracking-wide mb-4 uppercase">Weather Summary</h3>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Sun size={36} className="text-amber-400" />
            <div>
              <div className="text-3xl font-light text-white leading-none">28°C</div>
              <div className="text-xs text-slate-400 mt-1">Partly Cloudy</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-[#0f1722] p-2 rounded text-center border border-[#1e2d40]">
                <span className="text-[10px] text-slate-400 block mb-1">Rainfall (24h)</span>
                <span className="text-sm text-blue-400 font-medium">2.4 mm</span>
            </div>
            <div className="bg-[#0f1722] p-2 rounded text-center border border-[#1e2d40]">
                <span className="text-[10px] text-slate-400 block mb-1">Humidity</span>
                <span className="text-sm text-cyan-400 font-medium">65%</span>
            </div>
        </div>
        <button className="w-full py-2 bg-[#0f1722] rounded border border-[#1e2d40] text-slate-300 text-xs hover:bg-[#1c293a] transition">
          Full Weather Intelligence →
        </button>
      </div>

      {/* Mini AI Advisor */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5">
        <h3 className="text-white text-sm font-bold tracking-wide mb-4 uppercase flex items-center gap-2">
          <Activity size={16} className="text-emerald-400"/> AI Farm Advisor
        </h3>
        <div className="space-y-3">
            <div className="flex gap-2">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>
                <div className="text-xs text-slate-300 leading-tight">Soil moisture is adequate. No irrigation required today.</div>
            </div>
            <div className="flex gap-2">
                <AlertTriangle size={16} className="text-amber-500 shrink-0"/>
                <div className="text-xs text-slate-300 leading-tight">Nitrogen slightly low in Field B. Apply 25 kg/ha.</div>
            </div>
            <div className="flex gap-2">
                <CloudRain size={16} className="text-blue-400 shrink-0"/>
                <div className="text-xs text-slate-300 leading-tight">Rainfall expected in 18 hrs. Delay irrigation.</div>
            </div>
        </div>
      </div>

    </div>
  </div>
);


const SIDEBAR_ITEMS = [
  { id: 'twin', icon: Home, label: 'Digital Twin', sub: 'Farm Overview' },
  { id: 'weather', icon: CloudRain, label: 'Weather Intelligence', sub: 'Microclimate Data' },
  { id: 'soil', icon: Layers, label: 'Intelligent Soil', sub: 'NPK & Moisture' },
  { id: 'lifecycle', icon: Leaf, label: 'Grape Lifecycle', sub: 'Phenology' },
  { id: 'hydrogels', icon: Beaker, label: 'Intelligent Hydrogels', sub: 'Polymer Dynamics' },
  { id: 'mulching', icon: Box, label: 'Smart Mulching', sub: 'Sensor Films' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('twin');

  return (
    <div className="flex h-screen w-screen bg-[#060B12] text-white font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR - Navigation Router */}
      <aside className="w-64 shrink-0 bg-[#0f1722] border-r border-[#1e2d40] flex flex-col z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-[#1e2d40]">
           <div className="w-8 h-8 rounded-md bg-emerald-900/50 flex items-center justify-center border border-emerald-500/50">
             <span className="text-emerald-400 text-lg">🍇</span>
           </div>
           <div>
             <h1 className="font-bold text-white tracking-wide text-sm leading-tight">APOLLO AGRIVERSE</h1>
             <p className="text-[9px] text-slate-400 uppercase tracking-widest">Digital Twin System</p>
           </div>
        </div>
        
        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="flex flex-col gap-2 px-4">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all text-left ${
                    isActive 
                    ? 'bg-emerald-900/20 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                    : 'border border-transparent hover:bg-[#16202d]'
                  }`}
                >
                  <item.icon size={20} className={isActive ? 'text-emerald-400' : 'text-slate-400'} />
                  <div className="flex flex-col">
                    <span className={`text-sm ${isActive ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'}`}>
                      {item.label}
                    </span>
                    <span className="text-[10px] text-slate-500">{item.sub}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Global Farm Health Gauge (Always visible) */}
        <div className="p-6 border-t border-[#1e2d40] flex flex-col items-center bg-[#0a1017]">
            <h4 className="text-[10px] text-slate-400 uppercase tracking-widest mb-4 w-full text-center font-bold">Overall Farm Health</h4>
            <CircularGauge value={84} label="System Status" subLabel="Optimal" color="#10b981" />
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Top Utility Bar */}
        <header className="h-16 bg-[#0f1722]/80 backdrop-blur border-b border-[#1e2d40] flex items-center justify-end px-6 shrink-0 z-20">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CloudRain size={16} className="text-blue-400" />
              <span className="text-white text-sm font-medium">28°C</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets size={16} className="text-cyan-400" />
              <span className="text-white text-sm font-medium">65% Hum</span>
            </div>
            <div className="h-6 w-[1px] bg-[#1e2d40]"></div>
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Calendar size={16} /> 20 May 2025
            </div>
          </div>
        </header>

        {/* ROUTER VIEW: Render the selected page component */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'twin' && <MainDashboard />}
          {activeTab === 'weather' && <WeatherPanel />}
          {activeTab === 'soil' && <SoilPanel />}
          {activeTab === 'lifecycle' && <LifecyclePanel />}
          {activeTab === 'hydrogels' && <HydrogelPanel />}
          {activeTab === 'mulching' && <MulchingPanel />}
        </div>

      </div>
    </div>
  );
}