"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throttledParallel = throttledParallel;
exports.throttledMap = throttledMap;
async function throttledParallel(tasks, limit = 5) {
    const results = [];
    const executing = [];
    for (const task of tasks) {
        const p = task().then((value) => {
            results.push({ status: 'fulfilled', value });
        }, (reason) => {
            results.push({ status: 'rejected', reason });
        }).finally(() => {
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
async function throttledMap(items, mapper, limit = 5) {
    const tasks = items.map((item, index) => () => mapper(item, index));
    const results = await throttledParallel(tasks, limit);
    return results.map(r => {
        if (r.status === 'fulfilled')
            return r.value;
        throw r.reason;
    });
}
//# sourceMappingURL=throttler.util.js.map