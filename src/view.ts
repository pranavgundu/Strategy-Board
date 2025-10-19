import { Model } from "@/model.ts";
import { Whiteboard, updateCanvasSize } from "@/whiteboard.ts";
import { Match } from "@/match.ts";
import { QRImport, QRExport } from "@/qr.ts";

const get = (id: string): HTMLElement | null => document.getElementById(id);

// buttons
const B = {
  NewMatch: get("home-toolbar-new-btn") as HTMLElement,
  ImportMatch: get("home-toolbar-import-btn") as HTMLElement,
  Clear: get("home-toolbar-clear-btn") as HTMLElement,
  CreateMatch: get("create-match-create-btn") as HTMLElement,
  CancelCreate: get("create-match-cancel-btn") as HTMLElement,
  Back: get("whiteboard-toolbar-back") as HTMLElement,
  ToggleView: get("whiteboard-toolbar-view-toggle") as HTMLElement,
};

// inputs
const I = {
  MatchName: get("create-match-name") as HTMLInputElement,
  RedOne: get("create-match-red-1") as HTMLInputElement,
  RedTwo: get("create-match-red-2") as HTMLInputElement,
  RedThree: get("create-match-red-3") as HTMLInputElement,
  BlueOne: get("create-match-blue-1") as HTMLInputElement,
  BlueTwo: get("create-match-blue-2") as HTMLInputElement,
  BlueThree: get("create-match-blue-3") as HTMLInputElement,
};

// other elements
const E = {
  Home: get("home-container") as HTMLElement,
  Whiteboard: get("whiteboard-container") as HTMLElement,
  MatchList: get("home-match-list") as HTMLElement,
  CreateMatchPanel: get("create-match-container") as HTMLElement,
  EmptyMatchListPlaceholder: get(
    "home-match-list-empty-placeholder",
  ) as HTMLElement,
  MatchListItemTemplate: get("home-match-list-item-template") as HTMLElement,
  Export: get("qr-export-container") as HTMLElement,
  Import: get("qr-import-container") as HTMLElement,
  ImportInner: get("qr-import-inner-container") as HTMLElement,
};

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

    B.NewMatch.addEventListener("click", (e) => this.onClickNewMatch(e));
    B.CreateMatch.addEventListener("click", (e) => this.onClickCreateMatch(e));
    B.CancelCreate.addEventListener("click", (e) =>
      this.onClickCancelCreateMatch(e),
    );
    B.Back.addEventListener("click", (e) => this.onClickBack(e));
    B.ToggleView.addEventListener("click", (e) => this.onClickToggleView(e));
    B.ImportMatch.addEventListener("click", (e) => this.onClickImportMatch(e));

    E.Export.addEventListener("click", (e) => this.onCancelExport(e));
    E.Import.addEventListener("click", (e) => this.onCancelImport(e));
    E.ImportInner.addEventListener("click", (e) => e.stopPropagation());
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
    this.hide(E.EmptyMatchListPlaceholder);
    const item = E.MatchListItemTemplate.cloneNode(true) as HTMLElement;
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

    kebab.addEventListener("click", () => {
      this.hide(kebab);
      this.show(options);
      item.focus();
    });

    item.addEventListener("focusout", (e) => {
      if (item.contains(e.relatedTarget as Node)) return;

      this.hide(options);
      this.show(kebab);
    });

    deleteOption.addEventListener("click", () => {
      this.deleteMatch(item.id);
    });

    exportOption.addEventListener("click", () => {
      const match = this.model.getMatch(id);
      if (match) {
        this.qrexport.export(match);
        this.show(E.Export);
      }
    });

    const openMatch = () => {
      const match = this.model.getMatch(id);
      if (match !== null) {
        this.loadWhiteboard(match);
      }
    };
    item.children[0].addEventListener("click", openMatch);

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
