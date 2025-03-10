import { Match } from "@/match.ts";
import { Model } from "@/model.ts";
import fieldUrl from "./field25.png";

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
fieldImage.src = fieldUrl;

export function updateCanvasSize () {
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

let clickMovement = 0;

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
    private selectedType: string = "";
    private lastSelected: any = null;
    private rotControl: { x: number, y: number } | null = null;
    private isPointerDown = false;

    private currentStrokePoints: Array<[number, number]> = [];
    private previousRobotTransform: any = {};
    private currentAction = "none";

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
        drawing.addEventListener("pointerleave", this.onPointerLeave.bind(this));

        document.getElementById("whiteboard-toolbar-mode-auton")?.addEventListener("click", e => this.toggleMode("auton"));
        document.getElementById("whiteboard-toolbar-mode-teleop")?.addEventListener("click", e => this.toggleMode("teleop"));
        document.getElementById("whiteboard-toolbar-mode-endgame")?.addEventListener("click", e => this.toggleMode("endgame"));

        const widthConfig = <HTMLInputElement>document.getElementById("whiteboard-robot-config-width");
        widthConfig.addEventListener("input", e => {
            if (this.selected !== null) {
                let robotWidth = Number(widthConfig.value);
                if (Number.isNaN(robotWidth) || robotWidth > 100 || robotWidth < 5) {
                    robotWidth = 30;
                }
                if (this.match === null) return;
                this.match.auton[`${this.selected[0]}Robot`].w = robotWidth * width / realWidth;
                this.match.teleop[`${this.selected[0]}Robot`].w = robotWidth * width / realWidth;
                this.match.endgame[`${this.selected[0]}Robot`].w = robotWidth * width / realWidth;
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
                if (this.match === null) return;
                this.match.auton[`${this.selected[0]}Robot`].h = robotHeight * height / realHeight;
                this.match.teleop[`${this.selected[0]}Robot`].h = robotHeight * height / realHeight;
                this.match.endgame[`${this.selected[0]}Robot`].h = robotHeight * height / realHeight;
                this.drawRobots();
            }
        });

        document.getElementById("whiteboard-toolbar-undo")?.addEventListener("click", e => {
            this.undo();
        });

        DR.strokeStyle = "white";
        DR.lineWidth = 10;
        DR.lineCap = "round";
        DR.lineJoin = "round";

        requestAnimationFrame(this.main.bind(this));

        setInterval(() => {
            if (this.match !== null) {
                this.model.updateMatch(this.match.id);
            }
        }, 3000);
    }

    public setActive(active: boolean) {
        this.active = active;
        if (active == true) {
            if (this.getCurrentUndoHistory().length < 1) {
                document.getElementById("whiteboard-toolbar-undo")?.classList.remove("text-amber-500");
                document.getElementById("whiteboard-toolbar-undo")?.classList.add("text-amber-700");
            } else {
                document.getElementById("whiteboard-toolbar-undo")?.classList.add("text-amber-500");
                document.getElementById("whiteboard-toolbar-undo")?.classList.remove("text-amber-700");
            }
        } else if (active == false) {
            if (this.match !== null) this.model.updateMatch(this.match.id);
            this.match = null;
            this.lastSelected = null;
            this.selected = null;
            this.autonActionHistory = [];
            this.teleopActionHistory = [];
            this.endgameActionHistory = [];
            document.getElementById("whiteboard-robot-config")?.classList.add("hidden");
            document.getElementById("whiteboard-draw-config")?.classList.add("hidden");
        }
    }

    public setMatch(match: Match) {
        this.match = match;
        this.redrawAll();
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

    private addUndoHistory (action: any) {
        if (this.mode === "auton") {
            this.autonActionHistory.push(action);
        }
        if (this.mode === "teleop") {
            this.teleopActionHistory.push(action);
        }
        if (this.mode === "endgame") {
            this.endgameActionHistory.push(action);
        }

        document.getElementById("whiteboard-toolbar-undo")?.classList.add("text-amber-500");
        document.getElementById("whiteboard-toolbar-undo")?.classList.remove("text-amber-700");
    }

    private getCurrentUndoHistory () {
        if (this.mode === "auton") {
            return this.autonActionHistory;
        }
        if (this.mode === "teleop") {
            return this.teleopActionHistory;
        }
        if (this.mode === "endgame") {
            return this.endgameActionHistory;
        }

        return [];
    }

    private undo () {
        const history = this.getCurrentUndoHistory();
        if (history.length < 1) return;

        const action = history.pop();
        if (action.type == "stroke") {
            const data = this.getData();
            if (data !== null) {
                data.drawing.pop();
                this.redrawDrawing();
            }
        } else if (action.type == "transform") {
            const data = this.getData();
            if (data !== null) {
                const robot = data[`${action.slot}Robot`];
                if (action.prev.x != undefined) robot.x = action.prev.x;
                if (action.prev.y != undefined) robot.y = action.prev.y;
                if (action.prev.r != undefined) robot.r = action.prev.r;
                this.drawRobots();
            }
        }

        if (history.length < 1) {
            document.getElementById("whiteboard-toolbar-undo")?.classList.remove("text-amber-500");
            document.getElementById("whiteboard-toolbar-undo")?.classList.add("text-amber-700");
        }
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

    private drawRobot (name: string, robot: any, team: string, slot: string) {
        // if (!name) return;

        const isSelected = this.selected !== null && this.selected[0] == slot;

        if (team === "red") {
            IT.fillStyle = "red";
        } else {
            IT.fillStyle = "blue";
        }

        IT.beginPath();
        IT.save();
        IT.translate(robot.x - (this.camera.x - width / 2), robot.y - (this.camera.y - height / 2));
        IT.rotate(robot.r);
        IT.roundRect(-robot.w / 2, -robot.h / 2, robot.w, robot.h, 20);
        if (isSelected) {
            IT.shadowBlur = 30;
            IT.shadowColor = "white";
        }
        IT.fill();
        if (isSelected) {
            IT.shadowBlur = 0;
        }
        IT.beginPath();
        IT.fillStyle = "#242429";
        IT.roundRect(-robot.w / 2 + 17, -robot.h / 2 + 17, robot.w - 34, robot.h - 34, 10);
        IT.fill();

        IT.font = "bold 48px sans-serif";
        IT.fillStyle = "white";
        IT.textAlign = "center";
        IT.textBaseline = "middle";
        IT.fillText(name, 0, 0);

        if (this.selected !== null && this.selected[0] == slot) {
            IT.beginPath();
            IT.fillStyle = "white";
            IT.arc(robot.w / 2, 0, 20, 0, Math.PI * 2);
            IT.fill();
        }

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
        this.drawRobot(this.match.redOne, data.redOneRobot, "red", "redOne");
        this.drawRobot(this.match.redTwo, data.redTwoRobot, "red", "redTwo");
        this.drawRobot(this.match.redThree, data.redThreeRobot, "red", "redThree");
        this.drawRobot(this.match.blueOne, data.blueOneRobot, "blue", "blueOne");
        this.drawRobot(this.match.blueTwo, data.blueTwoRobot, "blue", "blueTwo");
        this.drawRobot(this.match.blueThree, data.blueThreeRobot, "blue", "blueThree");
    }

    private redrawDrawing () {
        const data = this.getData();

        if (data === null || this.match === null) return;

        DR.clearRect(0, 0, width, height);
        for (let stroke of data.drawing) {
            DR.beginPath();
            DR.moveTo(stroke[0][0] - (this.camera.x - width / 2 ), stroke[0][1] - (this.camera.y - height / 2));
            for (let point of stroke) {
                DR.lineTo(point[0] - (this.camera.x - width / 2), point[1] - (this.camera.y - height / 2));
            }
            DR.stroke();
        }
    }

    private redrawAll () {
        this.drawBackground();
        this.drawRobots();
        this.redrawDrawing();
    }

    private toggleMode (mode: string) {
        if (this.mode === mode) return;
        this.lastSelected = null;
        this.selected = null;
        document.getElementById("whiteboard-robot-config")?.classList.add("hidden");
        document.getElementById("whiteboard-draw-config")?.classList.add("hidden");
        document.getElementById(`whiteboard-toolbar-mode-${this.mode}`)?.classList.remove("font-extrabold");
        document.getElementById(`whiteboard-toolbar-mode-${this.mode}`)?.classList.remove("text-zinc-100");
        document.getElementById(`whiteboard-toolbar-mode-${this.mode}`)?.classList.add("text-zinc-300");
        document.getElementById(`whiteboard-toolbar-mode-${mode}`)?.classList.add("font-extrabold");
        document.getElementById(`whiteboard-toolbar-mode-${mode}`)?.classList.add("text-zinc-100");
        document.getElementById(`whiteboard-toolbar-mode-${mode}`)?.classList.remove("text-zinc-300");
        this.mode = mode;
        this.redrawAll();

        if (this.getCurrentUndoHistory().length < 1) {
            document.getElementById("whiteboard-toolbar-undo")?.classList.remove("text-amber-500");
            document.getElementById("whiteboard-toolbar-undo")?.classList.add("text-amber-700");
        } else {
            document.getElementById("whiteboard-toolbar-undo")?.classList.add("text-amber-500");
            document.getElementById("whiteboard-toolbar-undo")?.classList.remove("text-amber-700");
        }
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
        if (clickMovement > 30) return;
        //const selected = this.getRobotAtPoint(x, y);
        if (this.selected == null) {
            if (document.getElementById("whiteboard-robot-config")?.classList.contains("hidden") && this.lastSelected == null) {
                if (document.getElementById("whiteboard-draw-config")?.classList.contains("hidden")) {
                    document.getElementById("whiteboard-draw-config")?.classList.remove("hidden");
                } else {
                    document.getElementById("whiteboard-draw-config")?.classList.add("hidden");
                }
            } else {
                document.getElementById("whiteboard-robot-config")?.classList.add("hidden");
            }
        } else {
            document.getElementById("whiteboard-robot-config")?.classList.remove("hidden");
        }
    }

    private onPointerMove (e: PointerEvent) {
        const rect = drawing.getBoundingClientRect();
        const x = (e.clientX / scaling - rect.left / scaling) - (width / 2 - this.camera.x);
        const y = (e.clientY / scaling - rect.top / scaling) - (height / 2 - this.camera.y);
        clickMovement += Math.abs(x) + Math.abs(y);
        if(this.selected == null && this.isPointerDown) {
            if (Math.hypot(x - this.currentStrokePoints[this.currentStrokePoints.length - 1][0], y - this.currentStrokePoints[this.currentStrokePoints.length - 1][1]) < 10) return;
            this.currentStrokePoints.push([x, y]);
            DR.lineTo(x - (this.camera.x - width / 2), y - (this.camera.y - height / 2));
            DR.stroke();
        } else if (this.selected != null && this.isPointerDown) {
            if (this.selectedType === "robot") {
                this.selected[1].x = x + this.selected[2];
                this.selected[1].y = y + this.selected[3];
                this.rotControl = {
                    x: this.selected[1].x + (this.selected[1].w / 2) * Math.cos(this.selected[1].r),
                    y: this.selected[1].y + (this.selected[1].w / 2) * Math.sin(this.selected[1].r)
                };
                this.currentAction = "transform";
                this.drawRobots();
            } else if (this.selectedType === "rot") {
                this.rotControl = {
                    x: this.selected[1].x + (this.selected[1].w / 2) * Math.cos(this.selected[1].r),
                    y: this.selected[1].y + (this.selected[1].w / 2) * Math.sin(this.selected[1].r)
                };
                this.selected[1].r = Math.atan2(y - this.selected[1].y, x - this.selected[1].x);
                this.currentAction = "rot";
                this.drawRobots();
            }
        }
    }

    private onPointerDown (e: PointerEvent) {
        this.isPointerDown = true;
        const rect = drawing.getBoundingClientRect();
        const x = (e.clientX / scaling - rect.left / scaling) - (width / 2 - this.camera.x);
        const y = (e.clientY / scaling - rect.top / scaling) - (height / 2 - this.camera.y);
        const selected = this.getRobotAtPoint(x, y);
        if (this.selected !== null && this.rotControl !== null) {
            if (Math.hypot(x - this.rotControl.x, y - this.rotControl.y) < 30) {
                this.selectedType = "rot";
                this.previousRobotTransform = {
                    r: this.selected[1].r
                };
                return;
            }
        }
        if (selected !== null) {
            const widthConfig = <HTMLInputElement>document.getElementById("whiteboard-robot-config-width");
            const heightConfig = <HTMLInputElement>document.getElementById("whiteboard-robot-config-height");
            widthConfig.value = String(Math.round(selected[1].w * realWidth / width * 10) / 10);
            heightConfig.value = String(Math.round(selected[1].h * realHeight / height * 10) / 10);
            this.lastSelected = this.selected;
            this.selected = selected;
            this.selectedType = "robot";
            this.rotControl = {
                x: this.selected[1].x + (this.selected[1].w / 2) * Math.cos(this.selected[1].r),
                y: this.selected[1].y + (this.selected[1].w / 2) * Math.sin(this.selected[1].r)
            };
            this.previousRobotTransform = {
                x: this.selected[1].x,
                y: this.selected[1].y
            };
            this.drawRobots();
            // document.getElementById("whiteboard-robot-config")?.classList.remove("hidden");
            // document.getElementById("whiteboard-draw-config")?.classList.add("hidden");
            return;
        }
        this.lastSelected = this.selected;
        this.selected = selected;
        if (this.selected == null) {
            this.drawRobots();
            document.getElementById("whiteboard-robot-config")?.classList.add("hidden");
            DR.beginPath();
            DR.moveTo(x - (this.camera.x - width / 2), y - (this.camera.y - height / 2));
            this.currentStrokePoints.push([x, y]);
        }
        clickMovement = 0;
    }

    private onPointerUp (e: PointerEvent) {
        this.isPointerDown = false;
        if (this.selected !== null) {
            if (this.currentAction !== "none") {
                this.addUndoHistory({
                    type: "transform",
                    prev: this.previousRobotTransform,
                    slot: this.selected[0]
                });
            }
            this.currentAction = "none";
            //this.previousRobotTransform = this.selected[1];
        } else if (this.currentStrokePoints.length > 1) {
            DR.closePath();
            this.addUndoHistory({
                type: "stroke"
            });
            this.getData()?.drawing.push(this.currentStrokePoints);
        }
        this.currentStrokePoints = [];
    }

    private onPointerLeave (e: Event) {
        this.isPointerDown = false;
        if (this.currentStrokePoints.length > 1) {
            DR.closePath();
            this.addUndoHistory({
                type: "stroke"
            });
            this.getData()?.drawing.push(this.currentStrokePoints);
        }
        this.currentStrokePoints = [];
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