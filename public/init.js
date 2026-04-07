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

(function () {
    function compositeCanvases() {
        try {
            var bg = document.getElementById(
                "whiteboard-canvas-background",
            );
            var items = document.getElementById(
                "whiteboard-canvas-items",
            );
            var drawing = document.getElementById(
                "whiteboard-canvas-drawing",
            );

            if (!bg || !items || !drawing) {
                console.error(
                    "PNG Export: One or more canvases not found",
                    {
                        bg: !!bg,
                        items: !!items,
                        drawing: !!drawing,
                    },
                );
                return null;
            }

            if (
                !(bg instanceof HTMLCanvasElement) ||
                !(items instanceof HTMLCanvasElement) ||
                !(drawing instanceof HTMLCanvasElement)
            ) {
                console.error(
                    "PNG Export: Elements are not canvas elements",
                );
                return null;
            }

            var w = bg.width || 3510;
            var h = bg.height || 1610;

            console.log(
                "PNG Export: Creating composite canvas",
                w,
                "x",
                h,
            );

            var out = document.createElement("canvas");
            out.width = w;
            out.height = h;
            var ctx = out.getContext("2d");
            if (!ctx) {
                console.error(
                    "PNG Export: Failed to get 2d context",
                );
                return null;
            }

            ctx.drawImage(bg, 0, 0);
            ctx.drawImage(items, 0, 0);
            ctx.drawImage(drawing, 0, 0);

            console.log(
                "PNG Export: Composite canvas created successfully",
            );
            return out;
        } catch (err) {
            console.error(
                "PNG Export: Error in compositeCanvases",
                err,
            );
            return null;
        }
    }

    function downloadDataUrl(dataUrl, filename) {
        var a = document.createElement("a");
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function exportPNG(filename) {
        var c = compositeCanvases();
        if (!c) {
            alert("Export failed: canvases not available");
            return;
        }
        var dataUrl = c.toDataURL("image/png");
        downloadDataUrl(dataUrl, filename || "strategy-board.png");
    }

    function exportPDF() {
        var c = compositeCanvases();
        if (!c) {
            alert("Export failed: canvases not available");
            return;
        }
        var dataUrl = c.toDataURL("image/png");

        var w = window.open("", "_blank");
        if (!w) {
            alert(
                "Popup blocked. Please allow popups to export as PDF.",
            );
            return;
        }
        w.document.write(
            "<!doctype html><html><head><title>Strategy Board Export</title>",
        );
        w.document.write('</head><body style="margin:0">');
        w.document.write(
            '<img src="' +
                dataUrl +
                '" style="width:100%;height:auto;display:block" />',
        );
        w.document.write("</body></html>");
        w.document.close();
        w.focus();

        var img = w.document.querySelector("img");
        if (img) {
            img.onload = function () {
                setTimeout(function () {
                    try {
                        w.print();
                    } catch (err) {}
                    try {
                        w.close();
                    } catch (err) {}
                }, 250);
            };
        } else {
            setTimeout(function () {
                try {
                    w.print();
                } catch (err) {}
                try {
                    w.close();
                } catch (err) {}
            }, 500);
        }
    }

    function attachHandlers() {
        var exportOverlay = document.getElementById(
            "qr-export-container",
        );
        var exportProgressBar = document.getElementById(
            "qr-export-progress-bar",
        );
        if (exportOverlay && exportProgressBar) {
            exportOverlay.addEventListener("click", function () {
                try {
                    exportProgressBar.style.width = "0%";
                    exportProgressBar.classList.remove("complete");
                } catch (_err) {}
            });
        }
        var importOverlay = document.getElementById(
            "qr-import-container",
        );
        var importProgressBar = document.getElementById(
            "qr-import-progress-bar",
        );
        if (importOverlay && importProgressBar) {
            importOverlay.addEventListener("click", function () {
                try {
                    importProgressBar.style.width = "0%";
                    importProgressBar.classList.remove("complete");
                } catch (_err) {}
            });
        }
    }

    window.exportPNG = exportPNG;
    window.exportPDF = exportPDF;

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            attachHandlers,
            {
                once: true,
            },
        );
    } else {
        attachHandlers();
    }
})();

(function () {
    async function lockOrientation() {
        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock("landscape");
                console.log(
                    "Screen orientation locked to landscape",
                );
            }
        } catch (error) {
            console.log(
                "Screen orientation lock not supported or failed:",
                error,
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            lockOrientation,
        );
    } else {
        lockOrientation();
    }

    document.addEventListener("fullscreenchange", lockOrientation);
})();
