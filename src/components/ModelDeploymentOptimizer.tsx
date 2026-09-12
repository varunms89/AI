import React, { useState, useEffect } from 'react';
import { useSessionLog } from '../context/SessionLogContext';
import { 
  Rocket, 
  Cpu, 
  HardDrive, 
  Zap, 
  Clock, 
  Check, 
  ArrowRight, 
  Server, 
  SlidersHorizontal,
  FileCode,
  Shield,
  Layers
} from 'lucide-react';

interface QuantizationProfile {
  precision: string;
  bitsPerWeight: number;
  memoryFootprintGb: number;
  tokensOrFramesSec: number;
  accuracyRetention: string;
  recommendedHardware: string;
  recommendedUse: string;
}

const QUANT_PROFILES: Record<string, QuantizationProfile> = {
  fp32: {
    precision: 'FP32 Full Precision',
    bitsPerWeight: 32,
    memoryFootprintGb: 144,
    tokensOrFramesSec: 18,
    accuracyRetention: '100% Baseline',
    recommendedHardware: '8x NVIDIA H100 (640GB VRAM)',
    recommendedUse: 'High-precision scientific modeling & pre-training baseline',
  },
  fp16_bf16: {
    precision: 'BF16 / FP16 Native Mixed',
    bitsPerWeight: 16,
    memoryFootprintGb: 72,
    tokensOrFramesSec: 46,
    accuracyRetention: '99.9% (Imperceptible loss)',
    recommendedHardware: '4x NVIDIA H100 or 4x TPU v5p',
    recommendedUse: 'Standard production generative video & flagship LLMs',
  },
  fp8: {
    precision: 'FP8 (Transformer Engine Native)',
    bitsPerWeight: 8,
    memoryFootprintGb: 38,
    tokensOrFramesSec: 88,
    accuracyRetention: '99.4% (Near-lossless)',
    recommendedHardware: '2x NVIDIA H100 or 2x TPU v5p',
    recommendedUse: 'Optimized enterprise cloud deployment with 2.2x cost savings',
  },
  int4_awq: {
    precision: 'INT4 AWQ / GPTQ Compressed',
    bitsPerWeight: 4,
    memoryFootprintGb: 21,
    tokensOrFramesSec: 135,
    accuracyRetention: '98.2% (Validated for chat & vision)',
    recommendedHardware: '1x NVIDIA L4 (24GB) or 1x A100 (40GB)',
    recommendedUse: 'Extreme scale-to-zero serverless endpoints with microsecond cold starts',
  },
};

