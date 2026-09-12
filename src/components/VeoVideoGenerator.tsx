import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  RotateCcw, 
  Cpu, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Maximize2,
  Film,
  Zap,
  Sliders,
  ExternalLink,
  Database,
  Check,
  Cloud,
  CloudUpload,
  RefreshCw,
  History
} from 'lucide-react';
import { AspectRatio, VideoResolution, VideoGenerationJob } from '../types';
import { useSessionLog } from '../context/SessionLogContext';
import { useAuth } from '../context/AuthContext';
import { 
  saveUserVideo, 
  saveUserVeoDraft, 
  getUserVeoDraft, 
  FirestoreVeoDraft 
} from '../services/firestoreData';

const PROMPT_PRESETS = [
  {
    title: 'Cloud AI Quantum Supercluster',
    prompt: 'Cinematic sweeping dolly shot inside a futuristic liquid-cooled quantum cloud datacenter. Pulsing azure fiber-optic neural cables illuminate rows of humming TPU pods, holographic data flows hovering in atmospheric mist, 8k resolution, ultra-smooth motion.',
    aspectRatio: '16:9' as AspectRatio,
  },
  {
    title: 'Autonomous AI Drone Fleet',
    prompt: 'High-speed drone tracking shot gliding through a dense cyberpunk neon metropolis at night. Swarms of intelligent delivery drones coordinate flight paths with glowing emerald optical sensors, rainy reflections, volumetric headlights, cinematic depth of field.',
    aspectRatio: '16:9' as AspectRatio,
  },
  {
    title: 'Neural Network Diffusion',
    prompt: 'Vertical macro slow-motion capture of glowing bioluminescent synaptic nodes firing in a 3D neural matrix. Iridescent gold and cyan electrical pulses ripple through translucent fluid, cinematic lighting, 9:16 vertical composition.',
    aspectRatio: '9:16' as AspectRatio,
  },
  {
    title: 'Robotic Cloud Assembly',
    prompt: 'Vertical view of precision robotic arms soldering microchips with orange laser sparks in an ultra-clean high-tech semiconductor fabrication room. Reflections on brushed titanium, shallow depth of field, 60fps cinematic fluidity.',
    aspectRatio: '9:16' as AspectRatio,
  },
];

const PROCESSING_STAGES = [
  { progress: 12, text: 'Allocating high-performance cloud TPU/GPU cluster node...' },
  { progress: 28, text: 'Initializing Veo 3 latent video diffusion model weights...' },
  { progress: 48, text: 'Synthesizing spatio-temporal attention frames & motion vectors...' },
  { progress: 72, text: 'Applying temporal consistency & high-definition denoising...' },
  { progress: 88, text: 'Encoding cinematic MP4 stream in cloud artifact bucket...' },
  { progress: 96, text: 'Finalizing cloud egress pipeline & streaming buffer...' },
];

