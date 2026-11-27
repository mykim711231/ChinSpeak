import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** 백그라운드 복귀 후 고정 메뉴만 다시 그려 오래된 브라우저 합성 레이어를 교체한다. */
export function useResumeNav() {
  const [revision, setRevision] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const focusHref = useRef<string | null>(null);

  useEffect(() => {
    let frame = 0;
    let settled = 0;
    const cancel = () => { cancelAnimationFrame(frame); window.clearTimeout(settled); };
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (document.hidden) return;
        const active = document.activeElement;
        focusHref.current = active && navRef.current?.contains(active) ? active.getAttribute('href') : null;
        setRevision((value) => value + 1);
      });
    };
    const resume = () => {
      cancel();
      if (document.hidden) return;
      redraw();
      // OS 복귀 애니메이션 뒤 화면 크기가 확정된 시점에도 다시 그린다.
      settled = window.setTimeout(redraw, 500);
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('focus', resume);
    window.addEventListener('orientationchange', resume);
    return () => {
      cancel();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('orientationchange', resume);
    };
  }, []);

  useLayoutEffect(() => {
    const href = focusHref.current;
    focusHref.current = null;
    if (!href || document.activeElement !== document.body) return;
    const link = [...(navRef.current?.querySelectorAll('a') ?? [])].find((item) => item.getAttribute('href') === href);
    link?.focus({ preventScroll: true });
  }, [revision]);

  return { navRef, revision };
}
