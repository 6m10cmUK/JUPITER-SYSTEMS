export interface Env {
  R2_BUCKET: R2Bucket;
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ADMIN_USER_IDS?: string;
  CONVEX_SITE_URL?: string;
}

export interface AuthUser {
  uid: string;
  displayName: string;
  avatarUrl: string | null;
  isGuest?: boolean;
}
