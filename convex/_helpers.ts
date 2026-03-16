/** identity.subject からセッションIDを除いたユーザーIDを取得 */
export function getUserId(identity: { subject: string }): string {
  return identity.subject.split('|')[0];
}

/** ロール階層（低←→高） */
export const ROLE_HIERARCHY = ['guest', 'user', 'sub_owner', 'owner'] as const;
export type RoomRole = typeof ROLE_HIERARCHY[number];

/** 呼び出し元のロールが要求ロール以上であることを確認 */
export function assertMinRole(role: RoomRole, required: RoomRole): void {
  if (ROLE_HIERARCHY.indexOf(role) < ROLE_HIERARCHY.indexOf(required)) {
    throw new Error(`Permission denied: requires ${required}, got ${role}`);
  }
}
