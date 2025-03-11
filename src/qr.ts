import QrScanner from "qr-scanner";
import QRCode from "qrcodejs2-fixes";
import { Match } from "@/match.ts";

const HEADER_SIZE = 4;
const MAX_PAYLOAD_SIZE = 81 - HEADER_SIZE;
const STREAM_FPS = 30; // fps
const SIZE = 256;

export class QRExport {
    private pool;
    private intervalId;
    constructor () {
        this.pool = [
            new QRCode("qr-export-code-worker-0", {
                width: SIZE,
                height: SIZE
            }),
            new QRCode("qr-export-code-worker-1", {
                width: SIZE,
                height: SIZE
            }),
            new QRCode("qr-export-code-worker-2", {
                width: SIZE,
                height: SIZE
            }),
        ]
    }

    export (match: Match) {
        const data = JSON.stringify(match.getAsPacket());
        const payloads = data.match(new RegExp(".{1," + MAX_PAYLOAD_SIZE + "}", "g"));
        
        const payloadLength = payloads.length + 1;
        let poolIndex = 0;
        let payloadNumber = 0;

        const modulusPayloadNumber = n => {
            return (n + payloadLength) % payloadLength;
        }

        const modulusPoolIndex = n => {
            return (n + this.pool.length) % this.pool.length;
        }

        const getPayload = n => {
            let payload = "";
            payload += n.toString().padStart(HEADER_SIZE, "0");
            if (n == 0) { // 0 is special header packet
                payload += payloadLength;
            } else {
                payload += payloads[n - 1];
            }
            return payload;
        }

        // initial
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].clear();
            this.pool[i].makeCode(getPayload(payloadNumber));
            payloadNumber = modulusPayloadNumber(payloadNumber + 1);
        }

        this.intervalId = setInterval(() => {
            // show currnet, hide previous
            document.getElementById(`qr-export-code-worker-${poolIndex}`).classList.remove("hidden");
            document.getElementById(`qr-export-code-worker-${modulusPoolIndex(poolIndex - 1)}`).classList.add("hidden");
            // queue up previous for next
            this.pool[modulusPoolIndex(poolIndex - 1)].clear();
            this.pool[modulusPoolIndex(poolIndex - 1)].makeCode(getPayload(modulusPayloadNumber(payloadNumber + this.pool.length - 1)));
            poolIndex = modulusPoolIndex(poolIndex + 1);
            payloadNumber = modulusPayloadNumber(payloadNumber + 1);
        }, 1000 / STREAM_FPS);
    }

    close () {
        clearInterval(this.intervalId);
    }
}

export class QRImport {
    private scanner;
    private received = {};
    constructor () {
        this.scanner = new QrScanner(
            <HTMLVideoElement>document.getElementById("qr-import-video"),
            result => this.getResult(result),
            {
                maxScansPerSecond: 30,
                highlightScanRegion: true,
                highlightCodeOutline: true
            }
        )

        const list = <HTMLSelectElement>document.getElementById("qr-import-camera-select");
        list.addEventListener("change", (e: Event) => {
            this.scanner.setCamera((<HTMLOptionElement>e.target).value);
        });
    }

    private async getAvailableCameras () {
        const cameras = await QrScanner.listCameras(true);
        const list = <HTMLSelectElement>document.getElementById("qr-import-camera-select");
        for (let i = list.options.length - 1; i >= 0; i--) {
            list.remove(i);
        }
        for (let camera of cameras) {
            const option = document.createElement("option");
            option.value = camera.id;
            option.text = camera.label;
            list.add(option);
        }
        list.selectedIndex = 0;
        await this.scanner.setCamera(list.options[0]);
    }

    public async start () {
        this.received = {};
        await this.scanner.start();
        this.getAvailableCameras();
    }

    public stop () {
        this.scanner.stop();
    }

    private getResult (result) {

    }
}