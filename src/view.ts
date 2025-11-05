import { Model } from "@/model.ts";
import { Whiteboard, updateCanvasSize } from "@/whiteboard.ts";
import { Match } from "@/match.ts";
import { QRImport, QRExport } from "@/qr.ts";
import { CLEAR, SET, GET } from "@/db.ts";
import { TBAService } from "./tba.ts";
import { PDFExport } from "./pdf-export.ts";

const get = (id: string): HTMLElement | null => document.getElementById(id);

let B: {
  NewMatch?: HTMLElement | null;
  ImportMatch?: HTMLElement | null;
  TBAImport?: HTMLElement | null;
  Clear?: HTMLElement | null;
  CreateMatch?: HTMLElement | null;
  CancelCreate?: HTMLElement | null;
  Back?: HTMLElement | null;
  ToggleView?: HTMLElement | null;
  TBAImportBtn?: HTMLElement | null;
  TBACancel?: HTMLElement | null;
  ClearConfirmClear?: HTMLElement | null;
  ClearConfirmCancel?: HTMLElement | null;
} | null = null;

let I: {
  MatchName?: HTMLInputElement | null;
  RedOne?: HTMLInputElement | null;
  RedTwo?: HTMLInputElement | null;
  RedThree?: HTMLInputElement | null;
  BlueOne?: HTMLInputElement | null;
  BlueTwo?: HTMLInputElement | null;
  BlueThree?: HTMLInputElement | null;
  TBAApiKey?: HTMLInputElement | null;
  TBAEventKey?: HTMLInputElement | null;
  TBATeamNumber?: HTMLInputElement | null;
  TBAEventSearch?: HTMLInputElement | null;
  TBATeamSearch?: HTMLInputElement | null;
} | null = null;

let E: {
  Home?: HTMLElement | null;
  Whiteboard?: HTMLElement | null;
  MatchList?: HTMLElement | null;
  CreateMatchPanel?: HTMLElement | null;
  TBAImportPanel?: HTMLElement | null;
  EmptyMatchListPlaceholder?: HTMLElement | null;
  MatchListItemTemplate?: HTMLElement | null;
  Export?: HTMLElement | null;
  Import?: HTMLElement | null;
  ImportInner?: HTMLElement | null;
  TBAStatusMessage?: HTMLElement | null;
  TBAEventDropdown?: HTMLElement | null;
  TBAEventList?: HTMLElement | null;
  TBATeamDropdown?: HTMLElement | null;
  TBATeamList?: HTMLElement | null;
  ClearConfirmPanel?: HTMLElement | null;
} | null = null;

// this class manages the user interface and interactions
export class View {
  private model: Model;
  private whiteboard: Whiteboard;
  private qrimport: QRImport;
  private qrexport: QRExport;
  private tbaService: TBAService;
  private pdfExport: PDFExport;
  private currentExportMatch: Match | null = null;

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

    this.tbaService = new TBAService();
    this.pdfExport = new PDFExport();

