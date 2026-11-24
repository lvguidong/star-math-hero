import { useEffect, useRef, useState } from 'react';
import { AppController } from '../application/appController';

/** React 与 AppController 的桥接：订阅控制器变化并触发重渲染 */
export function useApp(): AppController {
  const ref = useRef<AppController | null>(null);
  if (!ref.current) {
    ref.current = new AppController(
      typeof window !== 'undefined' ? window.localStorage : null,
    );
  }
  const [, force] = useState(0);
  useEffect(() => ref.current!.subscribe(() => force(n => n + 1)), []);
  return ref.current;
}
