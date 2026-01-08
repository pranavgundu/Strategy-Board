import { Model } from "./model.ts";
import { Whiteboard, updateCanvasSize } from "./whiteboard.ts";
import { Match } from "./match.ts";
import { QRImport, QRExport } from "./qr.ts";
import { CLEAR, SET, GET } from "./db.ts";
import { ContributorsService } from "./contributors.ts";
import { uploadMatch, downloadMatch } from "./cloud.ts";
import {
  fuzzySearchItems,
  extractEventItems,
  extractTeamItems,
  type SearchableItem,
} from "./search.ts";
import { StatboticsService, type StatboticsMatchData } from "./statbotics.ts";

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;
  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), wait);
  };
}

const get = (id: string): HTMLElement | null => document.getElementById(id);

let B: {
  NewMatch?: HTMLElement | null;
  ImportMatch?: HTMLElement | null;
  ImportLink?: HTMLElement | null;
  TBAImport?: HTMLElement | null;
  Clear?: HTMLElement | null;
  CreateMatch?: HTMLElement | null;
  CancelCreate?: HTMLElement | null;
  Back?: HTMLElement | null;
  ToggleView?: HTMLElement | null;
  TBAImportBtn?: HTMLElement | null;
  TBACancel?: HTMLElement | null;
  TBAAllMatchesBtn?: HTMLElement | null;
  ClearConfirmClear?: HTMLElement | null;
  ClearConfirmCancel?: HTMLElement | null;
  ContributorsLink?: HTMLElement | null;
  ContributorsClose?: HTMLElement | null;
  ContributorsRetry?: HTMLElement | null;
  LinkImportImport?: HTMLElement | null;
  LinkImportCancel?: HTMLElement | null;
  ExportPDFBtn?: HTMLElement | null;
  ShareSuccessClose?: HTMLElement | null;
  ShareCodeCopy?: HTMLElement | null;
  ShareLinkCopy?: HTMLElement | null;
  TeamNumberSave?: HTMLElement | null;
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
  LinkImportCode?: HTMLInputElement | null;
  TeamNumber?: HTMLInputElement | null;
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
  ContributorsPanel?: HTMLElement | null;
  ContributorsLoading?: HTMLElement | null;
  ContributorsError?: HTMLElement | null;
  ContributorsList?: HTMLElement | null;
  ContributorsGrid?: HTMLElement | null;
  TeamsGrid?: HTMLElement | null;
  LastCommitInfo?: HTMLElement | null;
  LinkImportPanel?: HTMLElement | null;
  LinkImportStatus?: HTMLElement | null;
  ShareSuccessPanel?: HTMLElement | null;
  ShareCodeDisplay?: HTMLElement | null;
  ShareLinkDisplay?: HTMLInputElement | null;
} | null = null;

export class View {
  private model: Model;
  private whiteboard: Whiteboard;
  private qrimport: QRImport;
  private qrexport: QRExport;
  private tbaService: any = null; // Lazy-loaded
  private pdfExport: any = null; // Lazy-loaded
  private contributorsService: ContributorsService;
  private statboticsService: StatboticsService;
  private currentExportMatch: Match | null = null;
  private contributorTeams: string[] = [];
  private currentStatboticsData: StatboticsMatchData | null = null;

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

    // tbaService and pdfExport are lazy-loaded when needed
    this.contributorsService = new ContributorsService();
    this.statboticsService = new StatboticsService();

