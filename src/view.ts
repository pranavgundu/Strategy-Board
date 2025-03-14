import { Model } from "@/model.ts";
import { Whiteboard, updateCanvasSize } from "@/whiteboard.ts";
import { Match } from "@/match.ts";
import { QRImport, QRExport } from "@/qr.ts";

const get = document.getElementById.bind(document);

// buttons
const B = {
    NewMatch: <HTMLElement>get("home-toolbar-new-btn"),
    ImportMatch: <HTMLElement>get("home-toolbar-import-btn"),
    Clear: <HTMLElement>get("home-toolbar-clear-btn"),
    CreateMatch: <HTMLElement>get("create-match-create-btn"),
    CancelCreate: <HTMLElement>get("create-match-cancel-btn"),
    Back: <HTMLElement>get("whiteboard-toolbar-back"),
    ToggleView: <HTMLElement>get("whiteboard-toolbar-view-toggle"),
}

// inputs
const I = {
    MatchName: <HTMLInputElement>get("create-match-name"),
    RedOne: <HTMLInputElement>get("create-match-red-1"),
    RedTwo: <HTMLInputElement>get("create-match-red-2"),
    RedThree: <HTMLInputElement>get("create-match-red-3"),
    BlueOne: <HTMLInputElement>get("create-match-blue-1"),
    BlueTwo: <HTMLInputElement>get("create-match-blue-2"),
    BlueThree: <HTMLInputElement>get("create-match-blue-3"),
}

// other elements
const E = {
    Home: <HTMLElement>get("home-container"),
    Whiteboard: <HTMLElement>get("whiteboard-container"),
    MatchList: <HTMLElement>get("home-match-list"),
    CreateMatchPanel: <HTMLElement>get("create-match-container"),
    EmptyMatchListPlaceholder: <HTMLElement>get("home-match-list-empty-placeholder"),
    MatchListItemTemplate: <HTMLElement>get("home-match-list-item-template"),
    Export: <HTMLElement>get("qr-export-container"),
    Import: <HTMLElement>get("qr-import-container"),
    ImportInner: <HTMLElement>get("qr-import-inner-container"),
};

export class View {
    private model: Model;
    private whiteboard: Whiteboard;
    private qrimport: QRImport;
    private qrexport: QRExport;


    constructor (model: Model, whiteboard: Whiteboard, qrimport: QRImport, qrexport: QRExport) {
        this.model = model;
        this.whiteboard = whiteboard;
        this.qrimport = qrimport;
        this.qrexport = qrexport;

        for (let match of this.model.matches) {
            this.createNewMatch(match.id, match.matchName, match.redOne, match.redTwo, match.redThree, match.blueOne, match.blueTwo, match.blueThree);
        }

        B.NewMatch.addEventListener("click", e => this.onClickNewMatch(e));
        B.CreateMatch.addEventListener("click", e => this.onClickCreateMatch(e));
        B.CancelCreate.addEventListener("click", e => this.onClickCancelCreateMatch(e));
        //B.Clear.addEventListener("click", e => this.onClickClear(e));
        B.Back.addEventListener("click", e => this.onClickBack(e));
        B.ToggleView.addEventListener("click", e => this.onClickToggleView(e));
        B.ImportMatch.addEventListener("click", e => this.onClickImportMatch(e));

        E.Export.addEventListener("click", e => this.onCancelExport(e));
        E.Import.addEventListener("click", e => this.onCancelImport(e));
        E.ImportInner.addEventListener("click", e => e.stopPropagation());
    }

    private show (e: HTMLElement | null) {
        if (e === E.Home) {
            document.documentElement.style.backgroundColor = "#192334";
        } else if (e === E.Whiteboard) {
            document.documentElement.style.backgroundColor = "#18181b";
        }
        e?.classList.remove("hidden");
    }

    private hide (e: HTMLElement | null) {
        e?.classList.add("hidden");
    }

    /**
     * 
     */

    private hideCreateMatchPanel () {
        this.hide(E.CreateMatchPanel);
        I.MatchName.value = "";
        I.RedOne.value = "";
        I.RedTwo.value = "";
        I.RedThree.value = "";
        I.BlueOne.value = "";
        I.BlueTwo.value = "";
        I.BlueThree.value = "";
    }

