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
        this.qrexport.export(match);
        this.show(E.Export);
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

  private onClickImportMatch(e: Event): void {
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
    this.show(E.Import);
  }

  private onCancelExport(e: Event): void {
    this.qrexport.close();
    this.hide(E.Export);
  }

  private onCancelImport(e: Event): void {
    this.qrimport.stop();
    this.hide(E.Import);
  }
}
