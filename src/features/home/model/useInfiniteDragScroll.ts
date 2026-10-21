import { useEffect, type RefObject } from 'react';

// 他ボタン押下中の左押しは pointerdown が来ないため、mousedown で開始し最初の pointermove で pointerId を確定する印
const PENDING_MOUSE_POINTER = -1;

const AUTO_SCROLL_PX_PER_SEC = 12;
const RESUME_DELAY_MS = 2000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
// タブ非表示からの復帰などで一度に大きく進まないよう、1フレームあたりの経過時間に上限を置く
const MAX_FRAME_MS = 100;

export function useInfiniteDragScroll(
  ref: RefObject<HTMLDivElement | null>,
  items: readonly unknown[],
  rowCount: number,
  autoScrollDirection: 1 | -1 = 1,
) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    let autoReady = false;
    const initialPositionTimer = window.setTimeout(() => {
      container.scrollLeft = container.scrollWidth / 3;
      autoReady = true;
    }, 100);

    const checkInfiniteLoop = () => {
      const oneSetWidth = container.scrollWidth / 3;
      if (container.scrollLeft >= oneSetWidth * 2.5) {
        container.scrollLeft -= oneSetWidth;
      } else if (container.scrollLeft <= oneSetWidth * 0.5) {
        container.scrollLeft += oneSetWidth;
      }
    };

    let pointerId: number | null = null;
    let startX = 0;
    let previousX = 0;
    let dragging = false;
    let suppressClick = false;
    let suppressClickTimer: number | undefined;
    let scrollTimer: number | undefined;
    const originalUserSelect = container.style.userSelect;

    // 自動スクロールの停止判定に使う状態
    let hovering = false;
    let touchPointerId: number | null = null;
    let lastUserActionAt = Number.NEGATIVE_INFINITY;

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
      lastUserActionAt = performance.now();
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
      checkInfiniteLoop();
    };

    const handleScroll = () => {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(checkInfiniteLoop, 150);
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

    const handlePointerEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') hovering = true;
    };
    const handlePointerLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') hovering = false;
    };
    const handleTouchPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      touchPointerId = event.pointerId;
    };
    const handleTouchPointerEnd = (event: PointerEvent) => {
      if (event.pointerId !== touchPointerId) return;
      touchPointerId = null;
      lastUserActionAt = performance.now();
    };
    const handleWheel = () => {
      lastUserActionAt = performance.now();
    };

    // 触っていないとき、向きは引数 autoScrollDirection（1 = 右へ、-1 = 左へ）でゆっくり流す。位置は小数で積算し、scrollLeft の丸めによる遅れを防ぐ
    let autoPos = 0;
    let lastWritten = 0;
    let lastFrameAt: number | null = null;
    let rafId = 0;

    const isAutoScrollPaused = (now: number) =>
      !autoReady ||
      hovering ||
      pointerId !== null ||
      touchPointerId !== null ||
      now - lastUserActionAt < RESUME_DELAY_MS ||
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    const autoScrollFrame = (now: number) => {
      rafId = window.requestAnimationFrame(autoScrollFrame);
      const elapsed = lastFrameAt === null ? 0 : Math.min(now - lastFrameAt, MAX_FRAME_MS);
      lastFrameAt = now;

      if (isAutoScrollPaused(now)) {
        autoPos = container.scrollLeft;
        lastWritten = autoPos;
        return;
      }

      // 自分が書いた値から1px以上ずれていたら、ユーザー操作や無限ループ補正による位置変化とみなして合わせ直す
      if (Math.abs(container.scrollLeft - lastWritten) >= 1) {
        autoPos = container.scrollLeft;
      }
      autoPos += (autoScrollDirection * AUTO_SCROLL_PX_PER_SEC * elapsed) / 1000;
      container.scrollLeft = autoPos;

      const beforeCheck = container.scrollLeft;
      checkInfiniteLoop();
      if (container.scrollLeft !== beforeCheck) {
        autoPos = container.scrollLeft;
      }
      lastWritten = container.scrollLeft;
    };
    rafId = window.requestAnimationFrame(autoScrollFrame);

    const supportsScrollEnd = 'onscrollend' in window;
    if (supportsScrollEnd) {
      container.addEventListener('scrollend', checkInfiniteLoop);
    } else {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    container.addEventListener('pointerdown', handlePointerDown);
    container.addEventListener('pointerdown', handleTouchPointerDown);
    container.addEventListener('pointerenter', handlePointerEnter);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointerup', handleTouchPointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('pointercancel', handleTouchPointerEnd);
    container.addEventListener('lostpointercapture', handlePointerEnd);
    container.addEventListener('click', handleClick, true);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragstart', handleDocumentDragStart, true);
    container.addEventListener('selectstart', handleSelectStart);

    return () => {
      window.clearTimeout(initialPositionTimer);
      window.clearTimeout(suppressClickTimer);
      window.clearTimeout(scrollTimer);
      window.cancelAnimationFrame(rafId);
      container.removeEventListener('scrollend', checkInfiniteLoop);
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('pointerdown', handlePointerDown);
      container.removeEventListener('pointerdown', handleTouchPointerDown);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointerup', handleTouchPointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('pointercancel', handleTouchPointerEnd);
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
  }, [ref, items, rowCount, autoScrollDirection]);
}
