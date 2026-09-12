import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  getDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface FirestoreVideoItem {
  id: string;
  userId: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  status: 'initializing' | 'processing' | 'completed' | 'failed';
  operationName?: string;
  createdAt: string;
}

export interface FirestoreArchitecturePlan {
  id: string;
  userId: string;
  workloadType: string;
  modelSize?: string;
  computeCluster?: string;
  scalingStrategy?: string;
  createdAt: string;
}

export interface FirestoreSessionTelemetry {
  id: string;
  userId: string;
  sessionId: string;
  startedAt: string;
  totalInteractions: number;
  lastUpdated: string;
}

// 1. Veo 3 Video Persistence
export async function saveUserVideo(
  userId: string,
  video: {
    id: string;
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    resolution?: '720p' | '1080p';
    status: 'initializing' | 'processing' | 'completed' | 'failed';
    operationName?: string;
  }
): Promise<void> {
  const path = `users/${userId}/videos/${video.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'videos', video.id);
    const now = new Date().toISOString();
    const payload: FirestoreVideoItem = {
      id: video.id,
      userId,
      prompt: video.prompt.slice(0, 2048),
      aspectRatio: video.aspectRatio,
      resolution: video.resolution || '720p',
      status: video.status,
      operationName: video.operationName ? video.operationName.slice(0, 512) : undefined,
      createdAt: now,
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserVideos(
  userId: string,
  onUpdate: (videos: FirestoreVideoItem[]) => void
): () => void {
  const path = `users/${userId}/videos`;
  try {
    const q = collection(db, 'users', userId, 'videos');
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as FirestoreVideoItem);
        // Sort newest first
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteUserVideo(userId: string, videoId: string): Promise<void> {
  const path = `users/${userId}/videos/${videoId}`;
  try {
    const docRef = doc(db, 'users', userId, 'videos', videoId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 2. Cloud Architecture Plans Persistence
export async function saveUserArchitecturePlan(
  userId: string,
  plan: {
    id: string;
    workloadType: string;
    modelSize?: string;
    computeCluster?: string;
    scalingStrategy?: string;
  }
): Promise<void> {
  const path = `users/${userId}/architecturePlans/${plan.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'architecturePlans', plan.id);
    const payload: FirestoreArchitecturePlan = {
      id: plan.id,
      userId,
      workloadType: plan.workloadType.slice(0, 256),
      modelSize: plan.modelSize ? plan.modelSize.slice(0, 256) : undefined,
      computeCluster: plan.computeCluster ? plan.computeCluster.slice(0, 1024) : undefined,
      scalingStrategy: plan.scalingStrategy ? plan.scalingStrategy.slice(0, 1024) : undefined,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserArchitecturePlans(
  userId: string,
  onUpdate: (plans: FirestoreArchitecturePlan[]) => void
): () => void {
  const path = `users/${userId}/architecturePlans`;
  try {
    const q = collection(db, 'users', userId, 'architecturePlans');
    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data() as FirestoreArchitecturePlan);
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onUpdate(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteUserArchitecturePlan(userId: string, planId: string): Promise<void> {
  const path = `users/${userId}/architecturePlans/${planId}`;
  try {
    const docRef = doc(db, 'users', userId, 'architecturePlans', planId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 3. User Session Telemetry Persistence
export async function syncUserSessionTelemetry(
  userId: string,
  session: {
    sessionId: string;
    startedAt: string;
    totalInteractions: number;
  }
): Promise<void> {
  const path = `users/${userId}/sessionLogs/${session.sessionId}`;
  try {
    const docRef = doc(db, 'users', userId, 'sessionLogs', session.sessionId);
    const payload: FirestoreSessionTelemetry = {
      id: session.sessionId,
      userId,
      sessionId: session.sessionId,
      startedAt: session.startedAt,
      totalInteractions: session.totalInteractions,
      lastUpdated: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Veo Video Generator Draft Auto-Save Persistence
export interface FirestoreVeoDraft {
  id: string;
  userId: string;
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution?: '720p' | '1080p';
  lastSavedAt: string;
}

export const VEO_DRAFT_DOC_ID = 'veo_generator_draft';

export async function saveUserVeoDraft(
  userId: string,
  draft: {
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    resolution?: '720p' | '1080p';
  }
): Promise<FirestoreVeoDraft> {
  const path = `users/${userId}/drafts/${VEO_DRAFT_DOC_ID}`;
  try {
    const docRef = doc(db, 'users', userId, 'drafts', VEO_DRAFT_DOC_ID);
    const now = new Date().toISOString();
    const payload: FirestoreVeoDraft = {
      id: VEO_DRAFT_DOC_ID,
      userId,
      prompt: (draft.prompt || '').slice(0, 2048),
      aspectRatio: draft.aspectRatio,
      resolution: draft.resolution || '720p',
      lastSavedAt: now,
    };
    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserVeoDraft(
  userId: string
): Promise<FirestoreVeoDraft | null> {
  const path = `users/${userId}/drafts/${VEO_DRAFT_DOC_ID}`;
  try {
    const docRef = doc(db, 'users', userId, 'drafts', VEO_DRAFT_DOC_ID);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as FirestoreVeoDraft;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeUserVeoDraft(
  userId: string,
  onUpdate: (draft: FirestoreVeoDraft | null) => void
): () => void {
  const path = `users/${userId}/drafts/${VEO_DRAFT_DOC_ID}`;
  try {
    const docRef = doc(db, 'users', userId, 'drafts', VEO_DRAFT_DOC_ID);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as FirestoreVeoDraft);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
