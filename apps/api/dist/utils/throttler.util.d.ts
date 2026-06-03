export declare function throttledParallel<T>(tasks: (() => Promise<T>)[], limit?: number): Promise<PromiseSettledResult<T>[]>;
export declare function throttledMap<T, R>(items: T[], mapper: (item: T, index: number) => Promise<R>, limit?: number): Promise<R[]>;
