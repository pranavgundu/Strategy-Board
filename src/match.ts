import { v4 as uuidv4 } from "uuid";

export interface Packet {
    m: string,
    r1: string,
    r2: string,
    r3: string,
    b1: string,
    b2: string,
    b3: string,
    id: string,
    o: Optional
}

interface Optional {
    dim: {
        r1: { w: number, h: number },
        r2: { w: number, h: number },
        r3: { w: number, h: number },
        b1: { w: number, h: number },
        b2: { w: number, h: number },
        b3: { w: number, h: number },
    },
    a: {
        r1: { x: number, y: number, r: number },
        r2: { x: number, y: number, r: number },
        r3: { x: number, y: number, r: number },
        b1: { x: number, y: number, r: number },
        b2: { x: number, y: number, r: number },
        b3: { x: number, y: number, r: number },
        d: Array<[number, number]>,
        dx: Array<[number, number, number, number]>,
    },
    t: {
        r1: { x: number, y: number, r: number },
        r2: { x: number, y: number, r: number },
        r3: { x: number, y: number, r: number },
        b1: { x: number, y: number, r: number },
        b2: { x: number, y: number, r: number },
        b3: { x: number, y: number, r: number },
        d: Array<[number, number]>,
        dx: Array<[number, number, number, number]>,
    },
    e: {
        r1: { x: number, y: number, r: number },
        r2: { x: number, y: number, r: number },
        r3: { x: number, y: number, r: number },
        b1: { x: number, y: number, r: number },
        b2: { x: number, y: number, r: number },
        b3: { x: number, y: number, r: number },
        d: Array<[number, number]>,
        dx: Array<[number, number, number, number]>,
    }
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
        options?: Optional
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

    static fromPacket (packet: Packet) {
        return new Match(
            packet.m,
            packet.r1,
            packet.r2,
            packet.r3,
            packet.b1,
            packet.b2,
            packet.b3,
            packet.id,
            {
                dim: {
                    r1: packet.o.dim.r1,
                    r2: packet.o.dim.r2,
                    r3: packet.o.dim.r3,
                    b1: packet.o.dim.b1,
                    b2: packet.o.dim.b2,
                    b3: packet.o.dim.b3,
                },
                a: {
                    r1: packet.o.a.r1,
                    r2: packet.o.a.r2,
                    r3: packet.o.a.r3,
                    b1: packet.o.a.b1,
                    b2: packet.o.a.b2,
                    b3: packet.o.a.b3,
                    d: packet.o.a.d,
                    dx: packet.o.a.dx
                },
                t: {
                    r1: packet.o.t.r1,
                    r2: packet.o.t.r2,
                    r3: packet.o.t.r3,
                    b1: packet.o.t.b1,
                    b2: packet.o.t.b2,
                    b3: packet.o.t.b3,
                    d: packet.o.t.d,
                    dx: packet.o.t.dx
                },
                e: {
                    r1: packet.o.e.r1,
                    r2: packet.o.e.r2,
                    r3: packet.o.e.r3,
                    b1: packet.o.e.b1,
                    b2: packet.o.e.b2,
                    b3: packet.o.e.b3,
                    d: packet.o.e.d,
                    dx: packet.o.e.dx
                },
            }
        );
    }

