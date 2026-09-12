import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Keyboard, X, Command, Sparkles, Film, Cpu, Rocket, Database, Globe } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'veo' | 'scaling' | 'deployment' | 'advisor' | 'database';
}

interface ShortcutItem {
  keys: string[];
  description: string;
  context?: string;
}

interface ShortcutCategory {
  title: string;
  tabKey?: 'veo' | 'scaling' | 'deployment' | 'advisor' | 'database';
  icon: React.ElementType;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: 'Global Navigation & Tools',
    icon: Globe,
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
      { keys: ['?'], description: 'Toggle Keyboard Shortcuts Modal' },
      { keys: ['1', '–', '5'], description: 'Switch between primary tabs (Veo, Scaling, etc.)' },
      { keys: ['Esc'], description: 'Close active modal or palette' },
    ]
  },
  {
    title: 'Veo 3 Video Studio',
    tabKey: 'veo',
    icon: Film,
    shortcuts: [
      { keys: ['G'], description: 'Trigger "Generate Video with Veo 3"' },
      { keys: ['Ctrl', 'Enter'], description: 'Generate Video (works from inside prompt textarea)' },
      { keys: ['E'], description: 'AI Prompt Enhancement with Gemini 3.8 Flash' },
      { keys: ['S'], description: 'Save draft to Cloud Firestore immediately' },
      { keys: ['A'], description: 'Toggle aspect ratio between 16:9 (Landscape) and 9:16 (Portrait)' },
    ]
  },
  {
    title: 'Scalable Processing Fabric',
    tabKey: 'scaling',
    icon: Cpu,
    shortcuts: [
      { keys: ['S'], description: 'Run 4,800 Req/min Traffic Surge Simulation' },
      { keys: ['M'], description: 'Toggle Resource Monitor telemetry stream (Pause / Resume)' },
      { keys: ['B'], description: 'Inject sudden batch load spike into Resource Monitor' },
      { keys: ['C'], description: 'Cycle Cloud Accelerators (TPU v5p → H100 SXM5 → NVIDIA L4)' },
    ]
  },
  {
    title: 'Model Deployment Optimizer',
    tabKey: 'deployment',
    icon: Rocket,
    shortcuts: [
      { keys: ['Q'], description: 'Cycle quantization precision (FP32 → BF16 → FP8 → INT4)' },
      { keys: ['E'], description: 'Switch inference serving engine (vLLM → TensorRT-LLM → Triton)' },
    ]
  },
  {
    title: 'Cloud Architecture Advisor',
    tabKey: 'advisor',
    icon: Sparkles,
    shortcuts: [
      { keys: ['G'], description: 'Generate AI Cloud Architecture topology blueprint' },
      { keys: ['S'], description: 'Save generated architecture plan to Cloud Firestore' },
    ]
  },
  {
    title: 'Cloud Firestore & Auth',
    tabKey: 'database',
    icon: Database,
    shortcuts: [
      { keys: ['S'], description: 'Synchronize current session telemetry to Firestore' },
      { keys: ['D'], description: 'View active 30s Auto-Saved Veo Drafts' },
      { keys: ['V'], description: 'View Saved Veo 3 Video generations' },
      { keys: ['P'], description: 'View Saved Cloud Architecture Plans' },
    ]
  }
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  activeTab
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-10"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
                  <Keyboard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Keyboard Shortcuts</h3>
                  <p className="text-3xs text-slate-500">Dedicated key commands active across tabs</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {SHORTCUT_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isCurrentTab = category.tabKey === activeTab;

                return (
                  <div key={category.title} className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-800">
                        {category.title}
                      </span>
                      {isCurrentTab && (
                        <span className="text-3xs font-semibold px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                          Current Active Tab
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.shortcuts.map((sc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 border border-slate-200/80 text-xs"
                        >
                          <span className="text-slate-700 text-3xs font-medium pr-2">
                            {sc.description}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {sc.keys.map((k, kIdx) => (
                              <React.Fragment key={kIdx}>
                                <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 font-mono text-3xs font-semibold shadow-2xs">
                                  {k}
                                </kbd>
                                {kIdx < sc.keys.length - 1 && sc.keys[kIdx + 1] !== '–' && k !== '–' && (
                                  <span className="text-slate-400 text-3xs">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 text-3xs text-slate-500">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-white border border-slate-300 font-mono font-semibold">?</kbd> anywhere to open this dialog</span>
              <span>Single letter shortcuts are active when not typing in text fields</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
