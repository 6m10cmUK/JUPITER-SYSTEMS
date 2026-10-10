import type { Theme } from './characterDisplay';

export const themes: Theme[] = [
  {
    id: 'modern',
    name: 'モダン',
    description: 'シンプルでクリーンなデザイン。汎用的に使えます。',
    
    primaryColor: '#333333',
    secondaryColor: '#666666',
    textColor: '#000000',
    fontFamily: 'sans-serif',
    borderStyle: 'solid',
    
    canvasSize: {
      width: 794,  // A4 縦向き
      height: 1123
    },
    
    backgroundColor: '#FFFFFF',
    
    layout: {
      characterImage: {
        x: '65%',  // 右から35%
        y: 80,
        maxWidth: '90%',
        maxHeight: '90%'
      },
      expressions: {
        x: 60,
        y: '65%',
        thumbnailSize: 100,
        gap: 20,
        columns: 5
      },
      characterName: {
        x: '10%',
        y: '50%'
      },
      scenarioName: {
        x: '50%',
        y: '93%'
      }
    },
    
    textStyles: {
      characterName: {
        fontFamily: 'sans-serif',
        fontSize: 72,
        fontWeight: 'bold',
        color: '#000000',
        backgroundColor: '#FFFFFFE6'
      },
      scenarioName: {
        fontFamily: 'sans-serif',
        fontSize: 24,
        color: '#000000'
      },
      expressionLabel: {
        fontFamily: 'sans-serif',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000'
      }
    },
    
    decorations: {
      border: {
        style: 'none',
        width: 0,
        color: '#333333'
      }
    }
  },
  
  {
    id: 'fantasy',
    name: 'ファンタジー',
    description: '中世ファンタジー風の装飾的なデザイン',
    
    
    primaryColor: '#333333',
    secondaryColor: '#666666',
    textColor: '#000000',
    fontFamily: 'sans-serif',
    borderStyle: 'solid',
    
    canvasSize: {
      width: 794,
      height: 1123
    },
    
    backgroundColor: '#2C1810',
    
    layout: {
      characterImage: {
        x: '50%',
        y: 100,
        maxWidth: '80%',
        maxHeight: '70%'
      },
      expressions: {
        x: 80,
        y: '75%',
        thumbnailSize: 80,
        gap: 15,
        columns: 6
      },
      characterName: {
        x: '50%',
        y: '85%'
      },
      scenarioName: {
        x: '50%',
        y: '92%'
      }
    },
    
    textStyles: {
      characterName: {
        fontFamily: 'serif',
        fontSize: 64,
        fontWeight: 'bold',
        color: '#D4AF37',
        shadow: '0 4px 8px rgba(0,0,0,0.8)',
        backgroundColor: '#2C1810CC'
      },
      scenarioName: {
        fontFamily: 'serif',
        fontSize: 28,
        color: '#F5DEB3',
        shadow: '0 2px 4px rgba(0,0,0,0.8)'
      }
    },
    
    decorations: {
      border: {
        style: 'ornate',
        width: 6,
        color: '#D4AF37',
        radius: 0
      },
      elements: [
        { type: 'text', content: '⚔️', position: { x: 50, y: 50 } },
        { type: 'text', content: '🛡️', position: { x: '95%', y: 50 } },
        { type: 'text', content: '📜', position: { x: 50, y: '95%' } },
        { type: 'text', content: '🏰', position: { x: '95%', y: '95%' } }
      ]
    }
  },
  
  {
    id: 'cyberpunk',
    name: 'サイバーパンク',
    description: 'ネオンと電子回路をモチーフにした近未来的デザイン',
    
    
    primaryColor: '#333333',
    secondaryColor: '#666666',
    textColor: '#000000',
    fontFamily: 'sans-serif',
    borderStyle: 'solid',
    
    canvasSize: {
      width: 794,
      height: 1123
    },
    
    backgroundColor: '#0A0E27',
    
    layout: {
      characterImage: {
        x: '60%',
        y: 50,
        maxWidth: '85%',
        maxHeight: '80%'
      },
      expressions: {
        x: 40,
        y: '70%',
        thumbnailSize: 90,
        gap: 10,
        columns: 6
      },
      characterName: {
        x: '15%',
        y: '45%'
      },
      scenarioName: {
        x: '85%',
        y: '95%'
      }
    },
    
    textStyles: {
      characterName: {
        fontFamily: 'monospace',
        fontSize: 60,
        fontWeight: 'bold',
        color: '#00FFFF',
        shadow: '0 0 20px #00FFFF',
        backgroundColor: '#0A0E27E6'
      },
      scenarioName: {
        fontFamily: 'monospace',
        fontSize: 20,
        color: '#FF00FF',
        shadow: '0 0 10px #FF00FF'
      }
    },
    
    decorations: {
      border: {
        style: 'gradient',
        width: 4,
        color: '#00FFFF',
        radius: 0
      }
    }
  },
  
  {
    id: 'horror',
    name: 'ホラー',
    description: 'ダークで不気味な雰囲気のデザイン',
    
    
    primaryColor: '#333333',
    secondaryColor: '#666666',
    textColor: '#000000',
    fontFamily: 'sans-serif',
    borderStyle: 'solid',
    
    canvasSize: {
      width: 794,
      height: 1123
    },
    
    backgroundColor: '#1A0000',
    
    layout: {
      characterImage: {
        x: '50%',
        y: 120,
        maxWidth: '75%',
        maxHeight: '65%'
      },
      expressions: {
        x: 100,
        y: '80%',
        thumbnailSize: 70,
        gap: 25,
        columns: 5
      },
      characterName: {
        x: '50%',
        y: '88%'
      },
      scenarioName: {
        x: '50%',
        y: '94%'
      }
    },
    
    textStyles: {
      characterName: {
        fontFamily: 'serif',
        fontSize: 56,
        fontWeight: 'bold',
        color: '#FF6B6B',
        shadow: '0 0 30px #8B0000',
        backgroundColor: '#1A0000CC'
      },
      scenarioName: {
        fontFamily: 'serif',
        fontSize: 22,
        color: '#8B0000'
      }
    },
    
    decorations: {
      border: {
        style: 'solid',
        width: 3,
        color: '#8B0000',
        radius: 0
      },
      elements: [
        { type: 'text', content: '🦇', position: { x: 40, y: 40 } },
        { type: 'text', content: '🕷️', position: { x: '95%', y: 40 } },
        { type: 'text', content: '💀', position: { x: 40, y: '96%' } },
        { type: 'text', content: '🕯️', position: { x: '95%', y: '96%' } }
      ]
    }
  },
  
  {
    id: 'steampunk',
    name: 'スチームパンク',
    description: '歯車と真鍮をモチーフにしたヴィクトリア朝風デザイン',
    
    
    primaryColor: '#333333',
    secondaryColor: '#666666',
    textColor: '#000000',
    fontFamily: 'sans-serif',
    borderStyle: 'solid',
    
    canvasSize: {
      width: 794,
      height: 1123
    },
    
    backgroundColor: '#3E2723',
    
    layout: {
      characterImage: {
        x: '55%',
        y: 90,
        maxWidth: '80%',
        maxHeight: '75%'
      },
      expressions: {
        x: 70,
        y: '72%',
        thumbnailSize: 85,
        gap: 18,
        columns: 5
      },
      characterName: {
        x: '20%',
        y: '50%'
      },
      scenarioName: {
        x: '50%',
        y: '90%'
      }
    },
    
    textStyles: {
      characterName: {
        fontFamily: 'serif',
        fontSize: 58,
        fontWeight: 'bold',
        color: '#B8860B',
        shadow: '0 3px 6px rgba(0,0,0,0.7)',
        backgroundColor: '#3E2723E6'
      },
      scenarioName: {
        fontFamily: 'serif',
        fontSize: 26,
        color: '#FFE4B5'
      }
    },
    
    decorations: {
      border: {
        style: 'solid',
        width: 5,
        color: '#B8860B',
        radius: 0
      },
      elements: [
        { type: 'text', content: '⚙️', position: { x: 60, y: 60 } },
        { type: 'text', content: '🔧', position: { x: '92%', y: 60 } },
        { type: 'text', content: '⏰', position: { x: 60, y: '93%' } },
        { type: 'text', content: '🎩', position: { x: '92%', y: '93%' } }
      ]
    }
  }
]

// デフォルトテーマ（最初のテーマまたはmodernテーマ）
export const defaultTheme = themes.find(t => t.id === 'modern') || themes[0];

// テーマIDからテーマを取得
export const getThemeById = (id: string): Theme | undefined => {
  return themes.find(theme => theme.id === id);
};

// 開発時のデバッグ用
if (import.meta.env.DEV) {
  console.log('Loaded themes:', themes.map(t => ({ id: t.id, name: t.name })));
}