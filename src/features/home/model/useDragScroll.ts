import { useEffect, type RefObject } from 'react';

// 他ボタン押下中の左押しは pointerdown が来ないため、mousedown で開始し最初の pointermove で pointerId を確定する印
const PENDING_MOUSE_POINTER = -1;

/**
 * マウス（pointerType === 'mouse'）のドラッグで横スクロールさせる。
 * タッチはネイティブスクロールに任せるため対象外。
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>, deps: readonly unknown[]) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    let pointerId: number | null = null;
    let startX = 0;
    let previousX = 0;
    let dragging = false;
    let suppressClick = false;
    let suppressClickTimer: number | undefined;
    const originalUserSelect = container.style.userSelect;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0 || pointerId !== null) return;
      pointerId = event.pointerId;
      startX = previousX = event.clientX;
      window.clearTimeout(suppressClickTimer);
      suppressClick = false;
    };

    const endMouseDrag = () => {
      if (pointerId !== null && pointerId !== PENDING_MOUSE_POINTER && container.hasPointerCapture(pointerId)) {
        container.releasePointerCapture(pointerId);
      }
      pointerId = null;
      dragging = false;
      container.removeAttribute('data-dragging');
      container.style.userSelect = originalUserSelect;
      window.clearTimeout(suppressClickTimer);
      suppressClickTimer = window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.pointerId !== pointerId) return;
      endMouseDrag();
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (pointerId === PENDING_MOUSE_POINTER) pointerId = event.pointerId;
      if (event.pointerId !== pointerId) return;
      if ((event.buttons & 1) === 0) {
        endMouseDrag();
        return;
      }
      const delta = event.clientX - previousX;
      previousX = event.clientX;
      if (!dragging && Math.abs(event.clientX - startX) <= 5) return;

      if (!dragging) {
        dragging = true;
        suppressClick = true;
        container.setPointerCapture(event.pointerId);
        container.setAttribute('data-dragging', 'true');
        container.style.userSelect = 'none';
      }
      event.preventDefault();
      container.scrollLeft -= delta;
    };

    const handleClick = (event: MouseEvent) => {
      if (!suppressClick || event.detail === 0) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const handleDragStart = (event: DragEvent) => event.preventDefault();
    // マウスの文字選択とネイティブドラッグを止める。click は発火させる
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
      // 通常は pointerdown で pointerId が入っているので何もしない。他ボタン押下中はここで開始する
      if (pointerId === null) {
        pointerId = PENDING_MOUSE_POINTER;
        startX = previousX = event.clientX;
        window.clearTimeout(suppressClickTimer);
        suppressClick = false;
      }
    };
    const handleMouseUp = (event: MouseEvent) => {
      if (event.button === 0 && pointerId !== null) endMouseDrag();
    };
    // ドラッグ中にカーソルが要素の外へ出ても、ネイティブドラッグを止める
    const handleDocumentDragStart = (event: DragEvent) => {
      if (pointerId !== null) event.preventDefault();
    };
    const handleSelectStart = (event: Event) => {
      if (pointerId !== null) event.preventDefault();
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointercancel', handlePointerEnd);
    container.addEventListener('lostpointercapture', handlePointerEnd);
    container.addEventListener('click', handleClick, true);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragstart', handleDocumentDragStart, true);
    container.addEventListener('selectstart', handleSelectStart);

    return () => {
      window.clearTimeout(suppressClickTimer);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointercancel', handlePointerEnd);
      container.removeEventListener('lostpointercapture', handlePointerEnd);
      container.removeEventListener('click', handleClick, true);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragstart', handleDocumentDragStart, true);
      container.removeEventListener('selectstart', handleSelectStart);
      if (pointerId !== null && pointerId !== PENDING_MOUSE_POINTER && container.hasPointerCapture(pointerId)) {
        container.releasePointerCapture(pointerId);
      }
      container.removeAttribute('data-dragging');
      container.style.userSelect = originalUserSelect;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}
