/*
 * Booking widget loader.
 *
 *   <div data-booking-widget data-booking-url="https://book.example.com"></div>
 *   <script src="https://book.example.com/embed.js" async></script>
 *
 * Optional attributes: data-height (initial height, default 760), data-title.
 */
(function () {
  'use strict';

  function mount(container) {
    if (container.getAttribute('data-booking-mounted')) return;
    var base = (container.getAttribute('data-booking-url') || '').replace(/\/$/, '');
    if (!base) {
      console.error('[booking] data-booking-url is required');
      return;
    }
    var origin;
    try {
      origin = new URL(base).origin;
    } catch {
      console.error('[booking] data-booking-url is not a valid URL');
      return;
    }

    var iframe = document.createElement('iframe');
    iframe.src = base + '/embed';
    iframe.title = container.getAttribute('data-title') || 'Book online';
    iframe.loading = 'lazy';
    iframe.style.cssText = 'display:block;width:100%;border:0;height:' + (parseInt(container.getAttribute('data-height'), 10) || 760) + 'px';
    container.appendChild(iframe);
    container.setAttribute('data-booking-mounted', 'true');

    window.addEventListener('message', function (event) {
      if (event.origin !== origin || event.source !== iframe.contentWindow) return;
      var data = event.data;
      if (data && data.type === 'booking-resize' && typeof data.height === 'number') {
        iframe.style.height = Math.max(320, Math.ceil(data.height)) + 'px';
      }
    });
  }

  function init() {
    var nodes = document.querySelectorAll('[data-booking-widget]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
