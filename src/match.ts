import { v4 as uuidv4 } from "uuid";

// the match class represents a robotics match with teams and phases

interface RobotPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

interface PhaseData {
  redOneRobot: RobotPosition;
  redTwoRobot: RobotPosition;
  redThreeRobot: RobotPosition;
  blueOneRobot: RobotPosition;
  blueTwoRobot: RobotPosition;
  blueThreeRobot: RobotPosition;
  drawing: DrawingStroke[];
  drawingBBox: BoundingBox[];
  textAnnotations: TextAnnotation[];
  checkboxes: CheckboxAnnotation[];
}

type DrawingStroke = [number, ...Array<[number, number]>];
type BoundingBox = [number, number, number, number];
type TextAnnotation = [number, number, number, string];
type CheckboxAnnotation = [number, number, number, boolean]; // x, y, color, checked

interface MatchOptions {
  dim: {
    r1: { w: number; h: number };
    r2: { w: number; h: number };
    r3: { w: number; h: number };
    b1: { w: number; h: number };
    b2: { w: number; h: number };
    b3: { w: number; h: number };
  };
  a: PhaseOptions;
  t: PhaseOptions;
  e: PhaseOptions;
  n?: PhaseOptions;
}

interface PhaseOptions {
  r1: { x: number; y: number; r: number };
  r2: { x: number; y: number; r: number };
  r3: { x: number; y: number; r: number };
  b1: { x: number; y: number; r: number };
  b2: { x: number; y: number; r: number };
  b3: { x: number; y: number; r: number };
  d: DrawingStroke[];
  dx: BoundingBox[];
  txt?: TextAnnotation[];
  cb?: CheckboxAnnotation[];
}

const DEFAULT_ROBOT_WIDTH = 152.4;
const DEFAULT_ROBOT_HEIGHT = 152.4;
const DEFAULT_ROBOT_ROTATION = 0;

const DEFAULT_RED_POSITIONS = {
  one: { x: 2055, y: 455 },
  two: { x: 2055, y: 805 },
  three: { x: 2055, y: 1155 },
};

const DEFAULT_BLUE_POSITIONS = {
  one: { x: 1455, y: 455 },
  two: { x: 1455, y: 805 },
  three: { x: 1455, y: 1155 },
};

export class Match {
  public readonly matchName: string;
  public readonly redOne: string;
  public readonly redTwo: string;
  public readonly redThree: string;
  public readonly blueOne: string;
  public readonly blueTwo: string;
  public readonly blueThree: string;
  public readonly id: string;

  public auto: PhaseData;
  public teleop: PhaseData;
  public endgame: PhaseData;
  public notes: PhaseData;

  constructor(
    matchName: string,
    redOne: string,
    redTwo: string,
    redThree: string,
    blueOne: string,
    blueTwo: string,
    blueThree: string,
    id?: string,
    options?: MatchOptions,
  ) {
    this.matchName = matchName;
    this.redOne = redOne;
    this.redTwo = redTwo;
    this.redThree = redThree;
    this.blueOne = blueOne;
    this.blueTwo = blueTwo;
    this.blueThree = blueThree;
    this.id = id ?? uuidv4();

    this.auto = this.createDefaultPhaseData();
    this.teleop = this.createDefaultPhaseData();
    this.endgame = this.createDefaultPhaseData();
    this.notes = this.createDefaultPhaseData();

    if (options) {
      this.applyOptions(options);
    }
  }

  private createDefaultPhaseData(): PhaseData {
    return {
      redOneRobot: this.createDefaultRobotPosition(
        DEFAULT_RED_POSITIONS.one.x,
        DEFAULT_RED_POSITIONS.one.y,
      ),
      redTwoRobot: this.createDefaultRobotPosition(
        DEFAULT_RED_POSITIONS.two.x,
        DEFAULT_RED_POSITIONS.two.y,
      ),
      redThreeRobot: this.createDefaultRobotPosition(
        DEFAULT_RED_POSITIONS.three.x,
        DEFAULT_RED_POSITIONS.three.y,
      ),
      blueOneRobot: this.createDefaultRobotPosition(
        DEFAULT_BLUE_POSITIONS.one.x,
        DEFAULT_BLUE_POSITIONS.one.y,
      ),
      blueTwoRobot: this.createDefaultRobotPosition(
        DEFAULT_BLUE_POSITIONS.two.x,
        DEFAULT_BLUE_POSITIONS.two.y,
      ),
      blueThreeRobot: this.createDefaultRobotPosition(
        DEFAULT_BLUE_POSITIONS.three.x,
        DEFAULT_BLUE_POSITIONS.three.y,
      ),
      drawing: [],
      drawingBBox: [],
      textAnnotations: [],
      checkboxes: [],
    };
  }

