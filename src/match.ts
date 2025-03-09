export interface Packet {
    id: string,
    m: string,
    r1: string,
    r2: string,
    r3: string,
    b1: string,
    b2: string,
    b3: string
}

interface Optional {
    id: string
}

export class Match {
    public readonly matchName: string;
    public readonly redOne: string;
    public readonly redTwo: string;
    public readonly redThree: string;
    public readonly blueOne: string;
    public readonly blueTwo: string;
    public readonly blueThree: string;

    public readonly id: string;

    public auton: any = {
        redOneRobot: { x: 2055, y: 505, w: 152.4, h: 152.4, r: 0 },
        redTwoRobot: { x: 2055, y: 805, w: 152.4, h: 152.4, r: 0 },
        redThreeRobot: { x: 2055, y: 1105, w: 152.4, h: 152.4, r: 0 },
        blueOneRobot: { x: 1455, y: 505, w: 152.4, h: 152.4, r: 0 },
        blueTwoRobot: { x: 1455, y: 805, w: 152.4, h: 152.4, r: 0 },
        blueThreeRobot: { x: 1455, y: 1105, w: 152.4, h: 152.4, r: 0 },
        drawing: []
    }

    public teleop: any = {
        redOneRobot: { x: 2055, y: 505, w: 152.4, h: 152.4, r: 0 },
        redTwoRobot: { x: 2055, y: 805, w: 152.4, h: 152.4, r: 0 },
        redThreeRobot: { x: 2055, y: 1105, w: 152.4, h: 152.4, r: 0 },
        blueOneRobot: { x: 1455, y: 505, w: 152.4, h: 152.4, r: 0 },
        blueTwoRobot: { x: 1455, y: 805, w: 152.4, h: 152.4, r: 0 },
        blueThreeRobot: { x: 1455, y: 1105, w: 152.4, h: 152.4, r: 0 },
        drawing: []
    }

    public endgame: any = {
        redOneRobot: { x: 2055, y: 505, w: 152.4, h: 152.4, r: 0 },
        redTwoRobot: { x: 2055, y: 805, w: 152.4, h: 152.4, r: 0 },
        redThreeRobot: { x: 2055, y: 1105, w: 152.4, h: 152.4, r: 0 },
        blueOneRobot: { x: 1455, y: 505, w: 152.4, h: 152.4, r: 0 },
        blueTwoRobot: { x: 1455, y: 805, w: 152.4, h: 152.4, r: 0 },
        blueThreeRobot: { x: 1455, y: 1105, w: 152.4, h: 152.4, r: 0 },
        drawing: []
    }

    constructor (
        matchName: string,
        redOne: string,
        redTwo: string,
        redThree: string,
        blueOne: string,
        blueTwo: string,
        blueThree: string,
        options?: Optional
    ) {
        this.matchName = matchName;
        this.redOne = redOne;
        this.redTwo = redTwo;
        this.redThree = redThree;
        this.blueOne = blueOne;
        this.blueTwo = blueTwo;
        this.blueThree = blueThree;

        this.id = options?.id ?? self.crypto.randomUUID();
    }

    static fromPacket (packet: Packet) {
        return new Match(
            packet.m,
            packet.r1,
            packet.r2,
            packet.r3,
            packet.b1,
            packet.b2,
            packet.b3,
            {
                id: packet.id
            }
        );
    }

    getAsPacket (): Packet {
        return {
            id: this.id,
            m: this.matchName,
            r1: this.redOne,
            r2: this.redTwo,
            r3: this.redThree,
            b1: this.blueOne,
            b2: this.blueTwo,
            b3: this.blueThree
        };
    }
}