export class Model {
    constructor () {

    }

    public createNewMatch (
        matchName: string, redOne: String, redTwo: String, redThree: String, blueOne: String, blueTwo: String, blueThree: String
    ) {
        return self.crypto.randomUUID();
    }
}