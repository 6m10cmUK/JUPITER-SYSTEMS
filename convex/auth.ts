import { convexAuth, createAccount } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import Google from "@auth/core/providers/google";
import type { Value } from "convex/values";

// deviceId ベースの匿名認証（同一デバイスで同一アカウントを再利用）
const AnonymousWithDeviceId = ConvexCredentials({
  id: "anonymous",
  authorize: async (params: Record<string, Value | undefined>, ctx) => {
    const deviceId = params.deviceId as string | undefined;
    const id = deviceId ?? crypto.randomUUID();
    const { user } = await createAccount(ctx as any, {
      provider: "anonymous",
      account: { id },
      profile: { isAnonymous: true },
    });
    return { userId: user._id };
  },
});

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google, AnonymousWithDeviceId],
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
        onboarded: false,
      });
    },
  },
});
