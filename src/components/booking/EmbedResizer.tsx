'use client';

import { useEffect } from 'react';

/** Reports the page height to the host page so embed.js can size the iframe to fit. */
export default function EmbedResizer() {
  useEffect(() => {
    if (window.parent === window) return;
    let last = 0;
    // Measure the content, not the document: body has min-height 100dvh, which
    // inside an iframe equals the iframe's own height and would never shrink.
    const content = document.querySelector('main') ?? document.body;
    const report = () => {
      const height = Math.ceil(content.getBoundingClientRect().height);
      if (height !== last) {
        last = height;
        window.parent.postMessage({ type: 'booking-resize', height }, '*');
      }
    };
    const observer = new ResizeObserver(report);
    observer.observe(content);
    report();
    return () => observer.disconnect();
  }, []);
  return null;
}
