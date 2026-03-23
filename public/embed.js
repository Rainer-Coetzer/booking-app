(function() {
  'use strict';

  // Configuration
  var defaults = {
    url: '',
    width: '100%',
    height: '700px',
    maxWidth: '720px'
  };

  function createWidget(container) {
    var url = container.getAttribute('data-booking-url') || defaults.url;
    if (!url) {
      console.error('[BookingWidget] data-booking-url attribute is required');
      return;
    }

    var width = container.getAttribute('data-width') || defaults.width;
    var height = container.getAttribute('data-height') || defaults.height;
    var maxWidth = container.getAttribute('data-max-width') || defaults.maxWidth;

    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:' + width + ';max-width:' + maxWidth + ';margin:0 auto;';

    var iframe = document.createElement('iframe');
    iframe.src = url + '/embed';
    iframe.style.cssText = 'width:100%;height:' + height + ';border:none;background:transparent;';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', 'Book a Photography Session');
    iframe.setAttribute('allow', 'clipboard-write');

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    // Auto-resize listener
    window.addEventListener('message', function(e) {
      try {
        var origin = new URL(url).origin;
        if (e.origin !== origin) return;
        if (e.data && e.data.type === 'booking-resize') {
          iframe.style.height = e.data.height + 'px';
        }
      } catch(err) { /* ignore */ }
    });
  }

  // Initialize all booking widgets on page
  function init() {
    var containers = document.querySelectorAll('[data-booking-widget]');
    for (var i = 0; i < containers.length; i++) {
      createWidget(containers[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