    private loadWhiteboard (match: Match) {
        this.whiteboard.setMatch(match);
        this.whiteboard.setActive(true);
        this.show(E.Whiteboard);
        this.hide(E.Home);
        updateCanvasSize();
    }

    public async createNewMatch (
        id: string, matchName: string, redOne: string, redTwo: string, redThree: string, blueOne: string, blueTwo: string, blueThree: string
    ) {
        this.hide(E.EmptyMatchListPlaceholder);
        const item = E.MatchListItemTemplate.cloneNode(true) as HTMLElement;
        if (item == null) return;

        item.id = id;

        if (matchName === "") matchName = "Untitled";
        if (redOne === "") redOne = "---";
        if (redTwo === "") redTwo = "---";
        if (redThree === "") redThree = "---";
        if (blueOne === "") blueOne = "---";
        if (blueTwo === "") blueTwo = "---";
        if (blueThree === "") blueThree = "---";

        item.children[0].textContent = matchName;
        item.children[1].children[0].textContent = `${redOne} ${redTwo} ${redThree}`;
        item.children[1].children[2].textContent = `${blueOne} ${blueTwo} ${blueThree}`;

        item.setAttribute("tabindex", "0");

        let kebab = item.children[2].children[0] as HTMLElement;
        let options = item.children[2].children[1] as HTMLElement;
        let exportOption = options.children[0] as HTMLElement;
        let deleteOption = options.children[1] as HTMLElement;

        kebab.addEventListener("click", e => {
            this.hide(kebab);
            this.show(options);
            item.focus();
        });
        
        item.addEventListener("focusout", e => {
            if (item.contains(<Node>e.relatedTarget)) return;

            this.hide(options);
            this.show(kebab);
        });

        deleteOption.addEventListener("click", e => {
            this.deleteMatch(item.id);
        });

        exportOption.addEventListener("click", e => {
            this.qrexport.export(this.model.getMatch(id));
            this.show(E.Export);
        });

        const openMatch = (e: Event) => {
            const match = this.model.getMatch(id);
            if (match !== null) {
                this.loadWhiteboard(match);
            }
        }
        item.children[0].addEventListener("click", openMatch);
        
        this.show(item);
        E.MatchList.prepend(item);
    }

    public async deleteMatch (id: string) {
        const item = get(id);
        if (item === null) return;
        
        await this.model.deleteMatch(id);
        E.MatchList.removeChild(item);
        if (E.MatchList.children.length < 3) {
            this.show(E.EmptyMatchListPlaceholder);
        }
    }

    private onClickNewMatch (e: Event) {
        this.show(E.CreateMatchPanel);
    }

    private onClickCancelCreateMatch (e: Event) {
        this.hideCreateMatchPanel();
    }

    private async onClickCreateMatch (e: Event) {
        const id = await this.model.createNewMatch(I.MatchName.value, I.RedOne.value, I.RedTwo.value, I.RedThree.value, I.BlueOne.value, I.BlueTwo.value, I.BlueThree.value);
        this.createNewMatch(id, I.MatchName.value, I.RedOne.value, I.RedTwo.value, I.RedThree.value, I.BlueOne.value, I.BlueTwo.value, I.BlueThree.value);
        this.hideCreateMatchPanel();
    }

    private async onClickClear (e: Event) {
        if(!confirm("Are you sure you want to clear all data?")) return;
        while(E.MatchList.children.length > 2) {
            E.MatchList.removeChild(<Node>E.MatchList.firstChild);
        }
        this.model.clear();
        this.show(E.EmptyMatchListPlaceholder);
    }

    private onClickBack (e: Event) {
        this.whiteboard.setActive(false);
        this.show(E.Home);
        this.hide(E.Whiteboard);
    }

    private onClickToggleView (e: Event) {
        this.whiteboard.toggleView();
    }

    private onClickImportMatch (e: Event) {
        this.qrimport.start(async data => {
            const match = Match.fromPacket(data);
            const id = await this.model.addMatch(match);
            this.createNewMatch(id, match.matchName, match.redOne, match.redTwo, match.redThree, match.blueOne, match.blueTwo, match.blueThree);
            this.hide(E.Import);
        });
        this.show(E.Import);
    }

    private onCancelExport (e: Event) {
        this.qrexport.close();
        this.hide(E.Export);
    }

    private onCancelImport (e: Event) {
        this.qrimport.stop();
        this.hide(E.Import);
    }
}