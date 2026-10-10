import React from 'react';

interface Props {
  generatedCSS: string;
  onCopy: () => void;
}

export const CssOutputPanel: React.FC<Props> = ({ generatedCSS, onCopy }) => (
  <div>
    <div style={{ marginBottom: '15px' }}>
      <h4>使用方法:</h4>
      <ol style={{ fontSize: '14px', color: '#666' }}>
        <li>OBSでブラウザソースを追加</li>
        <li>URLにDiscord StreamkitのURLを入力</li>
        <li>「カスタムCSS」にこのコードをコピー＆ペースト</li>
        <li>完了！</li>
      </ol>
    </div>
    <div style={{ marginBottom: '15px' }}>
      <button
        onClick={onCopy}
        style={{
          padding: '12px 24px', fontSize: '16px',
          backgroundColor: '#28a745', color: 'white',
          border: 'none', borderRadius: '4px',
          cursor: 'pointer', fontWeight: 'bold',
        }}
      >
        📋 CSSをクリップボードにコピー
      </button>
    </div>
    <textarea
      value={generatedCSS}
      readOnly
      style={{
        width: '100%', height: '500px', padding: '20px',
        fontSize: '13px', fontFamily: 'Consolas, Monaco, "Courier New", monospace',
        border: '1px solid #ccc', borderRadius: '8px',
        backgroundColor: '#f8f9fa', resize: 'vertical', lineHeight: '1.5',
      }}
    />
  </div>
);
