import React, { useState, useEffect } from 'react';
import { useSessionLog } from '../context/SessionLogContext';
import { 
  Server, 
  Cpu, 
  TrendingUp, 
  Activity, 
  Zap, 
  Layers, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle,
  Sliders,
  DollarSign,
  Gauge
} from 'lucide-react';
import { ResourceMonitor } from './ResourceMonitor';

interface AcceleratorConfig {
  name: string;
  type: 'TPU' | 'GPU';
  chipCountPerNode: number;
  tflopsPerChip: number; // FP8/BF16
  vramGbPerChip: number;
  memoryBandwidthTb: number;
  hourlyRatePerNode: number;
  interconnect: string;
}

const ACCELERATORS: Record<string, AcceleratorConfig> = {
  tpu_v5p: {
    name: 'Google Cloud TPU v5p Pod',
    type: 'TPU',
    chipCountPerNode: 4,
    tflopsPerChip: 459,
    vramGbPerChip: 95,
    memoryBandwidthTb: 2.76,
    hourlyRatePerNode: 12.80,
    interconnect: '4.8 Tbps Optical Circuit Switches (OCS)',
  },
  h100_sxm5: {
    name: 'NVIDIA H100 SXM5 (8-GPU Node)',
    type: 'GPU',
    chipCountPerNode: 8,
    tflopsPerChip: 989,
    vramGbPerChip: 80,
    memoryBandwidthTb: 3.35,
    hourlyRatePerNode: 28.50,
    interconnect: '900 GB/s NVLink 4 + 3.2 Tbps RoCE v2',
  },
  nvidia_l4: {
    name: 'NVIDIA L4 Tensor Core (Cost-Optimized)',
    type: 'GPU',
    chipCountPerNode: 4,
    tflopsPerChip: 242,
    vramGbPerChip: 24,
    memoryBandwidthTb: 0.30,
    hourlyRatePerNode: 4.60,
    interconnect: 'PCIe Gen4 + 100 Gbps VPC Egress',
  },
};

