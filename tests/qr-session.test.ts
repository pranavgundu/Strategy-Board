import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reset: vi.fn(), receive: vi.fn(), start: vi.fn(), destroy: vi.fn(), constructed: vi.fn(),
}));
vi.mock("../src/lib/native/api", () => ({ native: { qr: { reset: mocks.reset, receive: mocks.receive } } }));
vi.mock("qr-scanner", () => ({
  default: class {
    constructor(_video: unknown, onResult: unknown) { mocks.constructed(onResult); }
    start = mocks.start;
    destroy = mocks.destroy;
    stop = vi.fn();
  },
}));
import { QrScanSession } from "../src/lib/features/qr";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
function video() { return { srcObject: null } as HTMLVideoElement; }

beforeEach(() => {
  vi.resetAllMocks();
  mocks.reset.mockResolvedValue(undefined);
  mocks.start.mockResolvedValue(undefined);
});

describe("QR scanner lifecycle", () => {
  it("does not start the camera after disposal during reset", async () => {
    const reset = deferred();
    mocks.reset.mockReturnValue(reset.promise);
    const session = new QrScanSession();
    const starting = session.start(video(), { onProgress: vi.fn() });
    await vi.waitFor(() => expect(mocks.reset).toHaveBeenCalled());
    await session.dispose();
    reset.resolve();
    await starting;
    expect(mocks.constructed).not.toHaveBeenCalled();
  });

  it("destroys a camera whose asynchronous startup completes after disposal", async () => {
    const start = deferred();
    mocks.start.mockReturnValue(start.promise);
    const session = new QrScanSession();
    const starting = session.start(video(), { onProgress: vi.fn() });
    await vi.waitFor(() => expect(mocks.start).toHaveBeenCalled());
    await session.dispose();
    mocks.destroy.mockClear();
    start.resolve();
    await starting;
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });
});