  private createDefaultRobotPosition(x: number, y: number): RobotPosition {
    return {
      x,
      y,
      w: DEFAULT_ROBOT_WIDTH,
      h: DEFAULT_ROBOT_HEIGHT,
      r: DEFAULT_ROBOT_ROTATION,
    };
  }

  private applyOptions(options: MatchOptions): void {
    this.applyPhaseOptions(this.auto, options.a, options.dim);
    this.applyPhaseOptions(this.teleop, options.t, options.dim);
    this.applyPhaseOptions(this.endgame, options.e, options.dim);
    if (options.n) {
      this.applyPhaseOptions(this.notes, options.n, options.dim);
    }
  }

  private applyPhaseOptions(
    phase: PhaseData,
    phaseOptions: PhaseOptions,
    dimensions: MatchOptions["dim"],
  ): void {
    phase.drawing = phaseOptions.d;
    phase.drawingBBox = phaseOptions.dx;
    phase.textAnnotations = phaseOptions.txt || [];
    phase.checkboxes = phaseOptions.cb || [];

    phase.redOneRobot = {
      x: phaseOptions.r1.x,
      y: phaseOptions.r1.y,
      r: phaseOptions.r1.r,
      w: dimensions.r1.w,
      h: dimensions.r1.h,
    };
    phase.redTwoRobot = {
      x: phaseOptions.r2.x,
      y: phaseOptions.r2.y,
      r: phaseOptions.r2.r,
      w: dimensions.r2.w,
      h: dimensions.r2.h,
    };
    phase.redThreeRobot = {
      x: phaseOptions.r3.x,
      y: phaseOptions.r3.y,
      r: phaseOptions.r3.r,
      w: dimensions.r3.w,
      h: dimensions.r3.h,
    };
    phase.blueOneRobot = {
      x: phaseOptions.b1.x,
      y: phaseOptions.b1.y,
      r: phaseOptions.b1.r,
      w: dimensions.b1.w,
      h: dimensions.b1.h,
    };
    phase.blueTwoRobot = {
      x: phaseOptions.b2.x,
      y: phaseOptions.b2.y,
      r: phaseOptions.b2.r,
      w: dimensions.b2.w,
      h: dimensions.b2.h,
    };
    phase.blueThreeRobot = {
      x: phaseOptions.b3.x,
      y: phaseOptions.b3.y,
      r: phaseOptions.b3.r,
      w: dimensions.b3.w,
      h: dimensions.b3.h,
    };
  }

