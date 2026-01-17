(function () {
    function qs(id) {
        return document.getElementById(id);
    }
    function log(msg) {
        try {
            var l = qs("app-debug-log");
            if (l)
                l.textContent +=
                    new Date().toLocaleTimeString() +
                    " - " +
                    msg +
                    "\n";
        } catch (e) {}
        console.log("APP-DEBUG:", msg);
    }

    // Instrument addEventListener to surface startup handler attachments.
    // This runs early in the page lifecycle so it can capture when the View attaches
    // event handlers to known elements during initialization.
    (function () {
        const originalAdd = EventTarget.prototype.addEventListener;
        EventTarget.prototype.addEventListener = function (
            type,
            listener,
            options,
        ) {
            try {
                const el =
                    this instanceof Element
                        ? this
                        : this && this.target
                          ? this.target
                          : null;
                const id = el && el.id ? el.id : null;
                const tracked = [
                    "home-toolbar-new-btn",
                    "home-toolbar-import-btn",
                    "home-toolbar-clear-btn",
                    "create-match-create-btn",
                    "create-match-cancel-btn",
                    "whiteboard-toolbar-back",
                    "whiteboard-toolbar-view-toggle",
                    "qr-export-container",
                    "qr-import-container",
                    "qr-import-inner-container",
                ];
                if (id && tracked.indexOf(id) !== -1) {
                    try {
                        log(
                            `Attached handler: "${type}" on #${id}`,
                        );
                    } catch (err) {
                        console.log(
                            "APP-DEBUG: Attached handler:",
                            type,
                            id,
                        );
                    }
                }
            } catch (err) {
                console.warn("Instrumentation failed:", err);
            }
            return originalAdd.call(this, type, listener, options);
        };
    })();
    function setStatus(text) {
        var s = qs("app-debug-status");
        if (s) s.textContent = text;
        log("Status: " + text);
    }
    function setLoadingMessage(text) {
        var el = qs("app-loading-message");
        if (el) el.textContent = text;
    }
    function hideLoadingScreen() {
        var l = qs("app-loading");
        if (l) l.classList.add("is-hidden");
    }
    function showLoadingScreen(text) {
        var l = qs("app-loading");
        if (l) l.classList.remove("is-hidden");
        if (text) setLoadingMessage(text);
    }
    function showOverlay() {
        var o = qs("app-debug-overlay");
        if (o) o.classList.remove("hidden");
    }
    function hideOverlay() {
        var o = qs("app-debug-overlay");
        if (o) o.classList.add("hidden");
    }
    function runSelfTest() {
        try {
            var newBtn = qs("home-toolbar-new-btn");
            var panel = qs("create-match-container");
            if (!newBtn || !panel) {
                setStatus(
                    "Self-test: required elements missing (home-toolbar-new-btn or create-match-container)",
                );
                showOverlay();
                return;
            }
            var beforeHidden = panel.classList.contains("hidden");
            log("Self-test: clicking New button");
            newBtn.click();
            setTimeout(function () {
                var afterHidden =
                    panel.classList.contains("hidden");
                if (beforeHidden && !afterHidden) {
                    setStatus(
                        "Self-test passed: create panel opened; handlers attached.",
                    );
                    var cancel = qs("create-match-cancel-btn");
                    if (cancel) cancel.click();
                    setTimeout(function () {
                        hideOverlay();
                    }, 1200);
                } else {
                    setStatus(
                        "Self-test failed: create panel did not open. Event handlers may not be attached.",
                    );
                    showOverlay();
                }
            }, 350);
        } catch (err) {
            setStatus(
                "Self-test exception: " + (err && err.message),
            );
            showOverlay();
        }
    }
    function onAppInitialized() {
        setStatus("App initialized");
    }
    function onModuleError(detail) {
        setStatus(
            "Module failed to load: " +
                (detail && detail.message
                    ? detail.message
                    : "unknown"),
        );
        showOverlay();
    }
    function onRuntimeError(ev) {
        setStatus(
            "Runtime error: " +
                (ev && ev.message ? ev.message : String(ev)),
        );
        showOverlay();
        log("Runtime error event: " + JSON.stringify(ev));
    }
    function onUnhandledRejection(ev) {
        setStatus(
            "Unhandled rejection: " +
                (ev && ev.reason
                    ? ev.reason.message || JSON.stringify(ev.reason)
                    : String(ev)),
        );
        showOverlay();
        log("Unhandled rejection: " + JSON.stringify(ev));
    }

    window.addEventListener("app:initialized", function () {
        hideLoadingScreen();
        onAppInitialized();
    });
    window.addEventListener("app:moduleerror", function (e) {
        showLoadingScreen(
            "Something went wrong loading the app. Try refreshing.",
        );
        onModuleError(e && e.detail);
    });
    window.addEventListener("error", function (e) {
        onRuntimeError(e && (e.error || e));
    });
    window.addEventListener("unhandledrejection", function (e) {
        onUnhandledRejection(e);
    });

    document.addEventListener(
        "DOMContentLoaded",
        function () {
            setStatus("DOMContentLoaded — awaiting module load...");
            setLoadingMessage("Preparing Strategy Board...");
            var selfBtn = qs("app-debug-selftest-btn");
            if (selfBtn)
                selfBtn.addEventListener("click", runSelfTest);
            var reloadBtn = qs("app-debug-reload-btn");
            if (reloadBtn)
                reloadBtn.addEventListener("click", function () {
                    location.reload();
                });
        },
        { once: true },
    );
})();
