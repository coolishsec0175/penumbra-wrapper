import { useEffect, useRef } from 'react';

/**
 * Binds a document-level keydown handler that always uses the latest callback.
 * Unlike the element-level listener on a focused node, this keeps shortcuts
 * responsive no matter where focus currently is.
 */
export function useGlobalKeydown(handler: (e: KeyboardEvent) => void) {
  const saved = useRef(handler);

  useEffect(() => {
    saved.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (e: KeyboardEvent) => saved.current(e);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);
}
