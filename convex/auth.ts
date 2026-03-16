import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google, Anonymous],
  callbacks: {
    async redirect({ redirectTo }) {
      // ホワイトリスト: localhost + Vercel プレビュー
      const allowed = [
        /^https?:\/\/localhost(:\d+)?/,
        /^https?:\/\/100\.121\.7\.83(:\d+)?/,
        /^https:\/\/.*\.vercel\.app/,
      ];
      if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
        return redirectTo;
      }
      if (allowed.some((re) => re.test(redirectTo))) {
        return redirectTo;
      }
      return "/";
    },
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
