import { v4 as uuidv4 } from "uuid";

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
        drawing: [],
        drawingBBox: []
    }

    public teleop: any = {
        redOneRobot: { x: 2055, y: 505, w: 152.4, h: 152.4, r: 0 },
        redTwoRobot: { x: 2055, y: 805, w: 152.4, h: 152.4, r: 0 },
        redThreeRobot: { x: 2055, y: 1105, w: 152.4, h: 152.4, r: 0 },
        blueOneRobot: { x: 1455, y: 505, w: 152.4, h: 152.4, r: 0 },
        blueTwoRobot: { x: 1455, y: 805, w: 152.4, h: 152.4, r: 0 },
        blueThreeRobot: { x: 1455, y: 1105, w: 152.4, h: 152.4, r: 0 },
        drawing: [],
        drawingBBox: []
    }

    public endgame: any = {
        redOneRobot: { x: 2055, y: 505, w: 152.4, h: 152.4, r: 0 },
        redTwoRobot: { x: 2055, y: 805, w: 152.4, h: 152.4, r: 0 },
        redThreeRobot: { x: 2055, y: 1105, w: 152.4, h: 152.4, r: 0 },
        blueOneRobot: { x: 1455, y: 505, w: 152.4, h: 152.4, r: 0 },
        blueTwoRobot: { x: 1455, y: 805, w: 152.4, h: 152.4, r: 0 },
        blueThreeRobot: { x: 1455, y: 1105, w: 152.4, h: 152.4, r: 0 },
        drawing: [],
        drawingBBox: []
    }

    constructor (
        matchName: string,
        redOne: string,
        redTwo: string,
        redThree: string,
        blueOne: string,
        blueTwo: string,
        blueThree: string,
        id?: string,
        options?: any
    ) {
        this.matchName = matchName;
        this.redOne = redOne;
        this.redTwo = redTwo;
        this.redThree = redThree;
        this.blueOne = blueOne;
        this.blueTwo = blueTwo;
        this.blueThree = blueThree;

        this.id = id ?? uuidv4();

        if (options) {
            this.auton.drawing = options.a.d;
            this.teleop.drawing = options.t.d;
            this.endgame.drawing = options.e.d;
            this.auton.drawingBBox = options.a.dx;
            this.teleop.drawingBBox = options.t.dx;
            this.endgame.drawingBBox = options.e.dx;

            this.auton.redOneRobot = {
                x: options.a.r1.x,
                y: options.a.r1.y,
                r: options.a.r1.r,
                w: options.dim.r1.w,
                h: options.dim.r1.h
            };
            this.auton.redTwoRobot = {
                x: options.a.r2.x,
                y: options.a.r2.y,
                r: options.a.r2.r,
                w: options.dim.r2.w,
                h: options.dim.r2.h
            };
            this.auton.redThreeRobot = {
                x: options.a.r3.x,
                y: options.a.r3.y,
                r: options.a.r3.r,
                w: options.dim.r3.w,
                h: options.dim.r3.h
            };
            this.auton.blueOneRobot = {
                x: options.a.b1.x,
                y: options.a.b1.y,
                r: options.a.b1.r,
                w: options.dim.b1.w,
                h: options.dim.b1.h
            };
            this.auton.blueTwoRobot = {
                x: options.a.b2.x,
                y: options.a.b2.y,
                r: options.a.b2.r,
                w: options.dim.b2.w,
                h: options.dim.b2.h
            };
            this.auton.blueThreeRobot = {
                x: options.a.b3.x,
                y: options.a.b3.y,
                r: options.a.b3.r,
                w: options.dim.b3.w,
                h: options.dim.b3.h
            };


            this.teleop.redOneRobot = {
                x: options.t.r1.x,
                y: options.t.r1.y,
                r: options.t.r1.r,
                w: options.dim.r1.w,
                h: options.dim.r1.h
            };
            this.teleop.redTwoRobot = {
                x: options.t.r2.x,
                y: options.t.r2.y,
                r: options.t.r2.r,
                w: options.dim.r2.w,
                h: options.dim.r2.h
            };
            this.teleop.redThreeRobot = {
                x: options.t.r3.x,
                y: options.t.r3.y,
                r: options.t.r3.r,
                w: options.dim.r3.w,
                h: options.dim.r3.h
            };
            this.teleop.blueOneRobot = {
                x: options.t.b1.x,
                y: options.t.b1.y,
                r: options.t.b1.r,
                w: options.dim.b1.w,
                h: options.dim.b1.h
            };
            this.teleop.blueTwoRobot = {
                x: options.t.b2.x,
                y: options.t.b2.y,
                r: options.t.b2.r,
                w: options.dim.b2.w,
                h: options.dim.b2.h
            };
            this.teleop.blueThreeRobot = {
                x: options.t.b3.x,
                y: options.t.b3.y,
                r: options.t.b3.r,
                w: options.dim.b3.w,
                h: options.dim.b3.h
            };


            this.endgame.redOneRobot = {
                x: options.e.r1.x,
                y: options.e.r1.y,
                r: options.e.r1.r,
                w: options.dim.r1.w,
                h: options.dim.r1.h
            };
            this.endgame.redTwoRobot = {
                x: options.e.r2.x,
                y: options.e.r2.y,
                r: options.e.r2.r,
                w: options.dim.r2.w,
                h: options.dim.r2.h
            };
            this.endgame.redThreeRobot = {
                x: options.e.r3.x,
                y: options.e.r3.y,
                r: options.e.r3.r,
                w: options.dim.r3.w,
                h: options.dim.r3.h
            };
            this.endgame.blueOneRobot = {
                x: options.e.b1.x,
                y: options.e.b1.y,
                r: options.e.b1.r,
                w: options.dim.b1.w,
                h: options.dim.b1.h
            };
            this.endgame.blueTwoRobot = {
                x: options.e.b2.x,
                y: options.e.b2.y,
                r: options.e.b2.r,
                w: options.dim.b2.w,
                h: options.dim.b2.h
            };
            this.endgame.blueThreeRobot = {
                x: options.e.b3.x,
                y: options.e.b3.y,
                r: options.e.b3.r,
                w: options.dim.b3.w,
                h: options.dim.b3.h
            };
        }
    }

    static fromPacket (packet) {
        return new Match(
            packet[0],
            packet[1],
            packet[2],
            packet[3],
            packet[4],
            packet[5],
            packet[6],
            packet[7],
            {
                dim: {
                    r1: { w: packet[8][0][0][0], h: packet[8][0][0][1] },
                    r2: { w: packet[8][0][1][0], h: packet[8][0][1][1] },
                    r3: { w: packet[8][0][2][0], h: packet[8][0][2][1] },
                    b1: { w: packet[8][0][3][0], h: packet[8][0][3][1] },
                    b2: { w: packet[8][0][4][0], h: packet[8][0][4][1] },
                    b3: { w: packet[8][0][5][0], h: packet[8][0][5][1] },
                },
                a: {
                    r1: Match.robotFromArrayPacket(packet[8][1][0]),
                    r2: Match.robotFromArrayPacket(packet[8][1][1]),
                    r3: Match.robotFromArrayPacket(packet[8][1][2]),
                    b1: Match.robotFromArrayPacket(packet[8][1][3]),
                    b2: Match.robotFromArrayPacket(packet[8][1][4]),
                    b3: Match.robotFromArrayPacket(packet[8][1][5]),
                    d: packet[8][1][6],
                    dx: packet[8][1][7]
                },
                t: {
                    r1: Match.robotFromArrayPacket(packet[8][2][0]),
                    r2: Match.robotFromArrayPacket(packet[8][2][1]),
                    r3: Match.robotFromArrayPacket(packet[8][2][2]),
                    b1: Match.robotFromArrayPacket(packet[8][2][3]),
                    b2: Match.robotFromArrayPacket(packet[8][2][4]),
                    b3: Match.robotFromArrayPacket(packet[8][2][5]),
                    d: packet[8][2][6],
                    dx: packet[8][2][7]
                },
                e: {
                    r1: Match.robotFromArrayPacket(packet[8][3][0]),
                    r2: Match.robotFromArrayPacket(packet[8][3][1]),
                    r3: Match.robotFromArrayPacket(packet[8][3][2]),
                    b1: Match.robotFromArrayPacket(packet[8][3][3]),
                    b2: Match.robotFromArrayPacket(packet[8][3][4]),
                    b3: Match.robotFromArrayPacket(packet[8][3][5]),
                    d: packet[8][3][6],
                    dx: packet[8][3][7]
                },
            }
        );
    }

    static robotFromArrayPacket (array) {
        return {
            x: array[0],
            y: array[1],
            r: array[2]
        }
    }

    getAsPacket (): any {
        return [
            this.matchName,
            this.redOne,
            this.redTwo,
            this.redThree,
            this.blueOne,
            this.blueTwo,
            this.blueThree,
            this.id,
            [
                [
                    [ Number(this.auton.redOneRobot.w.toFixed(1)), Number(this.auton.redOneRobot.h.toFixed(1)) ],
                    [ Number(this.auton.redTwoRobot.w.toFixed(1)), Number(this.auton.redTwoRobot.h.toFixed(1)) ],
                    [ Number(this.auton.redThreeRobot.w.toFixed(1)), Number(this.auton.redThreeRobot.h.toFixed(1)) ],
                    [ Number(this.auton.blueOneRobot.w.toFixed(1)), Number(this.auton.blueOneRobot.h.toFixed(1)) ],
                    [ Number(this.auton.blueTwoRobot.w.toFixed(1)), Number(this.auton.blueTwoRobot.h.toFixed(1)) ],
                    [ Number(this.auton.blueThreeRobot.w.toFixed(1)), Number(this.auton.blueThreeRobot.h.toFixed(1)) ],
                ],
                [
                    [ this.auton.redOneRobot.x, this.auton.redOneRobot.y, Number(this.auton.redOneRobot.r.toFixed(2)) ],
                    [ this.auton.redTwoRobot.x, this.auton.redTwoRobot.y, Number(this.auton.redTwoRobot.r.toFixed(2)) ],
                    [ this.auton.redThreeRobot.x, this.auton.redThreeRobot.y, Number(this.auton.redThreeRobot.r.toFixed(2)) ],
                    [ this.auton.blueOneRobot.x, this.auton.blueOneRobot.y, Number(this.auton.blueOneRobot.r.toFixed(2)) ],
                    [ this.auton.blueTwoRobot.x, this.auton.blueTwoRobot.y, Number(this.auton.blueTwoRobot.r.toFixed(2)) ],
                    [ this.auton.blueThreeRobot.x, this.auton.blueThreeRobot.y, Number(this.auton.blueThreeRobot.r.toFixed(2)) ],
                    this.auton.drawing,
                    this.auton.drawingBBox
                ],
                [
                    [ this.teleop.redOneRobot.x, this.teleop.redOneRobot.y, Number(this.teleop.redOneRobot.r.toFixed(2)) ],
                    [ this.teleop.redTwoRobot.x, this.teleop.redTwoRobot.y, Number(this.teleop.redTwoRobot.r.toFixed(2)) ],
                    [ this.teleop.redThreeRobot.x, this.teleop.redThreeRobot.y, Number(this.teleop.redThreeRobot.r.toFixed(2)) ],
                    [ this.teleop.blueOneRobot.x, this.teleop.blueOneRobot.y, Number(this.teleop.blueOneRobot.r.toFixed(2)) ],
                    [ this.teleop.blueTwoRobot.x, this.teleop.blueTwoRobot.y, Number(this.teleop.blueTwoRobot.r.toFixed(2)) ],
                    [ this.teleop.blueThreeRobot.x, this.teleop.blueThreeRobot.y, Number(this.teleop.blueThreeRobot.r.toFixed(2)) ],
                    this.teleop.drawing,
                    this.teleop.drawingBBox
                ],
                [
                    [ this.endgame.redOneRobot.x, this.endgame.redOneRobot.y, Number(this.endgame.redOneRobot.r.toFixed(2)) ],
                    [ this.endgame.redTwoRobot.x, this.endgame.redTwoRobot.y, Number(this.endgame.redTwoRobot.r.toFixed(2)) ],
                    [ this.endgame.redThreeRobot.x, this.endgame.redThreeRobot.y, Number(this.endgame.redThreeRobot.r.toFixed(2)) ],
                    [ this.endgame.blueOneRobot.x, this.endgame.blueOneRobot.y, Number(this.endgame.blueOneRobot.r.toFixed(2)) ],
                    [ this.endgame.blueTwoRobot.x, this.endgame.blueTwoRobot.y, Number(this.endgame.blueTwoRobot.r.toFixed(2)) ],
                    [ this.endgame.blueThreeRobot.x, this.endgame.blueThreeRobot.y, Number(this.endgame.blueThreeRobot.r.toFixed(2)) ],
                    this.endgame.drawing,
                    this.endgame.drawingBBox
                ],
            ]
        ];
    }
}