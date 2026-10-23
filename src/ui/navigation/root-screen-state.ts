export type RootScreenState = {
  resourcesReady: boolean;
  authUserId: string | null;
  recordsReady: boolean;
  isAuthRoute: boolean;
  workMode: 'individual' | 'group';
  isOnline: boolean;
  storageError: string | null;
};

/** Screen access changes without replacing the root navigator or its navigation state. */
export function rootScreenMode(state: RootScreenState): 'loading' | 'login' | 'clinic-blocked' | 'content' {
  if (!state.resourcesReady) return 'loading';
  if (state.isAuthRoute) return 'content';
  if (!state.authUserId) return 'login';
  if (!state.recordsReady) return 'loading';
  if (state.workMode === 'group' && (!state.isOnline || Boolean(state.storageError))) return 'clinic-blocked';
  return 'content';
}