    const initDOM = () => {
      B = {
        NewMatch: get("home-toolbar-new-btn") as HTMLElement | null,
        ImportMatch: get("home-toolbar-import-btn") as HTMLElement | null,
        ImportLink: get("home-toolbar-import-link-btn") as HTMLElement | null,
        TBAImport: get("home-toolbar-tba-btn") as HTMLElement | null,
        Clear: get("home-toolbar-clear-btn") as HTMLElement | null,
        CreateMatch: get("create-match-create-btn") as HTMLElement | null,
        CancelCreate: get("create-match-cancel-btn") as HTMLElement | null,
        Back: get("whiteboard-toolbar-back") as HTMLElement | null,
        ToggleView: get("whiteboard-toolbar-view-toggle") as HTMLElement | null,
        TBAImportBtn: get("tba-import-btn") as HTMLElement | null,
        TBACancel: get("tba-cancel-btn") as HTMLElement | null,
        TBAAllMatchesBtn: get("tba-all-matches-btn") as HTMLElement | null,
        ClearConfirmClear: get("clear-confirm-clear-btn") as HTMLElement | null,
        ClearConfirmCancel: get(
          "clear-confirm-cancel-btn",
        ) as HTMLElement | null,
        ContributorsLink: get("contributors-link-btn") as HTMLElement | null,
        ContributorsClose: get("contributors-close-btn") as HTMLElement | null,
        ContributorsRetry: get("contributors-retry-btn") as HTMLElement | null,
        LinkImportImport: get("link-import-import-btn") as HTMLElement | null,
        LinkImportCancel: get("link-import-cancel-btn") as HTMLElement | null,
        ExportPDFBtn: get("qr-export-pdf-btn") as HTMLElement | null,
        ShareSuccessClose: get("share-success-close-btn") as HTMLElement | null,
        ShareCodeCopy: get("share-code-copy-btn") as HTMLElement | null,
        ShareLinkCopy: get("share-link-copy-btn") as HTMLElement | null,
        TeamNumberSave: get("team-number-save-btn") as HTMLElement | null,
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
        LinkImportCode: get("link-import-code") as HTMLInputElement | null,
        TeamNumber: get("team-number-input") as HTMLInputElement | null,
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
        ContributorsPanel: get("contributors-container") as HTMLElement | null,
        ContributorsLoading: get("contributors-loading") as HTMLElement | null,
        ContributorsError: get("contributors-error") as HTMLElement | null,
        ContributorsList: get("contributors-list") as HTMLElement | null,
        ContributorsGrid: get("contributors-grid") as HTMLElement | null,
        TeamsGrid: get("teams-grid") as HTMLElement | null,
        LastCommitInfo: get("last-commit-info") as HTMLElement | null,
        LinkImportPanel: get("link-import-container") as HTMLElement | null,
        LinkImportStatus: get("link-import-status") as HTMLElement | null,
        ShareSuccessPanel: get("share-success-container") as HTMLElement | null,
        ShareCodeDisplay: get("share-code-display") as HTMLElement | null,
        ShareLinkDisplay: get("share-link-display") as HTMLInputElement | null,
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
          el: B?.ImportLink,
          id: "home-toolbar-import-link-btn",
          evt: "click",
          fn: (e: Event) => this.onClickImportLink(e),
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
        {
          el: B?.TBAAllMatchesBtn,
          id: "tba-all-matches-btn",
          evt: "click",
          fn: (e: Event) => this.onClickTBAAllMatches(e),
        },
        {
          el: B?.LinkImportImport,
          id: "link-import-import-btn",
          evt: "click",
          fn: (e: Event) => this.onClickLinkImportSubmit(e),
        },
        {
          el: B?.LinkImportCancel,
          id: "link-import-cancel-btn",
          evt: "click",
          fn: (e: Event) => this.onClickLinkImportCancel(e),
        },
        {
          el: B?.ExportPDFBtn,
          id: "qr-export-pdf-btn",
          evt: "click",
          fn: (e: Event) => this.onClickExportPDFFromModal(e),
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

      // Contributors link button
      const contributorsLinkBtn = B?.ContributorsLink;
      if (contributorsLinkBtn) {
        console.debug(
          "View: attaching 'click' handler to #contributors-link-btn",
        );
        try {
          contributorsLinkBtn.addEventListener("click", (e) => {
            e.preventDefault();
            this.showContributors();
          });
          console.debug(
            "View: attached 'click' handler to #contributors-link-btn",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #contributors-link-btn:",
            err,
          );
        }
      }

      // Contributors close button
      const contributorsCloseBtn = B?.ContributorsClose;
      if (contributorsCloseBtn) {
        console.debug(
          "View: attaching 'click' handler to #contributors-close-btn",
        );
        try {
          contributorsCloseBtn.addEventListener("click", (e) => {
            this.hide(E.ContributorsPanel);
          });
          console.debug(
            "View: attached 'click' handler to #contributors-close-btn",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #contributors-close-btn:",
            err,
          );
        }
      }

      // Contributors retry button
      const contributorsRetryBtn = B?.ContributorsRetry;
      if (contributorsRetryBtn) {
        console.debug(
          "View: attaching 'click' handler to #contributors-retry-btn",
        );
        try {
          contributorsRetryBtn.addEventListener("click", (e) => {
            this.loadContributors();
          });
          console.debug(
            "View: attached 'click' handler to #contributors-retry-btn",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #contributors-retry-btn:",
            err,
          );
        }
      }

      // Contributors panel backdrop click
      const contributorsPanel = E?.ContributorsPanel;
      if (contributorsPanel) {
        console.debug(
          "View: attaching 'click' handler to #contributors-container",
        );
        try {
          contributorsPanel.addEventListener("click", (e) => {
            if (e.target === contributorsPanel) {
              this.hide(E.ContributorsPanel);
            }
          });
          console.debug(
            "View: attached 'click' handler to #contributors-container",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #contributors-container:",
            err,
          );
        }
      }

      // Link import panel backdrop click
      const linkImportPanel = E?.LinkImportPanel;
      if (linkImportPanel) {
        console.debug(
          "View: attaching 'click' handler to #link-import-container",
        );
        try {
          linkImportPanel.addEventListener("click", (e) => {
            if (e.target === linkImportPanel) {
              this.hide(E.LinkImportPanel);
              this.hide(E.LinkImportStatus);
              if (I?.LinkImportCode) {
                I.LinkImportCode.value = "";
              }
            }
          });
          console.debug(
            "View: attached 'click' handler to #link-import-container",
          );
        } catch (err) {
          console.error(
            "View: failed to attach 'click' handler to #link-import-container:",
            err,
          );
        }
      }

      // Share success panel event listeners
      const shareSuccessClose = B?.ShareSuccessClose;
      if (shareSuccessClose) {
        shareSuccessClose.addEventListener("click", () => {
          this.hide(E.ShareSuccessPanel);
        });
      }

      const shareSuccessPanel = E?.ShareSuccessPanel;
      if (shareSuccessPanel) {
        shareSuccessPanel.addEventListener("click", (e) => {
          if (e.target === shareSuccessPanel) {
            this.hide(E.ShareSuccessPanel);
          }
        });
      }

      const shareCodeCopy = B?.ShareCodeCopy;
      if (shareCodeCopy) {
        shareCodeCopy.addEventListener("click", async () => {
          const code = E.ShareCodeDisplay?.textContent;
          if (code) {
            try {
              await navigator.clipboard.writeText(code);
              const btn = shareCodeCopy as HTMLElement;
              const originalHTML = btn.innerHTML;
              btn.innerHTML = '<i class="fas fa-check"></i>';
              setTimeout(() => {
                btn.innerHTML = originalHTML;
              }, 1500);
            } catch (err) {
              console.error("Failed to copy code:", err);
            }
          }
        });
      }

      const shareLinkCopy = B?.ShareLinkCopy;
      if (shareLinkCopy) {
        shareLinkCopy.addEventListener("click", async () => {
          const link = E.ShareLinkDisplay?.value;
          if (link) {
            try {
              await navigator.clipboard.writeText(link);
              const btn = shareLinkCopy as HTMLElement;
              const originalHTML = btn.innerHTML;
              btn.innerHTML = '<i class="fas fa-check"></i>';
              setTimeout(() => {
                btn.innerHTML = originalHTML;
              }, 1500);
            } catch (err) {
              console.error("Failed to copy link:", err);
            }
          }
        });
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

            const overlayId =
              statusId === "qr-export-status"
                ? "qr-export-container"
                : "qr-import-container";
            const overlay = get(overlayId);

            try {
              const mo = new MutationObserver(() => {
                updateProgressBarFromStatus(statusId, barId);
              });
              mo.observe(statusEl, {
                childList: true,
                characterData: true,
                subtree: true,
              });

              // Disconnect observer when overlay closes to prevent memory leak
              if (overlay) {
                const cleanup = () => {
                  mo.disconnect();
                  overlay.removeEventListener("click", cleanup);
                };
                overlay.addEventListener("click", cleanup);
              }
            } catch (_err) {
              // Fallback to polling if MutationObserver fails
              const poll = window.setInterval(() => {
                updateProgressBarFromStatus(statusId, barId);
              }, 400);

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

              const mRect = mode.getBoundingClientRect();
              const lRect = left.getBoundingClientRect();
              const rRect = right.getBoundingClientRect();

              const leftWidth = lRect.width;
              const modeWidth = mRect.width;
              const rightWidth = rRect.width;
              const toolbarWidth = toolbar.getBoundingClientRect().width;
              const padding = 48;
              const requiredWidth =
                leftWidth + modeWidth + rightWidth + padding * 2;

              toolbar.classList.remove(
                "toolbar-collapsed",
                "toolbar-condensed",
                "toolbar-ultra",
              );

              const slack = toolbarWidth - requiredWidth; // positive = space remaining
              if (slack < 0) {
                if (slack < -120) {
                  toolbar.classList.add("toolbar-ultra");
                } else {
                  toolbar.classList.add("toolbar-condensed");
                }
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
    this.initializeLastCommit();
    this.initializeContributorTeams();
    this.initializeTeamNumberPopup();
    this.checkShareCodeFromUrl();
  }

  private async initializeContributorTeams(): Promise<void> {
    try {
      this.contributorTeams = await this.contributorsService.fetchTeams();
      // Re-render match list to apply team animations now that teams are loaded
      this.refreshMatchList();
    } catch (error) {
      console.error("Failed to load contributor teams:", error);
    }
  }

  private refreshMatchList(): void {
    if (!E.MatchList) return;
    // Clear and re-render all matches with updated team animations
    E.MatchList.innerHTML = "";
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
    // Show empty placeholder if no matches
    if (this.model.matches.length === 0) {
      this.show(E.EmptyMatchListPlaceholder);
    } else {
      this.hide(E.EmptyMatchListPlaceholder);
    }
  }

  private async initializeTBAService(): Promise<void> {
    // Lazy-load TBA service when needed (saves bundle size on initial load)
    if (!this.tbaService) {
      const { TBAService } = await import("./tba.ts");
      this.tbaService = new TBAService();
    }
    await this.tbaService.loadApiKey();
  }

  private async initializeLastCommit(): Promise<void> {
    if (!E?.LastCommitInfo) return;

    try {
      const commit = await this.contributorsService.fetchLastCommit();
      if (commit) {
        const date = new Date(commit.date);
        const timeAgo = this.getTimeAgo(date);

        E.LastCommitInfo.innerHTML = `
          <a href="${commit.url}" target="_blank" rel="noopener noreferrer"
             class="hover:text-slate-300 transition-colors flex items-center gap-2"
             title="latest commit: ${commit.message}">
            <span class="font-mono">${commit.sha}</span>
            <span>•</span>
            <span>${timeAgo}</span>
          </a>
        `;
        E.LastCommitInfo.classList.remove("hidden");
        E.LastCommitInfo.querySelector("span")?.classList.remove("opacity-0");
      }
    } catch (error) {
      console.error("Error fetching last commit:", error);
    }
  }

  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
      }
    }

    return "just now";
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

  private async loadWhiteboard(match: Match): Promise<void> {
    this.whiteboard.setMatch(match);
    this.whiteboard.setActive(true);
    this.show(E.Whiteboard);
    this.hide(E.Home);
    updateCanvasSize();

    // Show or hide Statbotics tab based on whether match is from TBA
    const statboticsTab = document.getElementById(
      "whiteboard-toolbar-mode-statbotics",
    );
    if (match.isFromTBA()) {
      statboticsTab?.classList.remove("hidden");
      // Load Statbotics data in the background
      this.loadStatboticsData(match);
    } else {
      statboticsTab?.classList.add("hidden");
    }
  }

  private async loadStatboticsData(match: Match): Promise<void> {
    if (!match.tbaEventKey || !match.tbaMatchKey || !match.tbaYear) {
      // Show empty state
      const emptyState = document.getElementById("statbotics-empty-state");
      const dataContainer = document.getElementById(
        "statbotics-data-container",
      );
      const loadingState = document.getElementById("statbotics-loading-state");
      emptyState?.classList.remove("hidden");
      dataContainer?.classList.add("hidden");
      loadingState?.classList.add("hidden");
      return;
    }

    // Show loading state
    const emptyState = document.getElementById("statbotics-empty-state");
    const dataContainer = document.getElementById("statbotics-data-container");
    const loadingState = document.getElementById("statbotics-loading-state");
    emptyState?.classList.add("hidden");
    dataContainer?.classList.add("hidden");
    loadingState?.classList.remove("hidden");
    loadingState?.classList.add("flex");

    // Setup modal handlers
    this.setupEPAModalHandlers();

    try {
      // Prepare team data
      const redTeams = [
        parseInt(match.redThree),
        parseInt(match.redTwo),
        parseInt(match.redOne),
      ].filter((t) => !isNaN(t));

      const blueTeams = [
        parseInt(match.blueOne),
        parseInt(match.blueTwo),
        parseInt(match.blueThree),
      ].filter((t) => !isNaN(t));

      const matchData = await this.statboticsService.getMatchData(
        match.tbaMatchKey,
        redTeams,
        blueTeams,
        match.tbaYear,
      );

      this.currentStatboticsData = matchData;

      // Hide loading, show data
      loadingState?.classList.add("hidden");
      loadingState?.classList.remove("flex");
      dataContainer?.classList.remove("hidden");

      // Update win probabilities and bars
      const redWinProb = document.getElementById("statbotics-red-win-prob");
      const blueWinProb = document.getElementById("statbotics-blue-win-prob");
      const redBar = document.getElementById("statbotics-prob-bar-red");
      const blueBar = document.getElementById("statbotics-prob-bar-blue");

      if (redWinProb)
        redWinProb.textContent = `${(matchData.redWinProbability * 100).toFixed(0)}%`;
      if (blueWinProb)
        blueWinProb.textContent = `${(matchData.blueWinProbability * 100).toFixed(0)}%`;
      if (redBar)
        redBar.style.width = `${(matchData.redWinProbability * 100).toFixed(1)}%`;
      if (blueBar)
        blueBar.style.width = `${(matchData.blueWinProbability * 100).toFixed(1)}%`;

      // Update match result
      const matchResult = document.getElementById("statbotics-match-result");
      if (matchData.hasScores && matchResult) {
        let resultText = "";
        if (matchData.redScore && matchData.blueScore) {
          if (matchData.redScore > matchData.blueScore) {
            resultText = `Red Wins (${matchData.redScore} - ${matchData.blueScore})`;
            matchResult.className =
              "text-xl md:text-2xl font-bold text-red-400";
          } else if (matchData.blueScore > matchData.redScore) {
            resultText = `Blue Wins (${matchData.redScore} - ${matchData.blueScore})`;
            matchResult.className =
              "text-xl md:text-2xl font-bold text-blue-400";
          } else {
            resultText = `Tie (${matchData.redScore} - ${matchData.blueScore})`;
            matchResult.className =
              "text-xl md:text-2xl font-bold text-zinc-300";
          }
        } else {
          resultText = "Match Complete";
          matchResult.className = "text-xl md:text-2xl font-bold text-zinc-300";
        }
        matchResult.textContent = resultText;
      } else if (matchResult) {
        matchResult.textContent = "Not Played";
        matchResult.className = "text-xl md:text-2xl font-bold text-zinc-300";
      }

      // Update Red Alliance EPAs
      const redTeamsDisplay = [
        parseInt(match.redOne),
        parseInt(match.redTwo),
        parseInt(match.redThree),
      ];
      redTeamsDisplay.forEach((team, index) => {
        const teamEl = document.getElementById(
          `statbotics-red-${index + 1}-team`,
        );
        const epaEl = document.getElementById(
          `statbotics-red-${index + 1}-epa`,
        );

        if (teamEl) teamEl.textContent = team.toString();
        if (epaEl) {
          const epa = matchData.redTeamEPAs.get(team);
          epaEl.textContent = epa !== undefined ? epa.toFixed(1) : "--";
        }
      });

      // Update Blue Alliance EPAs
      const blueTeamsDisplay = [
        parseInt(match.blueOne),
        parseInt(match.blueTwo),
        parseInt(match.blueThree),
      ];
      blueTeamsDisplay.forEach((team, index) => {
        const teamEl = document.getElementById(
          `statbotics-blue-${index + 1}-team`,
        );
        const epaEl = document.getElementById(
          `statbotics-blue-${index + 1}-epa`,
        );

        if (teamEl) teamEl.textContent = team.toString();
        if (epaEl) {
          const epa = matchData.blueTeamEPAs.get(team);
          epaEl.textContent = epa !== undefined ? epa.toFixed(1) : "--";
        }
      });

      // Setup click handlers for EPA cards
      this.setupEPACardClickHandlers(matchData.teamDetails, matchData.yearData);
    } catch (error) {
      console.error("Failed to load Statbotics data:", error);
      const matchResult = document.getElementById("statbotics-match-result");
      if (matchResult) {
        matchResult.textContent = "Error loading data";
        matchResult.className = "text-xl md:text-2xl font-bold text-red-400";
      }
    }
  }

  private getEPAColorClass(
    value: number,
    percentiles:
      | { p99: number; p90: number; p75: number; p25: number }
      | undefined,
  ): string {
    if (!percentiles) return "text-zinc-300";

    // Compare value against global year percentiles (like Statbotics does)
    // Top 1% - Blue
    if (value >= percentiles.p99) {
      return "text-blue-400";
    }
    // Top 10% - Dark Green
    else if (value >= percentiles.p90) {
      return "text-green-500";
    }
    // Top 25% - Light Green
    else if (value >= percentiles.p75) {
      return "text-green-300";
    }
    // Bottom 25% - Red
    else if (value < percentiles.p25) {
      return "text-red-400";
    }
    // Middle 50% - No color/default
    return "text-zinc-300";
  }

  private setupEPAModalHandlers(): void {
    const modal = document.getElementById("epa-details-modal");
    const closeBtn = document.getElementById("epa-modal-close");

    // Close modal on button click
    closeBtn?.addEventListener("click", () => {
      modal?.classList.add("hidden");
    });

    // Close modal on backdrop click
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal?.classList.contains("hidden")) {
        modal.classList.add("hidden");
      }
    });
  }

