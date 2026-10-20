import { useEffect, type RefObject } from 'react';

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

    const handlePointerEnd = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.pointerId !== pointerId) return;
      pointerId = null;
      dragging = false;
      container.removeAttribute('data-dragging');
      container.style.userSelect = originalUserSelect;
      if (container.hasPointerCapture(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      window.clearTimeout(suppressClickTimer);
      suppressClickTimer = window.setTimeout(() => {
        suppressClick = false;
      }, 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.pointerId !== pointerId) return;
      if (event.buttons === 0) {
        handlePointerEnd(event);
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
    const handleSelectStart = (event: Event) => {
      if (pointerId !== null) event.preventDefault();
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    container.addEventListener('lostpointercapture', handlePointerEnd);
    container.addEventListener('click', handleClick, true);
    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('selectstart', handleSelectStart);

    return () => {
      window.clearTimeout(suppressClickTimer);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      container.removeEventListener('lostpointercapture', handlePointerEnd);
      container.removeEventListener('click', handleClick, true);
      container.removeEventListener('dragstart', handleDragStart);
      container.removeEventListener('selectstart', handleSelectStart);
      if (pointerId !== null && container.hasPointerCapture(pointerId)) {
        container.releasePointerCapture(pointerId);
      }
      container.removeAttribute('data-dragging');
      container.style.userSelect = originalUserSelect;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, ...deps]);
}
