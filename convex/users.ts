import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./_helpers";
import type { Id } from "./_generated/dataModel";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return { id: getUserId(identity) };
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = getUserId(identity);
    const user = await ctx.db.get(userId as Id<"users">);
    return {
      id: userId,
      name: user?.name ?? identity.name ?? null,
      image: user?.image ?? identity.pictureUrl ?? null,
    };
  },
});

export const updateMe = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = getUserId(identity);
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.image !== undefined) patch.image = args.image;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId as Id<"users">, patch);
    }
  },
});
