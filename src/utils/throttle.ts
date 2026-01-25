/**
 * Throttle utility for limiting function call frequency.
 * Used to prevent expensive operations (like point cloud generation)
 * from running too frequently during continuous updates.
 */

/**
 * Creates a throttled version of a function that will only execute
 * at most once per specified delay period.
 * 
 * Features:
 * - Immediate first call
 * - Trailing call at end of delay period if calls were made during delay
 * - Maintains the `this` context of the original function
 * 
 * @param fn The function to throttle
 * @param delay Minimum time (ms) between function executions
 * @returns Throttled version of the function
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const throttled = function (this: unknown, ...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // Store the latest arguments for potential trailing call
    lastArgs = args;

    if (timeSinceLastCall >= delay) {
      // Enough time has passed, execute immediately
      lastCall = now;
      fn.apply(this, args);
    } else if (!timeoutId) {
      // Schedule a trailing call at the end of the delay period
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        if (lastArgs) {
          fn.apply(this, lastArgs);
        }
      }, delay - timeSinceLastCall);
    }
  } as T;

  return throttled;
}

/**
 * Creates a debounced version of a function that will only execute
 * after the specified delay has passed without any new calls.
 * 
 * @param fn The function to debounce
 * @param delay Time (ms) to wait after last call before executing
 * @returns Debounced version of the function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: unknown, ...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn.apply(this, args);
    }, delay);
  } as T;

  return debounced;
}
