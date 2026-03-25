import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * 既存データの URL → asset_id マイグレーション
 * クライアントからアセット一覧（url → asset_id マップ）を渡して、
 * 各テーブルの旧 URL フィールドを asset_id に変換する。
 */
export const migrateUrlToAssetId = mutation({
  args: {
    room_id: v.string(),
    url_to_asset_id: v.array(v.object({ url: v.string(), asset_id: v.string() })),
  },
  handler: async (ctx, args) => {
    const urlMap = new Map(args.url_to_asset_id.map(e => [e.url, e.asset_id]));
    let updated = 0;

    // --- Objects ---
    const objects = await ctx.db
      .query("objects")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
    for (const obj of objects) {
      const imageUrl = (obj as any).image_url as string | null;
      if (imageUrl && !obj.image_asset_id) {
        const assetId = urlMap.get(imageUrl);
        if (assetId) {
          await ctx.db.patch(obj._id, { image_asset_id: assetId, image_url: undefined } as any);
          updated++;
        }
      }
    }

    // --- Scenes ---
    const scenes = await ctx.db
      .query("scenes")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
    for (const scene of scenes) {
      const updates: Record<string, any> = {};
      const bgUrl = (scene as any).background_url as string | null;
      const fgUrl = (scene as any).foreground_url as string | null;
      if (bgUrl && !scene.background_asset_id) {
        const assetId = urlMap.get(bgUrl);
        if (assetId) {
          updates.background_asset_id = assetId;
          updates.background_url = undefined;
        }
      }
      if (fgUrl && !scene.foreground_asset_id) {
        const assetId = urlMap.get(fgUrl);
        if (assetId) {
          updates.foreground_asset_id = assetId;
          updates.foreground_url = undefined;
        }
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(scene._id, updates);
        updated++;
      }
    }

    // --- Characters (images[].url → images[].asset_id) ---
    const chars = await ctx.db
      .query("characters_base")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
    for (const char of chars) {
      const images = char.images as Array<{ url?: string; asset_id?: string | null; label: string }>;
      let changed = false;
      const newImages = images.map(img => {
        if (img.url && !img.asset_id) {
          const assetId = urlMap.get(img.url);
          if (assetId) {
            changed = true;
            return { asset_id: assetId, label: img.label };
          }
        }
        return img;
      });
      if (changed) {
        await ctx.db.patch(char._id, { images: newImages } as any);
        updated++;
      }
    }

    // --- Cutins ---
    const cutins = await ctx.db
      .query("cutins")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
    for (const cutin of cutins) {
      const imageUrl = (cutin as any).image_url as string | null;
      if (imageUrl && !cutin.image_asset_id) {
        const assetId = urlMap.get(imageUrl);
        if (assetId) {
          await ctx.db.patch(cutin._id, { image_asset_id: assetId, image_url: undefined } as any);
          updated++;
        }
      }
    }

    // --- BGMs (bgm_source → bgm_asset_id, upload/url 型のみ) ---
    const bgms = await ctx.db
      .query("bgms")
      .withIndex("by_room", (q) => q.eq("room_id", args.room_id))
      .collect();
    for (const bgm of bgms) {
      if ((bgm.bgm_type === 'upload' || bgm.bgm_type === 'url') && bgm.bgm_source && !bgm.bgm_asset_id) {
        const assetId = urlMap.get(bgm.bgm_source);
        if (assetId) {
          await ctx.db.patch(bgm._id, { bgm_asset_id: assetId } as any);
          updated++;
        }
      }
    }

    return { updated };
  },
});
