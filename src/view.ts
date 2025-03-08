import { Model } from "@/model.ts";

const get = document.getElementById.bind(document);

// buttons
const B = {
    NewMatch: get("home-toolbar-new-btn"),
    CreateMatch: get("create-match-create-btn"),
    CancelCreate: get("create-match-cancel-btn"),
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
    MatchList: get("home-match-list"),
    CreateMatchPanel: get("create-match-container"),
    EmptyMatchListPlaceholder: get("home-match-list-empty-placeholder"),
    MatchListItemTemplate: get("home-match-list-item-template"),
};

export class View {
    private model: Model;

    constructor (model: Model) {
        this.model = model;

        B.NewMatch?.addEventListener("click", e => this.onClickNewMatch(e));
        B.CreateMatch?.addEventListener("click", e => this.onClickCreateMatch(e));
        B.CancelCreate?.addEventListener("click", e => this.onClickCancelCreateMatch(e));
    }

    private show (e: HTMLElement | null) {
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

    public createNewMatch (
        matchName: string, redOne: String, redTwo: String, redThree: String, blueOne: String, blueTwo: String, blueThree: String
    ) {
        this.hide(E.EmptyMatchListPlaceholder);
        const item = E.MatchListItemTemplate?.cloneNode(true) as HTMLElement;
        if (item == null) return;

        const id = this.model.createNewMatch(matchName, redOne, redTwo, redThree, blueOne, blueTwo, blueThree);
        item.id = id;

        if (matchName === "") matchName = "Untitled";
        if (redOne === "") redOne = "---";
        if (redTwo === "") redTwo = "---";
        if (redThree === "") redThree = "---";
        if (blueOne === "") blueOne = "---";
        if (blueTwo === "") blueTwo = "---";
        if (blueThree === "") blueThree = "---";

        item.childNodes[1]!.textContent = matchName;
        item.childNodes[3].childNodes[1].textContent = `${redOne} ${redTwo} ${redThree}`;
        item.childNodes[3].childNodes[5].textContent = `${blueOne} ${blueTwo} ${blueThree}`;

        item.setAttribute("tabindex", "0");

        let kebab = item.childNodes[5].childNodes[1] as HTMLElement;
        let options = item.childNodes[5].childNodes[3] as HTMLElement;
        let exportOption = options.childNodes[1] as HTMLElement;
        let deleteOption = options.childNodes[3] as HTMLElement;

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
        
        this.show(item);
        E.MatchList?.prepend(item);
    }

    public deleteMatch (id: string) {
        const item = get(id);
        if (item === null) return;

        E.MatchList?.removeChild(item);
    }

    private onClickNewMatch (e: Event) {
        this.show(E.CreateMatchPanel);
    }

    private onClickCancelCreateMatch (e: Event) {
        this.hideCreateMatchPanel();
    }

    private onClickCreateMatch (e: Event) {
        this.createNewMatch(I.MatchName.value, I.RedOne.value, I.RedTwo.value, I.RedThree.value, I.BlueOne.value, I.BlueTwo.value, I.BlueThree.value);
        this.hideCreateMatchPanel();
    }
}