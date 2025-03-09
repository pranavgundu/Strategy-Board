import { Match } from "@/match.ts";
import { Model } from "@/model.ts";

const background = <HTMLCanvasElement>document.getElementById("whiteboard-canvas-background");
const items = <HTMLCanvasElement>document.getElementById("whiteboard-canvas-items");
const drawing = <HTMLCanvasElement>document.getElementById("whiteboard-canvas-drawing");

const BG = <CanvasRenderingContext2D>background.getContext("2d");
const IT = <CanvasRenderingContext2D>items.getContext("2d");
const DR = <CanvasRenderingContext2D>drawing.getContext("2d");

const dpr = window.devicePixelRatio || 1;
const width = 3510;
const height = 1610;
const realWidth = 690.875; // inches
const realHeight = 317; // inches

let scaling = 1;

const fieldImage = new Image();
fieldImage.src = "../field25.png";

function updateCanvasSize () {
    const wrapper = <HTMLElement>document.getElementById("whiteboard-wrapper");

    const fillWidth = wrapper.clientWidth;
    const fillHeight = wrapper.clientHeight;

    const ratioWidth = fillWidth / background.width;
    const ratioHeight = fillHeight / background.height;

    const leftOffset = (fillWidth - background.width) / 2;
    const topOffset = (fillHeight - background.height) / 2 + wrapper.getBoundingClientRect().top;
    scaling = ratioWidth > ratioHeight ? ratioHeight : ratioWidth;
    [background, items, drawing].forEach(e => {
        e.style.scale = `${scaling}`;
        e.style.left = `${leftOffset}px`;
        e.style.top = `${topOffset}px`;
    });
}

window.addEventListener("resize", updateCanvasSize);
window.addEventListener("orientationchange", updateCanvasSize);
updateCanvasSize();

export class Whiteboard {
    private model;
    private active = true;
    private match: Match | null = null;
    private mode = "auton";
    private currentView = "full";
    private camera = {
        x: width / 2,
        y: height / 2
    };

    private selected: any = null;
    private isPointerDown = false;

    private currentStrokePoints: Array<[number, number]> = [];

    private autonActionHistory: Array<any> = [];
    private teleopActionHistory: Array<any> = [];
    private endgameActionHistory: Array<any> = [];

    static camera_presets: { [key: string]: { x: number, y: number} } = {
        "full": { x: width / 2, y: height / 2 },
        "red": { x: 3 * width / 4, y: height / 2 },
        "blue": { x: width / 4, y: height / 2 }
    };

    constructor (model: Model) {
        this.model = model;

        fieldImage.onload = () => this.drawBackground();
        
        window.addEventListener("resize", this.redrawAll.bind(this));
        window.addEventListener("orientationchange", this.redrawAll.bind(this));
        drawing.addEventListener("click", e => this.onClick(e));
        drawing.addEventListener("pointermove", this.onPointerMove.bind(this));
        drawing.addEventListener("pointerup", this.onPointerUp.bind(this));
        drawing.addEventListener("pointerdown", this.onPointerDown.bind(this));

        const widthConfig = <HTMLInputElement>document.getElementById("whiteboard-robot-config-width");
        widthConfig.addEventListener("input", e => {
            if (this.selected !== null) {
                let robotWidth = Number(widthConfig.value);
                if (Number.isNaN(robotWidth) || robotWidth > 100 || robotWidth < 5) {
                    robotWidth = 30;
                }
                this.selected[1].w = robotWidth * width / realWidth;
                this.drawRobots();
            }
        });

        const heightConfig = <HTMLInputElement>document.getElementById("whiteboard-robot-config-height");
        heightConfig.addEventListener("input", e => {
            if (this.selected !== null) {
                let robotHeight = Number(heightConfig.value);
                if (Number.isNaN(robotHeight) || robotHeight > 100 || robotHeight < 5) {
                    robotHeight = 30;
                }
                this.selected[1].h = robotHeight * height / realHeight;
                this.drawRobots();
            }
        });

        requestAnimationFrame(this.main.bind(this));
    }

