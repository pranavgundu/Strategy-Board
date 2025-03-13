import QrScanner from "qr-scanner";
import QRCode from "qrcode";
import { Match } from "@/match.ts";

const HEADER_SIZE = 4;
const PACKET_ZERO_HEADER_SIZE = 4;
const MAX_PAYLOAD_SIZE_BYTES = 78 - HEADER_SIZE;
const MAX_PAYLOAD_SIZE_ALPHA = 114 - HEADER_SIZE;
const STREAM_FPS = 15; // fps

export class QRExport {
    private pool;
    private intervalId;
    constructor () {
        this.pool = [
            /*new QRCode("qr-export-code-worker-0", {
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
            }),*/
            <HTMLElement>document.getElementById("qr-export-code-worker-0"),
            <HTMLElement>document.getElementById("qr-export-code-worker-1"),
            <HTMLElement>document.getElementById("qr-export-code-worker-2"),
        ]
    }

    export (match: Match) {
        const packet = match.getAsPacket();
        packet.splice(7, 1); // remove uuid

        let data = JSON.stringify(packet);
        //ata = data.replaceAll("[", "$"); use manual loop & calculate payloads at same time
        //data = data.replaceAll("]", "/"); use loop
        let dataBYTES = "";
        let dataALPHA = "";

        const lastQuoteIndex = data.lastIndexOf('"');
        if (lastQuoteIndex == -1) {
            alert("Possibly corrupted data... failed to export");
            return;
        }

        dataBYTES = data.substring(0, lastQuoteIndex + 1);
        dataALPHA = data.substring(lastQuoteIndex + 1, data.length);
        dataALPHA = dataALPHA.replaceAll("[", "$");
        dataALPHA = dataALPHA.replaceAll("]", "/");
        dataALPHA = dataALPHA.replaceAll(",", " ");

        const payloadZERO = dataBYTES.slice(0, MAX_PAYLOAD_SIZE_BYTES - PACKET_ZERO_HEADER_SIZE);
        const payloadBYTES = dataBYTES.slice(MAX_PAYLOAD_SIZE_BYTES - PACKET_ZERO_HEADER_SIZE).match(new RegExp(".{1," + MAX_PAYLOAD_SIZE_BYTES + "}", "g"));
        const payloadALPHA = dataALPHA.match(new RegExp(".{1," + MAX_PAYLOAD_SIZE_ALPHA + "}", "g"));
        
        let payloads = [payloadZERO];
        if (payloadBYTES !== null) payloads = payloads.concat(payloadBYTES);
        payloads = payloads.concat(payloadALPHA);
        payloads[0] = payloads.length.toString().padStart(4, "0") + payloads[0];
        
        const payloadLength = payloads.length;
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
            payload += payloads[n];
            return payload;
        }

        // initial
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].replaceChildren();
            document.getElementById(`qr-export-code-worker-${i}`).classList.add("hidden");
            QRCode.toCanvas(
                getPayload(i),
                { errorCorrectionLevel: "L", width: Math.min(window.innerWidth, window.innerHeight) },
                (err, canvas) => {
                    if (err) throw err;
                    this.pool[i].appendChild(canvas);
            });
            //console.log(getPayload(i));
            //this.pool[i].clear();
            //this.pool[i].makeCode(getPayload(payloadNumber));
        }

        document.getElementById(`qr-export-code-worker-0`).classList.remove("hidden");

        this.intervalId = setInterval(() => {
            //show currnet, hide previous
            document.getElementById(`qr-export-code-worker-${poolIndex}`).classList.remove("hidden");
            document.getElementById(`qr-export-code-worker-${modulusPoolIndex(poolIndex - 1)}`).classList.add("hidden");
            /*queue up previous for next
            this.pool[modulusPoolIndex(poolIndex - 1)].clear();
            this.pool[modulusPoolIndex(poolIndex - 1)].makeCode(getPayload(modulusPayloadNumber(payloadNumber + this.pool.length - 1)));
            */
            this.pool[modulusPoolIndex(poolIndex - 1)].replaceChildren();
            QRCode.toCanvas(
                getPayload(modulusPayloadNumber(payloadNumber + this.pool.length - 1)),
                { errorCorrectionLevel: "L", width: Math.min(window.innerWidth, window.innerHeight) },
                (err, canvas) => {
                    if (err) throw err;
                    this.pool[modulusPoolIndex(poolIndex - 1)].appendChild(canvas);
            });
            //console.log(getPayload(modulusPayloadNumber(payloadNumber + this.pool.length - 1)))
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
    private receivedIds = [];
    private expectedLength = -1;
    private callback;

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

    public async start (callback) {
        this.callback = callback;
        this.received = {};
        this.receivedIds = [];
        this.expectedLength = -1;
        await this.scanner.start();
        this.getAvailableCameras();
    }

    public stop () {
        this.scanner.stop();
    }

    private getResult (result) {
        const data = result.data;
        const id = Number(data.slice(0, 4));
        let payload;
        if (id == 0) {
            payload = data.slice(HEADER_SIZE + PACKET_ZERO_HEADER_SIZE);
            this.expectedLength = Number(data.slice(4, 8));
        } else {
            payload = data.slice(HEADER_SIZE);
        }

        this.received[id] = payload;
        if (this.receivedIds.indexOf(id) === -1) insertSorted(this.receivedIds, id);

        if (this.receivedIds.length == this.expectedLength) {
            this.importFinished();
        }
    }

    private importFinished () {
        this.stop();
        if (this.callback == null) return;

        let data: any = "";

        for (let i of this.receivedIds) {
            data += this.received[i];
        }

        const lastQuoteIndex = data.lastIndexOf('"');

        let dataBYTES = data.substring(0, lastQuoteIndex + 1);
        let dataALPHA = data.substring(lastQuoteIndex + 1, data.length);
        dataALPHA = dataALPHA.replaceAll("$", "[");
        dataALPHA = dataALPHA.replaceAll("/", "]");
        dataALPHA = dataALPHA.replaceAll(" ", ",");

        data = dataBYTES + dataALPHA;

        data = JSON.parse(data);
        data.splice(7, 0, null);

        this.callback(data);
        this.callback = null;
    }
}

function insertSorted(arr, num) {
    let left = 0, right = arr.length;
    
    while (left < right) {
        let mid = Math.floor((left + right) / 2);
        if (arr[mid] < num) left = mid + 1;
        else right = mid;
    }
    
    arr.splice(left, 0, num);
    return arr;
}