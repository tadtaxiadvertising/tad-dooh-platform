/**
 * ThrottledParallel utility for high-concurrency operations in low-resource environments.
 * Ensures that the application doesn't exceed memory limits by controlling the number 
 * of simultaneous promises.
 */

/**
 * Runs a list of tasks in parallel with a concurrency limit.
 * Uses Promise.allSettled to ensure all tasks finish even if some fail.
 * 
 * @param tasks Array of functions that return a Promise.
 * @param limit Maximum number of concurrent tasks. Default is 5.
 * @returns Promise that resolves to the results of all tasks.
 */
export async function throttledParallel<T>(
  tasks: (() => Promise<T>)[],
  limit = 5
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = task().then(
      (value) => {
        results.push({ status: 'fulfilled', value });
      },
      (reason) => {
        results.push({ status: 'rejected', reason });
      }
    ).finally(() => {
      executing.splice(executing.indexOf(p), 1);
    });

    executing.push(p);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Maps an array to a list of tasks with a concurrency limit.
 */
export async function throttledMap<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  limit = 5
): Promise<R[]> {
  const tasks = items.map((item, index) => () => mapper(item, index));
  const results = await throttledParallel(tasks, limit);
  
  return results.map(r => {
    if (r.status === 'fulfilled') return r.value;
    throw r.reason;
  });
}
