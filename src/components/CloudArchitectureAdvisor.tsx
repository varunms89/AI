import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Layers, 
  DollarSign, 
  ShieldCheck, 
  ArrowRight, 
  Server, 
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  Database,
  Check
} from 'lucide-react';
import { ArchitectureRecommendation } from '../types';
import { useSessionLog } from '../context/SessionLogContext';
import { useAuth } from '../context/AuthContext';
import { saveUserArchitecturePlan } from '../services/firestoreData';

export const CloudArchitectureAdvisor: React.FC = () => {
  const { logAction } = useSessionLog();
  const { user } = useAuth();
  const [workloadType, setWorkloadType] = useState('Veo 3 Generative Video Diffusion');
  const [modelSize, setModelSize] = useState('Veo 3 / 10B+ Spatio-Temporal Diffusion');
  const [targetLatencyMs, setTargetLatencyMs] = useState(15000);
  const [dailyRequests, setDailyRequests] = useState('25,000');
  const [batchSize, setBatchSize] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<ArchitectureRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSavedToDb, setIsSavedToDb] = useState(false);

  const handleGenerateArchitecture = async () => {
    setIsLoading(true);
    setError(null);
    logAction('architecture_advisor', 'Requested AI Cloud Architecture Plan', {
      workloadType,
      modelSize,
      targetLatencyMs,
      dailyRequests,
      batchSize,
    });

    try {
      const res = await fetch('/api/ai/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workloadType,
          modelSize,
          targetLatencyMs,
          dailyRequests,
          batchSize,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to generate recommendation');
      }

      setRecommendation(data);
      logAction('architecture_advisor', 'Cloud Architecture Plan Generated', {
        accelerator: data.computeCluster?.accelerator,
        nodeCountBaseline: data.computeCluster?.nodeCountBaseline,
        nodeCountPeak: data.computeCluster?.nodeCountPeak,
        speedup: data.optimizationTechniques?.speedupRatio,
      });
      setIsSavedToDb(false);
    } catch (err: any) {
      console.error('Architect error:', err);
      setError(err.message || 'Error communicating with AI architecture advisor');
      logAction('architecture_advisor', 'Cloud Architecture Generation Failed', {
        error: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = () => {
    if (!user || !recommendation) return;
    const planId = 'plan_' + Date.now();
    saveUserArchitecturePlan(user.uid, {
      id: planId,
      workloadType,
      modelSize,
      computeCluster: `${recommendation.computeCluster?.accelerator} (${recommendation.computeCluster?.interconnect})`,
      scalingStrategy: recommendation.scalingStrategy?.autoscalingPolicy,
    }).then(() => {
      setIsSavedToDb(true);
      logAction('database', 'Saved architecture plan to Firestore', { planId });
    });
  };

  // Listen for global and command palette app-action events
  useEffect(() => {
    const handleAppAction = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (!customEv.detail) return;

      if (customEv.detail.action === 'advisor:generate-architecture') {
        if (!isLoading) {
          handleGenerateArchitecture();
        }
      } else if (customEv.detail.action === 'advisor:save-plan') {
        handleSavePlan();
      }
    };

    window.addEventListener('app-action', handleAppAction);
    return () => window.removeEventListener('app-action', handleAppAction);
  }, [isLoading, workloadType, modelSize, targetLatencyMs, dailyRequests, batchSize, recommendation, user]);

  return (
    <div className="space-y-6" id="cloud-architect-root">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200/60">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Cloud Infrastructure Advisor
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Automated Cloud AI Capacity &amp; Topology Planner
          </h2>
          <p className="text-sm text-slate-600 max-w-2xl">
            Input your AI model parameters to receive an engineered hardware allocation plan, autoscaling policies, and cost-throughput optimization powered by Gemini 3.8 Flash.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Workload Specifications
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                AI Workload Class
              </label>
              <select
                value={workloadType}
                onChange={(e) => setWorkloadType(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-purple-200 focus:outline-hidden"
              >
                <option value="Veo 3 Generative Video Diffusion">Veo 3 Generative Video Diffusion</option>
                <option value="Frontier 70B MoE Text Generation">Frontier 70B MoE Text Generation</option>
                <option value="Real-Time Multimodal Voice & Video">Real-Time Multimodal Voice &amp; Video</option>
                <option value="Dense Batch Embedding & RAG Pipeline">Dense Batch Embedding &amp; RAG Pipeline</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Model Parameters &amp; Weight Architecture
              </label>
              <input
                type="text"
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value)}
                placeholder="e.g. Veo 3 / 10B+ Diffusion"
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-purple-200 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Latency SLA (ms)
                </label>
                <input
                  type="number"
                  value={targetLatencyMs}
                  onChange={(e) => setTargetLatencyMs(Number(e.target.value))}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-purple-200 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Est. Daily Inferences
                </label>
                <input
                  type="text"
                  value={dailyRequests}
                  onChange={(e) => setDailyRequests(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:ring-2 focus:ring-purple-200 focus:outline-hidden"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateArchitecture}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              title="Analyze & Generate Blueprint (G / Ctrl+Enter)"
            >
              {isLoading ? (
                <>
                  <Cpu className="h-4 w-4 animate-spin" />
                  <span>Synthesizing Cloud Blueprint...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Analyze &amp; Generate Blueprint</span>
                  <kbd className="hidden sm:inline-flex items-center text-3xs font-mono font-semibold bg-white/20 px-1.5 py-0.5 rounded border border-white/30 text-white shadow-2xs ml-1">
                    G
                  </kbd>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Architecture Blueprint */}
        <div className="lg:col-span-7 space-y-4">
          {recommendation ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-purple-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Engineered Cloud Deployment Blueprint
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {user && (
                    <button
                      type="button"
                      id="save-plan-to-firestore-btn"
                      onClick={handleSavePlan}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition cursor-pointer"
                      title="Save Plan to Cloud (S)"
                    >
                      {isSavedToDb ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Saved to Cloud</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-3.5 w-3.5 text-purple-600" />
                          <span>Save Plan to Cloud</span>
                          <kbd className="hidden sm:inline-block text-3xs font-mono bg-purple-200/80 text-purple-800 px-1 py-0.2 rounded font-semibold">
                            S
                          </kbd>
                        </>
                      )}
                    </button>
                  )}
                  <span className="text-2xs font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold">
                    Valid SLA Tier
                  </span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-3.5 rounded-lg bg-purple-50/70 border border-purple-200 text-xs text-purple-950 leading-relaxed">
                <span className="font-semibold">Executive Architecture Summary: </span>
                {recommendation.architectureOverview}
              </div>

              {/* Bento Grid Recommendations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Hardware */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-indigo-600" />
                    Compute Cluster &amp; Interconnect
                  </div>
                  <div className="text-slate-700 font-medium">
                    {recommendation.computeCluster?.accelerator}
                  </div>
                  <div className="text-slate-500 text-3xs">
                    Baseline: {recommendation.computeCluster?.nodeCountBaseline} nodes • Peak: {recommendation.computeCluster?.nodeCountPeak} nodes
                  </div>
                  <div className="text-slate-500 text-3xs">
                    Interconnect: {recommendation.computeCluster?.interconnect}
                  </div>
                </div>

                {/* Scaling Policy */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-600" />
                    Autoscaling &amp; Cold-Start Policy
                  </div>
                  <div className="text-slate-700 font-medium">
                    {recommendation.scalingStrategy?.autoscalingMetric}
                  </div>
                  <div className="text-slate-500 text-3xs">
                    Mitigation: {recommendation.scalingStrategy?.coldStartMitigation}
                  </div>
                  <div className="text-slate-500 text-3xs">
                    Idle Strategy: {recommendation.scalingStrategy?.idlePoolStrategy}
                  </div>
                </div>

                {/* Optimization */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-sky-600" />
                    Weight Quantization &amp; Engine
                  </div>
                  <div className="text-slate-700 font-medium">
                    {recommendation.optimizationTechniques?.engine} ({recommendation.optimizationTechniques?.precision})
                  </div>
                  <div className="text-slate-500 text-3xs">
                    KV Cache: {recommendation.optimizationTechniques?.kvCacheStrategy}
                  </div>
                  <div className="text-slate-500 text-3xs font-semibold text-emerald-600">
                    Est. Speedup: {recommendation.optimizationTechniques?.speedupRatio}
                  </div>
                </div>

                {/* Cost Analysis */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                  <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                    Cost &amp; Throughput SLA
                  </div>
                  <div className="text-slate-700 font-bold font-mono">
                    {recommendation.costThroughputAnalysis?.hourlyCostRange}
                  </div>
                  <div className="text-slate-500 text-3xs">
                    Throughput: {recommendation.costThroughputAnalysis?.throughputSLA}
                  </div>
                  <div className="text-slate-600 text-3xs">
                    {recommendation.costThroughputAnalysis?.recommendations}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-800">
                  Ready to Plan AI Cloud Architecture
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click <strong>"Analyze &amp; Generate Blueprint"</strong> to calculate compute requirements, node topologies, and memory bandwidth requirements tailored to your AI model.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
