import { useEffect, useRef } from 'react';

export function useImagePreloader(urls: (string | null | undefined)[]) {
  const loadedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const url of urls) {
      if (!url || loadedRef.current.has(url)) continue;
      loadedRef.current.add(url);
      const img = new Image();
      img.src = url;
    }
  }, [urls]);
}