export const VeoVideoGenerator: React.FC = () => {
  const { logAction } = useSessionLog();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0].prompt);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<VideoResolution>('720p');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [currentJob, setCurrentJob] = useState<VideoGenerationJob | null>(null);
  const [completedJobs, setCompletedJobs] = useState<VideoGenerationJob[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [savedToDbId, setSavedToDbId] = useState<string | null>(null);

  // Auto-Save state for 30-second Firestore persistence
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [secondsUntilNextSave, setSecondsUntilNextSave] = useState<number>(30);
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<string | null>(null);
  const [hasLoadedInitialDraft, setHasLoadedInitialDraft] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Live mutable refs so 30-second intervals always access latest prompt & configuration without reset
  const promptRef = useRef(prompt);
  const aspectRatioRef = useRef(aspectRatio);
  const resolutionRef = useRef(resolution);
  const lastSavedSnapshotRef = useRef<string>('');

  // Keep refs synchronized on state change
  useEffect(() => {
    promptRef.current = prompt;
    aspectRatioRef.current = aspectRatio;
    resolutionRef.current = resolution;
  }, [prompt, aspectRatio, resolution]);

  // Persist prompt and configuration to Firestore
  const performSaveDraft = async (force: boolean = false) => {
    const currentPrompt = promptRef.current.trim();
    const currentAspect = aspectRatioRef.current;
    const currentRes = resolutionRef.current;
    const snapshot = JSON.stringify({ prompt: currentPrompt, aspectRatio: currentAspect, resolution: currentRes });

    // If nothing changed since last save and not forced, skip unnecessary write
    if (!force && snapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (!user) {
      // Local backup if user is authenticating or offline
      try {
        localStorage.setItem(
          'veo_draft_local_backup',
          JSON.stringify({
            prompt: currentPrompt,
            aspectRatio: currentAspect,
            resolution: currentRes,
            lastSavedAt: new Date().toISOString(),
          })
        );
      } catch (e) {
        // ignore storage errors
      }
      return;
    }

    setAutoSaveStatus('saving');
    try {
      await saveUserVeoDraft(user.uid, {
        prompt: currentPrompt,
        aspectRatio: currentAspect,
        resolution: currentRes,
      });
      lastSavedSnapshotRef.current = snapshot;
      const now = new Date();
      setLastSavedTime(now);
      setAutoSaveStatus('saved');
      logAction('database', 'Auto-saved Veo generator draft to Cloud Firestore', {
        promptLength: currentPrompt.length,
        aspectRatio: currentAspect,
        resolution: currentRes,
        savedAt: now.toLocaleTimeString(),
      });
    } catch (err: any) {
      console.warn('Auto-save to Cloud Firestore failed:', err);
      setAutoSaveStatus('error');
    }
  };

  // 30-Second recurring auto-save timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilNextSave((prev) => {
        if (prev <= 1) {
          // Exactly every 30 seconds, persist current draft to Firestore
          performSaveDraft(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  // Initial fetch: restore auto-saved draft from Cloud Firestore on mount/auth
  useEffect(() => {
    if (!user || hasLoadedInitialDraft) return;

    getUserVeoDraft(user.uid)
      .then((savedDraft) => {
        setHasLoadedInitialDraft(true);
        if (savedDraft && savedDraft.prompt) {
          // Check if current prompt is default preset
          const isDefaultPreset = PROMPT_PRESETS.some((p) => p.prompt === promptRef.current) || !promptRef.current.trim();
          if (isDefaultPreset) {
            setPrompt(savedDraft.prompt);
            if (savedDraft.aspectRatio) setAspectRatio(savedDraft.aspectRatio);
            if (savedDraft.resolution) setResolution(savedDraft.resolution);

            lastSavedSnapshotRef.current = JSON.stringify({
              prompt: savedDraft.prompt.trim(),
              aspectRatio: savedDraft.aspectRatio,
              resolution: savedDraft.resolution || '720p',
            });

            const savedDate = new Date(savedDraft.lastSavedAt);
            setLastSavedTime(savedDate);
            setAutoSaveStatus('saved');
            setDraftRestoredNotice(
              `Restored auto-saved draft from Firestore (${savedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
            );
            logAction('database', 'Restored Veo draft from Cloud Firestore', {
              savedAt: savedDraft.lastSavedAt,
            });
          }
        }
      })
      .catch((err) => {
        console.debug('Failed to check existing draft:', err);
        setHasLoadedInitialDraft(true);
      });
  }, [user, hasLoadedInitialDraft, logAction]);

  // Flush draft to Firestore on page unload/navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      performSaveDraft(true);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Listen for global keyboard shortcuts and command palette app-action events
  useEffect(() => {
    const handleAppAction = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (!customEv.detail) return;
      switch (customEv.detail.action) {
        case 'veo:generate':
          if (!isGenerating && prompt.trim()) {
            handleStartGeneration();
          }
          break;
        case 'veo:enhance-prompt':
          if (!isOptimizingPrompt && !isGenerating && prompt.trim()) {
            handleOptimizePrompt();
          }
          break;
        case 'veo:save-draft':
          performSaveDraft(true);
          break;
        case 'veo:toggle-aspect':
          setAspectRatio((prev) => (prev === '16:9' ? '9:16' : '16:9'));
          break;
      }
    };

    window.addEventListener('app-action', handleAppAction);
    return () => window.removeEventListener('app-action', handleAppAction);
  }, [isGenerating, prompt, isOptimizingPrompt, aspectRatio, resolution]);

  // Handle AI Prompt Enhancement with Gemini 3.8 Flash
  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) return;
    setIsOptimizingPrompt(true);
    setErrorMessage(null);
    logAction('veo_video', 'Requested AI prompt enhancement', {
      originalPrompt: prompt,
      aspectRatio,
    });
    try {
      const res = await fetch('/api/ai/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style: 'cinematic', theme: 'cloud-ai' }),
      });
      const data = await res.json();
      if (data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        logAction('veo_video', 'AI prompt enhanced successfully', {
          enhancedPrompt: data.enhancedPrompt,
          suggestedAspect: data.suggestedAspect,
        });
        if (data.suggestedAspect) {
          setAspectRatio(data.suggestedAspect);
        }
      } else if (data.error) {
        setErrorMessage(data.error);
        logAction('veo_video', 'AI prompt enhancement error', { error: data.error });
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to enhance prompt with AI');
      logAction('veo_video', 'AI prompt enhancement failed', { error: err.message });
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  // Start Video Generation using Veo 3 (veo-3.1-fast-generate-preview)
  const handleStartGeneration = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);

    logAction('veo_video', 'Submitted Veo 3 video generation request', {
      prompt: prompt.trim(),
      aspectRatio,
      resolution,
      model: 'veo-3.1-fast-generate-preview',
    });

    const newJob: VideoGenerationJob = {
      id: 'job_' + Date.now(),
      operationName: '',
      prompt: prompt.trim(),
      aspectRatio,
      resolution,
      status: 'initializing',
      progressPercent: 5,
      stageMessage: 'Submitting generation request to Veo 3 Cloud Engine...',
      createdAt: Date.now(),
    };
    setCurrentJob(newJob);

    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          resolution,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to initialize video generation');
      }

      const operationName = data.operationName;
      logAction('veo_video', 'Veo 3 cloud operation initialized', {
        operationName,
        aspectRatio,
        resolution,
      });

      setCurrentJob((prev) => prev ? {
        ...prev,
        operationName,
        status: 'processing',
        progressPercent: 15,
        stageMessage: 'Operation created on cloud cluster. Polling status...',
      } : null);

      // Begin polling operation status
      pollOperationStatus(operationName);

    } catch (err: any) {
      console.error('Video generation start failed:', err);
      setErrorMessage(err.message || 'Error communicating with Veo 3 service');
      logAction('veo_video', 'Veo 3 generation failed to start', { error: err.message });
      setIsGenerating(false);
      setCurrentJob((prev) => prev ? { ...prev, status: 'failed', error: err.message } : null);
    }
  };

  // Poll status every 5 seconds until complete or error
  const pollOperationStatus = (opName: string) => {
    let pollCount = 0;

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = window.setInterval(async () => {
      pollCount++;
      const stageIdx = Math.min(pollCount, PROCESSING_STAGES.length - 1);
      const stage = PROCESSING_STAGES[stageIdx];

      setCurrentJob((prev) => prev ? {
        ...prev,
        progressPercent: stage.progress,
        stageMessage: stage.text,
      } : null);

      try {
        const res = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: opName }),
        });

        const data = await res.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.done) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }

          setCurrentJob((prev) => prev ? {
            ...prev,
            status: 'downloading',
            progressPercent: 95,
            stageMessage: 'Cloud processing finished! Streaming video bytes...',
          } : null);

          // Download completed video
          await fetchAndDisplayVideo(opName);
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setErrorMessage(err.message || 'Error while polling cloud video status');
        setIsGenerating(false);
        setCurrentJob((prev) => prev ? { ...prev, status: 'failed', error: err.message } : null);
      }
    }, 5000);
  };

  // Download video buffer & create playable Blob URL
  const fetchAndDisplayVideo = async (opName: string) => {
    try {
      const res = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: opName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to stream video from server');
      }

      const blob = await res.blob();
      const videoUrl = URL.createObjectURL(blob);

      logAction('veo_video', 'Veo 3 video stream downloaded and rendered', {
        operationName: opName,
        fileSizeKb: (blob.size / 1024).toFixed(1),
        mimeType: blob.type || 'video/mp4',
      });

      setCurrentJob((prev) => {
        if (!prev) return null;
        const finishedJob: VideoGenerationJob = {
          ...prev,
          status: 'completed',
          progressPercent: 100,
          stageMessage: 'Video synthesized successfully!',
          videoBlobUrl: videoUrl,
        };
        setCompletedJobs((list) => [finishedJob, ...list.slice(0, 9)]);

        // Persist to user's Firestore database if authenticated
        if (user) {
          saveUserVideo(user.uid, {
            id: finishedJob.id,
            prompt: finishedJob.prompt,
            aspectRatio: finishedJob.aspectRatio,
            resolution: finishedJob.resolution,
            status: 'completed',
            operationName: opName,
          })
            .then(() => {
              setSavedToDbId(finishedJob.id);
              logAction('database', 'Video auto-persisted to Firestore', { videoId: finishedJob.id });
            })
            .catch((e) => console.warn('Auto-save to Firestore notice:', e));
        }

        return finishedJob;
      });
    } catch (err: any) {
      console.error('Download video failed:', err);
      setErrorMessage(err.message || 'Failed to download completed video stream');
      setCurrentJob((prev) => prev ? { ...prev, status: 'failed', error: err.message } : null);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  return (
    <div className="space-y-6" id="veo-video-generator-root">
      {/* Top Banner Contextualizing Cloud in AI */}
      <div className="rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/80 via-white to-indigo-50/80 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800">
                <Film className="h-3.5 w-3.5" />
                Veo 3 Cloud Video Diffusion
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Model: veo-3.1-fast-generate-preview
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Generate Video from Text via Cloud Accelerator Clusters
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Veo 3 harnesses massive distributed cloud TPUs to synthesize temporally coherent high-definition video in parallel. 
              Configure your prompt, choose standard <strong className="font-semibold text-slate-700">16:9</strong> (landscape) or <strong className="font-semibold text-slate-700">9:16</strong> (portrait) aspect ratios, and initiate the cloud generation pipeline.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-white/80 backdrop-blur-xs p-3 rounded-lg border border-slate-200/60 shadow-2xs">
            <Cpu className="h-5 w-5 text-sky-600" />
            <div className="text-xs">
              <div className="font-semibold text-slate-800">Distributed Cloud Fabric</div>
              <div className="text-slate-500">TPU v5p Tensor Core Cluster</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Grid: Controls on Left, Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prompt Input & Configuration */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="veo-prompt-input" className="block text-sm font-semibold text-slate-900">
                Text Prompt Description
              </label>
              <button
                type="button"
                id="optimize-prompt-btn"
                onClick={handleOptimizePrompt}
                disabled={isOptimizingPrompt || isGenerating || !prompt.trim()}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors cursor-pointer"
                title="Optimize prompt with AI (E)"
              >
                <Sparkles className={`h-3.5 w-3.5 ${isOptimizingPrompt ? 'animate-spin' : ''}`} />
                <span>{isOptimizingPrompt ? 'Enhancing with Gemini...' : 'Enhance Prompt (AI)'}</span>
                <kbd className="hidden sm:inline-block text-3xs font-mono bg-indigo-100/80 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200 font-semibold">
                  E
                </kbd>
              </button>
            </div>

            <div className="relative">
              <textarea
                id="veo-prompt-input"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the scene, action, atmosphere, and cinematic lighting you want Veo 3 to generate..."
                className="w-full rounded-lg border border-slate-300 p-3.5 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-hidden transition"
                disabled={isGenerating}
              />
              <div className="absolute right-2.5 bottom-2.5 text-2xs text-slate-400 font-mono">
                {prompt.length} chars
              </div>
            </div>

            {/* Draft Restored Banner */}
            {draftRestoredNotice && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span className="font-medium">{draftRestoredNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftRestoredNotice(null)}
                  className="text-indigo-600 hover:text-indigo-900 text-3xs font-semibold underline ml-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 30-Second Auto-Save Telemetry Bar */}
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs">
              <div className="flex items-center gap-2">
                {autoSaveStatus === 'saving' ? (
                  <div className="flex items-center gap-1.5 text-sky-700">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-600" />
                    <span className="font-medium text-3xs">Persisting prompt &amp; config to Cloud Firestore...</span>
                  </div>
                ) : autoSaveStatus === 'saved' ? (
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-medium text-3xs">
                      Auto-saved to Firestore {lastSavedTime ? `at ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
                    </span>
                  </div>
                ) : autoSaveStatus === 'error' ? (
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-medium text-3xs">Cloud auto-save notice (local backup active)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Cloud className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-3xs font-medium">Auto-save: Cloud Firestore active (every 30s)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-3xs font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200" title="Next auto-save countdown">
                  sync: {secondsUntilNextSave}s
                </span>
                <button
                  type="button"
                  id="manual-save-draft-btn"
                  onClick={() => performSaveDraft(true)}
                  disabled={autoSaveStatus === 'saving'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-3xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-300/80 bg-white transition cursor-pointer"
                  title="Manually persist prompt and configuration to Firestore now (S)"
                >
                  <CloudUpload className="h-3 w-3 text-slate-500" />
                  <span>Save Now</span>
                  <kbd className="hidden sm:inline-block text-3xs font-mono bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200 font-semibold">
                    S
                  </kbd>
                </button>
              </div>
            </div>

            {/* Presets Selector */}
            <div>
              <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                <Sliders className="h-3 w-3" /> Quick Presets for Cloud & AI:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROMPT_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(preset.prompt);
                      setAspectRatio(preset.aspectRatio);
                    }}
                    disabled={isGenerating}
                    className={`text-left p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                      prompt === preset.prompt 
                        ? 'border-sky-400 bg-sky-50/70 text-sky-900 font-medium' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold truncate">{preset.title}</span>
                      <span className="text-3xs px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-500">
                        {preset.aspectRatio}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-slate-500 text-3xs">{preset.prompt}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio & Resolution Configs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              {/* Aspect Ratio: Mandatory 16:9 or 9:16 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Aspect Ratio (Veo 3 Specification)
                  </label>
                  <span className="text-3xs text-slate-400 font-mono hidden sm:inline">
                    <kbd className="px-1 py-0.2 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-600">A</kbd> toggle
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="ratio-16-9-btn"
                    onClick={() => setAspectRatio('16:9')}
                    disabled={isGenerating}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="h-2.5 w-4 border border-current rounded-xs inline-block"></span>
                    16:9 Landscape
                  </button>

                  <button
                    type="button"
                    id="ratio-9-16-btn"
                    onClick={() => setAspectRatio('9:16')}
                    disabled={isGenerating}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="h-4 w-2.5 border border-current rounded-xs inline-block"></span>
                    9:16 Portrait
                  </button>
                </div>
              </div>

              {/* Resolution Config */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Resolution Tier
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolution('720p')}
                    disabled={isGenerating}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer ${
                      resolution === '720p'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    720p Fast HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution('1080p')}
                    disabled={isGenerating}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition cursor-pointer ${
                      resolution === '1080p'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    1080p Ultra HD
                  </button>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">Generation Notice</div>
                  <div>{errorMessage}</div>
                  <div className="text-rose-600/80 text-3xs">
                    Veo 3 calls require a valid GEMINI_API_KEY with appropriate project permissions.
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              id="generate-video-btn"
              onClick={handleStartGeneration}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 px-5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 cursor-pointer"
              title="Generate Video with Veo 3 (G / Ctrl+Enter)"
            >
              {isGenerating ? (
                <>
                  <Cpu className="h-4 w-4 animate-spin text-sky-200" />
                  <span>Generating on Cloud GPU Cluster...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-white/80" />
                  <span>Generate Video with Veo 3</span>
                  <kbd className="hidden sm:inline-flex items-center text-3xs font-mono font-semibold bg-white/20 px-1.5 py-0.5 rounded border border-white/30 text-white shadow-2xs ml-1">
                    G
                  </kbd>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Video Monitor & Render Canvas */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Cloud Video Output &amp; Playback
                </h3>
              </div>

              {currentJob?.status === 'completed' && currentJob.videoBlobUrl && (
                <div className="flex items-center gap-2">
                  {user && (
                    <button
                      type="button"
                      id="save-video-to-firestore-btn"
                      onClick={() => {
                        saveUserVideo(user.uid, {
                          id: currentJob.id,
                          prompt: currentJob.prompt,
                          aspectRatio: currentJob.aspectRatio,
                          resolution: currentJob.resolution,
                          status: 'completed',
                          operationName: currentJob.operationName,
                        }).then(() => {
                          setSavedToDbId(currentJob.id);
                          logAction('database', 'Manual save video to Firestore triggered', { videoId: currentJob.id });
                        });
                      }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:text-indigo-800 px-2.5 py-1 rounded-md border border-indigo-200 hover:border-indigo-300 bg-indigo-50 transition cursor-pointer"
                    >
                      {savedToDbId === currentJob.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Saved in Cloud</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Save to Firestore</span>
                        </>
                      )}
                    </button>
                  )}

                  <a
                    href={currentJob.videoBlobUrl}
                    download={`veo3_render_${currentJob.id}.mp4`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-sky-600 px-2.5 py-1 rounded-md border border-slate-200 hover:border-sky-300 bg-slate-50 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download MP4
                  </a>
                </div>
              )}
            </div>

            {/* Video Viewport Stage */}
            <div className="relative rounded-lg bg-slate-950 overflow-hidden min-h-[340px] flex items-center justify-center border border-slate-800">
              {currentJob?.videoBlobUrl ? (
                <div className="w-full flex flex-col items-center">
                  <video
                    ref={videoRef}
                    src={currentJob.videoBlobUrl}
                    className={`max-h-[460px] object-contain ${
                      currentJob.aspectRatio === '9:16' ? 'w-auto max-w-[280px]' : 'w-full'
                    }`}
                    autoPlay
                    loop
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  {/* Video Control Bar */}
                  <div className="w-full bg-slate-900/90 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-white text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="hover:text-sky-400 transition cursor-pointer"
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            videoRef.current.play();
                          }
                        }}
                        className="hover:text-sky-400 transition cursor-pointer"
                        title="Restart"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-3xs text-slate-400 font-mono">
                        {currentJob.aspectRatio} • {currentJob.resolution}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-3xs text-slate-400">Speed:</span>
                      {[0.5, 1, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => changeSpeed(spd)}
                          className={`px-1.5 py-0.5 rounded text-3xs font-mono transition ${
                            playbackRate === spd ? 'bg-sky-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : isGenerating ? (
                /* Dynamic Processing State */
                <div className="p-8 text-center space-y-4 max-w-md w-full">
                  <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin"></div>
                    <Cpu className="h-7 w-7 text-sky-400 animate-pulse" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-sm font-semibold text-white">
                      Synthesizing Video on Cloud Infrastructure
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {currentJob?.stageMessage || 'Orchestrating Veo 3 inference pass...'}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-500 to-indigo-500 h-2 transition-all duration-500 ease-out"
                        style={{ width: `${currentJob?.progressPercent || 15}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-3xs text-slate-500 font-mono">
                      <span>Model: veo-3.1-fast-generate-preview</span>
                      <span>{currentJob?.progressPercent || 15}%</span>
                    </div>
                  </div>

                  <div className="rounded-md bg-slate-900/80 border border-slate-800 p-2.5 text-3xs text-slate-400 text-left space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-slate-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                      Cloud Scalability In Action:
                    </div>
                    <div>
                      High-dimensional video generation takes 60–120 seconds because billions of spatio-temporal diffusion computations run across interconnected TPU tensor cores.
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty / Idle State */
                <div className="p-8 text-center space-y-3 max-w-sm">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
                    <Film className="h-6 w-6 text-sky-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Veo 3 Studio Ready</h4>
                    <p className="text-xs text-slate-400">
                      Enter a prompt on the left and click <strong className="text-slate-200">"Generate Video with Veo 3"</strong> to initialize distributed cloud rendering.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 text-2xs text-slate-500 bg-slate-900/90 px-3 py-1.5 rounded-md border border-slate-800 font-mono">
                    Aspect Ratio: {aspectRatio} • Format: MP4 (H.264)
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Recall for Current Video */}
            {currentJob && (
              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Active Prompt: </span>
                <span className="text-slate-600">{currentJob.prompt}</span>
              </div>
            )}
          </div>

          {/* Previous Generations in this Session */}
          {completedJobs.length > 1 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Session Video Artifacts ({completedJobs.length})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {completedJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setCurrentJob(job)}
                    className={`p-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                      currentJob?.id === job.id 
                        ? 'border-sky-500 bg-sky-50/50 ring-1 ring-sky-300' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-3xs font-mono text-slate-500 mb-1">
                      <span>{job.aspectRatio}</span>
                      <span>{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="line-clamp-2 text-3xs text-slate-700">{job.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