    const initDOM = () => {
      B = {
        NewMatch: get("home-toolbar-new-btn") as HTMLElement | null,
        ImportMatch: get("home-toolbar-import-btn") as HTMLElement | null,
        TBAImport: get("home-toolbar-tba-btn") as HTMLElement | null,
        Clear: get("home-toolbar-clear-btn") as HTMLElement | null,
        CreateMatch: get("create-match-create-btn") as HTMLElement | null,
        CancelCreate: get("create-match-cancel-btn") as HTMLElement | null,
        Back: get("whiteboard-toolbar-back") as HTMLElement | null,
        ToggleView: get("whiteboard-toolbar-view-toggle") as HTMLElement | null,
        TBAImportBtn: get("tba-import-btn") as HTMLElement | null,
        TBACancel: get("tba-cancel-btn") as HTMLElement | null,
        ClearConfirmClear: get("clear-confirm-clear-btn") as HTMLElement | null,
        ClearConfirmCancel: get("clear-confirm-cancel-btn") as HTMLElement | null,
      };

      I = {
        MatchName: get("create-match-name") as HTMLInputElement | null,
        RedOne: get("create-match-red-1") as HTMLInputElement | null,
        RedTwo: get("create-match-red-2") as HTMLInputElement | null,
        RedThree: get("create-match-red-3") as HTMLInputElement | null,
        BlueOne: get("create-match-blue-1") as HTMLInputElement | null,
        BlueTwo: get("create-match-blue-2") as HTMLInputElement | null,
        BlueThree: get("create-match-blue-3") as HTMLInputElement | null,
        TBAApiKey: get("tba-api-key") as HTMLInputElement | null,
        TBAEventKey: get("tba-event-key") as HTMLInputElement | null,
        TBATeamNumber: get("tba-team-number") as HTMLInputElement | null,
        TBAEventSearch: get("tba-event-search") as HTMLInputElement | null,
        TBATeamSearch: get("tba-team-search") as HTMLInputElement | null,
      };

      E = {
        Home: get("home-container") as HTMLElement | null,
        Whiteboard: get("whiteboard-container") as HTMLElement | null,
        MatchList: get("home-match-list") as HTMLElement | null,
        CreateMatchPanel: get("create-match-container") as HTMLElement | null,
        TBAImportPanel: get("tba-import-container") as HTMLElement | null,
        EmptyMatchListPlaceholder: get(
          "home-match-list-empty-placeholder",
        ) as HTMLElement | null,
        MatchListItemTemplate: get(
          "home-match-list-item-template",
        ) as HTMLElement | null,
        Export: get("qr-export-container") as HTMLElement | null,
        Import: get("qr-import-container") as HTMLElement | null,
        ImportInner: get("qr-import-inner-container") as HTMLElement | null,
        TBAStatusMessage: get("tba-status-message") as HTMLElement | null,
        TBAEventDropdown: get("tba-event-dropdown") as HTMLElement | null,
        TBAEventList: get("tba-event-list") as HTMLElement | null,
        TBATeamDropdown: get("tba-team-dropdown") as HTMLElement | null,
        TBATeamList: get("tba-team-list") as HTMLElement | null,
        ClearConfirmPanel: get("clear-confirm-container") as HTMLElement | null,
      };

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
        {
          el: B?.TBAImport,
          id: "home-toolbar-tba-btn",
          evt: "click",
          fn: (e: Event) => this.onClickTBAImport(e),
        },
        {
          el: B?.TBAImportBtn,
          id: "tba-import-btn",
          evt: "click",
          fn: (e: Event) => this.onClickTBAImportSubmit(e),
        },
        {
          el: B?.TBACancel,
          id: "tba-cancel-btn",
          evt: "click",
          fn: (e: Event) => this.onClickTBACancel(e),
        },
      ];

      for (const h of trackedHandlers) {
        if (h.el) {
          console.debug(`View: attaching '${h.evt}' handler to #${h.id}`);
          try {
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
            this.show(E.ClearConfirmPanel);
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
        console.warn(
          "Missing element: home-toolbar-clear-btn (no clear handler attached here)",
        );
      }

      // Clear confirmation modal handlers
      const clearConfirmClear = B?.ClearConfirmClear;
      if (clearConfirmClear) {
        console.debug(
          "View: attaching 'click' handler to #clear-confirm-clear-btn",
        );
        try {
          clearConfirmClear.addEventListener("click", (e) => {
            CLEAR();
            location.reload();
          });
          console.debug(
            "View: attached 'click' handler to #clear-confirm-clear-btn",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #clear-confirm-clear-btn:",
            err,
          );
        }
      }

      const clearConfirmCancel = B?.ClearConfirmCancel;
      if (clearConfirmCancel) {
        console.debug(
          "View: attaching 'click' handler to #clear-confirm-cancel-btn",
        );
        try {
          clearConfirmCancel.addEventListener("click", (e) => {
            this.hide(E.ClearConfirmPanel);
          });
          console.debug(
            "View: attached 'click' handler to #clear-confirm-cancel-btn",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #clear-confirm-cancel-btn:",
            err,
          );
        }
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

          const parseProgressFromText = (text: string | null) => {
            if (!text) return null;
            const m = text.match(/(\d+)\s*\/\s*(\d+)/);
            if (m) {
              return { cur: Number(m[1]), total: Number(m[2]) };
            }

            const n = text.match(/Received\s*(\d+)\s*\/\s*(\d+)/i);
            if (n) return { cur: Number(n[1]), total: Number(n[2]) };
            return null;
          };

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

              if (!info) {
                return;
              }
              const pct = Math.max(
                0,
                Math.min(100, Math.round((info.cur / info.total) * 100)),
              );

              const lastPct = lastProgressValues.get(barId) || 0;

              if (pct > lastPct || pct < lastPct - 10) {
                barEl.style.width = pct + "%";
                lastProgressValues.set(barId, pct);
              }

              if (pct >= 100) barEl.classList.add("complete");
              else barEl.classList.remove("complete");
            } catch (_err) {}
          };

          const observeStatusToProgress = (statusId: string, barId: string) => {
            const statusEl = get(statusId);
            if (!statusEl) return;

            updateProgressBarFromStatus(statusId, barId);

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
              const poll = window.setInterval(() => {
                updateProgressBarFromStatus(statusId, barId);
              }, 400);

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

          observeStatusToProgress("qr-export-status", "qr-export-progress-bar");
          observeStatusToProgress("qr-import-status", "qr-import-progress-bar");

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
            } catch (_err) {}
          };

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

