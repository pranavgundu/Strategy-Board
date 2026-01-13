import { v4 as uuidv4 } from "uuid";
import { getRobotPositionsForYear } from "./manager.ts";

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
  checkboxes: CheckboxAnnotation[];
}

type DrawingStroke = [number, ...Array<[number, number]>];
type BoundingBox = [number, number, number, number];
type CheckboxAnnotation = [number, number, number, boolean];

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
  cb?: CheckboxAnnotation[];
}

const DEFAULT_ROBOT_WIDTH = 152.4;
const DEFAULT_ROBOT_HEIGHT = 152.4;
const DEFAULT_ROBOT_ROTATION = 0;

export class Match {
  public readonly matchName: string;
  public readonly redOne: string;
  public readonly redTwo: string;
  public readonly redThree: string;
  public readonly blueOne: string;
  public readonly blueTwo: string;
  public readonly blueThree: string;
  public readonly id: string;

  public readonly tbaEventKey?: string;
  public readonly tbaMatchKey?: string;
  public readonly tbaYear?: number;
  public fieldMetadata?: { selectedFieldYear?: number | null };

  public auto: PhaseData;
  public teleop: PhaseData;
  public endgame: PhaseData;
  public notes: PhaseData;

  /**
   * Creates a new Match instance.
   *
   * @param matchName - The name of the match
   * @param redOne - Red alliance robot 1 team number
   * @param redTwo - Red alliance robot 2 team number
   * @param redThree - Red alliance robot 3 team number
   * @param blueOne - Blue alliance robot 1 team number
   * @param blueTwo - Blue alliance robot 2 team number
   * @param blueThree - Blue alliance robot 3 team number
   * @param id - Optional unique identifier for the match. If not provided, generates a UUID.
   * @param options - Optional match configuration including robot dimensions and phase data
   * @param tbaEventKey - Optional TBA event key for Statbotics integration
   * @param tbaMatchKey - Optional TBA match key for Statbotics integration
   * @param tbaYear - Optional year for year-specific field and robot positioning
   */
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
    tbaEventKey?: string,
    tbaMatchKey?: string,
    tbaYear?: number,
  ) {
    this.matchName = matchName;
    this.redOne = redOne;
    this.redTwo = redTwo;
    this.redThree = redThree;
    this.blueOne = blueOne;
    this.blueTwo = blueTwo;
    this.blueThree = blueThree;
    this.id = id ?? uuidv4();
    this.tbaEventKey = tbaEventKey;
    this.tbaMatchKey = tbaMatchKey;
    this.tbaYear = tbaYear;

    const positions = getRobotPositionsForYear(tbaYear);

    this.auto = this.createDefaultPhaseData(positions);
    this.teleop = this.createDefaultPhaseData(positions);
    this.endgame = this.createDefaultPhaseData(positions);
    this.notes = this.createDefaultPhaseData(positions);

    if (options) {
      this.applyOptions(options);
    }
  }

  /**
   * Creates default phase data with robot positions initialized to year-specific starting positions.
   *
   * @param positions - Year-specific robot starting positions for red and blue alliances
   * @returns A PhaseData object with all robots positioned at their starting locations
   */
  private createDefaultPhaseData(
    positions: ReturnType<typeof getRobotPositionsForYear>,
  ): PhaseData {
    return {
      redOneRobot: this.createDefaultRobotPosition(
        positions.red.one.x,
        positions.red.one.y,
      ),
      redTwoRobot: this.createDefaultRobotPosition(
        positions.red.two.x,
        positions.red.two.y,
      ),
      redThreeRobot: this.createDefaultRobotPosition(
        positions.red.three.x,
        positions.red.three.y,
      ),
      blueOneRobot: this.createDefaultRobotPosition(
        positions.blue.one.x,
        positions.blue.one.y,
      ),
      blueTwoRobot: this.createDefaultRobotPosition(
        positions.blue.two.x,
        positions.blue.two.y,
      ),
      blueThreeRobot: this.createDefaultRobotPosition(
        positions.blue.three.x,
        positions.blue.three.y,
      ),
      drawing: [],
      drawingBBox: [],
      checkboxes: [],
    };
  }

  /**
   * Creates a default robot position with standard dimensions and rotation.
   *
   * @param x - The x-coordinate position on the field
   * @param y - The y-coordinate position on the field
   * @returns A RobotPosition object with default width, height, and rotation
   */
  private createDefaultRobotPosition(x: number, y: number): RobotPosition {
    return {
      x,
      y,
      w: DEFAULT_ROBOT_WIDTH,
      h: DEFAULT_ROBOT_HEIGHT,
      r: DEFAULT_ROBOT_ROTATION,
    };
  }

  /**
   * Applies match options to all phases (auto, teleop, endgame, notes).
   *
   * @param options - Match options containing phase-specific data and robot dimensions
   */
  private applyOptions(options: MatchOptions): void {
    this.applyPhaseOptions(this.auto, options.a, options.dim);
    this.applyPhaseOptions(this.teleop, options.t, options.dim);
    this.applyPhaseOptions(this.endgame, options.e, options.dim);
    if (options.n) {
      this.applyPhaseOptions(this.notes, options.n, options.dim);
    }
  }

  /**
   * Applies phase-specific options including robot positions, drawings, and dimensions.
   *
   * @param phase - The phase data object to update
   * @param phaseOptions - Phase-specific options containing robot positions and drawing data
   * @param dimensions - Robot dimensions for all six robots
   */
  private applyPhaseOptions(
    phase: PhaseData,
    phaseOptions: PhaseOptions,
    dimensions: MatchOptions["dim"],
  ): void {
    phase.drawing = phaseOptions.d;
    phase.drawingBBox = phaseOptions.dx;
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

  /**
   * Creates a Match instance from a serialized packet.
   *
   * @param packet - The serialized match data array.
   * @returns A new Match instance.
   */
  static fromPacket(packet: any): Match {
    const m = new Match(
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
          cb: packet[8][1][8] || [],
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
          cb: packet[8][2][8] || [],
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
          cb: packet[8][3][8] || [],
        },
        n: packet[8][4]
          ? {
              r1: Match.robotFromArrayPacket(packet[8][4][0]),
              r2: Match.robotFromArrayPacket(packet[8][4][1]),
              r3: Match.robotFromArrayPacket(packet[8][4][2]),
              b1: Match.robotFromArrayPacket(packet[8][4][3]),
              b2: Match.robotFromArrayPacket(packet[8][4][4]),
              b3: Match.robotFromArrayPacket(packet[8][4][5]),
              d: packet[8][4][6],
              dx: packet[8][4][7],
              cb: packet[8][4][8] || [],
            }
          : undefined,
      },
      packet[9],
      packet[10],
      packet[11],
    );
    // Optional field metadata lives at the next index (if present)
    if (packet.length > 12 && packet[12]) {
      m.fieldMetadata = packet[12];
    }
    return m;
  }

  /**
   * Converts an array packet to robot position data.
   *
   * @param array - Array containing x, y, and rotation values.
   * @returns Object with x, y, and r properties.
   */
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

  /**
   * Serializes the match to a packet format for storage or transmission.
   *
   * @returns Serialized match data as an array.
   */
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
          this.auto.checkboxes,
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
          this.teleop.checkboxes,
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
          this.endgame.checkboxes,
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
          this.notes.checkboxes,
        ],
      ],
      this.tbaEventKey,
      this.tbaMatchKey,
      this.tbaYear,
      // Optional final element for field metadata (kept for backwards compatibility)
      this.fieldMetadata || null,
    ];
  }

  /**
   * Checks if this match was imported from TBA.
   *
   * @returns True if the match has TBA metadata, false otherwise.
   */
  public isFromTBA(): boolean {
    return !!(this.tbaEventKey && this.tbaMatchKey && this.tbaYear);
  }
}
