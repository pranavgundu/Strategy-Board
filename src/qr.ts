import QrScanner from "qr-scanner";
import QRCode from "qrcode";
import { Match } from "@/match.ts";

const HEADER_SIZE = 4;
const PACKET_ZERO_HEADER_SIZE = 4;
const MAX_PAYLOAD_SIZE_BYTES = 78 - HEADER_SIZE;
const MAX_PAYLOAD_SIZE_ALPHA = 114 - HEADER_SIZE;
const STREAM_FPS = 15;

type QRExportCallback = (data: unknown) => void;

export class QRExport {
  private pool: HTMLElement[];
  private intervalId: number | null = null;

  constructor() {
    this.pool = [
      document.getElementById("qr-export-code-worker-0") as HTMLElement,
      document.getElementById("qr-export-code-worker-1") as HTMLElement,
      document.getElementById("qr-export-code-worker-2") as HTMLElement,
    ];
  }

  export(match: Match): void {
    const packet = match.getAsPacket();
    packet.splice(7, 1); // remove uuid

    let data = JSON.stringify(packet);
    let dataBYTES = "";
    let dataALPHA = "";

    const lastQuoteIndex = data.lastIndexOf('"');
    if (lastQuoteIndex === -1) {
      alert("Possibly corrupted data... failed to export");
      return;
    }

    dataBYTES = data.substring(0, lastQuoteIndex + 1);
    dataALPHA = data.substring(lastQuoteIndex + 1, data.length);
    dataALPHA = dataALPHA.replaceAll("[", "$");
    dataALPHA = dataALPHA.replaceAll("]", "/");
    dataALPHA = dataALPHA.replaceAll(",", " ");

    const payloadZERO = dataBYTES.slice(
      0,
      MAX_PAYLOAD_SIZE_BYTES - PACKET_ZERO_HEADER_SIZE,
    );
    const payloadBYTES = dataBYTES
      .slice(MAX_PAYLOAD_SIZE_BYTES - PACKET_ZERO_HEADER_SIZE)
      .match(new RegExp(".{1," + MAX_PAYLOAD_SIZE_BYTES + "}", "g"));
    const payloadALPHA = dataALPHA.match(
      new RegExp(".{1," + MAX_PAYLOAD_SIZE_ALPHA + "}", "g"),
    );

    let payloads = [payloadZERO];
    if (payloadBYTES !== null) payloads = payloads.concat(payloadBYTES);
    if (payloadALPHA !== null) payloads = payloads.concat(payloadALPHA);
    payloads[0] = payloads.length.toString().padStart(4, "0") + payloads[0];

    const payloadLength = payloads.length;
    let poolIndex = 0;
    let payloadNumber = 0;

    const modulusPayloadNumber = (n: number): number => {
      return (n + payloadLength) % payloadLength;
    };

    const modulusPoolIndex = (n: number): number => {
      return (n + this.pool.length) % this.pool.length;
    };

    const getPayload = (n: number): string => {
      let payload = "";
      payload += n.toString().padStart(HEADER_SIZE, "0");
      payload += payloads[n];
      return payload;
    };

    // Initialize pool
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].replaceChildren();
      document
        .getElementById(`qr-export-code-worker-${i}`)
        ?.classList.add("hidden");
      QRCode.toCanvas(
        getPayload(i),
        {
          errorCorrectionLevel: "L",
          width: Math.min(window.innerWidth, window.innerHeight),
        },
        (err, canvas) => {
          if (err) throw err;
          this.pool[i].appendChild(canvas);
        },
      );
    }

    document
      .getElementById(`qr-export-code-worker-0`)
      ?.classList.remove("hidden");

    this.intervalId = window.setInterval(() => {
      // Show current, hide previous
      document
        .getElementById(`qr-export-code-worker-${poolIndex}`)
        ?.classList.remove("hidden");
      document
        .getElementById(
          `qr-export-code-worker-${modulusPoolIndex(poolIndex - 1)}`,
        )
        ?.classList.add("hidden");

      // Queue up previous for next
      this.pool[modulusPoolIndex(poolIndex - 1)].replaceChildren();
      QRCode.toCanvas(
        getPayload(modulusPayloadNumber(payloadNumber + this.pool.length - 1)),
        {
          errorCorrectionLevel: "L",
          width: Math.min(window.innerWidth, window.innerHeight),
        },
        (err, canvas) => {
          if (err) throw err;
          this.pool[modulusPoolIndex(poolIndex - 1)].appendChild(canvas);
        },
      );

      poolIndex = modulusPoolIndex(poolIndex + 1);
      payloadNumber = modulusPayloadNumber(payloadNumber + 1);
    }, 1000 / STREAM_FPS);
  }

  close(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export class QRImport {
  private scanner: QrScanner;
  private received: Record<number, string> = {};
  private receivedIds: number[] = [];
  private expectedLength = -1;
  private callback: QRExportCallback | null = null;

  constructor() {
    this.scanner = new QrScanner(
      document.getElementById("qr-import-video") as HTMLVideoElement,
      (result) => this.getResult(result),
      {
        maxScansPerSecond: 30,
        highlightScanRegion: true,
        highlightCodeOutline: true,
      },
    );

    const list = document.getElementById(
      "qr-import-camera-select",
    ) as HTMLSelectElement;
    list.addEventListener("change", (e: Event) => {
      this.scanner.setCamera((e.target as HTMLSelectElement).value);
    });
  }

  private async getAvailableCameras(): Promise<void> {
    const cameras = await QrScanner.listCameras(true);
    const list = document.getElementById(
      "qr-import-camera-select",
    ) as HTMLSelectElement;

    for (let i = list.options.length - 1; i >= 0; i--) {
      list.remove(i);
    }

    for (const camera of cameras) {
      const option = document.createElement("option");
      option.value = camera.id;
      option.text = camera.label;
      list.add(option);
    }

    list.selectedIndex = 0;
    if (list.options.length > 0) {
      await this.scanner.setCamera(list.options[0].value);
    }
  }

  public async start(callback: QRExportCallback): Promise<void> {
    this.callback = callback;
    this.received = {};
    this.receivedIds = [];
    this.expectedLength = -1;
    await this.scanner.start();
    this.getAvailableCameras();
  }

  public stop(): void {
    this.scanner.stop();
  }

  private getResult(result: QrScanner.ScanResult): void {
    const data = result.data;
    const id = Number(data.slice(0, 4));
    let payload: string;

    if (id === 0) {
      payload = data.slice(HEADER_SIZE + PACKET_ZERO_HEADER_SIZE);
      this.expectedLength = Number(data.slice(4, 8));
    } else {
      payload = data.slice(HEADER_SIZE);
    }

    this.received[id] = payload;
    if (this.receivedIds.indexOf(id) === -1) {
      insertSorted(this.receivedIds, id);
    }

    if (this.receivedIds.length === this.expectedLength) {
      this.importFinished();
    }
  }

  private importFinished(): void {
    this.stop();
    if (this.callback === null) return;

    let data = "";

    for (const i of this.receivedIds) {
      data += this.received[i];
    }

    const lastQuoteIndex = data.lastIndexOf('"');

    const dataBYTES = data.substring(0, lastQuoteIndex + 1);
    let dataALPHA = data.substring(lastQuoteIndex + 1, data.length);
    dataALPHA = dataALPHA.replaceAll("$", "[");
    dataALPHA = dataALPHA.replaceAll("/", "]");
    dataALPHA = dataALPHA.replaceAll(" ", ",");

    data = dataBYTES + dataALPHA;

    const parsedData = JSON.parse(data);
    parsedData.splice(7, 0, null);

    this.callback(parsedData);
    this.callback = null;
  }
}

function insertSorted(arr: number[], num: number): number[] {
  let left = 0;
  let right = arr.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < num) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  arr.splice(left, 0, num);
  return arr;
}
