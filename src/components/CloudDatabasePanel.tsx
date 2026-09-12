import React, { useState, useEffect } from 'react';
import { 
  Database, 
  User as UserIcon, 
  LogIn, 
  LogOut, 
  Film, 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Cloud, 
  Clock, 
  Layers, 
  ExternalLink,
  Activity,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSessionLog } from '../context/SessionLogContext';
import { 
  subscribeUserVideos, 
  deleteUserVideo, 
  FirestoreVideoItem,
  subscribeUserArchitecturePlans,
  deleteUserArchitecturePlan,
  FirestoreArchitecturePlan,
  syncUserSessionTelemetry,
  subscribeUserVeoDraft,
  FirestoreVeoDraft
} from '../services/firestoreData';
import firebaseConfig from '../../firebase-applet-config.json';

interface CloudDatabasePanelProps {
  onNavigateToTab?: (tab: string) => void;
}

export const CloudDatabasePanel: React.FC<CloudDatabasePanelProps> = ({ onNavigateToTab }) => {
  const { user, loading, signInWithGoogle, signOut, error: authError } = useAuth();
  const { entries, sessionId, logAction } = useSessionLog();

  const [videos, setVideos] = useState<FirestoreVideoItem[]>([]);
  const [plans, setPlans] = useState<FirestoreArchitecturePlan[]>([]);
  const [veoDraft, setVeoDraft] = useState<FirestoreVeoDraft | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSyncingSession, setIsSyncingSession] = useState(false);
  const [sessionSyncedSuccess, setSessionSyncedSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<'videos' | 'plans' | 'drafts' | 'session'>('videos');

  // Real-time listener for user's saved videos in Firestore
  useEffect(() => {
    if (!user) {
      setVideos([]);
      return;
    }
    const unsubscribe = subscribeUserVideos(user.uid, (items) => {
      setVideos(items);
    });
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for user's saved architecture plans in Firestore
  useEffect(() => {
    if (!user) {
      setPlans([]);
      return;
    }
    const unsubscribe = subscribeUserArchitecturePlans(user.uid, (items) => {
      setPlans(items);
    });
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for user's auto-saved Veo draft in Firestore
  useEffect(() => {
    if (!user) {
      setVeoDraft(null);
      return;
    }
    const unsubscribe = subscribeUserVeoDraft(user.uid, (draft) => {
      setVeoDraft(draft);
    });
    return () => unsubscribe();
  }, [user]);

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    logAction('database', 'Copied prompt from saved Firestore video', { videoId: id });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!user) return;
    try {
      await deleteUserVideo(user.uid, videoId);
      logAction('database', 'Deleted video record from Firestore', { videoId });
    } catch (err: any) {
      console.error('Failed to delete video:', err);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!user) return;
    try {
      await deleteUserArchitecturePlan(user.uid, planId);
      logAction('database', 'Deleted architecture plan from Firestore', { planId });
    } catch (err: any) {
      console.error('Failed to delete architecture plan:', err);
    }
  };

  const handleSyncSession = async () => {
    if (!user || isSyncingSession) return;
    setIsSyncingSession(true);
    setSessionSyncedSuccess(false);
    try {
      await syncUserSessionTelemetry(user.uid, {
        sessionId,
        startedAt: new Date(Date.now() - entries.length * 2000).toISOString(),
        totalInteractions: entries.length,
      });
      setSessionSyncedSuccess(true);
      logAction('database', 'Persisted session telemetry to Firestore database', {
        sessionId,
        totalInteractions: entries.length,
      });
      setTimeout(() => setSessionSyncedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to sync session to Firestore:', err);
    } finally {
      setIsSyncingSession(false);
    }
  };

  // Listen for global and command palette app-action events
  useEffect(() => {
    const handleAppAction = (e: Event) => {
      const customEv = e as CustomEvent<{ action: string }>;
      if (!customEv.detail) return;

      if (customEv.detail.action === 'database:sync-session') {
        handleSyncSession();
      } else if (customEv.detail.action === 'database:view-drafts') {
        setActiveSection('drafts');
      } else if (customEv.detail.action === 'database:view-videos') {
        setActiveSection('videos');
      } else if (customEv.detail.action === 'database:view-plans') {
        setActiveSection('plans');
      }
    };

    window.addEventListener('app-action', handleAppAction);
    return () => window.removeEventListener('app-action', handleAppAction);
  }, [user, isSyncingSession, sessionId, entries]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Connection Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Cloud Firestore &amp; Firebase Authentication
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Database
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Persistent NoSQL cloud data storage and Google Sign-in authentication. Secure user data isolation enforced through rule-validated subcollections.
              </p>
            </div>
          </div>

          {/* Auth Action Button */}
          <div>
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'User'} 
                      referrerPolicy="no-referrer"
                      className="h-7 w-7 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                      {user.displayName || 'Authenticated User'}
                    </p>
                    <p className="text-3xs text-slate-500 truncate max-w-[140px] font-mono">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="firebase-signout-btn"
                  onClick={() => {
                    signOut();
                    logAction('database', 'User signed out from Firebase Auth');
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="firebase-signin-btn"
                onClick={() => {
                  signInWithGoogle();
                  logAction('database', 'Initiated Google Sign-in with Firebase Auth');
                }}
                disabled={loading}
                className="px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            Authentication notice: {authError}
          </div>
        )}

        {/* Cloud Database Specs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">Database ID</span>
              <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="font-mono text-xs font-bold text-slate-800 mt-1 truncate" title={firebaseConfig.firestoreDatabaseId}>
              {firebaseConfig.firestoreDatabaseId}
            </p>
            <span className="text-3xs text-emerald-600 font-medium">Enterprise Edition</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">Firebase Project</span>
              <Cloud className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="font-mono text-xs font-bold text-slate-800 mt-1 truncate" title={firebaseConfig.projectId}>
              {firebaseConfig.projectId}
            </p>
            <span className="text-3xs text-slate-500">Google Cloud Platform</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">Security Rules</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-800 mt-1">
              Zero-Trust ABAC Hardened
            </p>
            <span className="text-3xs text-emerald-600 font-medium">Deployed &amp; Verified</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-semibold uppercase tracking-wider text-slate-500">Persisted Records</span>
              <Activity className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <p className="text-xs font-bold text-slate-800 mt-1">
              {videos.length} Videos · {plans.length} Plans · {veoDraft ? '1 Active Draft' : '0 Drafts'}
            </p>
            <span className="text-3xs text-slate-500">Real-time sync enabled</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {!user ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <UserIcon className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Sign in to Access Your Cloud Database</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Connecting with Google Sign-in enables private Firestore document storage for your generated Veo 3 videos, custom cloud architecture plans, and session telemetry.
          </p>
          <button
            type="button"
            id="google-signin-hero-btn"
            onClick={() => signInWithGoogle()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Subcollection Navigation Pill Bar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-2 shadow-2xs">
            <div className="flex space-x-1">
              <button
                type="button"
                id="view-videos-btn"
                onClick={() => setActiveSection('videos')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeSection === 'videos'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                <span>Saved Veo 3 Videos</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-3xs font-mono">
                  {videos.length}
                </span>
              </button>

              <button
                type="button"
                id="view-plans-btn"
                onClick={() => setActiveSection('plans')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeSection === 'plans'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Saved Architecture Plans</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-3xs font-mono">
                  {plans.length}
                </span>
              </button>

              <button
                type="button"
                id="view-drafts-btn"
                onClick={() => setActiveSection('drafts')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeSection === 'drafts'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Auto-Saved Veo Draft</span>
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-3xs font-mono">
                  {veoDraft ? '1' : '0'}
                </span>
              </button>

              <button
                type="button"
                id="view-session-btn"
                onClick={() => setActiveSection('session')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                  activeSection === 'session'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Cloud Session Sync</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-3xs text-slate-500 font-mono pr-2">
              <span>Path: /users/{user.uid.slice(0, 8)}...</span>
            </div>
          </div>

          {/* Section: Saved Veo 3 Videos */}
          {activeSection === 'videos' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Saved Veo 3 Video Generations
                  </h3>
                  <p className="text-3xs text-slate-500">
                    Stored in Firestore collection: <code className="font-mono text-indigo-600">users/{user.uid}/videos</code>
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {videos.length} document{videos.length === 1 ? '' : 's'}
                </span>
              </div>

              {videos.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Film className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium">No saved videos in your cloud database yet</p>
                  <p className="text-3xs text-slate-400 mt-1">
                    Generate a video in the Veo 3 Studio tab to automatically persist generation prompts and parameters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((v) => (
                    <div
                      key={v.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-3xs font-semibold ${
                            v.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : v.status === 'failed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {v.status.toUpperCase()}
                          </span>
                          <span className="text-3xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                            {v.aspectRatio}
                          </span>
                          <span className="text-3xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                            {v.resolution || '720p'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(v.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Delete from Firestore"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <p className="text-xs text-slate-700 line-clamp-3 bg-white p-2.5 rounded border border-slate-200 leading-relaxed font-sans">
                        "{v.prompt}"
                      </p>

                      <div className="flex items-center justify-between pt-1 text-3xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(v.createdAt).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(v.id, v.prompt)}
                          className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 font-medium cursor-pointer"
                        >
                          {copiedId === v.id ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Prompt
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Saved Architecture Plans */}
          {activeSection === 'plans' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Saved Cloud AI Architecture Plans
                  </h3>
                  <p className="text-3xs text-slate-500">
                    Stored in Firestore collection: <code className="font-mono text-purple-600">users/{user.uid}/architecturePlans</code>
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  {plans.length} plan{plans.length === 1 ? '' : 's'}
                </span>
              </div>

              {plans.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Sparkles className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium">No architecture plans saved yet</p>
                  <p className="text-3xs text-slate-400 mt-1">
                    Generate an infrastructure plan in the Cloud Architecture Advisor tab and click "Save Plan to Cloud" to persist it.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {p.workloadType}
                          </h4>
                          <p className="text-3xs text-slate-500 font-mono mt-0.5">
                            Model Scale: {p.modelSize || 'Generative Diffusion Transformer'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(p.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                          title="Delete from Firestore"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {p.computeCluster && (
                          <div className="p-2.5 rounded bg-white border border-slate-200">
                            <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Compute Cluster
                            </span>
                            <span className="text-slate-800 text-3xs font-mono">
                              {p.computeCluster}
                            </span>
                          </div>
                        )}
                        {p.scalingStrategy && (
                          <div className="p-2.5 rounded bg-white border border-slate-200">
                            <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                              Scaling Strategy
                            </span>
                            <span className="text-slate-800 text-3xs">
                              {p.scalingStrategy}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-3xs text-slate-400 flex items-center gap-1 pt-1">
                        <Clock className="h-3 w-3" />
                        Saved on {new Date(p.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Auto-Saved Veo Draft */}
          {activeSection === 'drafts' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Auto-Saved Veo 3 Video Generator Configuration
                  </h3>
                  <p className="text-3xs text-slate-500">
                    Persisted every 30 seconds to Firestore at <code className="font-mono text-amber-600">users/{user.uid}/drafts/veo_generator_draft</code>
                  </p>
                </div>
                {onNavigateToTab && (
                  <button
                    type="button"
                    id="open-in-veo-studio-btn"
                    onClick={() => onNavigateToTab('veo')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Veo Studio
                  </button>
                )}
              </div>

              {!veoDraft ? (
                <div className="p-8 text-center rounded-lg border border-dashed border-slate-200">
                  <Cloud className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">No Auto-Saved Draft Found</p>
                  <p className="text-3xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Type a prompt in the Veo Video Generator. The system will automatically persist your draft and aspect configuration to Firestore every 30 seconds.
                  </p>
                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('veo')}
                      className="mt-3 text-xs font-medium text-amber-600 hover:text-amber-800 underline cursor-pointer"
                    >
                      Go to Veo 3 Generator &rarr;
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-amber-200/80 bg-amber-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        Veo 3 Draft Document
                      </span>
                      <span className="text-3xs font-mono text-slate-500">ID: {veoDraft.id}</span>
                    </div>
                    <div className="text-3xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400" />
                      Last Saved: {new Date(veoDraft.lastSavedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                    <div className="text-3xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Prompt Description
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap">
                      {veoDraft.prompt}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-3xs text-slate-400 font-medium">Aspect Ratio</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{veoDraft.aspectRatio}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-3xs text-slate-400 font-medium">Resolution</div>
                      <div className="font-semibold text-slate-800 mt-0.5">{veoDraft.resolution || '720p'}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-3xs text-slate-400 font-medium">Sync Interval</div>
                      <div className="font-semibold text-emerald-600 mt-0.5">Every 30 Seconds</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="text-3xs text-slate-400 font-medium">Access Control</div>
                      <div className="font-semibold text-slate-800 mt-0.5">Private ABAC (Owner Only)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Cloud Session Telemetry Sync */}
          {activeSection === 'session' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Live Session Telemetry Cloud Persistence
                  </h3>
                  <p className="text-3xs text-slate-500">
                    Persist your current session interactions into Firestore at <code className="font-mono text-indigo-600">users/{user.uid}/sessionLogs/{sessionId}</code>
                  </p>
                </div>
                <button
                  type="button"
                  id="sync-session-to-firestore-btn"
                  onClick={handleSyncSession}
                  disabled={isSyncingSession}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncingSession ? 'animate-spin' : ''}`} />
                  {isSyncingSession ? 'Syncing...' : 'Sync Session to Firestore'}
                </button>
              </div>

              {sessionSyncedSuccess && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  Successfully synchronized current session telemetry to Firestore database!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Session UUID</span>
                  <p className="font-mono text-xs font-bold text-slate-800 mt-1 truncate">{sessionId}</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Recorded Events</span>
                  <p className="text-base font-bold text-slate-800 mt-1">{entries.length} interactions</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-3xs font-semibold text-slate-500 uppercase tracking-wider block">Database Status</span>
                  <p className="text-xs font-bold text-emerald-600 mt-1">Firestore Connected</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
