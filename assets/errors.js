// Reports uncaught client errors to the Worker, which forwards them to Telegram.
// Deliberately tiny and dependency-free: it must survive whatever broke the page,
// so it uses no helpers, no imports, and guards every step.
(function () {
    'use strict';

    var ENDPOINT = 'https://iamovi-github-io.oviren-human.workers.dev/notify';
    var MAX_PER_PAGE = 3;
    var sent = 0;
    var seen = {};

    function report(payload) {
        if (sent >= MAX_PER_PAGE) return;
        var key = payload.message + '|' + payload.source + '|' + payload.line;
        if (seen[key]) return; // same error firing in a loop
        seen[key] = 1;
        sent += 1;

        try {
            // Mirrors notifyTelegram() in script.js: this endpoint is already
            // proven to work from the site, keepalive lets it outlive the page.
            fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(function () {});
        } catch (e) { /* never let the reporter throw */ }
    }

    function stackOf(err) {
        try { return String((err && err.stack) || '').slice(0, 700); }
        catch (e) { return ''; }
    }

    window.addEventListener('error', function (event) {
        // Resource load failures (img/script) have no message; skip them.
        if (!event.message && !event.error) return;
        report({
            type: 'error',
            page: location.pathname,
            message: String(event.message || (event.error && event.error.message) || 'unknown'),
            source: String(event.filename || ''),
            line: String(event.lineno || ''),
            stack: stackOf(event.error)
        });
    }, true);

    window.addEventListener('unhandledrejection', function (event) {
        var reason = event.reason;
        report({
            type: 'error',
            page: location.pathname,
            message: 'Unhandled rejection: ' + String((reason && reason.message) || reason || 'unknown'),
            source: '',
            line: '',
            stack: stackOf(reason)
        });
    });
})();
