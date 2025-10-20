import { Model } from "@/model.ts";
import { Whiteboard, updateCanvasSize } from "@/whiteboard.ts";
import { Match } from "@/match.ts";
import { QRImport, QRExport } from "@/qr.ts";
import { CLEAR } from "@/db.ts";

const get = (id: string): HTMLElement | null => document.getElementById(id);

// Lazily resolve DOM elements at initialization time.
// These placeholders are assigned once the DOM is ready.
let B: {
  NewMatch?: HTMLElement | null;
  ImportMatch?: HTMLElement | null;
  Clear?: HTMLElement | null;
  CreateMatch?: HTMLElement | null;
  CancelCreate?: HTMLElement | null;
  Back?: HTMLElement | null;
  ToggleView?: HTMLElement | null;
} | null = null;

let I: {
  MatchName?: HTMLInputElement | null;
  RedOne?: HTMLInputElement | null;
  RedTwo?: HTMLInputElement | null;
  RedThree?: HTMLInputElement | null;
  BlueOne?: HTMLInputElement | null;
  BlueTwo?: HTMLInputElement | null;
  BlueThree?: HTMLInputElement | null;
} | null = null;

let E: {
  Home?: HTMLElement | null;
  Whiteboard?: HTMLElement | null;
  MatchList?: HTMLElement | null;
  CreateMatchPanel?: HTMLElement | null;
  EmptyMatchListPlaceholder?: HTMLElement | null;
  MatchListItemTemplate?: HTMLElement | null;
  Export?: HTMLElement | null;
  Import?: HTMLElement | null;
  ImportInner?: HTMLElement | null;
} | null = null;

export class View {
  private model: Model;
  private whiteboard: Whiteboard;
  private qrimport: QRImport;
  private qrexport: QRExport;

