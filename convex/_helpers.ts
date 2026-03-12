/** identity.subject からセッションIDを除いたユーザーIDを取得 */
export function getUserId(identity: { subject: string }): string {
  return identity.subject.split('|')[0];
}