export const CloudScalingSimulator: React.FC = () => {
  const { logAction } = useSessionLog();
  const [selectedAccKey, setSelectedAccKey] = useState<string>('tpu_v5p');
  const [nodeCount, setNodeCount] = useState<number>(8);
  const [workload, setWorkload] = useState<'veo_video' | 'llm_moe' | 'vision_batch'>('veo_video');
  const [isTrafficSpike, setIsTrafficSpike] = useState<boolean>(false);
  const [spikeTimer, setSpikeTimer] = useState<number>(0);
  const [trafficRequestsPerMin, setTrafficRequestsPerMin] = useState<number>(1200);

  const acc = ACCELERATORS[selectedAccKey];
  const totalChips = nodeCount * acc.chipCountPerNode;
  const totalPetaFlops = ((totalChips * acc.tflopsPerChip) / 1000).toFixed(1);
  const totalVramTb = ((totalChips * acc.vramGbPerChip) / 1024).toFixed(2);
  const totalMemBandwidthTb = (totalChips * acc.memoryBandwidthTb).toFixed(1);
  const hourlyCost = (nodeCount * acc.hourlyRatePerNode).toFixed(2);

  // Compute throughput & latency based on nodes vs traffic
  const capacityRpm = totalChips * (workload === 'veo_video' ? 45 : workload === 'llm_moe' ? 280 : 850);
  const utilization = Math.min(100, Math.round((trafficRequestsPerMin / capacityRpm) * 100));
  const avgLatencySec = (
    (workload === 'veo_video' ? 18 : workload === 'llm_moe' ? 0.35 : 0.08) *
    (1 + (utilization > 85 ? (utilization - 85) * 0.06 : 0))
  ).toFixed(2);

  // Simulate traffic spike effect and autoscaling response
  const triggerTrafficSpike = () => {
    setIsTrafficSpike(true);
    setTrafficRequestsPerMin(4800);
    setSpikeTimer(15);
    logAction('compute_scaling', 'Simulated sudden 4x traffic surge', {
      previousRpm: trafficRequestsPerMin,
      surgeRpm: 4800,
      currentNodes: nodeCount,
      accelerator: acc.name,
    });
  };

  useEffect(() => {
    if (!isTrafficSpike) return;

    const interval = window.setInterval(() => {
      setSpikeTimer((prev) => {
        if (prev <= 1) {
          setIsTrafficSpike(false);
          setTrafficRequestsPerMin(1200);
          return 0;
        }
        // Auto-scale up nodes dynamically during spike
        if (prev === 12 && nodeCount < 24) {
          setNodeCount((c) => Math.min(32, c * 2));
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTrafficSpike, nodeCount]);

  // Listen for global and command palette app-action events
  useEffect(() => {
    const handleAppAction = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (!customEv.detail) return;

      if (customEv.detail.action === 'scaling:simulate-surge') {
        triggerTrafficSpike();
      } else if (customEv.detail.action === 'scaling:cycle-accelerator') {
        const keys = Object.keys(ACCELERATORS);
        setSelectedAccKey((current) => {
          const idx = keys.indexOf(current);
          const next = keys[(idx + 1) % keys.length];
          return next;
        });
      }
    };

    window.addEventListener('app-action', handleAppAction);
    return () => window.removeEventListener('app-action', handleAppAction);
  }, [trafficRequestsPerMin, nodeCount, selectedAccKey]);

  return (
    <div className="space-y-6" id="cloud-scaling-root">
      {/* Overview Ribbon */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 mb-2 border border-indigo-200/60">
              <Zap className="h-3.5 w-3.5" />
              Elastic Compute Fabric
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Scalable Cloud Processing for AI Workloads
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl mt-1">
              Advanced AI models like Veo 3 and Frontier LLMs require thousands of tightly coupled tensor cores. 
              Explore how cloud compute topologies dynamically scale node clusters, maximize HBM memory bandwidth, and optimize cost-per-inference.
            </p>
          </div>

          <button
            type="button"
            onClick={triggerTrafficSpike}
            disabled={isTrafficSpike}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer ${
              isTrafficSpike
                ? 'bg-amber-500 text-white animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title="Run Traffic Surge Simulation (S)"
          >
            <Activity className="h-4 w-4" />
            <span>{isTrafficSpike ? `Autoscaling Active (${spikeTimer}s)...` : 'Simulate 4,800 Req/min Surge'}</span>
            <kbd className="hidden sm:inline-flex items-center text-3xs font-mono font-semibold bg-white/20 px-1.5 py-0.5 rounded border border-white/30 text-white shadow-2xs ml-1">
              S
            </kbd>
          </button>
        </div>
      </div>

      {/* Control Bar: Hardware Accelerator & Workload Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Accelerator Choice */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Cloud Accelerator Architecture
          </label>
          <div className="space-y-1.5">
            {Object.entries(ACCELERATORS).map(([key, config]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedAccKey(key);
                  logAction('compute_scaling', 'Selected cloud accelerator', {
                    acceleratorKey: key,
                    name: config.name,
                    hourlyRate: config.hourlyRatePerNode,
                  });
                }}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between ${
                  selectedAccKey === key
                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-medium ring-1 ring-indigo-300'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-700'
                }`}
              >
                <div>
                  <div className="font-semibold">{config.name}</div>
                  <div className="text-3xs text-slate-500">
                    {config.chipCountPerNode} Chips • {config.tflopsPerChip} TFLOPs ea
                  </div>
                </div>
                <div className="text-right text-3xs font-mono text-slate-500">
                  ${config.hourlyRatePerNode}/hr
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Workload Profile */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            AI Model Workload Profile
          </label>
          <div className="space-y-1.5">
            {[
              { id: 'veo_video', title: 'Veo 3 Generative Video Diffusion', detail: 'Intense spatio-temporal 3D attention, HBM heavy' },
              { id: 'llm_moe', title: 'Frontier 70B+ MoE LLM Serving', detail: 'Token streaming, KV-cache bound, continuous batching' },
              { id: 'vision_batch', title: 'Distributed Multimodal Embeddings', detail: 'High-throughput compute bound, parallel pipeline' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setWorkload(item.id as any)}
                className={`w-full text-left p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                  workload === item.id
                    ? 'border-sky-500 bg-sky-50/70 text-sky-950 font-medium ring-1 ring-sky-300'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/60 text-slate-700'
                }`}
              >
                <div className="font-semibold">{item.title}</div>
                <div className="text-3xs text-slate-500">{item.detail}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Node Scale Slider */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Elastic Node Allocation
            </label>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
              {nodeCount} Nodes ({totalChips} Accelerators)
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={48}
            step={1}
            value={nodeCount}
            onChange={(e) => setNodeCount(Number(e.target.value))}
            className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-3xs text-slate-400 font-mono">
            <span>1 Node (Min)</span>
            <span>24 Nodes</span>
            <span>48 Nodes (Max)</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-3xs text-slate-600">
              <span>Interconnect Fabric:</span>
              <span className="font-semibold text-slate-800">{acc.interconnect}</span>
            </div>
            <div className="flex justify-between text-3xs text-slate-600">
              <span>Cluster Est. Cost:</span>
              <span className="font-bold text-slate-900">${hourlyCost} / hour</span>
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Cluster Telemetry Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Compute Power */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Aggregated Compute</span>
            <Cpu className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalPetaFlops} <span className="text-sm font-normal text-slate-500">PFLOPs</span>
          </div>
          <div className="text-2xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="h-3 w-3" />
            FP8 / BF16 Tensor Throughput
          </div>
        </div>

        {/* Metric 2: Memory Footprint */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Aggregated VRAM (HBM)</span>
            <Layers className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {totalVramTb} <span className="text-sm font-normal text-slate-500">TB HBM</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1 font-mono">
            {totalMemBandwidthTb} TB/s aggregate bandwidth
          </div>
        </div>

        {/* Metric 3: Cluster Utilization */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Cluster Load Utilization</span>
            <Gauge className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {utilization}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                utilization > 85 ? 'bg-rose-500' : utilization > 65 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${utilization}%` }}
            ></div>
          </div>
        </div>

        {/* Metric 4: End-to-End Latency */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Avg Request Latency</span>
            <Activity className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {avgLatencySec} <span className="text-sm font-normal text-slate-500">sec</span>
          </div>
          <div className="text-2xs text-slate-500 mt-1">
            {utilization > 85 ? 'Elevated due to queue congestion' : 'Well within operational SLA'}
          </div>
        </div>
      </div>

      {/* Real-Time Resource Monitor Component */}
      <ResourceMonitor
        acceleratorName={acc.name}
        acceleratorType={acc.type}
        nodeCount={nodeCount}
        totalChips={totalChips}
        isExternalTrafficSpike={isTrafficSpike}
      />

      {/* Visual Node Cluster Matrix */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              Live Cloud Node Pod Topology ({nodeCount} active nodes)
            </h3>
          </div>
          <span className="text-2xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            RoCE v2 Mesh Connected • 0 Packet Loss
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-1">
          {Array.from({ length: nodeCount }).map((_, i) => {
            const load = Math.min(99, Math.max(30, Math.round(utilization + (Math.sin(i * 1.5) * 12))));
            const isHot = load > 85;
            return (
              <div
                key={i}
                className={`p-2 rounded-lg border text-3xs font-mono transition space-y-1 ${
                  isHot 
                    ? 'border-amber-300 bg-amber-50/70 text-amber-900' 
                    : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">Node-{i + 1 < 10 ? `0${i + 1}` : i + 1}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${isHot ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></span>
                </div>
                <div className="text-slate-500 text-3xs">{acc.type} x{acc.chipCountPerNode}</div>
                <div className="flex justify-between font-semibold">
                  <span>Load:</span>
                  <span>{load}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-1 ${isHot ? 'bg-amber-500' : 'bg-sky-500'}`}
                    style={{ width: `${load}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