  private setupEPACardClickHandlers(
    teamDetails: Map<number, any>,
    yearData: any,
  ): void {
    const allCards = document.querySelectorAll("[data-team-index]");

    allCards.forEach((card) => {
      const teamIndex = card.getAttribute("data-team-index");
      if (!teamIndex) return;

      // Remove existing listeners by cloning
      const newCard = card.cloneNode(true);
      card.parentNode?.replaceChild(newCard, card);

      newCard.addEventListener("click", () => {
        const [alliance, position] = teamIndex.split("-");
        const teamEl = document.getElementById(
          `statbotics-${alliance}-${position}-team`,
        );
        const teamNumber = parseInt(teamEl?.textContent || "0");

        if (teamNumber && teamDetails.has(teamNumber)) {
          this.showEPADetailsModal(teamDetails.get(teamNumber), yearData);
        }
      });
    });
  }

  private showEPADetailsModal(teamData: any, yearData: any): void {
    const modal = document.getElementById("epa-details-modal");
    if (!modal) return;

    // Update modal content
    const teamEl = document.getElementById("epa-modal-team");
    const totalEl = document.getElementById("epa-modal-total");
    const autoEl = document.getElementById("epa-modal-auto");
    const teleopEl = document.getElementById("epa-modal-teleop");
    const endgameEl = document.getElementById("epa-modal-endgame");
    const rankEl = document.getElementById("epa-modal-rank");
    const percentileEl = document.getElementById("epa-modal-percentile");

    if (teamEl) teamEl.textContent = teamData.team.toString();

    // Apply color to each stat based on global year percentiles
    if (totalEl) {
      totalEl.textContent = teamData.totalEPA.toFixed(1);
      const totalColorClass = this.getEPAColorClass(
        teamData.totalEPA,
        yearData?.percentiles?.total_points,
      );
      totalEl.className = `font-bold ${totalColorClass}`;
    }
    if (autoEl) {
      autoEl.textContent = teamData.autoEPA.toFixed(1);
      const autoColorClass = this.getEPAColorClass(
        teamData.autoEPA,
        yearData?.percentiles?.auto_points,
      );
      autoEl.className = `font-bold ${autoColorClass}`;
    }
    if (teleopEl) {
      teleopEl.textContent = teamData.teleopEPA.toFixed(1);
      const teleopColorClass = this.getEPAColorClass(
        teamData.teleopEPA,
        yearData?.percentiles?.teleop_points,
      );
      teleopEl.className = `font-bold ${teleopColorClass}`;
    }
    if (endgameEl) {
      endgameEl.textContent = teamData.endgameEPA.toFixed(1);
      const endgameColorClass = this.getEPAColorClass(
        teamData.endgameEPA,
        yearData?.percentiles?.endgame_points,
      );
      endgameEl.className = `font-bold ${endgameColorClass}`;
    }
    if (rankEl) {
      rankEl.textContent = teamData.rank ? `#${teamData.rank}` : "N/A";
      rankEl.className = "text-zinc-300 font-bold";
    }
    if (percentileEl) {
      percentileEl.textContent = teamData.percentile
        ? `${(teamData.percentile * 100).toFixed(1)}%`
        : "N/A";
      percentileEl.className = "text-zinc-300 font-bold";
    }

    // Show modal
    modal.classList.remove("hidden");
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

    // Helper function to create colored team number spans with glow effect for special teams
    const createTeamSpan = (
      teamNumber: string,
      animationType: "rainbow" | "gold" | "none",
      baseColor: string,
    ): string => {
      if (animationType === "rainbow") {
        // Create sequential rainbow glow animation for each digit (for contributor teams)
        const digits = teamNumber.split("");
        const animatedDigits = digits
          .map((digit, index) => {
            const delay = index * 0.3; // 0.3s delay between each digit
            return `<span class="rainbow-team-digit" style="animation-delay: ${delay}s;">${digit}</span>`;
          })
          .join("");
        return `<span class="${baseColor}">${animatedDigits}</span>`;
      }
      if (animationType === "gold") {
        // Create sequential gold glow animation for each digit (for 834)
        const digits = teamNumber.split("");
        const animatedDigits = digits
          .map((digit, index) => {
            const delay = index * 0.3; // 0.3s delay between each digit
            return `<span class="special-team-digit" style="animation-delay: ${delay}s;">${digit}</span>`;
          })
          .join("");
        return `<span class="${baseColor}">${animatedDigits}</span>`;
      }
      return `<span class="${baseColor}">${teamNumber}</span>`;
    };

    const goldTeam = "834";
    const contributorTeams = this.contributorTeams || [];

    const getAnimationType = (team: string): "rainbow" | "gold" | "none" => {
      if (team === goldTeam) return "gold";
      if (contributorTeams.includes(team)) return "rainbow";
      return "none";
    };

    // Build HTML for red alliance with individual team colors
    const redAllianceElement = item.children[1].children[0] as HTMLElement;
    const redTeamsHTML = [redThree, redTwo, redOne]
      .map((team) =>
        createTeamSpan(team, getAnimationType(team), "text-red-400"),
      )
      .join(" ");
    redAllianceElement.innerHTML = redTeamsHTML;

    // Build HTML for blue alliance with individual team colors
    const blueAllianceElement = item.children[1].children[2] as HTMLElement;
    const blueTeamsHTML = [blueOne, blueTwo, blueThree]
      .map((team) =>
        createTeamSpan(team, getAnimationType(team), "text-blue-400"),
      )
      .join(" ");
    blueAllianceElement.innerHTML = blueTeamsHTML;

    item.setAttribute("tabindex", "0");

    const kebab = item.children[2].children[0] as HTMLElement;
    const options = item.children[2].children[1] as HTMLElement;
    const duplicateOption = options.children[0] as HTMLElement;
    const exportPNGOption = options.children[1] as HTMLElement;
    const exportQROption = options.children[2] as HTMLElement;
    const exportPDFOption = options.children[3] as HTMLElement;
    const deleteOption = options.children[4] as HTMLElement;

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

    // Export QR - directly start QR code animation
    exportQROption.addEventListener("click", (e) => {
      e.stopPropagation();
      const match = this.model.getMatch(id);
      if (match) {
        // Hide the options menu first
        this.hide(options);
        this.show(kebab);

        // Then show the export overlay
        this.show(E.Export);
        setTimeout(() => {
          try {
            this.currentExportMatch = match;

            // Prepare QR export - let user click Start button manually
            this.qrexport.export(match, () => {
              // QR export ready
            });
          } catch (err) {
            console.error("View: failed to start QR export:", err);
            alert("Failed to start QR export. See console for details.");
            this.hide(E.Export);
          }
        }, 50);
      } else {
        this.hide(options);
        this.show(kebab);
      }
    });

    // Export PNG - directly export to PNG
    exportPNGOption.addEventListener("click", (e) => {
      e.stopPropagation();
      const match = this.model.getMatch(id);
      if (match) {
        try {
          this.currentExportMatch = match;
          this.onClickExportPNG();
          // Note: currentExportMatch is cleared after the async export completes in onClickExportPNG
        } catch (err) {
          console.error("View: failed to export PNG:", err);
          alert("Failed to export PNG. See console for details.");
          this.currentExportMatch = null;
        }
      }

      this.hide(options);
      this.show(kebab);
    });

    // Share - generate Firebase link and copy to clipboard
    exportPDFOption.addEventListener("click", async (e) => {
      e.stopPropagation();
      const match = this.model.getMatch(id);
      if (match) {
        try {
          await this.onClickShare(match);
        } catch (err) {
          console.error("View: failed to share match:", err);
          alert("Failed to share match. See console for details.");
        }
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
      I.RedThree.value,
      I.RedTwo.value,
      I.RedOne.value,
      I.BlueOne.value,
      I.BlueTwo.value,
      I.BlueThree.value,
    );
    this.createNewMatch(
      id,
      I.MatchName.value,
      I.RedThree.value,
      I.RedTwo.value,
      I.RedOne.value,
      I.BlueOne.value,
      I.BlueTwo.value,
      I.BlueThree.value,
    );
    this.hide(E.CreateMatchPanel);

    // Clear all input fields
    I.MatchName.value = "";
    I.RedOne.value = "";
    I.RedTwo.value = "";
    I.RedThree.value = "";
    I.BlueOne.value = "";
    I.BlueTwo.value = "";
    I.BlueThree.value = "";
  }

  private onClickExportPNG(): void {
    if (!this.currentExportMatch) {
      console.error("No match available for PNG export");
      alert("No match data available for export");
      return;
    }

    try {
      // Set the match on the whiteboard so it knows what to draw
      this.whiteboard.setMatch(this.currentExportMatch);

      // Force a complete redraw of all canvases before export to ensure they're rendered
      this.whiteboard.forceRedraw();

      // Small delay to ensure rendering completes
      setTimeout(() => {
        try {
          // Call the global exportPNG function defined in index.html
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const filename = `strategy-board-${this.currentExportMatch?.matchName ?? "unknown"}-${timestamp}.png`;

          // Access the global exportPNG function
          const win = window as any;
          if (typeof win.exportPNG === "function") {
            win.exportPNG(filename);
          } else {
            throw new Error("exportPNG function not available");
          }
        } catch (err) {
          console.error("View: PNG export failed:", err);
          alert("Failed to export PNG. See console for details.");
        } finally {
          this.currentExportMatch = null;
        }
      }, 100);
    } catch (err) {
      console.error("View: PNG export failed:", err);
      alert("Failed to export PNG. See console for details.");
      this.currentExportMatch = null;
    }
  }

  private async onClickExportPDF(): Promise<void> {
    if (!this.currentExportMatch) {
      console.error("No match available for PDF export");
      alert("No match data available for export");
      return;
    }

    try {
      // Lazy-load PDF export module only when needed (saves 380KB on initial load)
      if (!this.pdfExport) {
        const { PDFExport } = await import("./pdf.ts");
        this.pdfExport = new PDFExport();
      }

      const packet = this.currentExportMatch.getAsPacket();
      packet.splice(7, 1);
      const raw = JSON.stringify(packet);

      const encoder = new TextEncoder();
      const bytes = encoder.encode(raw);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);

      const MAX_CHUNK_PAYLOAD = 200;
      const HEADER_SIZE = 4;
      const TOTAL_CHUNKS_HEADER_SIZE = 4;

      const chunks: string[] = [];
      for (let i = 0; i < b64.length; i += MAX_CHUNK_PAYLOAD) {
        chunks.push(b64.slice(i, i + MAX_CHUNK_PAYLOAD));
      }

      const totalChunks = Math.max(1, chunks.length);

      const payloads: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const payload =
          i.toString().padStart(HEADER_SIZE, "0") +
          totalChunks.toString().padStart(TOTAL_CHUNKS_HEADER_SIZE, "0") +
          (chunks[i] || "");
        payloads.push(payload);
      }

      const pdfBtn = document.getElementById("qr-export-pdf-btn");
      const originalText = pdfBtn?.textContent || "Export as PDF";
      if (pdfBtn) pdfBtn.textContent = "Generating PDF...";

      await this.pdfExport.exportToPDFLarge(
        payloads,
        this.currentExportMatch.matchName,
      );

      if (pdfBtn) pdfBtn.textContent = originalText;
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert("Failed to generate PDF. Please try again.");

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
    this.show(E.TBAImportPanel);

    await this.tbaService.loadApiKey();

    if (I?.TBAApiKey && this.tbaService.hasApiKey()) {
      I.TBAApiKey.placeholder = "API Key (saved)";
    }

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

        const year = parseInt(eventKey.substring(0, 4));
        const id = await this.model.createNewMatch(
          formattedMatchName,
          match.redTeams[2] || "",
          match.redTeams[1] || "",
          match.redTeams[0] || "",
          match.blueTeams[0] || "",
          match.blueTeams[1] || "",
          match.blueTeams[2] || "",
          eventKey,
          match.matchKey,
          year,
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

  private async onClickTBAAllMatches(e: Event): Promise<void> {
    if (!I?.TBAApiKey || !I?.TBAEventKey) {
      this.showTBAStatus("Missing required fields", true);
      return;
    }

    const apiKey = I.TBAApiKey.value.trim();
    const eventKey = I.TBAEventKey.value.trim();

    if (!eventKey) {
      this.showTBAStatus("Please select an event first", true);
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

    this.showTBAStatus("Fetching all matches from The Blue Alliance...", false);

    try {
      const matches = await this.tbaService.fetchAndParseAllMatches(eventKey);

      if (matches.length === 0) {
        this.showTBAStatus("No matches found for this event", true);
        return;
      }

      this.showTBAStatus(`Importing ${matches.length} matches...`, false);

      for (const match of matches) {
        const formattedMatchName = this.selectedEventName
          ? `${match.matchName} @ ${this.selectedEventName}`
          : match.matchName;

        const year = parseInt(eventKey.substring(0, 4));
        const id = await this.model.createNewMatch(
          formattedMatchName,
          match.redTeams[2] || "",
          match.redTeams[1] || "",
          match.redTeams[0] || "",
          match.blueTeams[0] || "",
          match.blueTeams[1] || "",
          match.blueTeams[2] || "",
          eventKey,
          match.matchKey,
          year,
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

      this.onClickTBACancel(e);
    } catch (error) {
      console.error("TBA all matches import error:", error);
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
    if (!this.tbaService.hasApiKey()) {
      console.error("No API key available");
      this.showTBAStatus("No API key available", true);
      return;
    }

    this.showTBAStatus("Loading events...", false);

    try {
      const currentYear = new Date().getFullYear();
      const yearsToFetch = [currentYear, currentYear - 1, currentYear - 2];
      const allEventsPromises = yearsToFetch.map((year) =>
        this.tbaService.fetchAndParseEvents(year),
      );

      const allEventsArrays = await Promise.all(allEventsPromises);
      const allEvents = allEventsArrays.flat();
      const events = this.tbaService.filterEventsWithinOneWeek(allEvents);

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
    // Save API key when user enters it (on blur or change)
    if (I?.TBAApiKey) {
      const saveApiKey = async () => {
        const apiKey = I.TBAApiKey!.value.trim();
        if (apiKey) {
          this.tbaService.setApiKey(apiKey);
          await SET("tbaApiKey", apiKey, (e) => {
            console.error("Failed to save TBA API key:", e);
          });
          I.TBAApiKey!.placeholder = "API Key (saved)";
        }
      };

      I.TBAApiKey.addEventListener("blur", saveApiKey);
      I.TBAApiKey.addEventListener("change", saveApiKey);
    }

    if (I?.TBAEventSearch) {
      // Debounce search to prevent lag on rapid typing
      const debouncedEventSearch = debounce((searchTerm: string) => {
        this.filterTBAEvents(searchTerm);
      }, 200); // 200ms debounce - feels instant but reduces calls by 80%

      I.TBAEventSearch.addEventListener("input", (e) => {
        const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
        debouncedEventSearch(searchTerm);

        // Show dropdown when user types, hide when empty
        if (searchTerm.length > 0) {
          this.show(E.TBAEventDropdown);
        } else {
          // Show all events in original sorted order when cleared
          this.filterTBAEvents("");
          if (E?.TBAEventList?.children.length) {
            this.show(E.TBAEventDropdown);
          }
        }
      });

      I.TBAEventSearch.addEventListener("focus", () => {
        // Show all events in sorted order when focused
        const currentValue = I.TBAEventSearch?.value || "";
        if (currentValue.length === 0) {
          this.filterTBAEvents("");
        }
        if (E?.TBAEventList?.children.length) {
          this.show(E.TBAEventDropdown);
        }
      });
    }

    if (I?.TBATeamSearch) {
      // Debounce search to prevent lag on rapid typing
      const debouncedTeamSearch = debounce(async (searchTerm: string) => {
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
      }, 200); // 200ms debounce

      I.TBATeamSearch.addEventListener("input", (e) => {
        const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
        debouncedTeamSearch(searchTerm);

        if (searchTerm.length > 0) {
          // Show team dropdown if event is selected, otherwise show event dropdown
          if (I?.TBAEventKey && I.TBAEventKey.value) {
            this.show(E.TBATeamDropdown);
          } else {
            this.show(E.TBAEventDropdown);
          }
        } else {
          // Show all teams in original sorted order when cleared
          this.filterTBATeams("");
          if (
            I?.TBAEventKey &&
            I.TBAEventKey.value &&
            E?.TBATeamList?.children.length
          ) {
            this.show(E.TBATeamDropdown);
          } else {
            this.hide(E.TBATeamDropdown);
          }
        }
      });

      I.TBATeamSearch.addEventListener("focus", () => {
        // Show all teams in sorted order when focused
        const currentValue = I.TBATeamSearch?.value || "";
        if (currentValue.length === 0) {
          this.filterTBATeams("");
        }
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

    // If no search term, show all items in original sorted order (by date)
    if (!searchTerm || searchTerm.trim() === "") {
      items.forEach((item) => {
        (item as HTMLElement).style.display = "";
      });
      return;
    }

    // Extract searchable items from the dropdown
    const searchableItems = extractEventItems(E.TBAEventList);

    // Perform fuzzy search with ranking
    const matches = fuzzySearchItems(searchableItems, searchTerm, 5);

    // Hide all items first
    items.forEach((item) => {
      (item as HTMLElement).style.display = "none";
    });

    // Show and reorder matched items by score
    if (matches.length > 0) {
      // Reorder DOM elements based on match score
      matches.forEach((match) => {
        match.item.style.display = "";
        // Move to end of list (maintains score order since we process in order)
        E.TBAEventList!.appendChild(match.item);
      });
    }
  }

  private filterTBATeams(searchTerm: string): void {
    if (!E?.TBATeamList) return;

    const items = E.TBATeamList.querySelectorAll(".tba-team-item");

    // If no search term, show all items in original sorted order (by team number)
    if (!searchTerm || searchTerm.trim() === "") {
      items.forEach((item) => {
        (item as HTMLElement).style.display = "";
      });
      return;
    }

    // Extract searchable items from the dropdown
    const searchableItems = extractTeamItems(E.TBATeamList);

    // Perform fuzzy search with ranking
    const matches = fuzzySearchItems(searchableItems, searchTerm, 5);

    // Hide all items first
    items.forEach((item) => {
      (item as HTMLElement).style.display = "none";
    });

    // Show and reorder matched items by score
    if (matches.length > 0) {
      // Reorder DOM elements based on match score
      matches.forEach((match) => {
        match.item.style.display = "";
        // Move to end of list (maintains score order since we process in order)
        E.TBATeamList!.appendChild(match.item);
      });
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

  private async showContributors() {
    this.show(E.ContributorsPanel);
    await this.loadContributors();
  }

  private async loadContributors() {
    if (
      !E.ContributorsLoading ||
      !E.ContributorsError ||
      !E.ContributorsList ||
      !E.ContributorsGrid ||
      !E.TeamsGrid
    ) {
      return;
    }

    // Show loading state
    E.ContributorsLoading.classList.remove("hidden");
    E.ContributorsError.classList.add("hidden");
    E.ContributorsList.classList.add("hidden");

    try {
      // Fetch both contributors and teams
      const [contributors, teams] = await Promise.all([
        this.contributorsService.fetchContributors(),
        this.contributorsService.fetchTeams(),
      ]);

      // Clear existing content
      E.ContributorsGrid.innerHTML = "";
      E.TeamsGrid.innerHTML = "";

      // Populate contributors
      contributors.forEach((contributor) => {
        const contributorCard = document.createElement("a");
        contributorCard.href = contributor.html_url;
        contributorCard.target = "_blank";
        contributorCard.rel = "noopener noreferrer";
        contributorCard.className = `
          flex items-center gap-4 p-4 bg-slate-700 rounded-xl
          glass-card hover:bg-slate-600 hover:scale-105 transition-all duration-200
          cursor-pointer no-underline
        `;

        contributorCard.innerHTML = `
          <div class="shrink-0 relative">
            <img
              src="${contributor.avatar_url}?s=128"
              alt="${contributor.login}"
              class="w-16 h-16 rounded-full border-2 border-slate-500"
              style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges; backface-visibility: hidden; transform: translateZ(0); will-change: transform;"
            />
          </div>
          <div class="grow min-w-0">
            <div class="contributor-name text-lg font-bold text-white truncate">
              ${contributor.name || contributor.login}
            </div>
            <p class="text-sm text-slate-400 truncate">@${contributor.login}</p>
            ${contributor.bio ? `<p class="text-sm text-slate-300 mt-1 line-clamp-2">${contributor.bio}</p>` : ""}
          </div>
        `;

        // Add hover effect for name color
        contributorCard.addEventListener("mouseenter", () => {
          const nameEl = contributorCard.querySelector(".contributor-name");
          if (nameEl) nameEl.classList.replace("text-white", "text-blue-400");
        });
        contributorCard.addEventListener("mouseleave", () => {
          const nameEl = contributorCard.querySelector(".contributor-name");
          if (nameEl) nameEl.classList.replace("text-blue-400", "text-white");
        });

        E.ContributorsGrid?.appendChild(contributorCard);
      });

      // Populate teams with same styling as contributors
      teams.forEach((teamNumber) => {
        const teamCard = document.createElement("div");
        teamCard.className = `
          flex items-center justify-center p-4 bg-slate-700 rounded-xl
          glass-card hover:bg-slate-600 hover:scale-105 transition-all duration-200
          cursor-default
        `;

        teamCard.innerHTML = `
          <div class="text-center">
            <div class="text-lg font-bold text-white">
              Team ${teamNumber}
            </div>
          </div>
        `;

        E.TeamsGrid?.appendChild(teamCard);
      });

      E.ContributorsLoading.classList.add("hidden");
      E.ContributorsList.classList.remove("hidden");
    } catch (error) {
      console.error("Error loading contributors:", error);

      E.ContributorsLoading.classList.add("hidden");
      E.ContributorsError.classList.remove("hidden");
    }
  }

  private onClickImportLink(e: Event): void {
    this.show(E.LinkImportPanel);
    if (I?.LinkImportCode) {
      I.LinkImportCode.value = "";
    }
    this.hide(E.LinkImportStatus);
  }

  private async onClickLinkImportSubmit(e: Event): Promise<void> {
    if (!I?.LinkImportCode) {
      console.error("Link import code input not found");
      return;
    }

    const shareCode = I.LinkImportCode.value.trim().toUpperCase();

    if (!shareCode || shareCode.length !== 6) {
      this.showLinkImportStatus("Please enter a valid 6-character code", true);
      return;
    }

    this.showLinkImportStatus("Loading match...", false);

    try {
      const match = await downloadMatch(shareCode);

      if (!match) {
        this.showLinkImportStatus("Share code not found or expired", true);
        return;
      }

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

      this.showLinkImportStatus("Match imported successfully!", false);

      setTimeout(() => {
        this.hide(E.LinkImportPanel);
        this.hide(E.LinkImportStatus);
        if (I?.LinkImportCode) {
          I.LinkImportCode.value = "";
        }
      }, 1000);
    } catch (error) {
      console.error("Link import error:", error);
      this.showLinkImportStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        true,
      );
    }
  }

  private onClickLinkImportCancel(e: Event): void {
    this.hide(E.LinkImportPanel);
    this.hide(E.LinkImportStatus);
    if (I?.LinkImportCode) {
      I.LinkImportCode.value = "";
    }
  }

  private showLinkImportStatus(message: string, isError: boolean): void {
    if (!E?.LinkImportStatus) return;

    E.LinkImportStatus.textContent = message;
    E.LinkImportStatus.className = isError
      ? "mt-4 text-sm sm:text-base text-red-400"
      : "mt-4 text-sm sm:text-base text-slate-300";
    this.show(E.LinkImportStatus);
  }

  private async checkShareCodeFromUrl(): Promise<void> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shareCode = urlParams.get("share");

      if (!shareCode) return;

      // Clean up URL without reloading
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      console.log("Found share code in URL:", shareCode);

      // Wait for DOM to be ready
      const waitForDOM = () => {
        return new Promise<void>((resolve) => {
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => resolve(), {
              once: true,
            });
          } else {
            resolve();
          }
        });
      };

      await waitForDOM();

      // Show loading status
      this.show(E.LinkImportPanel);
      this.showLinkImportStatus("Loading shared match...", false);

      const match = await downloadMatch(shareCode.trim().toUpperCase());

      if (!match) {
        this.showLinkImportStatus("Share code not found or expired", true);
        return;
      }

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

      this.showLinkImportStatus("Match imported successfully!", false);

      setTimeout(() => {
        this.hide(E.LinkImportPanel);
        this.hide(E.LinkImportStatus);
        // Open the imported match
        this.loadWhiteboard(match);
      }, 1000);
    } catch (error) {
      console.error("Error loading share code from URL:", error);
      this.showLinkImportStatus(
        `Error: ${error instanceof Error ? error.message : "Failed to load shared match"}`,
        true,
      );
    }
  }

  private async onClickShare(match: Match): Promise<void> {
    try {
      const shareCode = await uploadMatch(match);
      const shareUrl = `https://strategyboard.app/?share=${shareCode}`;

      if (E.ShareCodeDisplay) {
        E.ShareCodeDisplay.textContent = shareCode;
      }
      if (E.ShareLinkDisplay) {
        E.ShareLinkDisplay.value = shareUrl;
      }

      this.show(E.ShareSuccessPanel);

      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (clipboardErr) {
        console.warn("Could not copy to clipboard:", clipboardErr);
      }
    } catch (error) {
      console.error("Failed to generate share link:", error);
      throw error;
    }
  }

  private async onClickExportPDFFromModal(e: Event): Promise<void> {
    if (!this.currentExportMatch) {
      console.error("No match available for PDF export");
      alert("No match data available for export");
      return;
    }

    try {
      await this.onClickExportPDF();
    } catch (err) {
      console.error("View: failed to export PDF:", err);
      alert("Failed to export PDF. See console for details.");
    }
  }

  private initializeTeamNumberPopup(): void {
    const TEAM_NUMBER_KEY = "user-team-number";
    const popup = get("team-number-popup");

    const savedTeamNumber = localStorage.getItem(TEAM_NUMBER_KEY);

    if (!savedTeamNumber && popup) {
      popup.classList.remove("hidden");
    }

    B?.TeamNumberSave?.addEventListener("click", () => {
      const teamNumber = I?.TeamNumber?.value?.trim();
      if (teamNumber) {
        localStorage.setItem(TEAM_NUMBER_KEY, teamNumber);
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: "team_number",
          number: teamNumber,
        });
        console.log(`Team number saved and sent to GA: ${teamNumber}`);
        popup?.classList.add("hidden");
      } else {
        // Show validation error
        alert("Please enter your team number to continue.");
      }
    });

    // Allow Enter key to save
    I?.TeamNumber?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        B?.TeamNumberSave?.click();
      }
    });
  }
}
