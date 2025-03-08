import { Model } from "@/model.ts";

const get = document.getElementById.bind(document);

// buttons
const B = {
    NewMatch: <HTMLElement>get("home-toolbar-new-btn"),
    Clear: <HTMLElement>get("home-toolbar-clear-btn"),
    CreateMatch: <HTMLElement>get("create-match-create-btn"),
    CancelCreate: <HTMLElement>get("create-match-cancel-btn"),
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
    MatchList: <HTMLElement>get("home-match-list"),
    CreateMatchPanel: <HTMLElement>get("create-match-container"),
    EmptyMatchListPlaceholder: <HTMLElement>get("home-match-list-empty-placeholder"),
    MatchListItemTemplate: <HTMLElement>get("home-match-list-item-template"),
};

export class View {
    private model: Model;

    constructor (model: Model) {
        this.model = model;

        for (let match of this.model.matches) {
            this.createNewMatch(match.id, match.matchName, match.redOne, match.redTwo, match.redThree, match.blueOne, match.blueTwo, match.blueThree);
        }

        B.NewMatch.addEventListener("click", e => this.onClickNewMatch(e));
        B.CreateMatch.addEventListener("click", e => this.onClickCreateMatch(e));
        B.CancelCreate.addEventListener("click", e => this.onClickCancelCreateMatch(e));
        B.Clear.addEventListener("click", e => this.onClickClear(e));
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
        
        this.show(item);
        E.MatchList.prepend(item);
    }

    public async deleteMatch (id: string) {
        const item = get(id);
        if (item === null) return;
        
        await this.model.deleteMatch(id);
        E.MatchList.removeChild(item);
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
        console.log(E.MatchList.children);
        while(E.MatchList.children.length > 0) {
            E.MatchList.removeChild(<Node>E.MatchList.lastChild);
        }
        this.model.clear();
    }
}