  constructor(
    model: Model,
    whiteboard: Whiteboard,
    qrimport: QRImport,
    qrexport: QRExport,
  ) {
    this.model = model;
    this.whiteboard = whiteboard;
    this.qrimport = qrimport;
    this.qrexport = qrexport;

    // Initialize DOM-dependent state only after the DOM is ready.
    const initDOM = () => {
      // Resolve element references now that the DOM exists.
      B = {
        NewMatch: get("home-toolbar-new-btn") as HTMLElement | null,
        ImportMatch: get("home-toolbar-import-btn") as HTMLElement | null,
        Clear: get("home-toolbar-clear-btn") as HTMLElement | null,
        CreateMatch: get("create-match-create-btn") as HTMLElement | null,
        CancelCreate: get("create-match-cancel-btn") as HTMLElement | null,
        Back: get("whiteboard-toolbar-back") as HTMLElement | null,
        ToggleView: get("whiteboard-toolbar-view-toggle") as HTMLElement | null,
      };

      I = {
        MatchName: get("create-match-name") as HTMLInputElement | null,
        RedOne: get("create-match-red-1") as HTMLInputElement | null,
        RedTwo: get("create-match-red-2") as HTMLInputElement | null,
        RedThree: get("create-match-red-3") as HTMLInputElement | null,
        BlueOne: get("create-match-blue-1") as HTMLInputElement | null,
        BlueTwo: get("create-match-blue-2") as HTMLInputElement | null,
        BlueThree: get("create-match-blue-3") as HTMLInputElement | null,
      };

      E = {
        Home: get("home-container") as HTMLElement | null,
        Whiteboard: get("whiteboard-container") as HTMLElement | null,
        MatchList: get("home-match-list") as HTMLElement | null,
        CreateMatchPanel: get("create-match-container") as HTMLElement | null,
        EmptyMatchListPlaceholder: get(
          "home-match-list-empty-placeholder",
        ) as HTMLElement | null,
        MatchListItemTemplate: get(
          "home-match-list-item-template",
        ) as HTMLElement | null,
        Export: get("qr-export-container") as HTMLElement | null,
        Import: get("qr-import-container") as HTMLElement | null,
        ImportInner: get("qr-import-inner-container") as HTMLElement | null,
      };

      // Create existing match entries now that the list/template are available.
      for (const match of this.model.matches) {
        this.createNewMatch(
          match.id,
          match.matchName,
          match.redOne,
          match.redTwo,
          match.redThree,
          match.blueOne,
          match.blueTwo,
          match.blueThree,
        );
      }

      // Attach event listeners defensively (if element exists).
      // Use consolidated registration to add debug logs when handlers are attached.
      const trackedHandlers = [
        {
          el: B?.NewMatch,
          id: "home-toolbar-new-btn",
          evt: "click",
          fn: (e: Event) => this.onClickNewMatch(e),
        },
        {
          el: B?.CreateMatch,
          id: "create-match-create-btn",
          evt: "click",
          fn: (e: Event) => this.onClickCreateMatch(e),
        },
        {
          el: B?.CancelCreate,
          id: "create-match-cancel-btn",
          evt: "click",
          fn: (e: Event) => this.onClickCancelCreateMatch(e),
        },
        {
          el: B?.Back,
          id: "whiteboard-toolbar-back",
          evt: "click",
          fn: (e: Event) => this.onClickBack(e),
        },
        {
          el: B?.ToggleView,
          id: "whiteboard-toolbar-view-toggle",
          evt: "click",
          fn: (e: Event) => this.onClickToggleView(e),
        },
        {
          el: B?.ImportMatch,
          id: "home-toolbar-import-btn",
          evt: "click",
          fn: (e: Event) => this.onClickImportMatch(e),
        },
      ];

      for (const h of trackedHandlers) {
        if (h.el) {
          console.debug(`View: attaching '${h.evt}' handler to #${h.id}`);
          try {
            // Emit a lightweight event so the debug overlay or external monitors can see when
            // handlers are attached. Ignore if dispatching fails in constrained environments.
            try {
              window.dispatchEvent(
                new CustomEvent("app:handlerattached", {
                  detail: { id: h.id, event: h.evt },
                }),
              );
            } catch (_err) {}

            (h.el as HTMLElement).addEventListener(
              h.evt,
              h.fn as EventListener,
            );
            console.debug(`View: attached '${h.evt}' handler to #${h.id}`);
          } catch (err) {
            console.error(
              `View: failed to attach handler '${h.evt}' to #${h.id}:`,
              err,
            );
          }
        } else {
          console.warn(`Missing element: ${h.id}`);
        }
      }

      // Clear button has a special inline handler body; keep behavior but add logs.
      const clearBtn = B?.Clear;
      if (clearBtn) {
        console.debug(
          "View: attaching 'click' handler to #home-toolbar-clear-btn",
        );
        try {
          try {
            window.dispatchEvent(
              new CustomEvent("app:handlerattached", {
                detail: { id: "home-toolbar-clear-btn", event: "click" },
              }),
            );
          } catch (_err) {}
          clearBtn.addEventListener("click", (e) => {
            if (!confirm("Are you sure you want to clear all data?")) return;
            CLEAR();
            location.reload();
          });
          console.debug(
            "View: attached 'click' handler to #home-toolbar-clear-btn",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #home-toolbar-clear-btn:",
            err,
          );
        }
      } else {
        // There might be an inline handler in index.html; still warn to help debugging.
        console.warn(
          "Missing element: home-toolbar-clear-btn (no clear handler attached here)",
        );
      }

      const exportEl = E?.Export;
      if (exportEl) {
        console.debug(
          "View: attaching 'click' handler to #qr-export-container",
        );
        try {
          try {
            window.dispatchEvent(
              new CustomEvent("app:handlerattached", {
                detail: { id: "qr-export-container", event: "click" },
              }),
            );
          } catch (_err) {}
          exportEl.addEventListener("click", (e) => this.onCancelExport(e));
          // Also wire the inner close button to the same handler so keyboard users and
          // assistive-technology users have a proper, discoverable control to dismiss the export
          // overlay. We emit the same small instrumentation event used for other handlers.
          const exportCloseBtn = get(
            "qr-export-close-btn",
          ) as HTMLElement | null;
          if (exportCloseBtn) {
            try {
              window.dispatchEvent(
                new CustomEvent("app:handlerattached", {
                  detail: { id: "qr-export-close-btn", event: "click" },
                }),
              );
            } catch (_err) {}
            try {
              exportCloseBtn.addEventListener("click", (e) =>
                this.onCancelExport(e),
              );
              console.debug(
                "View: attached 'click' handler to #qr-export-close-btn",
              );
            } catch (err) {
              console.error(
                "View: failed to attach 'click' handler to #qr-export-close-btn:",
                err,
              );
            }
          } else {
            console.warn("Missing element: qr-export-close-btn");
          }

          // Progress helpers: parse status text and update the top progress bar
          // so small screens (including iPads) have a single authoritative progress indicator.
          const parseProgressFromText = (text: string | null) => {
            if (!text) return null;
            const m = text.match(/(\d+)\s*\/\s*(\d+)/);
            if (m) {
              return { cur: Number(m[1]), total: Number(m[2]) };
            }
            // tolerate variants like 'Received 3 / 12 chunks'
            const n = text.match(/Received\s*(\d+)\s*\/\s*(\d+)/i);
            if (n) return { cur: Number(n[1]), total: Number(n[2]) };
            return null;
          };

          // Track the last known progress value per bar to ensure monotonic increases
          const lastProgressValues = new Map<string, number>();

          const updateProgressBarFromStatus = (
            statusId: string,
            barId: string,
          ) => {
            try {
              const statusEl = get(statusId);
              const barEl = get(barId) as HTMLElement | null;
              if (!statusEl || !barEl) return;
              const info = parseProgressFromText(
                statusEl.textContent || (statusEl as HTMLElement).innerText,
              );
              // Important: do not reset the bar when parsing temporarily fails.
              // Many small status updates or transient text clearing previously caused
              // flicker (width jumping to 0). Only update when parse yields a numeric value.
              if (!info) {
                return;
              }
              const pct = Math.max(
                0,
                Math.min(100, Math.round((info.cur / info.total) * 100)),
              );

              // Get the last known progress value for this specific bar
              const lastPct = lastProgressValues.get(barId) || 0;

              // Only update if progress has increased or reset to a new stream (decrease)
              // This prevents multiple small transitions that create a segmented appearance
              if (pct > lastPct || pct < lastPct - 10) {
                barEl.style.width = pct + "%";
                lastProgressValues.set(barId, pct);
              }

              if (pct >= 100) barEl.classList.add("complete");
              else barEl.classList.remove("complete");
            } catch (_err) {
              // non-fatal: keep textual status as the canonical source of truth
            }
          };

          const observeStatusToProgress = (statusId: string, barId: string) => {
            const statusEl = get(statusId);
            if (!statusEl) return;
            // Initial sync
            updateProgressBarFromStatus(statusId, barId);
            // Observe subsequent status text changes and update the progress bar accordingly.
            try {
              const mo = new MutationObserver(() => {
                updateProgressBarFromStatus(statusId, barId);
              });
              mo.observe(statusEl, {
                childList: true,
                characterData: true,
                subtree: true,
              });
            } catch (_err) {
              // If MutationObserver is restricted, fall back to a short interval poll
              const poll = window.setInterval(() => {
                updateProgressBarFromStatus(statusId, barId);
              }, 400);
              // Try to clear poll when overlay closes (best-effort)
              const overlay = get(
                statusId === "qr-export-status"
                  ? "qr-export-container"
                  : "qr-import-container",
              );
              if (overlay) {
                overlay.addEventListener(
                  "click",
                  () => {
                    try {
                      clearInterval(poll);
                    } catch (_e) {}
                  },
                  { once: true },
                );
              }
            }
          };

          // Start observing both export and import status text nodes so the top progress bars
          // are kept in sync on small screens (including iPad) when the status text changes.
          observeStatusToProgress("qr-export-status", "qr-export-progress-bar");
          observeStatusToProgress("qr-import-status", "qr-import-progress-bar");

          // Reset progress tracking when overlays are closed to ensure clean state for next open
          const exportOverlayProgress = get("qr-export-container");
          const importOverlayProgress = get("qr-import-container");

          if (exportOverlayProgress) {
            exportOverlayProgress.addEventListener("click", (e) => {
              if (e.target === exportOverlayProgress) {
                lastProgressValues.delete("qr-export-progress-bar");
              }
            });
          }

          if (importOverlayProgress) {
            importOverlayProgress.addEventListener("click", (e) => {
              if (e.target === importOverlayProgress) {
                lastProgressValues.delete("qr-import-progress-bar");
              }
            });
          }

          // Ensure overlay inner containers adapt to iPad / tablet layouts programmatically
          // (CSS provides the baseline but this makes subtle breakpoints reliable at runtime).
          const ensureOverlayLayout = () => {
            try {
              const isTablet = window.innerWidth <= 1024;
              const exportInner = get(
                "qr-export-inner-container",
              ) as HTMLElement | null;
              const importInner = get(
                "qr-import-inner-container",
              ) as HTMLElement | null;
              if (exportInner) {
                exportInner.style.maxWidth = isTablet ? "92vw" : "820px";
                exportInner.style.width = isTablet ? "92vw" : "";
              }
              if (importInner) {
                importInner.style.maxWidth = isTablet ? "92vw" : "820px";
                importInner.style.width = isTablet ? "92vw" : "";
              }
            } catch (_err) {
              // ignore layout adjustments on constrained environments
            }
          };

          // If toolbar mode labels and the right controls overlap on a particular device,
          // force a compact/tablet layout for the toolbar so the labels never collide with
          // the right-side buttons (this helps when device pixel scaling makes CSS breakpoints
          // appear inaccurate for some iPads).
          const ensureToolbarArrangement = () => {
            try {
              const toolbar = get("whiteboard-toolbar") as HTMLElement | null;
              const mode = get(
                "whiteboard-toolbar-mode-select",
              ) as HTMLElement | null;
              const left = document.querySelector(
                "#whiteboard-toolbar .toolbar-left",
              ) as HTMLElement | null;
              const right = document.querySelector(
                "#whiteboard-toolbar .toolbar-right",
              ) as HTMLElement | null;
              if (!toolbar || !mode || !left || !right) return;
              const mRect = mode.getBoundingClientRect();
              const rRect = right.getBoundingClientRect();
              // If the mode area encroaches on the right controls, force a stacked layout.
              if (mRect.right > rRect.left - 8) {
                toolbar.style.gridTemplateColumns = "1fr 1fr";
                toolbar.style.gridTemplateRows = "auto auto";
                (mode as HTMLElement).style.gridColumn = "1 / -1";
                (mode as HTMLElement).style.gridRow = "2";
                left.style.gridColumn = "1";
                left.style.gridRow = "1";
                right.style.gridColumn = "2";
                right.style.gridRow = "1";
              } else {
                // restore defaults (let CSS handle normal layout)
                toolbar.style.gridTemplateColumns = "";
                toolbar.style.gridTemplateRows = "";
                (mode as HTMLElement).style.gridColumn = "";
                (mode as HTMLElement).style.gridRow = "";
                left.style.gridColumn = "";
                left.style.gridRow = "";
                right.style.gridColumn = "";
                right.style.gridRow = "";
              }
            } catch (_err) {
              // ignore layout calculation errors
            }
          };

          // When an overlay is shown we want to reset the progress bar once (clean slate for the new export/import).
          // We monkeypatch the instance `show` method so that we reset the correct UI elements only when an overlay opens;
          // this ensures we do not frequently reset in response to transient text changes.
          try {
            const origShow = (this as any).show.bind(this);
            (this as any).show = (e: HTMLElement | null) => {
              try {
                if (e === E.Export) {
                  const bar = get(
                    "qr-export-progress-bar",
                  ) as HTMLElement | null;
                  if (bar) {
                    bar.style.width = "0%";
                    bar.classList.remove("complete");
                  }
                  const dots = get("qr-export-dots") as HTMLElement | null;
                  if (dots) dots.style.display = "inline-flex";
                }
                if (e === E.Import) {
                  const bar = get(
                    "qr-import-progress-bar",
                  ) as HTMLElement | null;
                  if (bar) {
                    bar.style.width = "0%";
                    bar.classList.remove("complete");
                  }
                  const dots = get("qr-import-dots") as HTMLElement | null;
                  if (dots) dots.style.display = "inline-flex";
                }
              } catch (_err) {}
              // Call original behavior (show element).
              origShow(e);
              // Re-evaluate toolbar layout after showing overlays to avoid overlap at unusual widths.
              ensureOverlayLayout();
              ensureToolbarArrangement();
            };
          } catch (_err) {
            // If monkeypatching fails for any reason, we still proceed — show() will behave as before.
          }

          // Run immediately and on relevant events so orientation changes on iPad are handled.
          try {
            ensureOverlayLayout();
            ensureToolbarArrangement();
            window.addEventListener("resize", () => {
              ensureOverlayLayout();
              ensureToolbarArrangement();
            });
            window.addEventListener("orientationchange", () => {
              ensureOverlayLayout();
              ensureToolbarArrangement();
            });
          } catch (_err) {}

          // Backdrop handlers: do not reset the progress bar when the backdrop is clicked (that caused frequent flicker).
          // Instead, hide the animated dots and use the centralized onCancel handlers to stop streaming/scanning cleanly.
          const exportOverlay = get("qr-export-container");
          if (exportOverlay) {
            exportOverlay.addEventListener("click", (e) => {
              try {
                const dots = get("qr-export-dots") as HTMLElement | null;
                if (dots) dots.style.display = "none";
              } catch (_err) {}
              // Close via the same centralized cancel path so the exporter can clean up safely.
              try {
                this.onCancelExport(e as Event);
              } catch (_err) {}
            });
            // keep the existing custom event hook used by tests / automation
            exportOverlay.addEventListener("app:closeexport" as any, () => {
              this.onCancelExport(new Event("click"));
            });
          } else {
            console.warn("Missing element: qr-export-container");
          }

          const importOverlay = get("qr-import-container");
          if (importOverlay) {
            importOverlay.addEventListener("click", (e) => {
              try {
                const dots = get("qr-import-dots") as HTMLElement | null;
                if (dots) dots.style.display = "none";
              } catch (_err) {}
              try {
                this.onCancelImport(e as Event);
              } catch (_err) {}
            });
          }
          console.debug(
            "View: attached 'click' handler to #qr-export-container",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #qr-export-container:",
            err,
          );
        }
      } else {
        console.warn("Missing element: qr-export-container");
      }

      const importEl = E?.Import;
      if (importEl) {
        console.debug(
          "View: attaching 'click' handler to #qr-import-container",
        );
        try {
          try {
            window.dispatchEvent(
              new CustomEvent("app:handlerattached", {
                detail: { id: "qr-import-container", event: "click" },
              }),
            );
          } catch (_err) {}
          importEl.addEventListener("click", (e) => this.onCancelImport(e));
          console.debug(
            "View: attached 'click' handler to #qr-import-container",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #qr-import-container:",
            err,
          );
        }
      } else {
        console.warn("Missing element: qr-import-container");
      }

      const importInner = E?.ImportInner;
      if (importInner) {
        console.debug(
          "View: attaching 'click' handler to #qr-import-inner-container (stopPropagation)",
        );
        importInner.addEventListener("click", (e) => e.stopPropagation());

        // Programmatically insert a small, accessible close button inside the import
        // inner container so users can dismiss the import overlay without tapping the backdrop.
        // We create it here (rather than editing static HTML) so the view remains
        // resilient to small markup changes and tests can still locate/override it.
        if (!document.getElementById("qr-import-close-btn")) {
          try {
            const closeBtn = document.createElement("button");
            closeBtn.id = "qr-import-close-btn";
            closeBtn.className =
              "text-slate-300 bg-transparent px-3 py-1 rounded-md hover:bg-slate-700";
            closeBtn.title = "Close import";
            closeBtn.setAttribute("aria-label", "Close import dialog");
            closeBtn.textContent = "Close";
            // Keep position visually unobtrusive but accessible.
            closeBtn.style.position = "absolute";
            closeBtn.style.top = "8px";
            closeBtn.style.right = "8px";
            closeBtn.addEventListener("click", (ev) => {
              ev.stopPropagation();
              this.onCancelImport(ev);
            });
            importInner.appendChild(closeBtn);
          } catch (err) {
            console.warn("View: could not create import close button:", err);
          }
        }

        console.debug(
          "View: attached 'click' handler to #qr-import-inner-container",
        );
      } else {
        console.warn("Missing element: qr-import-inner-container");
      }
    };

    // If the DOM hasn't loaded yet, wait for it; otherwise initialize immediately.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initDOM, { once: true });
    } else {
      initDOM();
    }
  }

  private show(e: HTMLElement | null): void {
    if (e === E.Home) {
      document.documentElement.style.backgroundColor = "#192334";
    } else if (e === E.Whiteboard) {
      document.documentElement.style.backgroundColor = "#18181b";
    }
    e?.classList.remove("hidden");
  }

  private hide(e: HTMLElement | null): void {
    e?.classList.add("hidden");
  }

  private hideCreateMatchPanel(): void {
    this.hide(E.CreateMatchPanel);
    I.MatchName.value = "";
    I.RedOne.value = "";
    I.RedTwo.value = "";
    I.RedThree.value = "";
    I.BlueOne.value = "";
    I.BlueTwo.value = "";
    I.BlueThree.value = "";
  }

  private loadWhiteboard(match: Match): void {
    this.whiteboard.setMatch(match);
    this.whiteboard.setActive(true);
    this.show(E.Whiteboard);
    this.hide(E.Home);
    updateCanvasSize();
  }

  public createNewMatch(
    id: string,
    matchName: string,
    redOne: string,
    redTwo: string,
    redThree: string,
    blueOne: string,
    blueTwo: string,
    blueThree: string,
  ): void {
    // Defensive: ensure necessary DOM elements are available before proceeding.
    if (!E || !E.MatchList || !E.MatchListItemTemplate) {
      console.warn(
        "createNewMatch called before DOM initialization - skipping creation for",
        id,
      );
      return;
    }

    this.hide(E.EmptyMatchListPlaceholder);

    const template = E.MatchListItemTemplate;
    if (!template) {
      console.warn(
        "Missing match list item template; cannot create match item:",
        id,
      );
      return;
    }

    const item = template.cloneNode(true) as HTMLElement;
    if (!item) return;

    item.id = id;

    matchName = matchName || "Untitled";
    redOne = redOne || "---";
    redTwo = redTwo || "---";
    redThree = redThree || "---";
    blueOne = blueOne || "---";
    blueTwo = blueTwo || "---";
    blueThree = blueThree || "---";

    item.children[0].textContent = matchName;
    item.children[1].children[0].textContent = `${redOne} ${redTwo} ${redThree}`;
    item.children[1].children[2].textContent = `${blueOne} ${blueTwo} ${blueThree}`;

    item.setAttribute("tabindex", "0");

    const kebab = item.children[2].children[0] as HTMLElement;
    const options = item.children[2].children[1] as HTMLElement;
    const exportOption = options.children[0] as HTMLElement;
    const deleteOption = options.children[1] as HTMLElement;
    // Prevent clicks inside the kebab/options area from bubbling up to the
    // match item. This avoids accidental opens when interacting with the menu.
    options.addEventListener("click", (e) => e.stopPropagation());

    kebab.addEventListener("click", (e) => {
      // Prevent the click from bubbling up and being interpreted as an open
      // request on the overall match item.
      e.stopPropagation();
      this.hide(kebab);
      this.show(options);
      item.focus();
    });

    item.addEventListener("focusout", (e) => {
      if (item.contains(e.relatedTarget as Node)) return;

      this.hide(options);
      this.show(kebab);
    });

    deleteOption.addEventListener("click", (e) => {
      // Stop propagation so this click does not bubble up and open the match.
      e.stopPropagation();
      this.deleteMatch(item.id);
    });

    exportOption.addEventListener("click", (e) => {
      // Stop propagation so this click does not bubble up and open the match.
      e.stopPropagation();
      const match = this.model.getMatch(id);
      if (match) {
        // Show the export overlay immediately so users see feedback while QR frames
        // are generated. Defer the heavy work slightly to allow the overlay to render.
        this.show(E.Export);
        setTimeout(() => {
          try {
            this.qrexport.export(match);
          } catch (err) {
            console.error("View: failed to start QR export:", err);
            alert("Failed to start QR export. See console for details.");
            // Ensure overlay is closed if export cannot start.
            this.hide(E.Export);
          }
        }, 50);
      }
      // Close the options and restore the kebab to keep the UI consistent.
      this.hide(options);
      this.show(kebab);
    });

    const openMatch = () => {
      const match = this.model.getMatch(id);
      if (match !== null) {
        this.loadWhiteboard(match);
      }
    };
    // Make the entire match item clickable (except the kebab/options) and add
    // keyboard support for accessibility (Enter / Space).
    item.addEventListener("click", (e) => {
      const target = e.target as Node;
      // If the click originated inside the kebab/options controls, ignore it.
      if (kebab.contains(target) || options.contains(target)) return;
      openMatch();
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // prevent page scroll when Space is used
        openMatch();
      }
    });
    // Ensure the item is keyboard-focusable and announced as a control.
    item.setAttribute("tabindex", "0");
    item.setAttribute("role", "button");

    this.show(item);
    E.MatchList.prepend(item);
  }

  public async deleteMatch(id: string): Promise<void> {
    const item = get(id);
    if (!item) return;

    await this.model.deleteMatch(id);
    E.MatchList.removeChild(item);
    if (E.MatchList.children.length < 3) {
      this.show(E.EmptyMatchListPlaceholder);
    }
  }

  private onClickNewMatch(e: Event): void {
    this.show(E.CreateMatchPanel);
  }

  private onClickCancelCreateMatch(e: Event): void {
    this.hideCreateMatchPanel();
  }

  private async onClickCreateMatch(e: Event): Promise<void> {
    const id = await this.model.createNewMatch(
      I.MatchName.value,
      I.RedOne.value,
      I.RedTwo.value,
      I.RedThree.value,
      I.BlueOne.value,
      I.BlueTwo.value,
      I.BlueThree.value,
    );
    this.createNewMatch(
      id,
      I.MatchName.value,
      I.RedOne.value,
      I.RedTwo.value,
      I.RedThree.value,
      I.BlueOne.value,
      I.BlueTwo.value,
      I.BlueThree.value,
    );
    this.hideCreateMatchPanel();
  }

  private onClickBack(e: Event): void {
    this.whiteboard.setActive(false);
    this.show(E.Home);
    this.hide(E.Whiteboard);
  }

  private onClickToggleView(e: Event): void {
    this.whiteboard.toggleView();
  }

  private async onClickImportMatch(e: Event): Promise<void> {
    // Start the import process but only show the overlay if the camera becomes active.
    const videoEl = get("qr-import-video") as HTMLVideoElement | null;

    // Start the scanner and install the callback that will be invoked when a full
    // stream of QR frames has been decoded. We do not show the import overlay yet;
    // we'll wait until the camera/video element reports activity so the user sees
    // the live feed rather than an empty dialog.
    try {
      // Kick off the QR import; pass the existing callback behavior for when data arrives.
      // Note: QRImport.start handles errors internally and may alert on permission errors.
      // We still perform a lightweight readiness check below so we only show the overlay
      // if a camera feed actually starts.
      this.qrimport.start(async (data) => {
        const match = Match.fromPacket(data as any);
        const id = await this.model.addMatch(match);
        this.createNewMatch(
          id,
          match.matchName,
          match.redOne,
          match.redTwo,
          match.redThree,
          match.blueOne,
          match.blueTwo,
          match.blueThree,
        );
        // Hide the import overlay after we successfully imported the match.
        this.hide(E.Import);
      });
    } catch (err) {
      // Defensive: QRImport.start may throw in some implementations; ensure we surface the error.
      console.warn("View: qrimport.start threw an error:", err);
    }

    // If there is no video element to observe, bail out and let QRImport handle alerts.
    if (!videoEl) {
      console.warn(
        "View: no video element to verify camera start; not showing import overlay",
      );
      return;
    }

    // Wait up to a short timeout for the video element to become active.
    const started = await new Promise<boolean>((resolve) => {
      let finished = false;
      const timeout = window.setTimeout(() => {
        if (!finished) {
          finished = true;
          cleanup();
          resolve(false);
        }
      }, 2500);

      function cleanup() {
        clearTimeout(timeout);
        videoEl.removeEventListener("playing", onPlay);
        videoEl.removeEventListener("loadeddata", onPlay);
        videoEl.removeEventListener("error", onError);
      }
      function onPlay() {
        if (!finished) {
          finished = true;
          cleanup();
          resolve(true);
        }
      }
      function onError() {
        if (!finished) {
          finished = true;
          cleanup();
          resolve(false);
        }
      }

      // Immediate success if already in a usable ready state.
      if (videoEl.readyState >= 2) {
        finished = true;
        cleanup();
        resolve(true);
        return;
      }

      videoEl.addEventListener("playing", onPlay);
      videoEl.addEventListener("loadeddata", onPlay);
      videoEl.addEventListener("error", onError);
    });

    if (started) {
      // Only show the import overlay once the camera feed is active.
      this.show(E.Import);
    } else {
      // If the camera did not start in a timely manner, stop the scanner and inform the user.
      try {
        this.qrimport.stop();
      } catch (err) {
        console.warn("View: error stopping qrimport after failed start:", err);
      }
      alert(
        "Could not access the camera for QR import. Please grant camera permissions and try again.",
      );
    }
  }

  private onCancelExport(e: Event): void {
    try {
      this.qrexport.close();
    } catch (err) {
      console.warn("View: failed to stop QR export:", err);
    }
    this.hide(E.Export);

    // Clear export status text to leave the UI in a consistent state.
    const status = get("qr-export-status");
    if (status) status.textContent = "";
  }

  private onCancelImport(e: Event): void {
    try {
      this.qrimport.stop();
    } catch (err) {
      console.warn("View: error stopping QR import scanner:", err);
    }

    // Hide the import overlay.
    this.hide(E.Import);

    // Clear camera selection dropdown so it will be repopulated fresh next time.
    const cameraSelect = get(
      "qr-import-camera-select",
    ) as HTMLSelectElement | null;
    if (cameraSelect) {
      try {
        for (let i = cameraSelect.options.length - 1; i >= 0; i--) {
          cameraSelect.remove(i);
        }
      } catch (err) {
        console.warn("View: failed to clear camera select options:", err);
      }
    }

    // Ensure any active media stream attached to the video element is stopped and removed.
    const video = get("qr-import-video") as HTMLVideoElement | null;
    if (video) {
      try {
        video.pause();
        const anyVid = video as any;
        if (anyVid && anyVid.srcObject) {
          const stream = anyVid.srcObject as MediaStream;
          try {
            for (const track of stream.getTracks ? stream.getTracks() : []) {
              try {
                track.stop();
              } catch (_err) {}
            }
          } catch (_err) {}
          try {
            anyVid.srcObject = null;
          } catch (_err) {}
        } else {
          try {
            video.removeAttribute("src");
            video.load();
          } catch (_err) {}
        }
      } catch (err) {
        console.warn("View: error while clearing import video element:", err);
      }
    }

    // Clear any ephemeral status UI that might be present.
    const exportStatus = get("qr-export-status");
    if (exportStatus) exportStatus.textContent = "";
    const importStatus = get("qr-import-status");
    if (importStatus) importStatus.textContent = "";
  }
}
