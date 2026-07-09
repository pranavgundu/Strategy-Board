import { v4 as uuidv4 } from "uuid";
import { getRobotPositionsForYear } from "./manager.ts";
import { matchStateToPacket, packetToMatchFields } from "./wasm/index.ts";

export interface RobotPosition {
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
  tr?: PhaseOptions;
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
  public matchName: string;
  public redOne: string;
  public redTwo: string;
  public redThree: string;
  public blueOne: string;
  public blueTwo: string;
  public blueThree: string;
  public readonly id: string;

  public readonly tbaEventKey?: string;
  public readonly tbaMatchKey?: string;
  public readonly tbaYear?: number;
  public fieldMetadata?: { selectedFieldYear?: number | null };

  public auto: PhaseData;
  public teleop: PhaseData;
  public transition: PhaseData;
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
    this.transition = this.createDefaultPhaseData(positions);
    this.endgame = this.createDefaultPhaseData(positions);
    this.notes = this.createDefaultPhaseData(positions);

    if (options) {
      this.applyOptions(options);
    }
  }

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
    if (options.tr) {
      this.applyPhaseOptions(this.transition, options.tr, options.dim);
    }
  }

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

  public updateInfo(
    matchName: string,
    redOne: string,
    redTwo: string,
    redThree: string,
    blueOne: string,
    blueTwo: string,
    blueThree: string,
  ): void {
    this.matchName = matchName;
    this.redOne = redOne;
    this.redTwo = redTwo;
    this.redThree = redThree;
    this.blueOne = blueOne;
    this.blueTwo = blueTwo;
    this.blueThree = blueThree;
  }

  static fromPacket(packet: any): Match {
    const fields: any = packetToMatchFields(packet);
    const options: MatchOptions = fields.options;
    const m = new Match(
      fields.matchName,
      fields.redOne,
      fields.redTwo,
      fields.redThree,
      fields.blueOne,
      fields.blueTwo,
      fields.blueThree,
      fields.id ?? undefined,
      options,
      fields.tbaEventKey ?? undefined,
      fields.tbaMatchKey ?? undefined,
      fields.tbaYear ?? undefined,
    );
    if (fields.fieldMetadata) {
      m.fieldMetadata = fields.fieldMetadata;
    }
    return m;
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
    return matchStateToPacket({
      matchName: this.matchName,
      redOne: this.redOne,
      redTwo: this.redTwo,
      redThree: this.redThree,
      blueOne: this.blueOne,
      blueTwo: this.blueTwo,
      blueThree: this.blueThree,
      id: this.id,
      auto: this.auto,
      teleop: this.teleop,
      transition: this.transition,
      endgame: this.endgame,
      notes: this.notes,
      tbaEventKey: this.tbaEventKey ?? null,
      tbaMatchKey: this.tbaMatchKey ?? null,
      tbaYear: this.tbaYear ?? null,
      fieldMetadata: this.fieldMetadata || null,
    });
  }

  public isFromTBA(): boolean {
    return !!(this.tbaEventKey && this.tbaMatchKey && this.tbaYear);
  }
}
