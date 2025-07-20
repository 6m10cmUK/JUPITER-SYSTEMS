# Firebase セットアップガイド

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. 「プロジェクトを作成」をクリック
3. プロジェクト名を入力（例：trpg-pdf2md）
4. Google アナリティクスは任意（オフでもOK）

## 2. Authentication の設定

1. 左メニューから「Authentication」を選択
2. 「始める」をクリック
3. 「Sign-in method」タブで「Google」を有効化
4. プロジェクトの公開名とメールアドレスを設定
5. 「保存」

## 3. Firestore の設定

1. 左メニューから「Firestore Database」を選択
2. 「データベースの作成」をクリック
3. 「本番環境モード」を選択（後でルールを設定）
4. リージョンを選択（asia-northeast1 = 東京）

## 4. セキュリティルールの設定

Firestoreのルールタブで以下を設定：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分の暗号化キーのみアクセス可能
    match /userEncryptionKeys/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5. Firebase設定の取得

1. プロジェクト設定（歯車アイコン）→「プロジェクトの設定」
2. 「全般」タブの下部「マイアプリ」でWebアプリを追加
3. アプリ名を入力（例：TRPG PDF Tool）
4. 「Firebase SDK の追加」で設定値をコピー

## 6. 環境変数の設定

`.env.local`ファイルに以下を追加：

```
VITE_FIREBASE_API_KEY=取得したAPIキー
VITE_FIREBASE_AUTH_DOMAIN=取得したAuth Domain
VITE_FIREBASE_PROJECT_ID=取得したProject ID
VITE_FIREBASE_STORAGE_BUCKET=取得したStorage Bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=取得したSender ID
VITE_FIREBASE_APP_ID=取得したApp ID
```

## 7. 本番環境（Vercel）での設定

1. Vercelのプロジェクト設定
2. Environment Variables
3. 上記の環境変数を追加（VITE_プレフィックス付き）

## セキュリティのポイント

- Firebaseの設定値（APIキーなど）は公開されても安全
- セキュリティルールで適切にアクセス制御
- ユーザーごとに異なる暗号化キーを自動生成
- HTTPS通信で自動的に暗号化