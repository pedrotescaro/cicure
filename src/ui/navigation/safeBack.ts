import { useRouter, type Href } from 'expo-router';

export type Router = ReturnType<typeof useRouter>;

/**
 * Safely navigates back if there is a previous route in the navigation stack;
 * otherwise replaces the current route with the specified fallback route.
 * Prevents the React Navigation warning/error:
 * "The action 'GO_BACK' was not handled by any navigator. Is there any screen to go back to?"
 */
export function safeBack(router: Router, fallback: Href = '/') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
