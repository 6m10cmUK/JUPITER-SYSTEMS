import React from 'react';
import styles from './LayoutOverlay.module.css';
import type { LayoutPage, Region } from '../../types/layout.types';

interface LayoutOverlayProps {
  pageLayout: LayoutPage | null;
  scale: number;
  showOverlay: boolean;
  onRegionClick?: (regionType: string, region: Region) => void;
}

export const LayoutOverlay: React.FC<LayoutOverlayProps> = ({
  pageLayout,
  scale,
  showOverlay,
  onRegionClick
}) => {
  if (!pageLayout || !showOverlay) {
    return null;
  }

  const renderRegion = (
    region: Region & { column_number?: number },
    type: string,
    className: string
  ) => {
    const style: React.CSSProperties = {
      left: `${region.x * scale}px`,
      top: `${region.y * scale}px`,
      width: `${region.width * scale}px`,
      height: `${region.height * scale}px`,
    };

    return (
      <div
        key={`${type}-${region.column_number || 0}`}
        className={`${styles.region} ${styles[className]} ${
          region.detected ? styles.detected : ''
        }`}
        style={style}
        onClick={() => onRegionClick?.(type, region)}
        title={`${type}: ${region.block_count || 0}ブロック`}
      >
        <div className={styles.label}>
          {type === 'column' ? `カラム${region.column_number}` : type}
          {region.detected && (
            <span className={styles.blockCount}>
              ({region.block_count}ブロック)
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.overlay}>
      {/* ヘッダー領域 */}
      {pageLayout.regions.header?.detected && pageLayout.regions.header &&
        renderRegion(pageLayout.regions.header, 'ヘッダー', 'header')}
      
      {/* フッター領域 */}
      {pageLayout.regions.footer?.detected && pageLayout.regions.footer &&
        renderRegion(pageLayout.regions.footer, 'フッター', 'footer')}
      
      {/* 縦の余白領域 */}
      {pageLayout.regions.vertical_gaps?.map((gap, index) => (
        <div
          key={`gap-${index}`}
          className={`${styles.region} ${styles.verticalGap}`}
          style={{
            left: `${gap.x * scale}px`,
            top: `${gap.y * scale}px`,
            width: `${gap.width * scale}px`,
            height: `${gap.height * scale}px`,
          }}
          title={`余白領域: 幅${Math.round(gap.width)}px`}
        >
          <div className={styles.gapLabel}>
            余白 {index + 1}
          </div>
        </div>
      ))}
      
      {/* カラム領域 */}
      {pageLayout.regions.columns?.map((column: Region & { column_number?: number }) => (
        <div
          key={`column-${column.column_number}`}
          className={`${styles.region} ${styles.column}`}
          style={{
            left: `${column.x * scale}px`,
            top: `${column.y * scale}px`,
            width: `${column.width * scale}px`,
            height: `${column.height * scale}px`,
          }}
          onClick={() => onRegionClick?.('column', column)}
          title={`カラム${column.column_number}: ${column.block_count}ブロック`}
        >
          <div className={styles.label}>
            カラム{column.column_number}
            <span className={styles.blockCount}>
              ({column.block_count}ブロック)
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};