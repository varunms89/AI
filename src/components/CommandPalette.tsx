import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  Film, 
  Cpu, 
  Rocket, 
  Sparkles, 
  Search, 
  Command, 
  ArrowRight, 
  Check, 
  X,
  Layers,
  FileDown,
  Database,
  Play,
  RotateCcw,
  Keyboard,
  RefreshCw,
  Cloud,
  Activity
} from 'lucide-react';
import { useSessionLog } from '../context/SessionLogContext';
import { AppAction, dispatchAppAction } from '../lib/actionEvents';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  description: string;
  shortcut: string;
  icon: React.ElementType;
  tabKey?: 'veo' | 'scaling' | 'deployment' | 'advisor' | 'database';
  action?: AppAction;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'veo' | 'scaling' | 'deployment' | 'advisor' | 'database';
  onSelectTab: (tab: 'veo' | 'scaling' | 'deployment' | 'advisor' | 'database') => void;
}

const COMMANDS: CommandItem[] = [
  // Primary Tabs
  {
    id: 'veo',
    tabKey: 'veo',
    title: 'Veo 3 Video Studio',
    category: 'Tabs',
    description: 'Synthesize 16:9 & 9:16 high-definition video using cloud accelerators',
    shortcut: '1',
    icon: Film,
  },
  {
    id: 'scaling',
    tabKey: 'scaling',
    title: 'Scalable Processing Fabric',
    category: 'Tabs',
    description: 'Elastic cluster scaling, TPU v5p & H100 simulation with traffic surges',
    shortcut: '2',
    icon: Cpu,
  },
  {
    id: 'deployment',
    tabKey: 'deployment',
    title: 'Model Deployment & Quantization',
    category: 'Tabs',
    description: 'FP8/INT4 precision matrix, vLLM/TensorRT engines & cold-start mitigation',
    shortcut: '3',
    icon: Rocket,
  },
  {
    id: 'advisor',
    tabKey: 'advisor',
    title: 'Cloud Architecture Advisor',
    category: 'Tabs',
    description: 'AI-generated cloud topologies, KEDA scaling rules & hardware recommendations',
    shortcut: '4',
    icon: Sparkles,
  },
  {
    id: 'database',
    tabKey: 'database',
    title: 'Cloud Firestore & Auth',
    category: 'Tabs',
    description: 'NoSQL document persistence, Google sign-in auth & saved cloud assets',
    shortcut: '5',
    icon: Database,
  },

  // Veo Studio Actions
  {
    id: 'veo_generate',
    title: 'Generate Video with Veo 3',
    category: 'Veo Video Studio',
    description: 'Submit prompt to Google Cloud AI Veo 3 generation cluster',
    shortcut: 'G',
    tabKey: 'veo',
    action: 'veo:generate',
    icon: Film,
  },
  {
    id: 'veo_enhance',
    title: 'AI Enhance Prompt',
    category: 'Veo Video Studio',
    description: 'Optimize prompt with cinematic camera angles & temporal pacing using Gemini 3.8 Flash',
    shortcut: 'E',
    tabKey: 'veo',
    action: 'veo:enhance-prompt',
    icon: Sparkles,
  },
  {
    id: 'veo_save',
    title: 'Save Prompt Draft to Firestore',
    category: 'Veo Video Studio',
    description: 'Persist video generation draft and configuration to Cloud Firestore',
    shortcut: 'S',
    tabKey: 'veo',
    action: 'veo:save-draft',
    icon: Database,
  },
  {
    id: 'veo_aspect',
    title: 'Toggle Aspect Ratio (16:9 / 9:16)',
    category: 'Veo Video Studio',
    description: 'Switch between landscape cinematic and portrait mobile reels format',
    shortcut: 'A',
    tabKey: 'veo',
    action: 'veo:toggle-aspect',
    icon: Layers,
  },

  // Scaling Actions
  {
    id: 'scaling_surge',
    title: 'Run Traffic Surge Simulation',
    category: 'Scalable Fabric',
    description: 'Inject 4,800 Req/min workload surge to trigger auto-scaling cluster expansion',
    shortcut: 'S',
    tabKey: 'scaling',
    action: 'scaling:simulate-surge',
    icon: Cpu,
  },
  {
    id: 'scaling_monitor_toggle',
    title: 'Toggle Resource Monitor Telemetry',
    category: 'Scalable Fabric',
    description: 'Pause or resume real-time Recharts CPU and HBM memory telemetry stream',
    shortcut: 'M',
    tabKey: 'scaling',
    action: 'scaling:toggle-monitor',
    icon: Play,
  },
  {
    id: 'scaling_inject_spike',
    title: 'Inject Batch Spike in Monitor',
    category: 'Scalable Fabric',
    description: 'Trigger sudden batch throughput spike across tensor cores in Resource Monitor',
    shortcut: 'B',
    tabKey: 'scaling',
    action: 'scaling:inject-spike',
    icon: Activity,
  },
  {
    id: 'scaling_cycle_acc',
    title: 'Cycle Cloud Accelerators',
    category: 'Scalable Fabric',
    description: 'Switch hardware between TPU v5p Pod, H100 SXM5, and NVIDIA L4',
    shortcut: 'C',
    tabKey: 'scaling',
    action: 'scaling:cycle-accelerator',
    icon: Layers,
  },

  // Deployment Actions
  {
    id: 'deploy_quant',
    title: 'Cycle Quantization Precision',
    category: 'Deployment',
    description: 'Rotate precision profiles across FP32, BF16, FP8, and INT4 AWQ',
    shortcut: 'Q',
    tabKey: 'deployment',
    action: 'deployment:cycle-quant',
    icon: Rocket,
  },
  {
    id: 'deploy_engine',
    title: 'Switch Serving Engine',
    category: 'Deployment',
    description: 'Toggle inference backend between vLLM, TensorRT-LLM, and Triton',
    shortcut: 'E',
    tabKey: 'deployment',
    action: 'deployment:cycle-engine',
    icon: Layers,
  },

  // Advisor Actions
  {
    id: 'advisor_gen',
    title: 'Generate AI Cloud Architecture',
    category: 'Architecture Advisor',
    description: 'Invoke Gemini 3.8 Flash to design full-stack infrastructure topology',
    shortcut: 'G',
    tabKey: 'advisor',
    action: 'advisor:generate-architecture',
    icon: Sparkles,
  },
  {
    id: 'advisor_save',
    title: 'Save Architecture Plan to Firestore',
    category: 'Architecture Advisor',
    description: 'Persist AI cloud architecture design to Cloud Firestore',
    shortcut: 'S',
    tabKey: 'advisor',
    action: 'advisor:save-plan',
    icon: Database,
  },

  // Database Actions
  {
    id: 'db_sync',
    title: 'Sync Session Telemetry to Firestore',
    category: 'Firestore & Auth',
    description: 'Upload active browser session audit log and system events to database',
    shortcut: 'S',
    tabKey: 'database',
    action: 'database:sync-session',
    icon: RefreshCw,
  },
  {
    id: 'db_drafts',
    title: 'View Auto-Saved Veo Drafts',
    category: 'Firestore & Auth',
    description: 'Inspect auto-saved video configurations stored in Firestore',
    shortcut: 'D',
    tabKey: 'database',
    action: 'database:view-drafts',
    icon: Cloud,
  },

  // Global & Help Actions
  {
    id: 'help_shortcuts',
    title: 'View Keyboard Shortcuts',
    category: 'Help & Reference',
    description: 'Display all available keyboard shortcuts categorized by active tab',
    shortcut: '?',
    action: 'global:toggle-shortcuts-help',
    icon: Keyboard,
  },
  {
    id: 'export_log',
    title: 'Download Session Telemetry Log',
    category: 'Telemetry',
    description: 'Export interaction telemetry and session event history as JSON file',
    shortcut: 'L',
    action: 'global:export-log',
    icon: FileDown,
  },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { exportSessionLog, logAction } = useSessionLog();

  // Filter commands by query
  const filteredCommands = COMMANDS.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.shortcut.toLowerCase() === q
    );
  });

  // Focus input and reset search query on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Default selected index to current active tab if matching, else 0
      const currentIdx = COMMANDS.findIndex((c) => c.tabKey === activeTab);
      setSelectedIndex(currentIdx >= 0 ? currentIdx : 0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  // Handle keyboard navigation within palette (ArrowUp, ArrowDown, Enter, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => 
          filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => 
          filteredCommands.length > 0
            ? (prev - 1 + filteredCommands.length) % filteredCommands.length
            : 0
        );
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        return;
      }

      // Quick number key shortcut (1-5) when input is empty
      if (!query && ['1', '2', '3', '4', '5'].includes(e.key)) {
        const matchingCmd = COMMANDS.find((c) => c.shortcut === e.key);
        if (matchingCmd) {
          e.preventDefault();
          executeCommand(matchingCmd);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, query, onClose]);

  const executeCommand = (cmd: CommandItem) => {
    logAction('navigation', `Command Palette executed: ${cmd.title}`, {
      commandId: cmd.id,
      shortcut: cmd.shortcut,
      action: cmd.action,
    });

    if (cmd.id === 'export_log') {
      exportSessionLog();
    }

    if (cmd.tabKey && cmd.tabKey !== activeTab) {
      onSelectTab(cmd.tabKey);
      if (cmd.action) {
        setTimeout(() => {
          dispatchAppAction(cmd.action!);
        }, 120);
      }
    } else if (cmd.action) {
      dispatchAppAction(cmd.action);
    } else if (cmd.tabKey) {
      onSelectTab(cmd.tabKey);
    }

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 px-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden z-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
          >
            {/* Header & Search Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                id="command-palette-input"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a tab name or shortcut (1-4)..."
                className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                aria-label="Close command palette"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Command Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No matching tabs or commands found for &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredCommands.map((cmd, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isActiveTab = cmd.tabKey === activeTab;
                  const Icon = cmd.icon;

                  return (
                    <div
                      key={cmd.id}
                      id={`command-item-${cmd.id}`}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={() => executeCommand(cmd)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-sky-50 text-sky-950 ring-1 ring-sky-200'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold truncate">
                              {cmd.title}
                            </span>
                            <span className="text-3xs px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-medium">
                              {cmd.category}
                            </span>
                            {isActiveTab && (
                              <span className="inline-flex items-center gap-0.5 text-3xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                <Check className="h-2.5 w-2.5" />
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-3xs text-slate-500 truncate mt-0.5">
                            {cmd.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <kbd className="px-1.5 py-0.5 text-3xs font-mono font-semibold bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
                          {cmd.shortcut}
                        </kbd>
                        <ArrowRight
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                            isSelected ? 'translate-x-0.5 text-sky-600' : 'opacity-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigation Hints */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-3xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-600">↑</kbd>
                  <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-600">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-600">Enter</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-slate-600">Esc</kbd>
                  Close
                </span>
              </div>

              <div className="flex items-center gap-1 font-mono">
                <Command className="h-3 w-3 text-slate-400" />
                <span>Ctrl+K</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
