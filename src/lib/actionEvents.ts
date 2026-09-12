export type AppAction =
  // Veo Studio Actions
  | 'veo:generate'
  | 'veo:enhance-prompt'
  | 'veo:save-draft'
  | 'veo:toggle-aspect'
  // Scaling Simulator Actions
  | 'scaling:simulate-surge'
  | 'scaling:toggle-monitor'
  | 'scaling:inject-spike'
  | 'scaling:cycle-accelerator'
  // Deployment Optimizer Actions
  | 'deployment:cycle-quant'
  | 'deployment:cycle-engine'
  // Architecture Advisor Actions
  | 'advisor:generate-architecture'
  | 'advisor:save-plan'
  // Database Actions
  | 'database:sync-session'
  | 'database:view-drafts'
  | 'database:view-videos'
  | 'database:view-plans'
  // Global Actions
  | 'global:export-log'
  | 'global:toggle-shortcuts-help';

export function dispatchAppAction(action: AppAction, detail?: Record<string, any>) {
  window.dispatchEvent(new CustomEvent('app-action', { detail: { action, ...detail } }));
}
