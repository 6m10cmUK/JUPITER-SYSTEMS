rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分の暗号化キーのみアクセス可能
    match /userEncryptionKeys/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // スケジューラ: 空き時間
    match /availability/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && docId.matches(request.auth.uid + '_.*');
    }

    // スケジューラ: 定期スケジュール
    match /recurringSchedule/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && docId.matches(request.auth.uid + '_.*');
    }

    // ユーザープロフィール
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;

      // アセットライブラリ
      match /assets/{assetId} {
        allow read: if request.auth != null && request.auth.uid == uid;
        allow write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // Adrastea: TRPG盤面共有（MVP: 認証不要で全開放）
    match /rooms/{roomId} {
      allow read, write: if true;
      match /pieces/{pieceId} {
        allow read, write: if true;
      }
      match /messages/{messageId} {
        allow read, write: if true;
      }
      match /scenes/{sceneId} {
        allow read, write: if true;
        match /objects/{objectId} {
          allow read, write: if true;
        }
      }
      match /objects/{objectId} {
        allow read, write: if true;
      }
      match /characters/{characterId} {
        allow read, write: if true;
      }
      // 廃止予定: BoardObject統合後に削除
      match /screen_panels/{panelId} {
        allow read, write: if true;
      }
      match /markers/{markerId} {
        allow read, write: if true;
      }
      match /scenario_texts/{textId} {
        allow read, write: if true;
      }
      match /cutins/{cutinId} {
        allow read, write: if true;
      }
    }
  }
}