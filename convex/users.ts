import { query } from "./_generated/server";
import { getUserId } from "./_helpers";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return { id: getUserId(identity) };
  },
});
