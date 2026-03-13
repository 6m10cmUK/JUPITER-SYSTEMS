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
import type * as auth from "../auth.js";
import type * as bgms from "../bgms.js";
import type * as channels from "../channels.js";
import type * as characters from "../characters.js";
import type * as cutins from "../cutins.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as objects from "../objects.js";
import type * as pieces from "../pieces.js";
import type * as room_members from "../room_members.js";
import type * as rooms from "../rooms.js";
import type * as scenario_texts from "../scenario_texts.js";
import type * as scenes from "../scenes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _helpers: typeof _helpers;
  auth: typeof auth;
  bgms: typeof bgms;
  channels: typeof channels;
  characters: typeof characters;
  cutins: typeof cutins;
  http: typeof http;
  messages: typeof messages;
  migrations: typeof migrations;
  objects: typeof objects;
  pieces: typeof pieces;
  room_members: typeof room_members;
  rooms: typeof rooms;
  scenario_texts: typeof scenario_texts;
  scenes: typeof scenes;
  users: typeof users;
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
