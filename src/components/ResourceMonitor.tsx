import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import {
  Cpu,
  Activity,
  Layers,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  TrendingUp,
  AlertTriangle,
  HardDrive,
  BarChart3,
  SlidersHorizontal
} from 'lucide-react';

export type ModelArchitectureKey = 'veo_dit' | 'moe_70b' | 'dense_32b' | 'multimodal_vit';

export interface ArchitectureProfile {
  id: ModelArchitectureKey;
  name: string;
  category: string;
  description: string;
  baseCpu: number;
  cpuVariance: number;
  baseCompute: number;
  computeVariance: number;
  baseHostRam: number;
  ramVariance: number;
  baseVramHbm: number;
  vramVariance: number;
  bottleneck: string;
  bottleneckType: 'HBM Bandwidth' | 'Interconnect Fabric' | 'Host I/O' | 'Compute GEMM';
  tensorParallelism: string;
  pipelineParallelism: string;
  memoryFootprintNote: string;
}

export const ARCHITECTURE_PROFILES: Record<ModelArchitectureKey, ArchitectureProfile> = {
  veo_dit: {
    id: 'veo_dit',
    name: 'Veo 3 Diffusion Transformer (DiT)',
    category: 'Generative Video Synthesis',
    description: 'Deep 3D Spatio-Temporal attention with high temporal coherence denoising iterations.',
    baseCpu: 38,
    cpuVariance: 7,
    baseCompute: 89,
    computeVariance: 6,
    baseHostRam: 56,
    ramVariance: 5,
    baseVramHbm: 92,
    vramVariance: 4,
    bottleneck: 'HBM3e Memory Bandwidth & 3D Attention Weights',
    bottleneckType: 'HBM Bandwidth',
    tensorParallelism: 'TP=8 (Across Pod Trays)',
    pipelineParallelism: 'PP=4 (Temporal Stages)',
    memoryFootprintNote: 'High frame latent buffers & high-definition spatial caches'
  },
  moe_70b: {
    id: 'moe_70b',
    name: 'Frontier Mixture-of-Experts (MoE 8x7B)',
    category: 'Sparse Language Model',
    description: 'Dynamic token routing through top-2 experts per layer with paged attention KV caching.',
    baseCpu: 68,
    cpuVariance: 9,
    baseCompute: 74,
    computeVariance: 8,
    baseHostRam: 72,
    ramVariance: 6,
    baseVramHbm: 81,
    vramVariance: 7,
    bottleneck: 'Cross-Node All-to-All Routing & KV-Cache Swapping',
    bottleneckType: 'Interconnect Fabric',
    tensorParallelism: 'TP=4 (Local Socket)',
    pipelineParallelism: 'EP=8 (Expert Parallel)',
    memoryFootprintNote: 'Dynamic context length KV caches with dynamic memory allocator'
  },
  dense_32b: {
    id: 'dense_32b',
    name: 'Dense Frontier LLM (32B Parameters)',
    category: 'Dense Autoregressive LLM',
    description: 'Unified high-parameter dense matrix multiplications with static weight distribution.',
    baseCpu: 46,
    cpuVariance: 5,
    baseCompute: 85,
    computeVariance: 5,
    baseHostRam: 60,
    ramVariance: 4,
    baseVramHbm: 74,
    vramVariance: 4,
    bottleneck: 'FP8/BF16 Tensor Core Saturation (GEMM Bound)',
    bottleneckType: 'Compute GEMM',
    tensorParallelism: 'TP=4 (Unified Node)',
    pipelineParallelism: 'PP=2 (Layer Partition)',
    memoryFootprintNote: 'Continuous batching queue with predictable linear memory profile'
  },
  multimodal_vit: {
    id: 'multimodal_vit',
    name: 'Multimodal Vision-Language Transformer',
    category: 'Multimodal Understanding',
    description: 'High-throughput visual patch tokenization coupled with cross-attention LLM backbone.',
    baseCpu: 76,
    cpuVariance: 11,
    baseCompute: 63,
    computeVariance: 7,
    baseHostRam: 68,
    ramVariance: 7,
    baseVramHbm: 61,
    vramVariance: 6,
    bottleneck: 'Host Image/Video Preprocessing & Token Dispatch',
    bottleneckType: 'Host I/O',
    tensorParallelism: 'TP=2 (Vision Head)',
    pipelineParallelism: 'DP=16 (Data Parallel Batch)',
    memoryFootprintNote: 'Multi-resolution image buffers and intermediate spatial activations'
  }
};

