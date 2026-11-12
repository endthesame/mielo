// Process one request at a time without queuing stale audio chunks.
export class LiveTranscriber {
  private samples = new Int16Array(0);
  private lastSpeechAt: number | null = null;
  private generation = 0;
  private waitingForSpeech = true;
  private lastRunAt = 0;
  private inFlight: Promise<void> | null = null;
  private closed = false;

  constructor(
    private readonly transcribe: (data: ArrayBuffer) => Promise<string>,
    private readonly onText: (text: string) => void,
    private readonly onError: (error: unknown) => void,
    private readonly now: () => number = Date.now,
  ) {}

  pushAudio(data: ArrayBuffer): void {
    if (this.closed || data.byteLength === 0 || data.byteLength % 2 !== 0) return;
    const input = new Int16Array(data);
    let sum = 0;
    for (const sample of input) sum += Math.abs(sample);
    const now = this.now();
    if (sum / input.length > 120) {
      if (this.waitingForSpeech) { this.generation++; this.waitingForSpeech = false; }
      this.lastSpeechAt = now;
    }
    // Skip silence because Whisper can hallucinate text from it.
    if (this.lastSpeechAt === null || now - this.lastSpeechAt > 1400) {
      this.samples = new Int16Array(0);
      this.waitingForSpeech = true;
      return;
    }
    const keep = Math.min(this.samples.length, Math.max(0, 48000 - input.length));
    const length = Math.min(input.length, 48000);
    const next = new Int16Array(keep + length);
    next.set(this.samples.subarray(this.samples.length - keep));
    next.set(input.subarray(input.length - length), keep);
    this.samples = next;
    if (this.samples.length < 9600 || this.inFlight || now - this.lastRunAt < 700) return;
    this.lastRunAt = now;
    const snapshot = this.samples.slice().buffer;
    const generation = this.generation;
    this.inFlight = this.transcribe(snapshot).then((text) => {
      if (!this.closed && generation === this.generation && text.trim()) this.onText(text.trim());
    }).catch((error) => {
      if (!this.closed) this.onError(error);
    }).finally(() => { this.inFlight = null; });
  }

  async close(): Promise<void> {
    this.closed = true;
    this.samples = new Int16Array(0);
    await this.inFlight;
  }
}