              // Get bounding rectangles
              const mRect = mode.getBoundingClientRect();
              const lRect = left.getBoundingClientRect();
              const rRect = right.getBoundingClientRect();

              // Calculate required space and available space
              const leftWidth = lRect.width;
              const modeWidth = mRect.width;
              const rightWidth = rRect.width;
              const toolbarWidth = toolbar.getBoundingClientRect().width;
              const padding = 48; // Extra padding to prevent overlap, especially on iPads
              const requiredWidth =
                leftWidth + modeWidth + rightWidth + padding * 2;

              // Check if elements would overlap or are too close
              const shouldCollapse =
                mRect.right > rRect.left - padding ||
                mRect.left < lRect.right + padding ||
                requiredWidth > toolbarWidth;

              if (shouldCollapse) {
                // Apply collapsed layout using CSS class
                toolbar.classList.add("toolbar-collapsed");
              } else {
                // Remove collapsed layout
                toolbar.classList.remove("toolbar-collapsed");
              }
            } catch (_err) {}
          };

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

              origShow(e);

              ensureOverlayLayout();
              ensureToolbarArrangement();
            };
          } catch (_err) {}

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

          const exportOverlay = get("qr-export-container");
          if (exportOverlay) {
            exportOverlay.addEventListener("click", (e) => {
              try {
                const dots = get("qr-export-dots") as HTMLElement | null;
                if (dots) dots.style.display = "none";
              } catch (_err) {}

              try {
                this.onCancelExport(e as Event);
              } catch (_err) {}
            });

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

      // Add PDF export button listener
      const pdfExportBtn = get("qr-export-pdf-btn");
      if (pdfExportBtn) {
        console.debug("View: attaching 'click' handler to #qr-export-pdf-btn");
        pdfExportBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          await this.onClickExportPDF();
        });
        console.debug("View: attached 'click' handler to #qr-export-pdf-btn");
      } else {
        console.warn("Missing element: qr-export-pdf-btn");
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

        if (!document.getElementById("qr-import-close-btn")) {
          try {
            const closeBtn = document.createElement("button");
            closeBtn.id = "qr-import-close-btn";
            closeBtn.className =
              "text-slate-300 bg-transparent px-3 py-1 rounded-md hover:bg-slate-700";
            closeBtn.title = "Close import";
            closeBtn.setAttribute("aria-label", "Close import dialog");
            closeBtn.textContent = "Close";

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

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initDOM, { once: true });
    } else {
      initDOM();
    }

    this.initializeTBAService();
  }

  private async initializeTBAService(): Promise<void> {
    await this.tbaService.loadApiKey();
    console.log(
      "TBA Service initialized, has key:",
      this.tbaService.hasApiKey(),
    );
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
    item.children[1].children[0].textContent = `${redThree} ${redTwo} ${redOne}`;
    item.children[1].children[2].textContent = `${blueOne} ${blueTwo} ${blueThree}`;

    item.setAttribute("tabindex", "0");

    const kebab = item.children[2].children[0] as HTMLElement;
    const options = item.children[2].children[1] as HTMLElement;
    const duplicateOption = options.children[0] as HTMLElement;
    const exportOption = options.children[1] as HTMLElement;
    const deleteOption = options.children[2] as HTMLElement;

    options.addEventListener("click", (e) => e.stopPropagation());

    kebab.addEventListener("click", (e) => {
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
      e.stopPropagation();
      this.deleteMatch(item.id);
    });

    exportOption.addEventListener("click", (e) => {
      e.stopPropagation();
      const match = this.model.getMatch(id);
      if (match) {
        this.show(E.Export);
        setTimeout(() => {
          try {
            // Store the current match for PDF export
            this.currentExportMatch = match;

            // Show the start button and reset UI
            const startBtn = document.getElementById("qr-export-start-btn");
            if (startBtn) startBtn.style.display = "block";

            // Show the PDF export button
            const pdfBtn = document.getElementById("qr-export-pdf-btn");
            if (pdfBtn) pdfBtn.style.display = "block";

            this.qrexport.export(match, () => {
              // Callback when QR codes are ready - the start button is now functional
              console.log("QR export ready - waiting for user to click Start");
            });
          } catch (err) {
            console.error("View: failed to start QR export:", err);
            alert("Failed to start QR export. See console for details.");

            this.hide(E.Export);
          }
        }, 50);
      }

      this.hide(options);
      this.show(kebab);
    });

    duplicateOption.addEventListener("click", (e) => {
      e.stopPropagation();
      this.duplicateMatch(item.id);
      this.hide(options);
      this.show(kebab);
    });

    const openMatch = () => {
      const match = this.model.getMatch(id);
      if (match !== null) {
        this.loadWhiteboard(match);
      }
    };

    item.addEventListener("click", (e) => {
      const target = e.target as Node;

      if (kebab.contains(target) || options.contains(target)) return;
      openMatch();
    });
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMatch();
      }
    });

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

  public async duplicateMatch(id: string): Promise<void> {
    const match = this.model.getMatch(id);
    if (!match) return;

    const duplicatedMatchName = `Copy of ${match.matchName}`;
    const newId = await this.model.createNewMatch(
      duplicatedMatchName,
      match.redOne,
      match.redTwo,
      match.redThree,
      match.blueOne,
      match.blueTwo,
      match.blueThree,
    );

    const newMatch = this.model.getMatch(newId);
    if (!newMatch) return;

    newMatch.auto = JSON.parse(JSON.stringify(match.auto));
    newMatch.teleop = JSON.parse(JSON.stringify(match.teleop));
    newMatch.endgame = JSON.parse(JSON.stringify(match.endgame));

    await this.model.updateMatch(newId);

    this.createNewMatch(
      newId,
      duplicatedMatchName,
      match.redOne,
      match.redTwo,
      match.redThree,
      match.blueOne,
      match.blueTwo,
      match.blueThree,
    );
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
    this.hide(E.CreateMatchPanel);
  }

  private async onClickExportPDF(): Promise<void> {
    if (!this.currentExportMatch) {
      console.error("No match available for PDF export");
      alert("No match data available for export");
      return;
    }

    try {
      // Use the SAME encoding as live QR export
      const packet = this.currentExportMatch.getAsPacket();
      packet.splice(7, 1); // Remove the same element as QR export does
      const raw = JSON.stringify(packet);

      // Encode to base64 (same as QR export)
      const encoder = new TextEncoder();
      const bytes = encoder.encode(raw);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);

      // Split into chunks using the SAME system as QR export
      const MAX_CHUNK_PAYLOAD = 200;
      const HEADER_SIZE = 4;
      const TOTAL_CHUNKS_HEADER_SIZE = 4;

      const chunks: string[] = [];
      for (let i = 0; i < b64.length; i += MAX_CHUNK_PAYLOAD) {
        chunks.push(b64.slice(i, i + MAX_CHUNK_PAYLOAD));
      }

      const totalChunks = Math.max(1, chunks.length);

      // Create payloads with headers (same format as QR export)
      const payloads: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const payload =
          i.toString().padStart(HEADER_SIZE, "0") +
          totalChunks.toString().padStart(TOTAL_CHUNKS_HEADER_SIZE, "0") +
          (chunks[i] || "");
        payloads.push(payload);
      }

      // Show progress
      const pdfBtn = document.getElementById("qr-export-pdf-btn");
      const originalText = pdfBtn?.textContent || "Export as PDF";
      if (pdfBtn) pdfBtn.textContent = "Generating PDF...";

      // Generate PDF with large layout (one QR per page)
      await this.pdfExport.exportToPDFLarge(
        payloads,
        this.currentExportMatch.matchName,
      );

      // Reset button
      if (pdfBtn) pdfBtn.textContent = originalText;

      console.log("PDF export completed successfully");
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to generate PDF. Please try again.");

      // Reset button
      const pdfBtn = document.getElementById("qr-export-pdf-btn");
      if (pdfBtn) pdfBtn.textContent = "Export as PDF";
    }
  }

  private onClickBack(e: Event): void {
    this.whiteboard.setActive(false);
    this.show(E.Home);
    this.hide(E.Whiteboard);
  }

  private onClickToggleView(e: Event): void {
    this.whiteboard.toggleView();
  }

  private selectedEventName: string = "";

  private async onClickTBAImport(e: Event): Promise<void> {
    console.log("TBA Import clicked");
    this.show(E.TBAImportPanel);

    await this.tbaService.loadApiKey();

    if (I?.TBAApiKey && this.tbaService.hasApiKey()) {
      I.TBAApiKey.placeholder = "API Key (saved)";
    }

    // Enable team search from the start
    if (I?.TBATeamSearch) {
      I.TBATeamSearch.disabled = false;
      I.TBATeamSearch.placeholder = "Search teams...";
    }

    await this.loadTBAEvents();

    this.setupTBADropdownListeners();
  }

  private onClickTBACancel(e: Event): void {
    this.hide(E.TBAImportPanel);
    this.hide(E.TBAStatusMessage);
    this.hide(E.TBAEventDropdown);
    this.hide(E.TBATeamDropdown);
    this.selectedEventName = "";
    if (I?.TBAApiKey) I.TBAApiKey.value = "";
    if (I?.TBAEventKey) I.TBAEventKey.value = "";
    if (I?.TBATeamNumber) I.TBATeamNumber.value = "";
    if (I?.TBAEventSearch) I.TBAEventSearch.value = "";
    if (I?.TBATeamSearch) {
      I.TBATeamSearch.value = "";
      I.TBATeamSearch.disabled = false;
      I.TBATeamSearch.placeholder = "Search teams...";
    }
  }

  private async onClickTBAImportSubmit(e: Event): Promise<void> {
    if (!I?.TBAApiKey || !I?.TBAEventKey || !I?.TBATeamNumber) {
      this.showTBAStatus("Missing required fields", true);
      return;
    }

    const apiKey = I.TBAApiKey.value.trim();
    const eventKey = I.TBAEventKey.value.trim();
    const teamNumber = I.TBATeamNumber.value.trim();

    if (!eventKey || !teamNumber) {
      this.showTBAStatus("Please select event and team", true);
      return;
    }

    if (apiKey) {
      this.tbaService.setApiKey(apiKey);
      await SET("tbaApiKey", apiKey, (e) => {
        console.error("Failed to save TBA API key:", e);
      });
    } else if (!this.tbaService.hasApiKey()) {
      this.showTBAStatus("Please enter your TBA API key", true);
      return;
    }

    this.showTBAStatus("Fetching matches from The Blue Alliance...", false);

    try {
      const matches = await this.tbaService.fetchAndParseTeamMatches(
        teamNumber,
        eventKey,
      );

      if (matches.length === 0) {
        this.showTBAStatus(
          "No matches found for this team at this event",
          true,
        );
        return;
      }

      this.showTBAStatus(`Importing ${matches.length} matches...`, false);

      for (const match of matches) {
        const formattedMatchName = this.selectedEventName
          ? `${match.matchName} @ ${this.selectedEventName}`
          : match.matchName;

        const id = await this.model.createNewMatch(
          formattedMatchName,
          match.redTeams[2] || "",
          match.redTeams[1] || "",
          match.redTeams[0] || "",
          match.blueTeams[0] || "",
          match.blueTeams[1] || "",
          match.blueTeams[2] || "",
        );

        this.createNewMatch(
          id,
          formattedMatchName,
          match.redTeams[2] || "",
          match.redTeams[1] || "",
          match.redTeams[0] || "",
          match.blueTeams[0] || "",
          match.blueTeams[1] || "",
          match.blueTeams[2] || "",
        );
      }

      this.showTBAStatus(
        `Successfully imported ${matches.length} matches!`,
        false,
      );

      setTimeout(() => {
        this.onClickTBACancel(e);
      }, 1500);
    } catch (error) {
      console.error("TBA import error:", error);
      this.showTBAStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        true,
      );
    }
  }

  private showTBAStatus(message: string, isError: boolean): void {
    if (!E?.TBAStatusMessage) return;

    E.TBAStatusMessage.textContent = message;
    E.TBAStatusMessage.className = isError
      ? "w-full px-8 pb-4 text-center text-red-400"
      : "w-full px-8 pb-4 text-center text-slate-300";
    this.show(E.TBAStatusMessage);
  }

  private async loadTBAEvents(): Promise<void> {
    console.log(
      "Loading TBA events, has API key:",
      this.tbaService.hasApiKey(),
    );

    if (!this.tbaService.hasApiKey()) {
      console.error("No API key available");
      this.showTBAStatus("No API key available", true);
      return;
    }

    this.showTBAStatus("Loading events...", false);

    try {
      const currentYear = new Date().getFullYear();
      console.log("Fetching events for year:", currentYear);

      const yearsToFetch = [currentYear, currentYear - 1, currentYear - 2];
      const allEventsPromises = yearsToFetch.map((year) =>
        this.tbaService.fetchAndParseEvents(year),
      );

      const allEventsArrays = await Promise.all(allEventsPromises);
      const events = allEventsArrays.flat();

      console.log("Loaded events:", events.length);

      if (!E?.TBAEventList) return;

      E.TBAEventList.innerHTML = "";

      for (const event of events) {
        const item = document.createElement("div");
        item.className = "tba-dropdown-item";
        item.dataset.eventKey = event.key;

        const name = document.createElement("div");
        name.className = "tba-event-name";
        name.textContent = event.name;

        const details = document.createElement("div");
        details.className = "tba-event-details";
        details.textContent = `${event.location} • ${event.dateRange} • ${event.year}`;

        item.appendChild(name);
        item.appendChild(details);

        item.addEventListener("click", () =>
          this.selectTBAEvent(event.key, event.name),
        );

        E.TBAEventList.appendChild(item);
      }

      this.hide(E.TBAStatusMessage);
    } catch (error) {
      console.error("Failed to load events:", error);
      this.showTBAStatus("Failed to load events. Check API key.", true);
    }
  }

  private async selectTBAEvent(
    eventKey: string,
    eventName: string,
  ): Promise<void> {
    console.log("Event selected:", eventKey, eventName);

    if (!I?.TBAEventKey || !I?.TBAEventSearch || !I?.TBATeamSearch) {
      console.error("Missing input elements");
      return;
    }

    this.selectedEventName = eventName;

    I.TBAEventKey.value = eventKey;
    I.TBAEventSearch.value = eventName;

    this.hide(E.TBAEventDropdown);

    I.TBATeamSearch.disabled = false;
    I.TBATeamSearch.placeholder = "Search teams...";

    console.log("Loading teams for event:", eventKey);

    await this.loadTBATeamsForEvent(eventKey);
  }

  private async loadTBATeamsForEvent(eventKey: string): Promise<void> {
    console.log("loadTBATeamsForEvent called with:", eventKey);
    this.showTBAStatus("Loading teams...", false);

    try {
      console.log("Fetching teams from TBA...");
      const teams = await this.tbaService.fetchTeamsAtEvent(eventKey);
      console.log("Teams loaded:", teams.length, teams);

      if (!E?.TBATeamList) {
        console.error("TBATeamList element not found");
        return;
      }

      E.TBATeamList.innerHTML = "";

      const sortedTeams = teams.sort((a, b) => parseInt(a) - parseInt(b));
      console.log("Sorted teams:", sortedTeams);

      for (const team of sortedTeams) {
        const item = document.createElement("div");
        item.className = "tba-team-item";
        item.dataset.teamNumber = team;
        item.textContent = `Team ${team}`;

        item.addEventListener("click", () => this.selectTBATeam(team));

        E.TBATeamList.appendChild(item);
      }

      console.log("Team items added to dropdown");
      this.hide(E.TBAStatusMessage);

      if (sortedTeams.length > 0) {
        this.show(E.TBATeamDropdown);
      }
    } catch (error) {
      console.error("Failed to load teams:", error);
      this.showTBAStatus("Failed to load teams for this event.", true);
    }
  }

  private selectTBATeam(teamNumber: string): void {
    if (!I?.TBATeamNumber || !I?.TBATeamSearch) return;

    I.TBATeamNumber.value = teamNumber;
    I.TBATeamSearch.value = `Team ${teamNumber}`;

    this.hide(E.TBATeamDropdown);
  }

  private setupTBADropdownListeners(): void {
    if (I?.TBAEventSearch) {
      I.TBAEventSearch.addEventListener("input", (e) => {
        const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
        this.filterTBAEvents(searchTerm);

        if (searchTerm.length > 0) {
          this.show(E.TBAEventDropdown);
        } else {
          this.hide(E.TBAEventDropdown);
        }
      });

      I.TBAEventSearch.addEventListener("focus", () => {
        if (E?.TBAEventList?.children.length) {
          this.show(E.TBAEventDropdown);
        }
      });
    }

    if (I?.TBATeamSearch) {
      I.TBATeamSearch.addEventListener("input", async (e) => {
        const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();

        // If team search has content and no event is selected, filter events by team
        if (
          searchTerm.length > 0 &&
          (!I?.TBAEventKey || !I.TBAEventKey.value)
        ) {
          await this.filterEventsByTeam(searchTerm);
        } else {
          // Otherwise, filter teams normally
          this.filterTBATeams(searchTerm);
        }

        if (searchTerm.length > 0) {
          // Show team dropdown if event is selected, otherwise show event dropdown
          if (I?.TBAEventKey && I.TBAEventKey.value) {
            this.show(E.TBATeamDropdown);
          } else {
            this.show(E.TBAEventDropdown);
          }
        } else {
          this.hide(E.TBATeamDropdown);
          this.hide(E.TBAEventDropdown);
        }
      });

      I.TBATeamSearch.addEventListener("focus", () => {
        if (E?.TBATeamList?.children.length) {
          this.show(E.TBATeamDropdown);
        }
      });
    }

    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest("#tba-event-search") &&
        !target.closest("#tba-event-dropdown")
      ) {
        this.hide(E.TBAEventDropdown);
      }
      if (
        !target.closest("#tba-team-search") &&
        !target.closest("#tba-team-dropdown")
      ) {
        this.hide(E.TBATeamDropdown);
      }
    });
  }

  private filterTBAEvents(searchTerm: string): void {
    if (!E?.TBAEventList) return;

    const items = E.TBAEventList.querySelectorAll(".tba-dropdown-item");
    let visibleCount = 0;

    items.forEach((item) => {
      const name =
        item.querySelector(".tba-event-name")?.textContent?.toLowerCase() || "";
      const details =
        item.querySelector(".tba-event-details")?.textContent?.toLowerCase() ||
        "";
      const eventKey =
        (item as HTMLElement).dataset.eventKey?.toLowerCase() || "";

      if (
        name.includes(searchTerm) ||
        details.includes(searchTerm) ||
        eventKey.includes(searchTerm)
      ) {
        (item as HTMLElement).style.display = "";
        visibleCount++;
      } else {
        (item as HTMLElement).style.display = "none";
      }
    });

    if (visibleCount > 0) {
      this.show(E.TBAEventDropdown);
    } else {
      this.hide(E.TBAEventDropdown);
    }
  }

  private filterTBATeams(searchTerm: string): void {
    if (!E?.TBATeamList) return;

    const items = E.TBATeamList.querySelectorAll(".tba-team-item");
    let visibleCount = 0;

    items.forEach((item) => {
      const teamNumber = (item as HTMLElement).dataset.teamNumber || "";

      if (
        teamNumber.includes(searchTerm) ||
        item.textContent?.toLowerCase().includes(searchTerm)
      ) {
        (item as HTMLElement).style.display = "";
        visibleCount++;
      } else {
        (item as HTMLElement).style.display = "none";
      }
    });

    if (visibleCount > 0) {
      this.show(E.TBATeamDropdown);
    } else {
      this.hide(E.TBATeamDropdown);
    }
  }

  private async filterEventsByTeam(searchTerm: string): Promise<void> {
    if (!E?.TBAEventList) return;

    // Extract team number from search term (remove "team" prefix if present)
    const teamNumber = searchTerm.replace(/^team\s*/i, "").trim();

    if (!teamNumber || !this.tbaService.hasApiKey()) {
      this.filterTBAEvents(searchTerm);
      return;
    }

    this.showTBAStatus("Searching for events with this team...", false);

    try {
      // Fetch team's events
      const currentYear = new Date().getFullYear();
      const yearsToFetch = [currentYear, currentYear - 1, currentYear - 2];

      const allTeamEventsPromises = yearsToFetch.map((year) =>
        this.tbaService.getTeamEvents(teamNumber, year).catch(() => []),
      );

      const allTeamEventsArrays = await Promise.all(allTeamEventsPromises);
      const teamEventKeys = new Set(
        allTeamEventsArrays.flat().map((e) => e.key),
      );

      // Filter the event list to show only events this team is attending
      const items = E.TBAEventList.querySelectorAll(".tba-dropdown-item");
      let visibleCount = 0;

      items.forEach((item) => {
        const eventKey = (item as HTMLElement).dataset.eventKey || "";

        if (teamEventKeys.has(eventKey)) {
          (item as HTMLElement).style.display = "";
          visibleCount++;
        } else {
          (item as HTMLElement).style.display = "none";
        }
      });

      this.hide(E.TBAStatusMessage);

      if (visibleCount > 0) {
        this.show(E.TBAEventDropdown);
      } else {
        this.hide(E.TBAEventDropdown);
        this.showTBAStatus(`No events found for team ${teamNumber}`, true);
      }
    } catch (error) {
      console.error("Failed to filter events by team:", error);
      this.showTBAStatus("Failed to search for team events", true);
      // Fallback to regular event filtering
      this.filterTBAEvents(searchTerm);
    }
  }

  private async onClickImportMatch(e: Event): Promise<void> {
    const videoEl = get("qr-import-video") as HTMLVideoElement | null;

    try {
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

        this.hide(E.Import);
      });
    } catch (err) {
      console.warn("View: qrimport.start threw an error:", err);
    }

    if (!videoEl) {
      console.warn(
        "View: no video element to verify camera start; not showing import overlay",
      );
      return;
    }

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
      this.show(E.Import);
    } else {
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

    const status = get("qr-export-status");
    if (status) status.textContent = "";

    // Hide PDF export button and clear current match
    const pdfBtn = document.getElementById("qr-export-pdf-btn");
    if (pdfBtn) pdfBtn.style.display = "none";
    this.currentExportMatch = null;
  }

  private onCancelImport(e: Event): void {
    try {
      this.qrimport.stop();
    } catch (err) {
      console.warn("View: error stopping QR import scanner:", err);
    }

    this.hide(E.Import);

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

    const exportStatus = get("qr-export-status");
    if (exportStatus) exportStatus.textContent = "";
    const importStatus = get("qr-import-status");
    if (importStatus) importStatus.textContent = "";
  }
}