export const ModelDeploymentOptimizer: React.FC = () => {
  const { logAction } = useSessionLog();
  const [selectedQuant, setSelectedQuant] = useState<string>('fp8');
  const [servingEngine, setServingEngine] = useState<'vllm' | 'tensorrt' | 'triton'>('vllm');
  const [coldStartStrategy, setColdStartStrategy] = useState<'warm_pool' | 'lazy_stream' | 'scale_zero'>('warm_pool');

  const profile = QUANT_PROFILES[selectedQuant];

  const handleSelectQuant = (key: string) => {
    setSelectedQuant(key);
    const item = QUANT_PROFILES[key];
    logAction('model_deployment', 'Selected model quantization profile', {
      quantizationKey: key,
      precision: item.precision,
      vramFootprintGb: item.memoryFootprintGb,
      speedup: `${((item.tokensOrFramesSec / 18)).toFixed(1)}x`,
    });
  };

  const handleSelectEngine = (engine: 'vllm' | 'tensorrt' | 'triton') => {
    setServingEngine(engine);
    logAction('model_deployment', 'Selected inference serving engine', { engine });
  };

  const handleSelectColdStart = (strategy: 'warm_pool' | 'lazy_stream' | 'scale_zero') => {
    setColdStartStrategy(strategy);
    logAction('model_deployment', 'Selected cold-start mitigation strategy', { strategy });
  };

  // Listen for global and command palette app-action events
  useEffect(() => {
    const handleAppAction = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (!customEv.detail) return;

      if (customEv.detail.action === 'deployment:cycle-quant') {
        const keys = Object.keys(QUANT_PROFILES);
        setSelectedQuant((current) => {
          const idx = keys.indexOf(current);
          const next = keys[(idx + 1) % keys.length];
          return next;
        });
      } else if (customEv.detail.action === 'deployment:cycle-engine') {
        const engines: Array<'vllm' | 'tensorrt' | 'triton'> = ['vllm', 'tensorrt', 'triton'];
        setServingEngine((current) => {
          const idx = engines.indexOf(current);
          const next = engines[(idx + 1) % engines.length];
          return next;
        });
      }
    };

    window.addEventListener('app-action', handleAppAction);
    return () => window.removeEventListener('app-action', handleAppAction);
  }, []);

  return (
    <div className="space-y-6" id="model-deployment-root">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
            <Rocket className="h-3.5 w-3.5" />
            Efficient Model Deployment
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Optimization Techniques for Cloud AI Deployment
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Deploying heavy multimodal models like Veo 3 or 70B+ LLMs into production requires algorithmic precision scaling, 
            memory-paged KV caches, and intelligent container image streaming to ensure low latency and cost efficiency.
          </p>
        </div>
      </div>

      {/* Grid: Quantization & Compression Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Quantization Comparison */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-600" />
                Weight Quantization &amp; Memory Footprint
              </h3>
              <span className="text-xs text-slate-500 font-mono">Sample 70B / Veo 3 Class</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(QUANT_PROFILES).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectQuant(key)}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                    selectedQuant === key
                      ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider">{key}</div>
                  <div className="text-xs font-bold text-slate-900 truncate mt-0.5">{item.precision.split(' ')[0]}</div>
                  <div className="text-sm font-mono font-bold text-emerald-700 mt-2">{item.memoryFootprintGb} GB</div>
                  <div className="text-3xs text-slate-500">{item.bitsPerWeight} bits/wt</div>
                </button>
              ))}
            </div>

            {/* Detailed Selected Profile Card */}
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-bold text-slate-800">{profile.precision}</span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                  {profile.accuracyRetention}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-3xs">Throughput Multiplier:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    ~{profile.tokensOrFramesSec} units/sec ({((profile.tokensOrFramesSec / 18)).toFixed(1)}x over FP32)
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-3xs">Recommended Hardware:</span>
                  <span className="font-semibold text-slate-800">{profile.recommendedHardware}</span>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200">
                <span className="font-semibold text-slate-800">Deployment Best Practice: </span>
                {profile.recommendedUse}
              </div>
            </div>
          </div>

          {/* Inference Serving Engines */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-600" />
              High-Throughput Cloud Inference Engines
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'vllm', title: 'vLLM Engine', tag: 'PagedAttention', desc: 'Virtual memory paging for KV-cache, continuous batching, eliminates memory fragmentation.' },
                { id: 'tensorrt', title: 'NVIDIA TensorRT-LLM', tag: 'Kernel Fusion', desc: 'Highly optimized fused CUDA kernels for H100/L4, in-flight batching, FP8 GEMM.' },
                { id: 'triton', title: 'Triton Server', tag: 'Multi-Model', desc: 'Concurrent model pipelines, dynamic batch scheduling, CPU/GPU hybrid offloading.' },
              ].map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => handleSelectEngine(engine.id as any)}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                    servingEngine === engine.id
                      ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-300'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{engine.title}</span>
                    <span className="text-3xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono">
                      {engine.tag}
                    </span>
                  </div>
                  <p className="text-3xs text-slate-600 leading-relaxed">{engine.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Cold Start vs Warm Pool & Cloud Architecture */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Cold-Start Mitigation in Cloud Run / KNative
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When traffic scales from 0 to 1, downloading 20–80GB weights over network creates painful cold starts. 
              Modern cloud platforms solve this via weight streaming and warm standby pools.
            </p>

            <div className="space-y-2">
              {[
                { 
                  id: 'warm_pool', 
                  title: 'Pre-warmed Minimum Replicas (minScale: 1)', 
                  coldLatency: '80 ms', 
                  cost: 'Higher baseline',
                  recommended: 'Mission-critical user APIs'
                },
                { 
                  id: 'lazy_stream', 
                  title: 'Peer-to-Peer Container Weight Streaming (eStargz)', 
                  coldLatency: '2.4 sec', 
                  cost: 'Near zero idle',
                  recommended: 'Batch & background jobs'
                },
                { 
                  id: 'scale_zero', 
                  title: 'Pure Serverless Scale-to-Zero', 
                  coldLatency: '18 - 45 sec', 
                  cost: 'Zero idle cost',
                  recommended: 'Internal dev staging'
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelectColdStart(opt.id as any)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    coldStartStrategy === opt.id
                      ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-300'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900 mb-1">
                    <span>{opt.title}</span>
                    <span className="font-mono text-xs text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                      {opt.coldLatency}
                    </span>
                  </div>
                  <div className="flex justify-between text-3xs text-slate-500">
                    <span>Cost Model: {opt.cost}</span>
                    <span>{opt.recommended}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Cloud Architecture Blueprint Card */}
            <div className="rounded-lg bg-slate-900 p-3.5 text-white text-xs space-y-2 font-mono">
              <div className="flex items-center justify-between text-slate-400 text-3xs border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1">
                  <FileCode className="h-3 w-3" />
                  keda-scaledobject.yaml
                </span>
                <span className="text-emerald-400">spec.v1alpha1</span>
              </div>
              <pre className="text-3xs text-slate-300 overflow-x-auto leading-relaxed">
{`apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: veo-video-worker-autoscaler
spec:
  scaleTargetRef:
    name: veo-inference-pod
  minReplicaCount: 1
  maxReplicaCount: 32
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prom:9090
      metricName: inference_queue_depth
      threshold: '4'`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
