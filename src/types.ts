export type AspectRatio = '16:9' | '9:16';
export type VideoResolution = '720p' | '1080p';

export interface VideoGenerationJob {
  id: string;
  operationName: string;
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: VideoResolution;
  status: 'initializing' | 'processing' | 'downloading' | 'completed' | 'failed';
  progressPercent: number;
  stageMessage: string;
  videoBlobUrl?: string;
  createdAt: number;
  error?: string;
}

export interface CloudNodeMetrics {
  nodeId: string;
  accelerator: 'NVIDIA H100 SXM5' | 'Google Cloud TPU v5p' | 'NVIDIA L4 Tensor Core';
  gpuUtilization: number;
  memoryUsedGb: number;
  memoryTotalGb: number;
  temperatureC: number;
  activeBatchSize: number;
  tokensOrFramesPerSec: number;
  status: 'active' | 'scaling' | 'idle';
}

export interface ArchitectureRecommendation {
  computeCluster: {
    accelerator: string;
    nodeCountBaseline: number;
    nodeCountPeak: number;
    interconnect: string;
    vramPerNode: string;
  };
  scalingStrategy: {
    autoscalingMetric: string;
    coldStartMitigation: string;
    scaleDownDelaySeconds: number;
    idlePoolStrategy: string;
  };
  optimizationTechniques: {
    precision: string;
    engine: string;
    kvCacheStrategy: string;
    speedupRatio: string;
  };
  costThroughputAnalysis: {
    hourlyCostRange: string;
    throughputSLA: string;
    recommendations: string;
  };
  architectureOverview: string;
}

export interface DeploymentPreset {
  id: string;
  name: string;
  category: 'GenAI Video (Veo)' | 'LLM 70B+' | 'Real-time Vision' | 'Embeddings';
  modelWeightsSize: string;
  targetLatency: string;
  recommendedHardware: string;
  autoscalingTrigger: string;
  vramRequirement: string;
}

export interface SessionLogEntry {
  id: string;
  timestamp: string;
  category: 'navigation' | 'veo_video' | 'compute_scaling' | 'model_deployment' | 'architecture_advisor' | 'database' | 'auth' | 'system' | 'shortcut';
  action: string;
  details?: Record<string, any>;
}

export interface SessionData {
  sessionId: string;
  startedAt: string;
  exportedAt: string;
  appVersion: string;
  userAgent: string;
  environment: {
    region: string;
    acceleratorCluster: string;
    port: number;
  };
  totalInteractions: number;
  events: SessionLogEntry[];
}