interface MetricDataPoint {
  time: string;
  second: number;
  cpuUsage: number;
  computeUsage: number;
  hostRamUsage: number;
  vramHbmUsage: number;
  activeRequests: number;
}

interface ResourceMonitorProps {
  acceleratorName?: string;
  acceleratorType?: 'TPU' | 'GPU';
  nodeCount?: number;
  totalChips?: number;
  isExternalTrafficSpike?: boolean;
}

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({
  acceleratorName = 'Google Cloud TPU v5p Pod',
  acceleratorType = 'TPU',
  nodeCount = 8,
  totalChips = 32,
  isExternalTrafficSpike = false
}) => {
  const [selectedArchKey, setSelectedArchKey] = useState<ModelArchitectureKey>('veo_dit');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'both' | 'compute' | 'memory'>('both');
  const [dataPoints, setDataPoints] = useState<MetricDataPoint[]>([]);
  const [simulatedSpike, setSimulatedSpike] = useState<boolean>(false);
  const [spikeCountdown, setSpikeCountdown] = useState<number>(0);

  const activeArch = ARCHITECTURE_PROFILES[selectedArchKey];
  const timeStepRef = useRef<number>(0);

  // Helper to generate a data point
  const generateDataPoint = (step: number, spikeActive: boolean): MetricDataPoint => {
    const spikeMultiplier = spikeActive ? 1.28 : 1.0;
    const now = new Date(Date.now() - (30 - step) * 1500);
    const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Harmonic wave to simulate realistic oscillating pipeline cycles
    const wave = Math.sin(step * 0.45) * 0.5 + Math.cos(step * 0.22) * 0.5;

    // CPU Usage
    const cpuJitter = (Math.random() * 2 - 1) * activeArch.cpuVariance + wave * 3;
    const cpuVal = Math.min(99, Math.max(15, Math.round((activeArch.baseCpu + cpuJitter) * spikeMultiplier)));

    // Accelerator Compute (TPU/GPU)
    const computeJitter = (Math.random() * 2 - 1) * activeArch.computeVariance + wave * 4;
    const computeVal = Math.min(100, Math.max(25, Math.round((activeArch.baseCompute + computeJitter) * spikeMultiplier)));

    // Host RAM
    const ramJitter = (Math.random() * 2 - 1) * activeArch.ramVariance + (step % 5 === 0 ? 2 : -1);
    const ramVal = Math.min(96, Math.max(20, Math.round((activeArch.baseHostRam + ramJitter) * (spikeActive ? 1.15 : 1.0))));

    // VRAM / HBM
    const vramJitter = (Math.random() * 2 - 1) * activeArch.vramVariance + wave * 2;
    const vramVal = Math.min(99, Math.max(30, Math.round((activeArch.baseVramHbm + vramJitter) * (spikeActive ? 1.2 : 1.0))));

    // Active requests
    const baseReq = spikeActive ? 420 : 130;
    const reqVal = Math.round(baseReq + (Math.random() * 20 - 10) + wave * 15);

    return {
      time: timeLabel,
      second: step,
      cpuUsage: cpuVal,
      computeUsage: computeVal,
      hostRamUsage: ramVal,
      vramHbmUsage: vramVal,
      activeRequests: reqVal
    };
  };

  // Seed initial 20 data points when architecture or component initializes
  useEffect(() => {
    const initialPoints: MetricDataPoint[] = [];
    for (let i = 0; i < 20; i++) {
      initialPoints.push(generateDataPoint(i, false));
    }
    setDataPoints(initialPoints);
    timeStepRef.current = 20;
  }, [selectedArchKey]);

  // Combined spike state: either local trigger or parent component trigger
  const isSpikeActive = simulatedSpike || isExternalTrafficSpike;

  // Real-time streaming interval (every 1.5 seconds)
  useEffect(() => {
    if (!isStreaming) return;

    const interval = window.setInterval(() => {
      timeStepRef.current += 1;
      const nextPoint = generateDataPoint(timeStepRef.current, isSpikeActive);

      setDataPoints((prev) => {
        const updated = [...prev.slice(1), nextPoint];
        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isStreaming, isSpikeActive, selectedArchKey]);

  // Handle local spike countdown
  useEffect(() => {
    if (!simulatedSpike) return;

    const timer = window.setInterval(() => {
      setSpikeCountdown((prev) => {
        if (prev <= 1) {
          setSimulatedSpike(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [simulatedSpike]);

  const handleTriggerSpike = () => {
    setSimulatedSpike(true);
    setSpikeCountdown(12);
  };

  // Listen for global and command palette app-action events
  useEffect(() => {
    const handleAppAction = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (!customEv.detail) return;

      if (customEv.detail.action === 'scaling:toggle-monitor') {
        setIsStreaming((prev) => !prev);
      } else if (customEv.detail.action === 'scaling:inject-spike') {
        handleTriggerSpike();
      }
    };

    window.addEventListener('app-action', handleAppAction);
    return () => window.removeEventListener('app-action', handleAppAction);
  }, []);

  const handleResetStream = () => {
    const freshPoints: MetricDataPoint[] = [];
    for (let i = 0; i < 20; i++) {
      freshPoints.push(generateDataPoint(i, false));
    }
    setDataPoints(freshPoints);
    timeStepRef.current = 20;
    setSimulatedSpike(false);
    setSpikeCountdown(0);
  };

  // Latest readings
  const currentMetric = dataPoints[dataPoints.length - 1] || {
    cpuUsage: activeArch.baseCpu,
    computeUsage: activeArch.baseCompute,
    hostRamUsage: activeArch.baseHostRam,
    vramHbmUsage: activeArch.baseVramHbm,
    activeRequests: 120
  };

  // Memory capacity estimations based on node count
  const estimatedVramPerNodeGb = acceleratorType === 'TPU' ? 380 : 640;
  const totalClusterVramGb = nodeCount * estimatedVramPerNodeGb;
  const currentVramUsedGb = ((totalClusterVramGb * currentMetric.vramHbmUsage) / 100).toFixed(0);

  const estimatedHostRamPerNodeGb = 512;
  const totalClusterHostRamGb = nodeCount * estimatedHostRamPerNodeGb;
  const currentHostRamUsedGb = ((totalClusterHostRamGb * currentMetric.hostRamUsage) / 100).toFixed(0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-6" id="resource-monitor-root">
      {/* Header & Architecture Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Live Resource Monitor
                <span className="text-2xs font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${isStreaming ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {isStreaming ? '1.5s Real-Time Telemetry' : 'Stream Paused'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulated hardware utilization under diverse frontier AI model architectures on {acceleratorName}
              </p>
            </div>
          </div>
        </div>

        {/* Streaming Controls & Spike Generator */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="toggle-stream-btn"
            onClick={() => setIsStreaming((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              isStreaming
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs'
            }`}
            title="Toggle real-time telemetry stream (M)"
          >
            {isStreaming ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
                <kbd className="hidden sm:inline-block text-3xs font-mono bg-slate-200/80 text-slate-600 px-1 py-0.2 rounded font-semibold">
                  M
                </kbd>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span>Resume</span>
                <kbd className="hidden sm:inline-block text-3xs font-mono bg-emerald-700 text-emerald-100 px-1 py-0.2 rounded font-semibold">
                  M
                </kbd>
              </>
            )}
          </button>

          <button
            type="button"
            id="trigger-monitor-spike-btn"
            onClick={handleTriggerSpike}
            disabled={isSpikeActive}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
              isSpikeActive
                ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse cursor-not-allowed'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
            }`}
            title="Inject sudden batch spike into monitor (B)"
          >
            <Activity className="h-3.5 w-3.5 text-amber-600" />
            <span>{simulatedSpike ? `Spike Active (${spikeCountdown}s)` : 'Inject Batch Spike'}</span>
            <kbd className="hidden sm:inline-block text-3xs font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200 font-semibold">
              B
            </kbd>
          </button>

          <button
            type="button"
            id="reset-monitor-stream-btn"
            onClick={handleResetStream}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer border border-slate-200"
            title="Reset telemetry stream"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Architecture Selection Buttons */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
            Model Architecture Profile Impact:
          </label>
          <span className="text-3xs font-mono text-slate-500">
            Cluster Target: {nodeCount} Nodes ({totalChips} {acceleratorType} Cores)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {Object.values(ARCHITECTURE_PROFILES).map((arch) => {
            const isSelected = selectedArchKey === arch.id;
            return (
              <button
                key={arch.id}
                type="button"
                id={`arch-select-${arch.id}`}
                onClick={() => setSelectedArchKey(arch.id)}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-400 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">
                      {arch.category}
                    </span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  <div className="font-bold text-xs mt-1 text-slate-900">{arch.name}</div>
                  <p className="text-3xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {arch.description}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-3xs font-mono">
                  <span className="text-slate-500">Primary Bottleneck:</span>
                  <span className={`font-semibold ${
                    arch.bottleneckType === 'HBM Bandwidth' ? 'text-amber-700' :
                    arch.bottleneckType === 'Compute GEMM' ? 'text-indigo-700' :
                    arch.bottleneckType === 'Host I/O' ? 'text-sky-700' : 'text-purple-700'
                  }`}>
                    {arch.bottleneckType}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Metric Highlights Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Host CPU Usage */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs font-semibold uppercase tracking-wider">Host CPU Utilization</span>
            <Cpu className="h-3.5 w-3.5 text-sky-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {currentMetric.cpuUsage}%
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden mt-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                currentMetric.cpuUsage > 80 ? 'bg-amber-500' : 'bg-sky-500'
              }`}
              style={{ width: `${currentMetric.cpuUsage}%` }}
            ></div>
          </div>
          <div className="text-3xs text-slate-500 pt-0.5">
            Tokens, dispatch &amp; orchestration
          </div>
        </div>

        {/* Card 2: Accelerator Compute (TPU/GPU) */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs font-semibold uppercase tracking-wider">{acceleratorType} Core Tensor Load</span>
            <Zap className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {currentMetric.computeUsage}%
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden mt-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                currentMetric.computeUsage > 85 ? 'bg-rose-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${currentMetric.computeUsage}%` }}
            ></div>
          </div>
          <div className="text-3xs text-slate-500 pt-0.5">
            Symmetric matrix multiplier pipes
          </div>
        </div>

        {/* Card 3: Host RAM Footprint */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs font-semibold uppercase tracking-wider">Host RAM Saturation</span>
            <HardDrive className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {currentMetric.hostRamUsage}%
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden mt-1">
            <div
              className="h-1 rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${currentMetric.hostRamUsage}%` }}
            ></div>
          </div>
          <div className="text-3xs text-slate-500 pt-0.5 font-mono">
            {currentHostRamUsedGb} GB of {totalClusterHostRamGb} GB
          </div>
        </div>

        {/* Card 4: Accelerator HBM / VRAM */}
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-3xs font-semibold uppercase tracking-wider">HBM / VRAM Saturation</span>
            <Layers className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {currentMetric.vramHbmUsage}%
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden mt-1">
            <div
              className={`h-1 rounded-full transition-all duration-300 ${
                currentMetric.vramHbmUsage > 88 ? 'bg-rose-500' : 'bg-amber-500'
              }`}
              style={{ width: `${currentMetric.vramHbmUsage}%` }}
            ></div>
          </div>
          <div className="text-3xs text-slate-500 pt-0.5 font-mono">
            {currentVramUsedGb} GB of {totalClusterVramGb} GB HBM
          </div>
        </div>
      </div>

      {/* Chart Visualizer Area */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Real-Time Telemetry Time Series (Past 30 Seconds)
            </span>
            {isSpikeActive && (
              <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                Surge Load Applied
              </span>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-3xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'both' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Metrics
            </button>
            <button
              type="button"
              onClick={() => setViewMode('compute')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'compute' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compute (CPU / Core)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('memory')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                viewMode === 'memory' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Memory (RAM / HBM)
            </button>
          </div>
        </div>

        {/* Recharts Live Chart Container */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'compute' ? (
                <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="computeColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="cpuColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="computeUsage"
                    name={`${acceleratorType} Tensor Compute (%)`}
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#computeColor)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpuUsage"
                    name="Host CPU (%)"
                    stroke="#0284c7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cpuColor)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : viewMode === 'memory' ? (
                <AreaChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vramColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="ramColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="vramHbmUsage"
                    name="Accelerator HBM / VRAM (%)"
                    stroke="#d97706"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#vramColor)"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="hostRamUsage"
                    name="Host RAM (%)"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#ramColor)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <LineChart data={dataPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="computeUsage"
                    name={`${acceleratorType} Core Compute (%)`}
                    stroke="#4f46e5"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="vramHbmUsage"
                    name="HBM / VRAM (%)"
                    stroke="#d97706"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="cpuUsage"
                    name="Host CPU (%)"
                    stroke="#0284c7"
                    strokeWidth={1.8}
                    dot={false}
                    strokeDasharray="4 2"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="hostRamUsage"
                    name="Host RAM (%)"
                    stroke="#059669"
                    strokeWidth={1.8}
                    dot={false}
                    strokeDasharray="4 2"
                    isAnimationActive={false}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Architecture Architectural Impact & Hardware Sizing Explainer */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-900">
              Architectural Profile Analysis: {activeArch.name}
            </span>
          </div>
          <span className="text-3xs font-mono text-slate-500">
            Parallelism Strategy: {activeArch.tensorParallelism} • {activeArch.pipelineParallelism}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
              Dominant Resource Bottleneck
            </div>
            <div className="font-bold text-slate-800 mt-1">
              {activeArch.bottleneck}
            </div>
            <p className="text-3xs text-slate-500 mt-1 leading-relaxed">
              {activeArch.id === 'veo_dit' 
                ? 'Spatio-temporal cross-frame diffusion attention saturates high-bandwidth memory transfer speeds before raw arithmetic limits.'
                : activeArch.id === 'moe_70b'
                ? 'Dynamic router token dispatch triggers cross-node all-to-all collectives across optical circuit switches.'
                : activeArch.id === 'dense_32b'
                ? 'Dense matrix multiplication keeps tensor systolic arrays consistently near peak theoretical TFLOP capacity.'
                : 'Host thread decoding of incoming high-resolution video streams consumes heavy host CPU cycles before GPU tensor ingest.'}
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
              Memory &amp; KV Cache Dynamics
            </div>
            <div className="font-bold text-slate-800 mt-1">
              {activeArch.memoryFootprintNote}
            </div>
            <p className="text-3xs text-slate-500 mt-1 leading-relaxed">
              Total estimated active working memory: <strong className="font-mono text-slate-700">{currentVramUsedGb} GB HBM</strong> across {nodeCount} node cluster.
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
              Cloud Scaling Recommendation
            </div>
            <div className="font-bold text-slate-800 mt-1">
              {currentMetric.computeUsage > 85 || currentMetric.vramHbmUsage > 90
                ? 'Horizontal Scale-Up Recommended'
                : 'Cluster Operating in Nominal Envelope'}
            </div>
            <p className="text-3xs text-slate-500 mt-1 leading-relaxed">
              Autoscale rule: trigger additional {acceleratorType} nodes when HBM memory saturation sustains &gt; 85% for more than 15 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