    public setActive(active: boolean) {
        this.active = active;
        if (active == false) {
            this.selected = null;
            this.autonActionHistory = [];
            this.teleopActionHistory = [];
            this.endgameActionHistory = [];
            document.getElementById("whiteboard-robot-config")?.classList.add("hidden");
        }
    }

    public setMatch(match: Match) {
        this.match = match;
        this.drawRobots();
        this.redrawDrawing();
    }

    public toggleView () {
        if (this.currentView == "full") {
            this.currentView = "red";
        } else if (this.currentView == "red") {
            this.currentView = "blue";
        } else if (this.currentView == "blue") {
            this.currentView = "full";
        }
        this.camera = Whiteboard.camera_presets[this.currentView];
        this.redrawAll();
    }

    private drawBackground () {
        BG.save();
        BG.clearRect(0, 0, width, height);
        BG.fillStyle = "#18181b";
        BG.fillRect(0, 0, width, height);
        BG.translate(width / 2 - this.camera.x, height / 2 - this.camera.y);
        BG.drawImage(fieldImage, 0, 0);
        BG.restore();
    }

    private drawRobot (name: string, robot: any, team: string) {
        if (!name) return;

        if (team === "red") {
            IT.fillStyle = "red";
        } else {
            IT.fillStyle = "blue";
        }

        IT.beginPath();
        IT.save();
        IT.translate(robot.x - (this.camera.x - width / 2), robot.y - (this.camera.y - height / 2));
        IT.rotate(robot.r);
        IT.fillRect(-robot.w / 2, -robot.h / 2, robot.w, robot.h);
        IT.restore();
    }

    private getData () {
        if (this.match === null) return null;
        if (this.mode === "auton") {
            return this.match.auton;
        }
        if (this.mode === "teleop") {
            return this.match.teleop;
        }
        if (this.mode === "endgame") {
            return this.match.endgame;
        }
        return null;
    }

    private drawRobots () {
        const data = this.getData();

        if (data === null || this.match === null) return;

        IT.clearRect(0, 0, width, height);
        this.drawRobot(this.match.redOne, data.redOneRobot, "red");
        this.drawRobot(this.match.redTwo, data.redTwoRobot, "red");
        this.drawRobot(this.match.redThree, data.redThreeRobot, "red");
        this.drawRobot(this.match.blueOne, data.blueOneRobot, "blue");
        this.drawRobot(this.match.blueTwo, data.blueTwoRobot, "blue");
        this.drawRobot(this.match.blueThree, data.blueThreeRobot, "blue");
    }

    private redrawDrawing () {
        const data = this.getData();

        if (data === null || this.match === null) return;
        
        for (let stroke of data.drawing) {
            DR.beginPath();
            DR.moveTo(stroke[0][0], stroke[0][1]);
            for (let point of stroke) {
                DR.lineTo(point[0], point[1]);
            }
            DR.stroke();
        }
    }

    private redrawAll () {
        this.drawBackground();
        this.drawRobots();
    }

    private isRobotAtPoint (robot: any, x: number, y: number) {
        return isPointInRect(x, y, robot.x, robot.y, robot.w, robot.h, robot.r);
    }