  static fromPacket(packet: any): Match {
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
          dx: packet[8][1][7],
        },
        t: {
          r1: Match.robotFromArrayPacket(packet[8][2][0]),
          r2: Match.robotFromArrayPacket(packet[8][2][1]),
          r3: Match.robotFromArrayPacket(packet[8][2][2]),
          b1: Match.robotFromArrayPacket(packet[8][2][3]),
          b2: Match.robotFromArrayPacket(packet[8][2][4]),
          b3: Match.robotFromArrayPacket(packet[8][2][5]),
          d: packet[8][2][6],
          dx: packet[8][2][7],
        },
        e: {
          r1: Match.robotFromArrayPacket(packet[8][3][0]),
          r2: Match.robotFromArrayPacket(packet[8][3][1]),
          r3: Match.robotFromArrayPacket(packet[8][3][2]),
          b1: Match.robotFromArrayPacket(packet[8][3][3]),
          b2: Match.robotFromArrayPacket(packet[8][3][4]),
          b3: Match.robotFromArrayPacket(packet[8][3][5]),
          d: packet[8][3][6],
          dx: packet[8][3][7],
        },
      },
    );
  }

  static robotFromArrayPacket(array: any[]): {
    x: number;
    y: number;
    r: number;
  } {
    return {
      x: array[0],
      y: array[1],
      r: array[2],
    };
  }

  getAsPacket(): any {
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
          [
            Number(this.auto.redOneRobot.w.toFixed(1)),
            Number(this.auto.redOneRobot.h.toFixed(1)),
          ],
          [
            Number(this.auto.redTwoRobot.w.toFixed(1)),
            Number(this.auto.redTwoRobot.h.toFixed(1)),
          ],
          [
            Number(this.auto.redThreeRobot.w.toFixed(1)),
            Number(this.auto.redThreeRobot.h.toFixed(1)),
          ],
          [
            Number(this.auto.blueOneRobot.w.toFixed(1)),
            Number(this.auto.blueOneRobot.h.toFixed(1)),
          ],
          [
            Number(this.auto.blueTwoRobot.w.toFixed(1)),
            Number(this.auto.blueTwoRobot.h.toFixed(1)),
          ],
          [
            Number(this.auto.blueThreeRobot.w.toFixed(1)),
            Number(this.auto.blueThreeRobot.h.toFixed(1)),
          ],
        ],
        [
          [
            this.auto.redOneRobot.x,
            this.auto.redOneRobot.y,
            Number(this.auto.redOneRobot.r.toFixed(2)),
          ],
          [
            this.auto.redTwoRobot.x,
            this.auto.redTwoRobot.y,
            Number(this.auto.redTwoRobot.r.toFixed(2)),
          ],
          [
            this.auto.redThreeRobot.x,
            this.auto.redThreeRobot.y,
            Number(this.auto.redThreeRobot.r.toFixed(2)),
          ],
          [
            this.auto.blueOneRobot.x,
            this.auto.blueOneRobot.y,
            Number(this.auto.blueOneRobot.r.toFixed(2)),
          ],
          [
            this.auto.blueTwoRobot.x,
            this.auto.blueTwoRobot.y,
            Number(this.auto.blueTwoRobot.r.toFixed(2)),
          ],
          [
            this.auto.blueThreeRobot.x,
            this.auto.blueThreeRobot.y,
            Number(this.auto.blueThreeRobot.r.toFixed(2)),
          ],
          this.auto.drawing,
          this.auto.drawingBBox,
          this.auto.textAnnotations,
        ],
        [
          [
            this.teleop.redOneRobot.x,
            this.teleop.redOneRobot.y,
            Number(this.teleop.redOneRobot.r.toFixed(2)),
          ],
          [
            this.teleop.redTwoRobot.x,
            this.teleop.redTwoRobot.y,
            Number(this.teleop.redTwoRobot.r.toFixed(2)),
          ],
          [
            this.teleop.redThreeRobot.x,
            this.teleop.redThreeRobot.y,
            Number(this.teleop.redThreeRobot.r.toFixed(2)),
          ],
          [
            this.teleop.blueOneRobot.x,
            this.teleop.blueOneRobot.y,
            Number(this.teleop.blueOneRobot.r.toFixed(2)),
          ],
          [
            this.teleop.blueTwoRobot.x,
            this.teleop.blueTwoRobot.y,
            Number(this.teleop.blueTwoRobot.r.toFixed(2)),
          ],
          [
            this.teleop.blueThreeRobot.x,
            this.teleop.blueThreeRobot.y,
            Number(this.teleop.blueThreeRobot.r.toFixed(2)),
          ],
          this.teleop.drawing,
          this.teleop.drawingBBox,
          this.teleop.textAnnotations,
        ],
        [
          [
            this.endgame.redOneRobot.x,
            this.endgame.redOneRobot.y,
            Number(this.endgame.redOneRobot.r.toFixed(2)),
          ],
          [
            this.endgame.redTwoRobot.x,
            this.endgame.redTwoRobot.y,
            Number(this.endgame.redTwoRobot.r.toFixed(2)),
          ],
          [
            this.endgame.redThreeRobot.x,
            this.endgame.redThreeRobot.y,
            Number(this.endgame.redThreeRobot.r.toFixed(2)),
          ],
          [
            this.endgame.blueOneRobot.x,
            this.endgame.blueOneRobot.y,
            Number(this.endgame.blueOneRobot.r.toFixed(2)),
          ],
          [
            this.endgame.blueTwoRobot.x,
            this.endgame.blueTwoRobot.y,
            Number(this.endgame.blueTwoRobot.r.toFixed(2)),
          ],
          [
            this.endgame.blueThreeRobot.x,
            this.endgame.blueThreeRobot.y,
            Number(this.endgame.blueThreeRobot.r.toFixed(2)),
          ],
          this.endgame.drawing,
          this.endgame.drawingBBox,
          this.endgame.textAnnotations,
        ],
        [
          [
            this.notes.redOneRobot.x,
            this.notes.redOneRobot.y,
            Number(this.notes.redOneRobot.r.toFixed(2)),
          ],
          [
            this.notes.redTwoRobot.x,
            this.notes.redTwoRobot.y,
            Number(this.notes.redTwoRobot.r.toFixed(2)),
          ],
          [
            this.notes.redThreeRobot.x,
            this.notes.redThreeRobot.y,
            Number(this.notes.redThreeRobot.r.toFixed(2)),
          ],
          [
            this.notes.blueOneRobot.x,
            this.notes.blueOneRobot.y,
            Number(this.notes.blueOneRobot.r.toFixed(2)),
          ],
          [
            this.notes.blueTwoRobot.x,
            this.notes.blueTwoRobot.y,
            Number(this.notes.blueTwoRobot.r.toFixed(2)),
          ],
          [
            this.notes.blueThreeRobot.x,
            this.notes.blueThreeRobot.y,
            Number(this.notes.blueThreeRobot.r.toFixed(2)),
          ],
          this.notes.drawing,
          this.notes.drawingBBox,
          this.notes.textAnnotations,
        ],
      ],
    ];
  }
}
