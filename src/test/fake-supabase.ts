import type { SupabaseClient } from "@supabase/supabase-js";

type Result = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};
export type RecordedQuery = { table: string; calls: [string, ...unknown[]][] };

const METHODS = [
  "select",
  "insert",
  "update",
  "delete",
  "eq",
  "order",
  "limit",
  "maybeSingle",
  "single",
];

/**
 * A stand-in for the Supabase query builder. Every query records its chained
 * calls and resolves to the next queued result, in order.
 */
export function fakeSupabase(results: Result[]) {
  const queue = [...results];
  const queries: RecordedQuery[] = [];

  const db = {
    from(table: string) {
      const query: RecordedQuery = { table, calls: [] };
      queries.push(query);
      const builder: Record<string, unknown> = {};
      for (const method of METHODS) {
        builder[method] = (...args: unknown[]) => {
          query.calls.push([method, ...args]);
          return builder;
        };
      }
      builder.then = (
        resolve: (r: Result) => unknown,
        reject: (e: unknown) => unknown,
      ) => {
        const next = queue.shift();
        if (!next) {
          return Promise.reject(new Error(`No result queued for ${table}`)).then(
            resolve,
            reject,
          );
        }
        return Promise.resolve({ data: null, error: null, ...next }).then(
          resolve,
          reject,
        );
      };
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, queries };
}
