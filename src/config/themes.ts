import type { Theme } from '../types/characterDisplay.tsx';

export const themes: Theme[] = [
  {
    id: 'fantasy',
    name: 'ファンタジー',
    backgroundColor: '#2C1810',
    primaryColor: '#D4AF37',
    secondaryColor: '#8B4513',
    textColor: '#F5DEB3',
    borderStyle: 'ornate',
    fontFamily: 'serif',
    decorations: {
      topLeft: '⚔️',
      topRight: '🛡️',
      bottomLeft: '📜',
      bottomRight: '🏰'
    }
  },
  {
    id: 'cyberpunk',
    name: 'サイバーパンク',
    backgroundColor: '#0A0E27',
    primaryColor: '#00FFFF',
    secondaryColor: '#FF00FF',
    textColor: '#FFFFFF',
    borderStyle: 'gradient',
    fontFamily: 'monospace',
    decorations: {
      topLeft: '◢',
      topRight: '◣',
      bottomLeft: '◤',
      bottomRight: '◥'
    }
  },
  {
    id: 'horror',
    name: 'ホラー',
    backgroundColor: '#1A0000',
    primaryColor: '#8B0000',
    secondaryColor: '#4B0000',
    textColor: '#FF6B6B',
    borderStyle: 'solid',
    fontFamily: 'serif',
    decorations: {
      topLeft: '🦇',
      topRight: '🕷️',
      bottomLeft: '💀',
      bottomRight: '🕯️'
    }
  },
  {
    id: 'modern',
    name: 'モダン',
    backgroundColor: '#FFFFFF',
    primaryColor: '#333333',
    secondaryColor: '#666666',
    textColor: '#000000',
    borderStyle: 'none',
    fontFamily: 'sans-serif'
  },
  {
    id: 'steampunk',
    name: 'スチームパンク',
    backgroundColor: '#3E2723',
    primaryColor: '#B8860B',
    secondaryColor: '#CD853F',
    textColor: '#FFE4B5',
    borderStyle: 'solid',
    fontFamily: 'serif',
    decorations: {
      topLeft: '⚙️',
      topRight: '🔧',
      bottomLeft: '⏰',
      bottomRight: '🎩'
    }
  }
];