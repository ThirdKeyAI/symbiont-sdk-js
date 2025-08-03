/**
 * Test helper functions and utilities
 */

/**
 * Wait for a specified amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await delay(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a spy function that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): SpyFunction<T> {
  const calls: Array<{ args: Parameters<T>; result?: ReturnType<T>; error?: Error }> = [];
  
  const spy = ((...args: Parameters<T>) => {
    try {
      const result = implementation ? implementation(...args) : undefined;
      calls.push({ args, result });
      return result;
    } catch (error) {
      calls.push({ args, error: error as Error });
      throw error;
    }
  }) as SpyFunction<T>;

  spy.calls = calls;
  spy.callCount = () => calls.length;
  spy.calledWith = (...args: Parameters<T>) => 
    calls.some(call => JSON.stringify(call.args) === JSON.stringify(args));
  spy.lastCall = () => calls[calls.length - 1];
  spy.reset = () => calls.length = 0;

  return spy;
}

/**
 * Assert that a value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Expected value to be defined');
  }
}

/**
 * Assert that a function throws an error
 */
export async function assertThrows(
  fn: () => any | Promise<any>,
  expectedError?: string | RegExp | (new (...args: any[]) => Error)
): Promise<Error> {
  try {
    await fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedError) {
      if (typeof expectedError === 'string') {
        if (!(error as Error).message.includes(expectedError)) {
          throw new Error(`Expected error message to include "${expectedError}", got "${(error as Error).message}"`);
        }
      } else if (expectedError instanceof RegExp) {
        if (!expectedError.test((error as Error).message)) {
          throw new Error(`Expected error message to match ${expectedError}, got "${(error as Error).message}"`);
        }
      } else if (typeof expectedError === 'function') {
        if (!(error instanceof expectedError)) {
          throw new Error(`Expected error to be instance of ${expectedError.name}, got ${error?.constructor?.name}`);
        }
      }
    }
    return error as Error;
  }
}

/**
 * Create a mock timer that can be controlled in tests
 */
export function createMockTimer() {
  let currentTime = 0;
  const timers: Array<{ id: number; callback: () => void; time: number; interval?: number }> = [];
  let nextId = 1;

  return {
    now: () => currentTime,
    
    setTimeout: (callback: () => void, delay: number) => {
      const id = nextId++;
      timers.push({ id, callback, time: currentTime + delay });
      return id;
    },
    
    setInterval: (callback: () => void, interval: number) => {
      const id = nextId++;
      timers.push({ id, callback, time: currentTime + interval, interval });
      return id;
    },
    
    clearTimeout: (id: number) => {
      const index = timers.findIndex(timer => timer.id === id);
      if (index !== -1) {
        timers.splice(index, 1);
      }
    },
    
    clearInterval: (id: number) => {
      const index = timers.findIndex(timer => timer.id === id);
      if (index !== -1) {
        timers.splice(index, 1);
      }
    },
    
    tick: (ms: number) => {
      currentTime += ms;
      const toRun = timers.filter(timer => timer.time <= currentTime);
      
      for (const timer of toRun) {
        timer.callback();
        
        if (timer.interval) {
          // Reschedule interval timer
          timer.time = currentTime + timer.interval;
        } else {
          // Remove one-time timer
          const index = timers.indexOf(timer);
          if (index !== -1) {
            timers.splice(index, 1);
          }
        }
      }
    },
    
    clear: () => {
      timers.length = 0;
      currentTime = 0;
    }
  };
}

/**
 * Create a temporary environment variable for testing
 */
export function withEnv<T>(envVars: Record<string, string>, fn: () => T | Promise<T>): Promise<T> {
  const originalEnv = { ...process.env };
  
  // Set test environment variables
  Object.entries(envVars).forEach(([key, value]) => {
    process.env[key] = value;
  });
  
  const cleanup = () => {
    // Restore original environment
    process.env = originalEnv;
  };
  
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(cleanup);
    } else {
      cleanup();
      return Promise.resolve(result);
    }
  } catch (error) {
    cleanup();
    return Promise.reject(error);
  }
}

/**
 * Generate a random string for testing
 */
export function randomString(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Deep clone an object for testing
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

export interface SpyFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Array<{ args: Parameters<T>; result?: ReturnType<T>; error?: Error }>;
  callCount(): number;
  calledWith(...args: Parameters<T>): boolean;
  lastCall(): { args: Parameters<T>; result?: ReturnType<T>; error?: Error } | undefined;
  reset(): void;
}