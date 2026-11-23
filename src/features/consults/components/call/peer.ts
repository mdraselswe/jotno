"use client";

/**
 * One WebRTC connection for a consult call, using the "perfect negotiation"
 * pattern (https://w3c.github.io/webrtc-pc/#perfect-negotiation-example): both
 * sides may send offers; the polite side (the one who answered) backs off on a
 * collision. Signals travel over the consult's private Realtime channel.
 */
export type PeerSignal =
  | { kind: "sdp"; description: RTCSessionDescriptionInit }
  | { kind: "ice"; candidate: RTCIceCandidateInit | null };

export type PeerState = "connecting" | "connected" | "reconnecting" | "failed" | "closed";

export interface PeerEvents {
  signal: (s: PeerSignal) => void;
  remoteStream: (stream: MediaStream) => void;
  state: (s: PeerState) => void;
}

/** Keep video light for Bangladeshi mobile data: ~500 kbps, frame rate over sharpness. */
const VIDEO_MAX_BITRATE = 500_000;

export class PeerCall {
  readonly pc: RTCPeerConnection;
  private makingOffer = false;
  private ignoreOffer = false;
  private pendingIce: RTCIceCandidateInit[] = [];
  private restartTimer: number | undefined;
  private failTimer: number | undefined;
  private connectedOnce = false;
  private closed = false;
  private readonly remote = new MediaStream();

  constructor(
    iceServers: RTCIceServer[],
    private readonly polite: boolean,
    private readonly on: PeerEvents,
  ) {
    this.pc = new RTCPeerConnection({ iceServers, bundlePolicy: "max-bundle" });
    this.pc.onnegotiationneeded = () => void this.offer();
    this.pc.onicecandidate = ({ candidate }) =>
      this.on.signal({ kind: "ice", candidate: candidate?.toJSON() ?? null });
    this.pc.ontrack = ({ track }) => {
      if (!this.remote.getTracks().includes(track)) this.remote.addTrack(track);
      this.on.remoteStream(this.remote);
    };
    this.pc.onconnectionstatechange = () => this.onConnectionState();
  }

  /** Sends our microphone (and camera) to the other side. */
  addLocal(stream: MediaStream) {
    for (const track of stream.getTracks()) {
      const sender = this.pc.addTrack(track, stream);
      if (track.kind === "video") void this.limitVideo(sender);
    }
  }

  /** Swap or drop the camera without renegotiating (null = camera off). */
  async replaceVideo(track: MediaStreamTrack | null) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === "video" || s.track === null);
    if (sender) await sender.replaceTrack(track);
  }

  async handle(signal: PeerSignal) {
    if (this.closed) return;
    try {
      if (signal.kind === "sdp") {
        const description = signal.description;
        const collision =
          description.type === "offer" && (this.makingOffer || this.pc.signalingState !== "stable");
        this.ignoreOffer = !this.polite && collision;
        if (this.ignoreOffer) return;
        await this.pc.setRemoteDescription(description);
        for (const c of this.pendingIce.splice(0)) await this.pc.addIceCandidate(c).catch(() => undefined);
        if (description.type === "offer") {
          await this.pc.setLocalDescription();
          if (this.pc.localDescription)
            this.on.signal({ kind: "sdp", description: this.pc.localDescription.toJSON() });
        }
      } else if (signal.candidate) {
        if (!this.pc.remoteDescription) this.pendingIce.push(signal.candidate);
        else
          await this.pc.addIceCandidate(signal.candidate).catch((e: unknown) => {
            if (!this.ignoreOffer) throw e;
          });
      }
    } catch (error) {
      console.warn("[call] signal failed", error);
    }
  }

  /** Try a fresh network path (Wi-Fi ↔ mobile data, a short drop). */
  restart() {
    if (this.closed) return;
    this.pc.restartIce();
  }

  /** true when the chosen path goes through the TURN relay. */
  async usesRelay(): Promise<boolean | null> {
    try {
      const stats = await this.pc.getStats();
      let pairId: string | undefined;
      stats.forEach((r: { type: string; selectedCandidatePairId?: string }) => {
        if (r.type === "transport" && r.selectedCandidatePairId) pairId = r.selectedCandidatePairId;
      });
      let localId: string | undefined;
      stats.forEach(
        (r: { type: string; id: string; nominated?: boolean; state?: string; localCandidateId?: string }) => {
          if (r.type !== "candidate-pair") return;
          if (pairId ? r.id === pairId : r.nominated && r.state === "succeeded") localId = r.localCandidateId;
        },
      );
      if (!localId) return null;
      let relay: boolean | null = null;
      stats.forEach((r: { type: string; id: string; candidateType?: string }) => {
        if (r.type === "local-candidate" && r.id === localId) relay = r.candidateType === "relay";
      });
      return relay;
    } catch {
      return null;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    window.clearTimeout(this.restartTimer);
    window.clearTimeout(this.failTimer);
    this.pc.onnegotiationneeded = null;
    this.pc.onicecandidate = null;
    this.pc.ontrack = null;
    this.pc.onconnectionstatechange = null;
    this.pc.close();
    for (const t of this.remote.getTracks()) t.stop();
    this.on.state("closed");
  }

  private async offer() {
    try {
      this.makingOffer = true;
      await this.pc.setLocalDescription();
      if (this.pc.localDescription)
        this.on.signal({ kind: "sdp", description: this.pc.localDescription.toJSON() });
    } catch (error) {
      console.warn("[call] offer failed", error);
    } finally {
      this.makingOffer = false;
    }
  }

  private async limitVideo(sender: RTCRtpSender) {
    try {
      const params = sender.getParameters();
      params.encodings = params.encodings.length > 0 ? params.encodings : [{}];
      for (const e of params.encodings) e.maxBitrate = VIDEO_MAX_BITRATE;
      params.degradationPreference = "maintain-framerate";
      await sender.setParameters(params);
    } catch {
      // Not every browser allows this before negotiation; the default is fine.
    }
  }

  private onConnectionState() {
    const s = this.pc.connectionState;
    window.clearTimeout(this.restartTimer);
    if (s === "connected") {
      this.connectedOnce = true;
      window.clearTimeout(this.failTimer);
      this.on.state("connected");
    } else if (s === "disconnected") {
      this.on.state(this.connectedOnce ? "reconnecting" : "connecting");
      // A short drop often heals by itself; if not, look for a new path.
      if (!this.polite) this.restartTimer = window.setTimeout(() => this.restart(), 3000);
      this.giveUpLater();
    } else if (s === "failed") {
      this.on.state("reconnecting");
      if (!this.polite) this.restart();
      this.giveUpLater();
    } else if (s === "connecting" || s === "new") {
      this.on.state(this.connectedOnce ? "reconnecting" : "connecting");
      this.giveUpLater();
    }
  }

  private giveUpLater() {
    window.clearTimeout(this.failTimer);
    this.failTimer = window.setTimeout(() => {
      if (this.pc.connectionState !== "connected") this.on.state("failed");
    }, 25_000);
  }
}
