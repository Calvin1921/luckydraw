/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _helpers from "../_helpers.js";
import type * as draw from "../draw.js";
import type * as events from "../events.js";
import type * as http from "../http.js";
import type * as organizations from "../organizations.js";
import type * as participants from "../participants.js";
import type * as prizes from "../prizes.js";
import type * as seed from "../seed.js";
import type * as winnerLogs from "../winnerLogs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  draw: typeof draw;
  events: typeof events;
  http: typeof http;
  organizations: typeof organizations;
  participants: typeof participants;
  prizes: typeof prizes;
  seed: typeof seed;
  winnerLogs: typeof winnerLogs;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