    getAsPacket (): Packet {
        return {
            m: this.matchName,
            r1: this.redOne,
            r2: this.redTwo,
            r3: this.redThree,
            b1: this.blueOne,
            b2: this.blueTwo,
            b3: this.blueThree,
            id: this.id,
            o: {
                dim: {
                    r1: { w: this.auton.redOneRobot.w.toFixed(1), h: this.auton.redOneRobot.h.toFixed(1) },
                    r2: { w: this.auton.redTwoRobot.w.toFixed(1), h: this.auton.redTwoRobot.h.toFixed(1) },
                    r3: { w: this.auton.redThreeRobot.w.toFixed(1), h: this.auton.redThreeRobot.h.toFixed(1) },
                    b1: { w: this.auton.blueOneRobot.w.toFixed(1), h: this.auton.blueOneRobot.h.toFixed(1) },
                    b2: { w: this.auton.blueTwoRobot.w.toFixed(1), h: this.auton.blueTwoRobot.h.toFixed(1) },
                    b3: { w: this.auton.blueThreeRobot.w.toFixed(1), h: this.auton.blueThreeRobot.h.toFixed(1) },
                },
                a: {
                    r1: { x: this.auton.redOneRobot.x, y: this.auton.redOneRobot.y, r: this.auton.redOneRobot.r.toFixed(2) },
                    r2: { x: this.auton.redTwoRobot.x, y: this.auton.redTwoRobot.y, r: this.auton.redTwoRobot.r.toFixed(2) },
                    r3: { x: this.auton.redThreeRobot.x, y: this.auton.redThreeRobot.y, r: this.auton.redThreeRobot.r.toFixed(2) },
                    b1: { x: this.auton.blueOneRobot.x, y: this.auton.blueOneRobot.y, r: this.auton.blueOneRobot.r.toFixed(2) },
                    b2: { x: this.auton.blueTwoRobot.x, y: this.auton.blueTwoRobot.y, r: this.auton.blueTwoRobot.r.toFixed(2) },
                    b3: { x: this.auton.blueThreeRobot.x, y: this.auton.blueThreeRobot.y, r: this.auton.blueThreeRobot.r.toFixed(2) },
                    d: this.auton.drawing,
                    dx: this.auton.drawingBBox
                },
                t: {
                    r1: { x: this.teleop.redOneRobot.x, y: this.teleop.redOneRobot.y, r: this.teleop.redOneRobot.r.toFixed(2) },
                    r2: { x: this.teleop.redTwoRobot.x, y: this.teleop.redTwoRobot.y, r: this.teleop.redTwoRobot.r.toFixed(2) },
                    r3: { x: this.teleop.redThreeRobot.x, y: this.teleop.redThreeRobot.y, r: this.teleop.redThreeRobot.r.toFixed(2) },
                    b1: { x: this.teleop.blueOneRobot.x, y: this.teleop.blueOneRobot.y, r: this.teleop.blueOneRobot.r.toFixed(2) },
                    b2: { x: this.teleop.blueTwoRobot.x, y: this.teleop.blueTwoRobot.y, r: this.teleop.blueTwoRobot.r.toFixed(2) },
                    b3: { x: this.teleop.blueThreeRobot.x, y: this.teleop.blueThreeRobot.y, r: this.teleop.blueThreeRobot.r.toFixed(2) },
                    d: this.teleop.drawing,
                    dx: this.teleop.drawingBBox
                },
                e: {
                    r1: { x: this.endgame.redOneRobot.x, y: this.endgame.redOneRobot.y, r: this.endgame.redOneRobot.r.toFixed(2) },
                    r2: { x: this.endgame.redTwoRobot.x, y: this.endgame.redTwoRobot.y, r: this.endgame.redTwoRobot.r.toFixed(2) },
                    r3: { x: this.endgame.redThreeRobot.x, y: this.endgame.redThreeRobot.y, r: this.endgame.redThreeRobot.r.toFixed(2) },
                    b1: { x: this.endgame.blueOneRobot.x, y: this.endgame.blueOneRobot.y, r: this.endgame.blueOneRobot.r.toFixed(2) },
                    b2: { x: this.endgame.blueTwoRobot.x, y: this.endgame.blueTwoRobot.y, r: this.endgame.blueTwoRobot.r.toFixed(2) },
                    b3: { x: this.endgame.blueThreeRobot.x, y: this.endgame.blueThreeRobot.y, r: this.endgame.blueThreeRobot.r.toFixed(2) },
                    d: this.endgame.drawing,
                    dx: this.endgame.drawingBBox
                },
            }
        };
    }
}