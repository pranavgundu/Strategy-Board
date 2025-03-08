import { GET, GETMANY, SET, DEL, CLEAR, ENTRIES } from "@/db.ts";
import { Match } from "@/match.ts";

export class Model {
    public matches: Array<Match> = [];
    private matchIds: Array<string> = []; // preserve order in DB

    constructor () {
        
    }

    public async loadPersistentData () {
        const matchIds: Array<string> = await GET("matchIds", e => {
            alert("Could not load data from IndexedDB. IndexedDB might be disabled on this browser");
        });
        if (matchIds === undefined) return;

        const matches = await GETMANY(matchIds);
        if (matches !== undefined) {
            for (let match of matches) {
                this.matches.push(Match.fromPacket(match));
                this.matchIds.push(match.id);
            }
        }
    }

    public async createNewMatch (
        matchName: string, redOne: string, redTwo: string, redThree: string, blueOne: string, blueTwo: string, blueThree: string
    ) {
        const match = new Match(matchName, redOne, redTwo, redThree, blueOne, blueTwo, blueThree);
        this.matches.push(match);
        this.matchIds.push(match.id);
        await SET(match.id, match.getAsPacket());
        await SET("matchIds", this.matchIds);
        return match.id;
    }

    public async deleteMatch(id: string) {
        const index = this.matches.findIndex(e => e.id === id);
        if (index === -1) return;
        this.matches.splice(index, 1);
        this.matchIds.splice(index, 1);
        await SET("matchIds", this.matchIds);
        DEL(id);
    }

    public async clear() {
        this.matches = [];
        this.matchIds = [];
        CLEAR();
    }
}