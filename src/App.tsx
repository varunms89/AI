/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Film, 
  Cpu, 
  Rocket, 
  Sparkles, 
  Cloud, 
  Activity, 
  Server,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  Download,
  Command,
  Database,
  LogIn,
  LogOut,
  User as UserIcon,
  Keyboard
} from 'lucide-react';
import { VeoVideoGenerator } from './components/VeoVideoGenerator';
import { CloudScalingSimulator } from './components/CloudScalingSimulator';
import { ModelDeploymentOptimizer } from './components/ModelDeploymentOptimizer';
import { CloudArchitectureAdvisor } from './components/CloudArchitectureAdvisor';
import { CloudDatabasePanel } from './components/CloudDatabasePanel';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { dispatchAppAction } from './lib/actionEvents';
import { SessionLogProvider, useSessionLog } from './context/SessionLogContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'veo' | 'scaling' | 'deployment' | 'advisor' | 'database'>('veo');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [actionNotification, setActionNotification] = useState<string | null>(null);
  const [serverHealth, setServerHealth] = useState<{ status: string; hasApiKey: boolean } | null>(null);
  const { entries, logAction, exportSessionLog } = useSessionLog();
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  const showShortcutFeedback = (msg: string) => {
    setActionNotification(msg);
    logAction('shortcut', `Executed keyboard shortcut: ${msg}`);
    setTimeout(() => {
      setActionNotification((curr) => (curr === msg ? null : curr));
    }, 2200);
  };

  // Listen for global action events from command palette or buttons
  useEffect(() => {
    const handleGlobalAction = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (!customEv.detail) return;
      if (customEv.detail.action === 'global:toggle-shortcuts-help') {
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (customEv.detail.action === 'global:export-log') {
        exportSessionLog();
        showShortcutFeedback('Exported Session Telemetry Log');
      }
    };
    window.addEventListener('app-action', handleGlobalAction);
    return () => window.removeEventListener('app-action', handleGlobalAction);
  }, [exportSessionLog]);

  // Global Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      // Ctrl+K / Cmd+K: Open Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => {
          const nextState = !prev;
          if (nextState) {
            logAction('navigation', 'Opened Command Palette via Ctrl+K shortcut');
          }
          return nextState;
        });
        return;
      }

      // Question mark (?): Open Keyboard Shortcuts Modal (when not in text input)
      if (!isTextInput && e.key === '?') {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => {
          const nextState = !prev;
          if (nextState) {
            logAction('navigation', 'Opened Keyboard Shortcuts Modal via ? shortcut');
          }
          return nextState;
        });
        return;
      }

      // Ctrl+Enter / Cmd+Enter: Generate action even inside textarea
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeTab === 'veo') {
          dispatchAppAction('veo:generate');
          showShortcutFeedback('Veo 3: Video Generation Started (Ctrl+Enter)');
        } else if (activeTab === 'advisor') {
          dispatchAppAction('advisor:generate-architecture');
          showShortcutFeedback('Advisor: Cloud Blueprint Synthesizing (Ctrl+Enter)');
        }
        return;
      }

      // Ctrl+S / Cmd+S: Save action even inside textarea
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (activeTab === 'veo') {
          dispatchAppAction('veo:save-draft');
          showShortcutFeedback('Veo 3: Draft Saved to Firestore (Ctrl+S)');
        } else if (activeTab === 'advisor') {
          dispatchAppAction('advisor:save-plan');
          showShortcutFeedback('Advisor: Architecture Plan Saved (Ctrl+S)');
        } else if (activeTab === 'database') {
          dispatchAppAction('database:sync-session');
          showShortcutFeedback('Firestore: Synced Session Telemetry (Ctrl+S)');
        }
        return;
      }

      // Single-character shortcuts are disabled when typing in inputs/textareas
      if (isTextInput) {
        return;
      }

      // Tab switching numbers: 1 to 5
      if (['1', '2', '3', '4', '5'].includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const tabMap: Record<string, 'veo' | 'scaling' | 'deployment' | 'advisor' | 'database'> = {
          '1': 'veo',
          '2': 'scaling',
          '3': 'deployment',
          '4': 'advisor',
          '5': 'database'
        };
        const nextTab = tabMap[e.key];
        if (nextTab) {
          handleTabChange(nextTab);
          showShortcutFeedback(`Switched Tab: ${nextTab.toUpperCase()} (${e.key})`);
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Tab-specific shortcuts
      if (activeTab === 'veo') {
        if (key === 'g') {
          e.preventDefault();
          dispatchAppAction('veo:generate');
          showShortcutFeedback('Veo 3: Generating Video (G)');
        } else if (key === 'e') {
          e.preventDefault();
          dispatchAppAction('veo:enhance-prompt');
          showShortcutFeedback('Veo 3: AI Prompt Enhancement (E)');
        } else if (key === 's') {
          e.preventDefault();
          dispatchAppAction('veo:save-draft');
          showShortcutFeedback('Veo 3: Draft Saved to Firestore (S)');
        } else if (key === 'a') {
          e.preventDefault();
          dispatchAppAction('veo:toggle-aspect');
          showShortcutFeedback('Veo 3: Aspect Ratio Toggled (A)');
        }
      } else if (activeTab === 'scaling') {
        if (key === 's') {
          e.preventDefault();
          dispatchAppAction('scaling:simulate-surge');
          showShortcutFeedback('Scalable Fabric: 4,800 Req/min Surge (S)');
        } else if (key === 'm') {
          e.preventDefault();
          dispatchAppAction('scaling:toggle-monitor');
          showShortcutFeedback('Resource Monitor: Stream Toggled (M)');
        } else if (key === 'b') {
          e.preventDefault();
          dispatchAppAction('scaling:inject-spike');
          showShortcutFeedback('Resource Monitor: Batch Spike Injected (B)');
        } else if (key === 'c') {
          e.preventDefault();
          dispatchAppAction('scaling:cycle-accelerator');
          showShortcutFeedback('Scalable Fabric: Accelerator Cycled (C)');
        }
      } else if (activeTab === 'deployment') {
        if (key === 'q') {
          e.preventDefault();
          dispatchAppAction('deployment:cycle-quant');
          showShortcutFeedback('Deployment: Quantization Profile Cycled (Q)');
        } else if (key === 'e') {
          e.preventDefault();
          dispatchAppAction('deployment:cycle-engine');
          showShortcutFeedback('Deployment: Serving Engine Cycled (E)');
        }
      } else if (activeTab === 'advisor') {
        if (key === 'g') {
          e.preventDefault();
          dispatchAppAction('advisor:generate-architecture');
          showShortcutFeedback('Advisor: Cloud Blueprint Synthesizing (G)');
        } else if (key === 's') {
          e.preventDefault();
          dispatchAppAction('advisor:save-plan');
          showShortcutFeedback('Advisor: Plan Saved to Cloud (S)');
        }
      } else if (activeTab === 'database') {
        if (key === 's') {
          e.preventDefault();
          dispatchAppAction('database:sync-session');
          showShortcutFeedback('Firestore: Session Telemetry Synced (S)');
        } else if (key === 'd') {
          e.preventDefault();
          dispatchAppAction('database:view-drafts');
          showShortcutFeedback('Firestore: Viewing Auto-Saved Drafts (D)');
        } else if (key === 'v') {
          e.preventDefault();
          dispatchAppAction('database:view-videos');
          showShortcutFeedback('Firestore: Viewing Saved Videos (V)');
        } else if (key === 'p') {
          e.preventDefault();
          dispatchAppAction('database:view-plans');
          showShortcutFeedback('Firestore: Viewing Saved Plans (P)');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, logAction]);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setServerHealth(data);
        logAction('system', 'Health check completed', { status: data.status, hasApiKey: data.hasApiKey });
      })
      .catch((err) => {
        console.warn('Health check failed:', err);
        logAction('system', 'Health check failed', { error: String(err) });
      });
  }, [logAction]);

  const handleTabChange = (tab: 'veo' | 'scaling' | 'deployment' | 'advisor' | 'database') => {
    if (tab !== activeTab) {
      logAction('navigation', `Navigated to ${tab} tab`, { from: activeTab, to: tab });
      setActiveTab(tab);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight text-slate-900">
                    CloudScale AI
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 text-3xs font-semibold text-sky-800">
                    Veo 3 Engine
                  </span>
                </div>
                <p className="text-3xs text-slate-500 hidden sm:block">
                  Scalable Processing Power &amp; Efficient Model Deployment
                </p>
              </div>
            </div>

            {/* Live Infrastructure Telemetry Ribbon & Command Palette Button */}
            <div className="flex items-center gap-2.5">
              {/* Quick Command Palette Trigger */}
              <button
                type="button"
                id="open-command-palette-btn"
                onClick={() => {
                  setIsCommandPaletteOpen(true);
                  logAction('navigation', 'Opened Command Palette via header button');
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-600 text-xs font-medium shadow-2xs transition cursor-pointer"
                title="Open Command Palette (Ctrl+K)"
              >
                <Command className="h-3 w-3 text-slate-500" />
                <span className="text-3xs text-slate-600 font-medium">Quick Switch</span>
                <kbd className="text-3xs font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-500 font-semibold shadow-2xs">
                  Ctrl+K
                </kbd>
              </button>

              {/* Dedicated Keyboard Shortcuts Modal Trigger */}
              <button
                type="button"
                id="open-shortcuts-modal-btn"
                onClick={() => {
                  setIsShortcutsModalOpen(true);
                  logAction('navigation', 'Opened Keyboard Shortcuts help modal');
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-600 text-xs font-medium shadow-2xs transition cursor-pointer"
                title="View Keyboard Shortcuts (?)"
              >
                <Keyboard className="h-3 w-3 text-slate-500" />
                <span className="text-3xs text-slate-600 font-medium">Shortcuts</span>
                <kbd className="text-3xs font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-500 font-semibold shadow-2xs">
                  ?
                </kbd>
              </button>

              <div className="hidden md:flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full text-slate-600">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-3xs">Region: asia-southeast1</span>
                <span className="text-slate-300">•</span>
                <span className="text-3xs text-slate-500">Firestore Active</span>
              </div>

              {/* Authentication Button / User Profile */}
              {authLoading ? (
                <div className="h-8 w-20 bg-slate-100 animate-pulse rounded-full" />
              ) : user ? (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full text-xs">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-3xs font-bold">
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <span className="text-3xs font-medium text-slate-700 max-w-[100px] truncate hidden sm:inline">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <button
                    type="button"
                    id="sign-out-btn"
                    onClick={() => {
                      signOut();
                      logAction('auth', 'User signed out');
                    }}
                    title="Sign Out"
                    className="text-slate-400 hover:text-slate-600 ml-0.5 cursor-pointer"
                  >
                    <LogOut className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="google-signin-btn"
                  onClick={() => {
                    signInWithGoogle();
                    logAction('auth', 'Triggered Google Sign-in popup');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
              )}

              {serverHealth && (
                <div className="text-3xs px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Cloud API Ready</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 border-t border-slate-100 py-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              id="tab-veo-video"
              onClick={() => handleTabChange('veo')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'veo'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Film className="h-4 w-4" />
              Veo 3 Video Studio
              <span className="ml-0.5 rounded px-1.5 py-0.2 bg-white/20 text-3xs font-mono">
                16:9 / 9:16
              </span>
            </button>

            <button
              type="button"
              id="tab-scalable-compute"
              onClick={() => handleTabChange('scaling')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'scaling'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Cpu className="h-4 w-4" />
              Scalable Processing Fabric
            </button>

            <button
              type="button"
              id="tab-model-deployment"
              onClick={() => handleTabChange('deployment')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'deployment'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Rocket className="h-4 w-4" />
              Model Deployment &amp; Quantization
            </button>

            <button
              type="button"
              id="tab-architecture-advisor"
              onClick={() => handleTabChange('advisor')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'advisor'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Cloud Architecture Advisor
            </button>

            <button
              type="button"
              id="tab-cloud-firestore"
              onClick={() => handleTabChange('database')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'database'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database className="h-4 w-4" />
              Cloud Firestore &amp; Auth
              <span className="ml-0.5 rounded px-1.5 py-0.2 bg-amber-100 text-amber-800 text-3xs font-semibold">
                DB
              </span>
            </button>
          </div>

          {/* Contextual Keyboard Shortcuts Ribbon */}
          <div className="hidden sm:flex items-center justify-between py-1 border-t border-slate-100/80 text-3xs text-slate-500">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-600">Active Tab Shortcuts:</span>
              {activeTab === 'veo' && (
                <div className="flex items-center gap-2">
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">G</kbd> Generate Video</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">E</kbd> AI Enhance Prompt</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">S</kbd> Save Draft</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">A</kbd> Toggle 16:9 / 9:16</span>
                </div>
              )}
              {activeTab === 'scaling' && (
                <div className="flex items-center gap-2">
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">S</kbd> Simulate 4,800 Req/min</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">M</kbd> Pause/Resume Stream</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">B</kbd> Inject Batch Spike</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">C</kbd> Cycle Accelerators</span>
                </div>
              )}
              {activeTab === 'deployment' && (
                <div className="flex items-center gap-2">
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">Q</kbd> Cycle Quantization</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">E</kbd> Cycle Serving Engine</span>
                </div>
              )}
              {activeTab === 'advisor' && (
                <div className="flex items-center gap-2">
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">G</kbd> Generate Blueprint</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">S</kbd> Save Plan to Cloud</span>
                </div>
              )}
              {activeTab === 'database' && (
                <div className="flex items-center gap-2">
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">S</kbd> Sync Telemetry</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">D</kbd> View Drafts</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">V</kbd> View Videos</span>
                  <span className="text-slate-300">•</span>
                  <span><kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">P</kbd> View Plans</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Switch tabs: <kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">1</kbd>–<kbd className="font-mono font-semibold bg-slate-100 px-1 py-0.2 rounded border border-slate-200 text-slate-700">5</kbd></span>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(true)}
                className="text-sky-600 hover:text-sky-700 font-semibold cursor-pointer underline decoration-sky-300"
              >
                All Shortcuts (?)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Fade-In and Slide-Up Animation */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
          >
            {activeTab === 'veo' && <VeoVideoGenerator />}
            {activeTab === 'scaling' && <CloudScalingSimulator />}
            {activeTab === 'deployment' && <ModelDeploymentOptimizer />}
            {activeTab === 'advisor' && <CloudArchitectureAdvisor />}
            {activeTab === 'database' && <CloudDatabasePanel onNavigateToTab={(tab) => handleTabChange(tab as any)} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer with Session Download */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">CloudScale AI</span>
            <span>•</span>
            <span>Powered by Google Cloud &amp; Veo 3 Video Diffusion</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Download Session Log Button */}
            <button
              type="button"
              id="download-session-log-btn"
              onClick={exportSessionLog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-700 text-xs font-medium shadow-2xs transition cursor-pointer"
              title="Download JSON log of user session interactions"
            >
              <Download className="h-3.5 w-3.5 text-sky-600" />
              <span>Download Session Log</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 border border-slate-200 text-3xs font-mono text-slate-600">
                {entries.length}
              </span>
            </button>

            <div className="hidden md:flex items-center gap-3 text-3xs font-mono border-l border-slate-200 pl-3">
              <span>veo-3.1-fast-generate-preview</span>
              <span>•</span>
              <span>Gemini 3.8 Flash</span>
              <span>•</span>
              <span>Port 3000 Ingress</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        activeTab={activeTab}
        onSelectTab={handleTabChange}
      />

      {/* Keyboard Shortcuts Reference Modal (?) */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
        activeTab={activeTab}
      />

      {/* Shortcut Action Toast */}
      <AnimatePresence>
        {actionNotification && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white shadow-xl border border-slate-700 text-xs font-medium backdrop-blur-md"
          >
            <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
            <span>{actionNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SessionLogProvider>
        <AppContent />
      </SessionLogProvider>
    </AuthProvider>
  );
}

