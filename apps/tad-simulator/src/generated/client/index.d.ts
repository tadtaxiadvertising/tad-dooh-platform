
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model LatencyLog
 * 
 */
export type LatencyLog = $Result.DefaultSelection<Prisma.$LatencyLogPayload>
/**
 * Model SimulationConfig
 * 
 */
export type SimulationConfig = $Result.DefaultSelection<Prisma.$SimulationConfigPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more LatencyLogs
 * const latencyLogs = await prisma.latencyLog.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more LatencyLogs
   * const latencyLogs = await prisma.latencyLog.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.latencyLog`: Exposes CRUD operations for the **LatencyLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more LatencyLogs
    * const latencyLogs = await prisma.latencyLog.findMany()
    * ```
    */
  get latencyLog(): Prisma.LatencyLogDelegate<ExtArgs>;

  /**
   * `prisma.simulationConfig`: Exposes CRUD operations for the **SimulationConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SimulationConfigs
    * const simulationConfigs = await prisma.simulationConfig.findMany()
    * ```
    */
  get simulationConfig(): Prisma.SimulationConfigDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.22.0
   * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    LatencyLog: 'LatencyLog',
    SimulationConfig: 'SimulationConfig'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "latencyLog" | "simulationConfig"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      LatencyLog: {
        payload: Prisma.$LatencyLogPayload<ExtArgs>
        fields: Prisma.LatencyLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LatencyLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LatencyLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>
          }
          findFirst: {
            args: Prisma.LatencyLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LatencyLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>
          }
          findMany: {
            args: Prisma.LatencyLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>[]
          }
          create: {
            args: Prisma.LatencyLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>
          }
          createMany: {
            args: Prisma.LatencyLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.LatencyLogCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>[]
          }
          delete: {
            args: Prisma.LatencyLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>
          }
          update: {
            args: Prisma.LatencyLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>
          }
          deleteMany: {
            args: Prisma.LatencyLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LatencyLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LatencyLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LatencyLogPayload>
          }
          aggregate: {
            args: Prisma.LatencyLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLatencyLog>
          }
          groupBy: {
            args: Prisma.LatencyLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<LatencyLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.LatencyLogCountArgs<ExtArgs>
            result: $Utils.Optional<LatencyLogCountAggregateOutputType> | number
          }
        }
      }
      SimulationConfig: {
        payload: Prisma.$SimulationConfigPayload<ExtArgs>
        fields: Prisma.SimulationConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SimulationConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SimulationConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>
          }
          findFirst: {
            args: Prisma.SimulationConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SimulationConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>
          }
          findMany: {
            args: Prisma.SimulationConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>[]
          }
          create: {
            args: Prisma.SimulationConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>
          }
          createMany: {
            args: Prisma.SimulationConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SimulationConfigCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>[]
          }
          delete: {
            args: Prisma.SimulationConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>
          }
          update: {
            args: Prisma.SimulationConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>
          }
          deleteMany: {
            args: Prisma.SimulationConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SimulationConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SimulationConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SimulationConfigPayload>
          }
          aggregate: {
            args: Prisma.SimulationConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSimulationConfig>
          }
          groupBy: {
            args: Prisma.SimulationConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<SimulationConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.SimulationConfigCountArgs<ExtArgs>
            result: $Utils.Optional<SimulationConfigCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }


  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model LatencyLog
   */

  export type AggregateLatencyLog = {
    _count: LatencyLogCountAggregateOutputType | null
    _avg: LatencyLogAvgAggregateOutputType | null
    _sum: LatencyLogSumAggregateOutputType | null
    _min: LatencyLogMinAggregateOutputType | null
    _max: LatencyLogMaxAggregateOutputType | null
  }

  export type LatencyLogAvgAggregateOutputType = {
    id: number | null
    latencyMs: number | null
    statusCode: number | null
  }

  export type LatencyLogSumAggregateOutputType = {
    id: number | null
    latencyMs: number | null
    statusCode: number | null
  }

  export type LatencyLogMinAggregateOutputType = {
    id: number | null
    driverId: string | null
    endpoint: string | null
    latencyMs: number | null
    statusCode: number | null
    timestamp: Date | null
  }

  export type LatencyLogMaxAggregateOutputType = {
    id: number | null
    driverId: string | null
    endpoint: string | null
    latencyMs: number | null
    statusCode: number | null
    timestamp: Date | null
  }

  export type LatencyLogCountAggregateOutputType = {
    id: number
    driverId: number
    endpoint: number
    latencyMs: number
    statusCode: number
    timestamp: number
    _all: number
  }


  export type LatencyLogAvgAggregateInputType = {
    id?: true
    latencyMs?: true
    statusCode?: true
  }

  export type LatencyLogSumAggregateInputType = {
    id?: true
    latencyMs?: true
    statusCode?: true
  }

  export type LatencyLogMinAggregateInputType = {
    id?: true
    driverId?: true
    endpoint?: true
    latencyMs?: true
    statusCode?: true
    timestamp?: true
  }

  export type LatencyLogMaxAggregateInputType = {
    id?: true
    driverId?: true
    endpoint?: true
    latencyMs?: true
    statusCode?: true
    timestamp?: true
  }

  export type LatencyLogCountAggregateInputType = {
    id?: true
    driverId?: true
    endpoint?: true
    latencyMs?: true
    statusCode?: true
    timestamp?: true
    _all?: true
  }

  export type LatencyLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LatencyLog to aggregate.
     */
    where?: LatencyLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LatencyLogs to fetch.
     */
    orderBy?: LatencyLogOrderByWithRelationInput | LatencyLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LatencyLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LatencyLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LatencyLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned LatencyLogs
    **/
    _count?: true | LatencyLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LatencyLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LatencyLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LatencyLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LatencyLogMaxAggregateInputType
  }

  export type GetLatencyLogAggregateType<T extends LatencyLogAggregateArgs> = {
        [P in keyof T & keyof AggregateLatencyLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLatencyLog[P]>
      : GetScalarType<T[P], AggregateLatencyLog[P]>
  }




  export type LatencyLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LatencyLogWhereInput
    orderBy?: LatencyLogOrderByWithAggregationInput | LatencyLogOrderByWithAggregationInput[]
    by: LatencyLogScalarFieldEnum[] | LatencyLogScalarFieldEnum
    having?: LatencyLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LatencyLogCountAggregateInputType | true
    _avg?: LatencyLogAvgAggregateInputType
    _sum?: LatencyLogSumAggregateInputType
    _min?: LatencyLogMinAggregateInputType
    _max?: LatencyLogMaxAggregateInputType
  }

  export type LatencyLogGroupByOutputType = {
    id: number
    driverId: string | null
    endpoint: string
    latencyMs: number
    statusCode: number
    timestamp: Date
    _count: LatencyLogCountAggregateOutputType | null
    _avg: LatencyLogAvgAggregateOutputType | null
    _sum: LatencyLogSumAggregateOutputType | null
    _min: LatencyLogMinAggregateOutputType | null
    _max: LatencyLogMaxAggregateOutputType | null
  }

  type GetLatencyLogGroupByPayload<T extends LatencyLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LatencyLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LatencyLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LatencyLogGroupByOutputType[P]>
            : GetScalarType<T[P], LatencyLogGroupByOutputType[P]>
        }
      >
    >


  export type LatencyLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    driverId?: boolean
    endpoint?: boolean
    latencyMs?: boolean
    statusCode?: boolean
    timestamp?: boolean
  }, ExtArgs["result"]["latencyLog"]>

  export type LatencyLogSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    driverId?: boolean
    endpoint?: boolean
    latencyMs?: boolean
    statusCode?: boolean
    timestamp?: boolean
  }, ExtArgs["result"]["latencyLog"]>

  export type LatencyLogSelectScalar = {
    id?: boolean
    driverId?: boolean
    endpoint?: boolean
    latencyMs?: boolean
    statusCode?: boolean
    timestamp?: boolean
  }


  export type $LatencyLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "LatencyLog"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      driverId: string | null
      endpoint: string
      latencyMs: number
      statusCode: number
      timestamp: Date
    }, ExtArgs["result"]["latencyLog"]>
    composites: {}
  }

  type LatencyLogGetPayload<S extends boolean | null | undefined | LatencyLogDefaultArgs> = $Result.GetResult<Prisma.$LatencyLogPayload, S>

  type LatencyLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<LatencyLogFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: LatencyLogCountAggregateInputType | true
    }

  export interface LatencyLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['LatencyLog'], meta: { name: 'LatencyLog' } }
    /**
     * Find zero or one LatencyLog that matches the filter.
     * @param {LatencyLogFindUniqueArgs} args - Arguments to find a LatencyLog
     * @example
     * // Get one LatencyLog
     * const latencyLog = await prisma.latencyLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LatencyLogFindUniqueArgs>(args: SelectSubset<T, LatencyLogFindUniqueArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one LatencyLog that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {LatencyLogFindUniqueOrThrowArgs} args - Arguments to find a LatencyLog
     * @example
     * // Get one LatencyLog
     * const latencyLog = await prisma.latencyLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LatencyLogFindUniqueOrThrowArgs>(args: SelectSubset<T, LatencyLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first LatencyLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LatencyLogFindFirstArgs} args - Arguments to find a LatencyLog
     * @example
     * // Get one LatencyLog
     * const latencyLog = await prisma.latencyLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LatencyLogFindFirstArgs>(args?: SelectSubset<T, LatencyLogFindFirstArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first LatencyLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LatencyLogFindFirstOrThrowArgs} args - Arguments to find a LatencyLog
     * @example
     * // Get one LatencyLog
     * const latencyLog = await prisma.latencyLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LatencyLogFindFirstOrThrowArgs>(args?: SelectSubset<T, LatencyLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more LatencyLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LatencyLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all LatencyLogs
     * const latencyLogs = await prisma.latencyLog.findMany()
     * 
     * // Get first 10 LatencyLogs
     * const latencyLogs = await prisma.latencyLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const latencyLogWithIdOnly = await prisma.latencyLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LatencyLogFindManyArgs>(args?: SelectSubset<T, LatencyLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a LatencyLog.
     * @param {LatencyLogCreateArgs} args - Arguments to create a LatencyLog.
     * @example
     * // Create one LatencyLog
     * const LatencyLog = await prisma.latencyLog.create({
     *   data: {
     *     // ... data to create a LatencyLog
     *   }
     * })
     * 
     */
    create<T extends LatencyLogCreateArgs>(args: SelectSubset<T, LatencyLogCreateArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many LatencyLogs.
     * @param {LatencyLogCreateManyArgs} args - Arguments to create many LatencyLogs.
     * @example
     * // Create many LatencyLogs
     * const latencyLog = await prisma.latencyLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LatencyLogCreateManyArgs>(args?: SelectSubset<T, LatencyLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many LatencyLogs and returns the data saved in the database.
     * @param {LatencyLogCreateManyAndReturnArgs} args - Arguments to create many LatencyLogs.
     * @example
     * // Create many LatencyLogs
     * const latencyLog = await prisma.latencyLog.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many LatencyLogs and only return the `id`
     * const latencyLogWithIdOnly = await prisma.latencyLog.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends LatencyLogCreateManyAndReturnArgs>(args?: SelectSubset<T, LatencyLogCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a LatencyLog.
     * @param {LatencyLogDeleteArgs} args - Arguments to delete one LatencyLog.
     * @example
     * // Delete one LatencyLog
     * const LatencyLog = await prisma.latencyLog.delete({
     *   where: {
     *     // ... filter to delete one LatencyLog
     *   }
     * })
     * 
     */
    delete<T extends LatencyLogDeleteArgs>(args: SelectSubset<T, LatencyLogDeleteArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one LatencyLog.
     * @param {LatencyLogUpdateArgs} args - Arguments to update one LatencyLog.
     * @example
     * // Update one LatencyLog
     * const latencyLog = await prisma.latencyLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LatencyLogUpdateArgs>(args: SelectSubset<T, LatencyLogUpdateArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more LatencyLogs.
     * @param {LatencyLogDeleteManyArgs} args - Arguments to filter LatencyLogs to delete.
     * @example
     * // Delete a few LatencyLogs
     * const { count } = await prisma.latencyLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LatencyLogDeleteManyArgs>(args?: SelectSubset<T, LatencyLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more LatencyLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LatencyLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many LatencyLogs
     * const latencyLog = await prisma.latencyLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LatencyLogUpdateManyArgs>(args: SelectSubset<T, LatencyLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one LatencyLog.
     * @param {LatencyLogUpsertArgs} args - Arguments to update or create a LatencyLog.
     * @example
     * // Update or create a LatencyLog
     * const latencyLog = await prisma.latencyLog.upsert({
     *   create: {
     *     // ... data to create a LatencyLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the LatencyLog we want to update
     *   }
     * })
     */
    upsert<T extends LatencyLogUpsertArgs>(args: SelectSubset<T, LatencyLogUpsertArgs<ExtArgs>>): Prisma__LatencyLogClient<$Result.GetResult<Prisma.$LatencyLogPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of LatencyLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LatencyLogCountArgs} args - Arguments to filter LatencyLogs to count.
     * @example
     * // Count the number of LatencyLogs
     * const count = await prisma.latencyLog.count({
     *   where: {
     *     // ... the filter for the LatencyLogs we want to count
     *   }
     * })
    **/
    count<T extends LatencyLogCountArgs>(
      args?: Subset<T, LatencyLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LatencyLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a LatencyLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LatencyLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LatencyLogAggregateArgs>(args: Subset<T, LatencyLogAggregateArgs>): Prisma.PrismaPromise<GetLatencyLogAggregateType<T>>

    /**
     * Group by LatencyLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LatencyLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LatencyLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LatencyLogGroupByArgs['orderBy'] }
        : { orderBy?: LatencyLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LatencyLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLatencyLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the LatencyLog model
   */
  readonly fields: LatencyLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for LatencyLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LatencyLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the LatencyLog model
   */ 
  interface LatencyLogFieldRefs {
    readonly id: FieldRef<"LatencyLog", 'Int'>
    readonly driverId: FieldRef<"LatencyLog", 'String'>
    readonly endpoint: FieldRef<"LatencyLog", 'String'>
    readonly latencyMs: FieldRef<"LatencyLog", 'Int'>
    readonly statusCode: FieldRef<"LatencyLog", 'Int'>
    readonly timestamp: FieldRef<"LatencyLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * LatencyLog findUnique
   */
  export type LatencyLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * Filter, which LatencyLog to fetch.
     */
    where: LatencyLogWhereUniqueInput
  }

  /**
   * LatencyLog findUniqueOrThrow
   */
  export type LatencyLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * Filter, which LatencyLog to fetch.
     */
    where: LatencyLogWhereUniqueInput
  }

  /**
   * LatencyLog findFirst
   */
  export type LatencyLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * Filter, which LatencyLog to fetch.
     */
    where?: LatencyLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LatencyLogs to fetch.
     */
    orderBy?: LatencyLogOrderByWithRelationInput | LatencyLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LatencyLogs.
     */
    cursor?: LatencyLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LatencyLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LatencyLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LatencyLogs.
     */
    distinct?: LatencyLogScalarFieldEnum | LatencyLogScalarFieldEnum[]
  }

  /**
   * LatencyLog findFirstOrThrow
   */
  export type LatencyLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * Filter, which LatencyLog to fetch.
     */
    where?: LatencyLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LatencyLogs to fetch.
     */
    orderBy?: LatencyLogOrderByWithRelationInput | LatencyLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for LatencyLogs.
     */
    cursor?: LatencyLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LatencyLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LatencyLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of LatencyLogs.
     */
    distinct?: LatencyLogScalarFieldEnum | LatencyLogScalarFieldEnum[]
  }

  /**
   * LatencyLog findMany
   */
  export type LatencyLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * Filter, which LatencyLogs to fetch.
     */
    where?: LatencyLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of LatencyLogs to fetch.
     */
    orderBy?: LatencyLogOrderByWithRelationInput | LatencyLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing LatencyLogs.
     */
    cursor?: LatencyLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` LatencyLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` LatencyLogs.
     */
    skip?: number
    distinct?: LatencyLogScalarFieldEnum | LatencyLogScalarFieldEnum[]
  }

  /**
   * LatencyLog create
   */
  export type LatencyLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * The data needed to create a LatencyLog.
     */
    data: XOR<LatencyLogCreateInput, LatencyLogUncheckedCreateInput>
  }

  /**
   * LatencyLog createMany
   */
  export type LatencyLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many LatencyLogs.
     */
    data: LatencyLogCreateManyInput | LatencyLogCreateManyInput[]
  }

  /**
   * LatencyLog createManyAndReturn
   */
  export type LatencyLogCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many LatencyLogs.
     */
    data: LatencyLogCreateManyInput | LatencyLogCreateManyInput[]
  }

  /**
   * LatencyLog update
   */
  export type LatencyLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * The data needed to update a LatencyLog.
     */
    data: XOR<LatencyLogUpdateInput, LatencyLogUncheckedUpdateInput>
    /**
     * Choose, which LatencyLog to update.
     */
    where: LatencyLogWhereUniqueInput
  }

  /**
   * LatencyLog updateMany
   */
  export type LatencyLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update LatencyLogs.
     */
    data: XOR<LatencyLogUpdateManyMutationInput, LatencyLogUncheckedUpdateManyInput>
    /**
     * Filter which LatencyLogs to update
     */
    where?: LatencyLogWhereInput
  }

  /**
   * LatencyLog upsert
   */
  export type LatencyLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * The filter to search for the LatencyLog to update in case it exists.
     */
    where: LatencyLogWhereUniqueInput
    /**
     * In case the LatencyLog found by the `where` argument doesn't exist, create a new LatencyLog with this data.
     */
    create: XOR<LatencyLogCreateInput, LatencyLogUncheckedCreateInput>
    /**
     * In case the LatencyLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LatencyLogUpdateInput, LatencyLogUncheckedUpdateInput>
  }

  /**
   * LatencyLog delete
   */
  export type LatencyLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
    /**
     * Filter which LatencyLog to delete.
     */
    where: LatencyLogWhereUniqueInput
  }

  /**
   * LatencyLog deleteMany
   */
  export type LatencyLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which LatencyLogs to delete
     */
    where?: LatencyLogWhereInput
  }

  /**
   * LatencyLog without action
   */
  export type LatencyLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the LatencyLog
     */
    select?: LatencyLogSelect<ExtArgs> | null
  }


  /**
   * Model SimulationConfig
   */

  export type AggregateSimulationConfig = {
    _count: SimulationConfigCountAggregateOutputType | null
    _avg: SimulationConfigAvgAggregateOutputType | null
    _sum: SimulationConfigSumAggregateOutputType | null
    _min: SimulationConfigMinAggregateOutputType | null
    _max: SimulationConfigMaxAggregateOutputType | null
  }

  export type SimulationConfigAvgAggregateOutputType = {
    id: number | null
    driverCount: number | null
  }

  export type SimulationConfigSumAggregateOutputType = {
    id: number | null
    driverCount: number | null
  }

  export type SimulationConfigMinAggregateOutputType = {
    id: number | null
    driverCount: number | null
    running: boolean | null
    updatedAt: Date | null
  }

  export type SimulationConfigMaxAggregateOutputType = {
    id: number | null
    driverCount: number | null
    running: boolean | null
    updatedAt: Date | null
  }

  export type SimulationConfigCountAggregateOutputType = {
    id: number
    driverCount: number
    running: number
    updatedAt: number
    _all: number
  }


  export type SimulationConfigAvgAggregateInputType = {
    id?: true
    driverCount?: true
  }

  export type SimulationConfigSumAggregateInputType = {
    id?: true
    driverCount?: true
  }

  export type SimulationConfigMinAggregateInputType = {
    id?: true
    driverCount?: true
    running?: true
    updatedAt?: true
  }

  export type SimulationConfigMaxAggregateInputType = {
    id?: true
    driverCount?: true
    running?: true
    updatedAt?: true
  }

  export type SimulationConfigCountAggregateInputType = {
    id?: true
    driverCount?: true
    running?: true
    updatedAt?: true
    _all?: true
  }

  export type SimulationConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SimulationConfig to aggregate.
     */
    where?: SimulationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationConfigs to fetch.
     */
    orderBy?: SimulationConfigOrderByWithRelationInput | SimulationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SimulationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SimulationConfigs
    **/
    _count?: true | SimulationConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SimulationConfigAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SimulationConfigSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SimulationConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SimulationConfigMaxAggregateInputType
  }

  export type GetSimulationConfigAggregateType<T extends SimulationConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateSimulationConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSimulationConfig[P]>
      : GetScalarType<T[P], AggregateSimulationConfig[P]>
  }




  export type SimulationConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SimulationConfigWhereInput
    orderBy?: SimulationConfigOrderByWithAggregationInput | SimulationConfigOrderByWithAggregationInput[]
    by: SimulationConfigScalarFieldEnum[] | SimulationConfigScalarFieldEnum
    having?: SimulationConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SimulationConfigCountAggregateInputType | true
    _avg?: SimulationConfigAvgAggregateInputType
    _sum?: SimulationConfigSumAggregateInputType
    _min?: SimulationConfigMinAggregateInputType
    _max?: SimulationConfigMaxAggregateInputType
  }

  export type SimulationConfigGroupByOutputType = {
    id: number
    driverCount: number
    running: boolean
    updatedAt: Date
    _count: SimulationConfigCountAggregateOutputType | null
    _avg: SimulationConfigAvgAggregateOutputType | null
    _sum: SimulationConfigSumAggregateOutputType | null
    _min: SimulationConfigMinAggregateOutputType | null
    _max: SimulationConfigMaxAggregateOutputType | null
  }

  type GetSimulationConfigGroupByPayload<T extends SimulationConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SimulationConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SimulationConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SimulationConfigGroupByOutputType[P]>
            : GetScalarType<T[P], SimulationConfigGroupByOutputType[P]>
        }
      >
    >


  export type SimulationConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    driverCount?: boolean
    running?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["simulationConfig"]>

  export type SimulationConfigSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    driverCount?: boolean
    running?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["simulationConfig"]>

  export type SimulationConfigSelectScalar = {
    id?: boolean
    driverCount?: boolean
    running?: boolean
    updatedAt?: boolean
  }


  export type $SimulationConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SimulationConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      driverCount: number
      running: boolean
      updatedAt: Date
    }, ExtArgs["result"]["simulationConfig"]>
    composites: {}
  }

  type SimulationConfigGetPayload<S extends boolean | null | undefined | SimulationConfigDefaultArgs> = $Result.GetResult<Prisma.$SimulationConfigPayload, S>

  type SimulationConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<SimulationConfigFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: SimulationConfigCountAggregateInputType | true
    }

  export interface SimulationConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SimulationConfig'], meta: { name: 'SimulationConfig' } }
    /**
     * Find zero or one SimulationConfig that matches the filter.
     * @param {SimulationConfigFindUniqueArgs} args - Arguments to find a SimulationConfig
     * @example
     * // Get one SimulationConfig
     * const simulationConfig = await prisma.simulationConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SimulationConfigFindUniqueArgs>(args: SelectSubset<T, SimulationConfigFindUniqueArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "findUnique"> | null, null, ExtArgs>

    /**
     * Find one SimulationConfig that matches the filter or throw an error with `error.code='P2025'` 
     * if no matches were found.
     * @param {SimulationConfigFindUniqueOrThrowArgs} args - Arguments to find a SimulationConfig
     * @example
     * // Get one SimulationConfig
     * const simulationConfig = await prisma.simulationConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SimulationConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, SimulationConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "findUniqueOrThrow">, never, ExtArgs>

    /**
     * Find the first SimulationConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationConfigFindFirstArgs} args - Arguments to find a SimulationConfig
     * @example
     * // Get one SimulationConfig
     * const simulationConfig = await prisma.simulationConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SimulationConfigFindFirstArgs>(args?: SelectSubset<T, SimulationConfigFindFirstArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "findFirst"> | null, null, ExtArgs>

    /**
     * Find the first SimulationConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationConfigFindFirstOrThrowArgs} args - Arguments to find a SimulationConfig
     * @example
     * // Get one SimulationConfig
     * const simulationConfig = await prisma.simulationConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SimulationConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, SimulationConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "findFirstOrThrow">, never, ExtArgs>

    /**
     * Find zero or more SimulationConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SimulationConfigs
     * const simulationConfigs = await prisma.simulationConfig.findMany()
     * 
     * // Get first 10 SimulationConfigs
     * const simulationConfigs = await prisma.simulationConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const simulationConfigWithIdOnly = await prisma.simulationConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SimulationConfigFindManyArgs>(args?: SelectSubset<T, SimulationConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "findMany">>

    /**
     * Create a SimulationConfig.
     * @param {SimulationConfigCreateArgs} args - Arguments to create a SimulationConfig.
     * @example
     * // Create one SimulationConfig
     * const SimulationConfig = await prisma.simulationConfig.create({
     *   data: {
     *     // ... data to create a SimulationConfig
     *   }
     * })
     * 
     */
    create<T extends SimulationConfigCreateArgs>(args: SelectSubset<T, SimulationConfigCreateArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "create">, never, ExtArgs>

    /**
     * Create many SimulationConfigs.
     * @param {SimulationConfigCreateManyArgs} args - Arguments to create many SimulationConfigs.
     * @example
     * // Create many SimulationConfigs
     * const simulationConfig = await prisma.simulationConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SimulationConfigCreateManyArgs>(args?: SelectSubset<T, SimulationConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SimulationConfigs and returns the data saved in the database.
     * @param {SimulationConfigCreateManyAndReturnArgs} args - Arguments to create many SimulationConfigs.
     * @example
     * // Create many SimulationConfigs
     * const simulationConfig = await prisma.simulationConfig.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SimulationConfigs and only return the `id`
     * const simulationConfigWithIdOnly = await prisma.simulationConfig.createManyAndReturn({ 
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SimulationConfigCreateManyAndReturnArgs>(args?: SelectSubset<T, SimulationConfigCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "createManyAndReturn">>

    /**
     * Delete a SimulationConfig.
     * @param {SimulationConfigDeleteArgs} args - Arguments to delete one SimulationConfig.
     * @example
     * // Delete one SimulationConfig
     * const SimulationConfig = await prisma.simulationConfig.delete({
     *   where: {
     *     // ... filter to delete one SimulationConfig
     *   }
     * })
     * 
     */
    delete<T extends SimulationConfigDeleteArgs>(args: SelectSubset<T, SimulationConfigDeleteArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "delete">, never, ExtArgs>

    /**
     * Update one SimulationConfig.
     * @param {SimulationConfigUpdateArgs} args - Arguments to update one SimulationConfig.
     * @example
     * // Update one SimulationConfig
     * const simulationConfig = await prisma.simulationConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SimulationConfigUpdateArgs>(args: SelectSubset<T, SimulationConfigUpdateArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "update">, never, ExtArgs>

    /**
     * Delete zero or more SimulationConfigs.
     * @param {SimulationConfigDeleteManyArgs} args - Arguments to filter SimulationConfigs to delete.
     * @example
     * // Delete a few SimulationConfigs
     * const { count } = await prisma.simulationConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SimulationConfigDeleteManyArgs>(args?: SelectSubset<T, SimulationConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SimulationConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SimulationConfigs
     * const simulationConfig = await prisma.simulationConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SimulationConfigUpdateManyArgs>(args: SelectSubset<T, SimulationConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one SimulationConfig.
     * @param {SimulationConfigUpsertArgs} args - Arguments to update or create a SimulationConfig.
     * @example
     * // Update or create a SimulationConfig
     * const simulationConfig = await prisma.simulationConfig.upsert({
     *   create: {
     *     // ... data to create a SimulationConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SimulationConfig we want to update
     *   }
     * })
     */
    upsert<T extends SimulationConfigUpsertArgs>(args: SelectSubset<T, SimulationConfigUpsertArgs<ExtArgs>>): Prisma__SimulationConfigClient<$Result.GetResult<Prisma.$SimulationConfigPayload<ExtArgs>, T, "upsert">, never, ExtArgs>


    /**
     * Count the number of SimulationConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationConfigCountArgs} args - Arguments to filter SimulationConfigs to count.
     * @example
     * // Count the number of SimulationConfigs
     * const count = await prisma.simulationConfig.count({
     *   where: {
     *     // ... the filter for the SimulationConfigs we want to count
     *   }
     * })
    **/
    count<T extends SimulationConfigCountArgs>(
      args?: Subset<T, SimulationConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SimulationConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SimulationConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SimulationConfigAggregateArgs>(args: Subset<T, SimulationConfigAggregateArgs>): Prisma.PrismaPromise<GetSimulationConfigAggregateType<T>>

    /**
     * Group by SimulationConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SimulationConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SimulationConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SimulationConfigGroupByArgs['orderBy'] }
        : { orderBy?: SimulationConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SimulationConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSimulationConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SimulationConfig model
   */
  readonly fields: SimulationConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SimulationConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SimulationConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SimulationConfig model
   */ 
  interface SimulationConfigFieldRefs {
    readonly id: FieldRef<"SimulationConfig", 'Int'>
    readonly driverCount: FieldRef<"SimulationConfig", 'Int'>
    readonly running: FieldRef<"SimulationConfig", 'Boolean'>
    readonly updatedAt: FieldRef<"SimulationConfig", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SimulationConfig findUnique
   */
  export type SimulationConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * Filter, which SimulationConfig to fetch.
     */
    where: SimulationConfigWhereUniqueInput
  }

  /**
   * SimulationConfig findUniqueOrThrow
   */
  export type SimulationConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * Filter, which SimulationConfig to fetch.
     */
    where: SimulationConfigWhereUniqueInput
  }

  /**
   * SimulationConfig findFirst
   */
  export type SimulationConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * Filter, which SimulationConfig to fetch.
     */
    where?: SimulationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationConfigs to fetch.
     */
    orderBy?: SimulationConfigOrderByWithRelationInput | SimulationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SimulationConfigs.
     */
    cursor?: SimulationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SimulationConfigs.
     */
    distinct?: SimulationConfigScalarFieldEnum | SimulationConfigScalarFieldEnum[]
  }

  /**
   * SimulationConfig findFirstOrThrow
   */
  export type SimulationConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * Filter, which SimulationConfig to fetch.
     */
    where?: SimulationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationConfigs to fetch.
     */
    orderBy?: SimulationConfigOrderByWithRelationInput | SimulationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SimulationConfigs.
     */
    cursor?: SimulationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SimulationConfigs.
     */
    distinct?: SimulationConfigScalarFieldEnum | SimulationConfigScalarFieldEnum[]
  }

  /**
   * SimulationConfig findMany
   */
  export type SimulationConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * Filter, which SimulationConfigs to fetch.
     */
    where?: SimulationConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SimulationConfigs to fetch.
     */
    orderBy?: SimulationConfigOrderByWithRelationInput | SimulationConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SimulationConfigs.
     */
    cursor?: SimulationConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SimulationConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SimulationConfigs.
     */
    skip?: number
    distinct?: SimulationConfigScalarFieldEnum | SimulationConfigScalarFieldEnum[]
  }

  /**
   * SimulationConfig create
   */
  export type SimulationConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * The data needed to create a SimulationConfig.
     */
    data: XOR<SimulationConfigCreateInput, SimulationConfigUncheckedCreateInput>
  }

  /**
   * SimulationConfig createMany
   */
  export type SimulationConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SimulationConfigs.
     */
    data: SimulationConfigCreateManyInput | SimulationConfigCreateManyInput[]
  }

  /**
   * SimulationConfig createManyAndReturn
   */
  export type SimulationConfigCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * The data used to create many SimulationConfigs.
     */
    data: SimulationConfigCreateManyInput | SimulationConfigCreateManyInput[]
  }

  /**
   * SimulationConfig update
   */
  export type SimulationConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * The data needed to update a SimulationConfig.
     */
    data: XOR<SimulationConfigUpdateInput, SimulationConfigUncheckedUpdateInput>
    /**
     * Choose, which SimulationConfig to update.
     */
    where: SimulationConfigWhereUniqueInput
  }

  /**
   * SimulationConfig updateMany
   */
  export type SimulationConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SimulationConfigs.
     */
    data: XOR<SimulationConfigUpdateManyMutationInput, SimulationConfigUncheckedUpdateManyInput>
    /**
     * Filter which SimulationConfigs to update
     */
    where?: SimulationConfigWhereInput
  }

  /**
   * SimulationConfig upsert
   */
  export type SimulationConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * The filter to search for the SimulationConfig to update in case it exists.
     */
    where: SimulationConfigWhereUniqueInput
    /**
     * In case the SimulationConfig found by the `where` argument doesn't exist, create a new SimulationConfig with this data.
     */
    create: XOR<SimulationConfigCreateInput, SimulationConfigUncheckedCreateInput>
    /**
     * In case the SimulationConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SimulationConfigUpdateInput, SimulationConfigUncheckedUpdateInput>
  }

  /**
   * SimulationConfig delete
   */
  export type SimulationConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
    /**
     * Filter which SimulationConfig to delete.
     */
    where: SimulationConfigWhereUniqueInput
  }

  /**
   * SimulationConfig deleteMany
   */
  export type SimulationConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SimulationConfigs to delete
     */
    where?: SimulationConfigWhereInput
  }

  /**
   * SimulationConfig without action
   */
  export type SimulationConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SimulationConfig
     */
    select?: SimulationConfigSelect<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const LatencyLogScalarFieldEnum: {
    id: 'id',
    driverId: 'driverId',
    endpoint: 'endpoint',
    latencyMs: 'latencyMs',
    statusCode: 'statusCode',
    timestamp: 'timestamp'
  };

  export type LatencyLogScalarFieldEnum = (typeof LatencyLogScalarFieldEnum)[keyof typeof LatencyLogScalarFieldEnum]


  export const SimulationConfigScalarFieldEnum: {
    id: 'id',
    driverCount: 'driverCount',
    running: 'running',
    updatedAt: 'updatedAt'
  };

  export type SimulationConfigScalarFieldEnum = (typeof SimulationConfigScalarFieldEnum)[keyof typeof SimulationConfigScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type LatencyLogWhereInput = {
    AND?: LatencyLogWhereInput | LatencyLogWhereInput[]
    OR?: LatencyLogWhereInput[]
    NOT?: LatencyLogWhereInput | LatencyLogWhereInput[]
    id?: IntFilter<"LatencyLog"> | number
    driverId?: StringNullableFilter<"LatencyLog"> | string | null
    endpoint?: StringFilter<"LatencyLog"> | string
    latencyMs?: IntFilter<"LatencyLog"> | number
    statusCode?: IntFilter<"LatencyLog"> | number
    timestamp?: DateTimeFilter<"LatencyLog"> | Date | string
  }

  export type LatencyLogOrderByWithRelationInput = {
    id?: SortOrder
    driverId?: SortOrderInput | SortOrder
    endpoint?: SortOrder
    latencyMs?: SortOrder
    statusCode?: SortOrder
    timestamp?: SortOrder
  }

  export type LatencyLogWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: LatencyLogWhereInput | LatencyLogWhereInput[]
    OR?: LatencyLogWhereInput[]
    NOT?: LatencyLogWhereInput | LatencyLogWhereInput[]
    driverId?: StringNullableFilter<"LatencyLog"> | string | null
    endpoint?: StringFilter<"LatencyLog"> | string
    latencyMs?: IntFilter<"LatencyLog"> | number
    statusCode?: IntFilter<"LatencyLog"> | number
    timestamp?: DateTimeFilter<"LatencyLog"> | Date | string
  }, "id">

  export type LatencyLogOrderByWithAggregationInput = {
    id?: SortOrder
    driverId?: SortOrderInput | SortOrder
    endpoint?: SortOrder
    latencyMs?: SortOrder
    statusCode?: SortOrder
    timestamp?: SortOrder
    _count?: LatencyLogCountOrderByAggregateInput
    _avg?: LatencyLogAvgOrderByAggregateInput
    _max?: LatencyLogMaxOrderByAggregateInput
    _min?: LatencyLogMinOrderByAggregateInput
    _sum?: LatencyLogSumOrderByAggregateInput
  }

  export type LatencyLogScalarWhereWithAggregatesInput = {
    AND?: LatencyLogScalarWhereWithAggregatesInput | LatencyLogScalarWhereWithAggregatesInput[]
    OR?: LatencyLogScalarWhereWithAggregatesInput[]
    NOT?: LatencyLogScalarWhereWithAggregatesInput | LatencyLogScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"LatencyLog"> | number
    driverId?: StringNullableWithAggregatesFilter<"LatencyLog"> | string | null
    endpoint?: StringWithAggregatesFilter<"LatencyLog"> | string
    latencyMs?: IntWithAggregatesFilter<"LatencyLog"> | number
    statusCode?: IntWithAggregatesFilter<"LatencyLog"> | number
    timestamp?: DateTimeWithAggregatesFilter<"LatencyLog"> | Date | string
  }

  export type SimulationConfigWhereInput = {
    AND?: SimulationConfigWhereInput | SimulationConfigWhereInput[]
    OR?: SimulationConfigWhereInput[]
    NOT?: SimulationConfigWhereInput | SimulationConfigWhereInput[]
    id?: IntFilter<"SimulationConfig"> | number
    driverCount?: IntFilter<"SimulationConfig"> | number
    running?: BoolFilter<"SimulationConfig"> | boolean
    updatedAt?: DateTimeFilter<"SimulationConfig"> | Date | string
  }

  export type SimulationConfigOrderByWithRelationInput = {
    id?: SortOrder
    driverCount?: SortOrder
    running?: SortOrder
    updatedAt?: SortOrder
  }

  export type SimulationConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: SimulationConfigWhereInput | SimulationConfigWhereInput[]
    OR?: SimulationConfigWhereInput[]
    NOT?: SimulationConfigWhereInput | SimulationConfigWhereInput[]
    driverCount?: IntFilter<"SimulationConfig"> | number
    running?: BoolFilter<"SimulationConfig"> | boolean
    updatedAt?: DateTimeFilter<"SimulationConfig"> | Date | string
  }, "id">

  export type SimulationConfigOrderByWithAggregationInput = {
    id?: SortOrder
    driverCount?: SortOrder
    running?: SortOrder
    updatedAt?: SortOrder
    _count?: SimulationConfigCountOrderByAggregateInput
    _avg?: SimulationConfigAvgOrderByAggregateInput
    _max?: SimulationConfigMaxOrderByAggregateInput
    _min?: SimulationConfigMinOrderByAggregateInput
    _sum?: SimulationConfigSumOrderByAggregateInput
  }

  export type SimulationConfigScalarWhereWithAggregatesInput = {
    AND?: SimulationConfigScalarWhereWithAggregatesInput | SimulationConfigScalarWhereWithAggregatesInput[]
    OR?: SimulationConfigScalarWhereWithAggregatesInput[]
    NOT?: SimulationConfigScalarWhereWithAggregatesInput | SimulationConfigScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"SimulationConfig"> | number
    driverCount?: IntWithAggregatesFilter<"SimulationConfig"> | number
    running?: BoolWithAggregatesFilter<"SimulationConfig"> | boolean
    updatedAt?: DateTimeWithAggregatesFilter<"SimulationConfig"> | Date | string
  }

  export type LatencyLogCreateInput = {
    driverId?: string | null
    endpoint: string
    latencyMs: number
    statusCode: number
    timestamp?: Date | string
  }

  export type LatencyLogUncheckedCreateInput = {
    id?: number
    driverId?: string | null
    endpoint: string
    latencyMs: number
    statusCode: number
    timestamp?: Date | string
  }

  export type LatencyLogUpdateInput = {
    driverId?: NullableStringFieldUpdateOperationsInput | string | null
    endpoint?: StringFieldUpdateOperationsInput | string
    latencyMs?: IntFieldUpdateOperationsInput | number
    statusCode?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LatencyLogUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    driverId?: NullableStringFieldUpdateOperationsInput | string | null
    endpoint?: StringFieldUpdateOperationsInput | string
    latencyMs?: IntFieldUpdateOperationsInput | number
    statusCode?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LatencyLogCreateManyInput = {
    id?: number
    driverId?: string | null
    endpoint: string
    latencyMs: number
    statusCode: number
    timestamp?: Date | string
  }

  export type LatencyLogUpdateManyMutationInput = {
    driverId?: NullableStringFieldUpdateOperationsInput | string | null
    endpoint?: StringFieldUpdateOperationsInput | string
    latencyMs?: IntFieldUpdateOperationsInput | number
    statusCode?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LatencyLogUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    driverId?: NullableStringFieldUpdateOperationsInput | string | null
    endpoint?: StringFieldUpdateOperationsInput | string
    latencyMs?: IntFieldUpdateOperationsInput | number
    statusCode?: IntFieldUpdateOperationsInput | number
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationConfigCreateInput = {
    id?: number
    driverCount?: number
    running?: boolean
    updatedAt?: Date | string
  }

  export type SimulationConfigUncheckedCreateInput = {
    id?: number
    driverCount?: number
    running?: boolean
    updatedAt?: Date | string
  }

  export type SimulationConfigUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    driverCount?: IntFieldUpdateOperationsInput | number
    running?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationConfigUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    driverCount?: IntFieldUpdateOperationsInput | number
    running?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationConfigCreateManyInput = {
    id?: number
    driverCount?: number
    running?: boolean
    updatedAt?: Date | string
  }

  export type SimulationConfigUpdateManyMutationInput = {
    id?: IntFieldUpdateOperationsInput | number
    driverCount?: IntFieldUpdateOperationsInput | number
    running?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SimulationConfigUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    driverCount?: IntFieldUpdateOperationsInput | number
    running?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type LatencyLogCountOrderByAggregateInput = {
    id?: SortOrder
    driverId?: SortOrder
    endpoint?: SortOrder
    latencyMs?: SortOrder
    statusCode?: SortOrder
    timestamp?: SortOrder
  }

  export type LatencyLogAvgOrderByAggregateInput = {
    id?: SortOrder
    latencyMs?: SortOrder
    statusCode?: SortOrder
  }

  export type LatencyLogMaxOrderByAggregateInput = {
    id?: SortOrder
    driverId?: SortOrder
    endpoint?: SortOrder
    latencyMs?: SortOrder
    statusCode?: SortOrder
    timestamp?: SortOrder
  }

  export type LatencyLogMinOrderByAggregateInput = {
    id?: SortOrder
    driverId?: SortOrder
    endpoint?: SortOrder
    latencyMs?: SortOrder
    statusCode?: SortOrder
    timestamp?: SortOrder
  }

  export type LatencyLogSumOrderByAggregateInput = {
    id?: SortOrder
    latencyMs?: SortOrder
    statusCode?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type SimulationConfigCountOrderByAggregateInput = {
    id?: SortOrder
    driverCount?: SortOrder
    running?: SortOrder
    updatedAt?: SortOrder
  }

  export type SimulationConfigAvgOrderByAggregateInput = {
    id?: SortOrder
    driverCount?: SortOrder
  }

  export type SimulationConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    driverCount?: SortOrder
    running?: SortOrder
    updatedAt?: SortOrder
  }

  export type SimulationConfigMinOrderByAggregateInput = {
    id?: SortOrder
    driverCount?: SortOrder
    running?: SortOrder
    updatedAt?: SortOrder
  }

  export type SimulationConfigSumOrderByAggregateInput = {
    id?: SortOrder
    driverCount?: SortOrder
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use LatencyLogDefaultArgs instead
     */
    export type LatencyLogArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = LatencyLogDefaultArgs<ExtArgs>
    /**
     * @deprecated Use SimulationConfigDefaultArgs instead
     */
    export type SimulationConfigArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = SimulationConfigDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}