import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) {
        // 既存ユーザー: name/image は上書きしない（ユーザーが編集した値を保持）
        return existingUserId;
      }
      // 新規ユーザー: Google プロフィールで初期化
      return await ctx.db.insert("users", {
        name: profile.name ?? undefined,
        image: profile.image ?? undefined,
        email: profile.email ?? undefined,
      });
    },
  },
});