    private getRobotAtPoint (x: number, y: number): [string, any, number, number] | null {
        const data = this.getData();

        if (data === null) return null;

        if (this.isRobotAtPoint(data.redOneRobot, x, y)) {
            return ["redOne", data.redOneRobot, data.redOneRobot.x - x, data.redOneRobot.y - y];
        }
        if (this.isRobotAtPoint(data.redTwoRobot, x, y)) {
            return ["redTwo", data.redTwoRobot, data.redTwoRobot.x - x, data.redTwoRobot.y - y];
        }
        if (this.isRobotAtPoint(data.redThreeRobot, x, y)) {
            return ["redThree", data.redThreeRobot, data.redThreeRobot.x - x, data.redThreeRobot.y - y];
        }
        if (this.isRobotAtPoint(data.blueOneRobot, x, y)) {
            return ["blueOne", data.blueOneRobot, data.blueOneRobot.x - x, data.blueOneRobot.y - y];
        }
        if (this.isRobotAtPoint(data.blueTwoRobot, x, y)) {
            return ["blueTwo", data.blueTwoRobot, data.blueTwoRobot.x - x, data.blueTwoRobot.y - y];
        }
        if (this.isRobotAtPoint(data.blueThreeRobot, x, y)) {
            return ["blueThree", data.blueThreeRobot, data.blueThreeRobot.x - x, data.blueThreeRobot.y - y];
        }
        return null;
    }

    private onClick (e: MouseEvent) {
        const rect = drawing.getBoundingClientRect();
        const x = (e.clientX / scaling - rect.left / scaling) - (width / 2 - this.camera.x);
        const y = (e.clientY / scaling - rect.top / scaling) - (height / 2 - this.camera.y);
        const selected = this.getRobotAtPoint(x, y);
        if (selected !== null) {
            const widthConfig = <HTMLInputElement>document.getElementById("whiteboard-robot-config-width");
            const heightConfig = <HTMLInputElement>document.getElementById("whiteboard-robot-config-height");
            widthConfig.value = String(Math.round(selected[1].w * realWidth / width * 10) / 10);
            heightConfig.value = String(Math.round(selected[1].h * realHeight / height * 10) / 10);
            this.selected = selected;
            document.getElementById("whiteboard-robot-config")?.classList.remove("hidden");
        } else {
            document.getElementById("whiteboard-robot-config")?.classList.add("hidden");
        }
    }

    private onPointerMove (e: PointerEvent) {
        const rect = drawing.getBoundingClientRect();
        const x = (e.clientX / scaling - rect.left / scaling) - (width / 2 - this.camera.x);
        const y = (e.clientY / scaling - rect.top / scaling) - (height / 2 - this.camera.y);
        if(this.selected == null && this.isPointerDown) {
            if (Math.hypot(x - this.currentStrokePoints[this.currentStrokePoints.length - 1][0], y - this.currentStrokePoints[this.currentStrokePoints.length - 1][1]) < 10) return;
            this.currentStrokePoints.push([x, y]);
            DR.lineTo(x, y);
            DR.stroke();
        }
    }

    private onPointerDown (e: PointerEvent) {
        this.isPointerDown = true;
        const rect = drawing.getBoundingClientRect();
        const x = (e.clientX / scaling - rect.left / scaling) - (width / 2 - this.camera.x);
        const y = (e.clientY / scaling - rect.top / scaling) - (height / 2 - this.camera.y);
        this.selected = this.getRobotAtPoint(x, y);
        if (this.selected == null) {
            DR.beginPath();
            DR.strokeStyle = "white";
            DR.lineWidth = 10;
            DR.lineCap = "round";
            DR.lineJoin = "round";
            DR.moveTo(x, y);
            this.currentStrokePoints.push([x, y]);
        }
    }

    private onPointerUp (e: PointerEvent) {
        this.isPointerDown = false;
        if (this.currentStrokePoints.length > 1) {
            if (this.mode === "auton") {
                this.autonActionHistory.push({
                    type: "stroke"
                });
                this.getData()?.drawing.push(this.currentStrokePoints);
                this.currentStrokePoints = [];
            }
        }
    }

    private main () {
        if (!this.active) return;
    }
}

function isPointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number, rr: number) {
    const cos = Math.cos(-rr);
    const sin = Math.sin(-rr);
    const localX = cos * (px - rx) - sin * (py - ry);
    const localY = sin * (px - rx) + cos * (py - ry);
    return (
        localX >= -rw / 2 &&
        localX <= rw / 2 &&
        localY >= -rh / 2 &&
        localY <= rh / 2
    );
}