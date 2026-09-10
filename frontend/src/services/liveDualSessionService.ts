/**
 * Live Dual-WebSocket Session Service for Rabbly AI Tutor.
 *
 * Coordinates two dedicated WebSocket channels:
 * 1. Input Channel (/ws/live/{sessionId}/input):
 *    - Transmits student 16kHz PCM microphone audio.
 *    - Streams debounced tldraw blackboard spatial states.
 *    - Sends MCP JSON-RPC responses after executing whiteboard draw tools.
 * 2. Output Channel (/ws/live/{sessionId}/output):
 *    - Receives streaming agent audio PCM and plays it via Web Audio API.
 *    - Receives real-time subtitles and transcription chunks.
 *    - Dispatches incoming MCP JSON-RPC tool requests to WhiteboardMcpServer.
 */

import { whiteboardMcpServer, type McpJsonRpcRequest } from '../mcp/whiteboardMcpServer';
import type { BoardStatePayload } from '../types';

export type AgentLiveStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'error';

export interface LiveSessionCallbacks {
  onStatusChange?: (status: AgentLiveStatus, message?: string) => void;
  onTranscript?: (text: string) => void;
  onAudioLevel?: (level: number) => void;
}

export class LiveDualSessionService {
  private sessionId: string | null = null;
  private inputSocket: WebSocket | null = null;
  private outputSocket: WebSocket | null = null;

  private status: AgentLiveStatus = 'idle';
  private callbacks: LiveSessionCallbacks = {};

  // Audio Capture (Mic -> Input WS)
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isMicMuted: boolean = true;

  // Audio Playback (Output WS -> Speakers)
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;

  // Board State Streaming
  private lastStreamedElementCount: number = -1;
  private boardStreamDebounceTimer: number | null = null;

  constructor() {
    console.log('[LiveDualSessionService] Initialized.');
  }

  /**
   * Set callback listeners for status, transcript, and audio levels.
   */
  public setCallbacks(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to both /input and /output WebSocket endpoints for the given session.
   */
  public async connect(sessionId: string, baseWsUrl?: string): Promise<void> {
    this.sessionId = sessionId;
    this.updateStatus('connecting', 'Connecting to Rabbly AI Tutor live session...');

    const host = baseWsUrl || (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + (window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host);

    const inputUrl = `${host}/ws/live/${sessionId}/input`;
    const outputUrl = `${host}/ws/live/${sessionId}/output`;

    console.log(`[DualWS] Connecting to channels for session '${sessionId}':`);
    console.log(`[DualWS:Input] URL: ${inputUrl}`);
    console.log(`[DualWS:Output] URL: ${outputUrl}`);

    try {
      // 1. Establish Output Channel (Backend -> Frontend)
      await this.initOutputChannel(outputUrl);

      // 2. Establish Input Channel (Frontend -> Backend)
      await this.initInputChannel(inputUrl);

      // 3. Initialize Audio Playback Context
      this.initPlaybackContext();

      // 4. Send initial board state immediately
      this.streamBoardState();

      this.updateStatus('listening', 'Connected and listening.');
      console.log(`[DualWS] Both channels successfully established for session '${sessionId}'.`);
    } catch (err) {
      console.error('[DualWS] Connection failure:', err);
      this.updateStatus('error', 'Failed to connect to live tutoring service.');
      this.disconnect();
    }
  }

  /**
   * Initialize the Output WebSocket channel (receives agent speech, subtitles, MCP requests).
   */
  private initOutputChannel(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.outputSocket = new WebSocket(url);

      this.outputSocket.onopen = () => {
        console.log('[DualWS:Output] Channel OPEN.');
        resolve();
      };

      this.outputSocket.onerror = (err) => {
        console.error('[DualWS:Output] Channel ERROR:', err);
        reject(err);
      };

      this.outputSocket.onclose = () => {
        console.log('[DualWS:Output] Channel CLOSED.');
      };

      this.outputSocket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this.handleOutputMessage(data);
        } catch (err) {
          console.error('[DualWS:Output] Failed to parse message:', event.data, err);
        }
      };
    });
  }

  /**
   * Initialize the Input WebSocket channel (sends mic PCM audio, board states, MCP responses).
   */
  private initInputChannel(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.inputSocket = new WebSocket(url);

      this.inputSocket.onopen = () => {
        console.log('[DualWS:Input] Channel OPEN.');
        resolve();
      };

      this.inputSocket.onerror = (err) => {
        console.error('[DualWS:Input] Channel ERROR:', err);
        reject(err);
      };

      this.inputSocket.onclose = () => {
        console.log('[DualWS:Input] Channel CLOSED.');
      };

      this.inputSocket.onmessage = (event) => {
        console.debug('[DualWS:Input] Received on input socket:', event.data);
      };
    });
  }

  /**
   * Process incoming messages from the Output channel.
   */
  private async handleOutputMessage(data: Record<string, unknown>) {
    const type = data.type as string;

    // 1. Agent Status Update
    if (type === 'agent_status') {
      const status = (data.status as AgentLiveStatus) || 'listening';
      const message = data.message as string | undefined;
      console.log(`[DualWS:Output] Status: ${status} - ${message || ''}`);

      if (status === 'interrupted') {
        this.clearAudioPlaybackQueue();
      }

      this.updateStatus(status, message);
    }

    // 2. Agent Live Speech Subtitles
    else if (type === 'transcript') {
      const text = String(data.text || '');
      console.log(`[DualWS:Output] Transcript: "${text}"`);
      this.callbacks.onTranscript?.(text);
    }

    // 3. Agent Audio PCM Stream
    else if (type === 'audio') {
      const base64Data = data.data as string;
      if (base64Data) {
        this.queueAudioChunk(base64Data);
      }
    }

    // 4. Whiteboard MCP Tool Request from Agent
    else if (type === 'mcp_request') {
      const payload = data.payload as McpJsonRpcRequest;
      console.log(`[DualWS:Output] Received Whiteboard MCP Tool Request:`, payload);

      this.updateStatus('thinking', `Drawing on blackboard: ${payload.params?.name || ''}...`);

      try {
        // Execute through Frontend WhiteboardMcpServer
        const rpcResponse = await whiteboardMcpServer.handleJsonRpcRequest(payload);
        console.log(`[DualWS:Output] MCP Execution Result:`, rpcResponse);

        // Immediately transmit result back to backend over Input Channel
        this.sendToInput({
          type: 'mcp_response',
          sessionId: this.sessionId,
          payload: rpcResponse,
        });

        // Trigger fresh board state stream after canvas modification
        setTimeout(() => this.streamBoardState(), 300);
      } catch (err) {
        console.error(`[DualWS:Output] Error handling MCP tool request:`, err);
        this.sendToInput({
          type: 'mcp_response',
          sessionId: this.sessionId,
          payload: {
            jsonrpc: '2.0',
            id: payload.id,
            error: { code: -32000, message: String(err) },
          },
        });
      }
    }
  }

  /**
   * Helper to transmit data over the Input WebSocket channel.
   */
  public sendToInput(data: Record<string, unknown>): boolean {
    if (this.inputSocket && this.inputSocket.readyState === WebSocket.OPEN) {
      this.inputSocket.send(JSON.stringify(data));
      return true;
    }
    console.warn('[DualWS:Input] Cannot send: Input socket is not open.');
    return false;
  }

  /**
   * Sends a typed text message from student to agent over the Input channel.
   */
  public sendTextMessage(text: string): boolean {
    console.log(`[DualWS:Input] Sending student text: "${text}"`);
    return this.sendToInput({
      type: 'text',
      sessionId: this.sessionId,
      text,
    });
  }

  /**
   * Streams the current spatial snapshot of the tldraw blackboard to the agent.
   * Debounced to avoid excessive socket traffic while drawing.
   */
  public streamBoardState(force: boolean = false): void {
    if (this.boardStreamDebounceTimer !== null) {
      window.clearTimeout(this.boardStreamDebounceTimer);
    }

    this.boardStreamDebounceTimer = window.setTimeout(() => {
      const state: BoardStatePayload | null = whiteboardMcpServer.getBoardStateSnapshot();
      if (!state) {
        console.debug('[DualWS:Input] Editor not attached, skipping board state stream.');
        return;
      }

      if (!force && state.elementCount === this.lastStreamedElementCount && state.elementCount > 0) {
        // Unchanged
        return;
      }

      this.lastStreamedElementCount = state.elementCount;
      console.log(`[DualWS:Input] Streaming board state to agent: ${state.elementCount} shapes on canvas.`);

      this.sendToInput({
        type: 'board_state',
        sessionId: this.sessionId,
        payload: state,
      });
    }, 250);
  }

  // ---------------------------------------------------------------------------
  // Microphone Audio Capture (User -> Input WebSocket)
  // ---------------------------------------------------------------------------

  /**
   * Start capturing student microphone audio and streaming PCM to backend.
   */
  public async startAudioCapture(): Promise<void> {
    if (this.mediaStream) {
      this.isMicMuted = false;
      return;
    }

    try {
      console.log('[AudioBridge] Requesting microphone access...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      // 2048 buffer size gives ~128ms chunks at 16kHz
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (this.isMicMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Calculate audio RMS level for visual meter
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.callbacks.onAudioLevel?.(Math.min(rms * 5, 1));

        // Convert Float32Array to 16-bit Int16 Linear PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode raw PCM bytes
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = window.btoa(binary);

        // Transmit over Input WebSocket
        this.sendToInput({
          type: 'audio',
          sessionId: this.sessionId,
          data: b64,
        });
      };

      source.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isMicMuted = false;
      console.log('[AudioBridge] Microphone streaming active (16kHz PCM).');
    } catch (err) {
      console.error('[AudioBridge] Failed to initialize microphone:', err);
    }
  }

  /**
   * Stop or mute microphone streaming.
   */
  public stopAudioCapture(): void {
    this.isMicMuted = true;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    console.log('[AudioBridge] Microphone stopped.');
  }

  public setMicMuted(muted: boolean): void {
    this.isMicMuted = muted;
    console.log(`[AudioBridge] Mic muted state: ${muted}`);
    if (!muted && !this.mediaStream) {
      this.startAudioCapture();
    }
  }

  // ---------------------------------------------------------------------------
  // Agent Audio Playback (Output WebSocket -> User Speakers)
  // ---------------------------------------------------------------------------

  private initPlaybackContext(): void {
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      // Gemini Live typically outputs 24kHz audio
      this.playbackContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 24000,
      });
      this.nextPlayTime = 0;
      console.log('[AudioPlayback] Initialized at 24kHz.');
    }
  }

  /**
   * Queue raw 24kHz 1-channel PCM audio chunk from Gemini for smooth playback.
   */
  private queueAudioChunk(base64Data: string): void {
    if (!this.playbackContext) return;
    if (this.playbackContext.state === 'suspended') {
      this.playbackContext.resume();
    }

    try {
      const binary = window.atob(base64Data);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Convert 16-bit PCM bytes to Float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
      }

      const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      this.scheduleBufferPlayback(audioBuffer);
    } catch (err) {
      console.error('[AudioPlayback] Failed to decode audio chunk:', err);
    }
  }

  private scheduleBufferPlayback(buffer: AudioBuffer): void {
    if (!this.playbackContext) return;

    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);

    const currentTime = this.playbackContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;

    this.updateStatus('speaking');
    source.onended = () => {
      if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.05) {
        this.updateStatus('listening');
      }
    };
  }

  private clearAudioPlaybackQueue(): void {
    console.log('[AudioPlayback] Clearing playback queue (interrupted).');
    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    }
    this.updateStatus('listening');
  }

  private updateStatus(status: AgentLiveStatus, message?: string): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status, message);
  }

  public getStatus(): AgentLiveStatus {
    return this.status;
  }

  /**
   * Cleanly disconnect sockets and audio streams.
   */
  public disconnect(): void {
    console.log('[DualWS] Disconnecting session...');
    this.stopAudioCapture();

    if (this.inputSocket) {
      this.inputSocket.close();
      this.inputSocket = null;
    }
    if (this.outputSocket) {
      this.outputSocket.close();
      this.outputSocket = null;
    }

    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      this.playbackContext.close();
      this.playbackContext = null;
    }

    this.updateStatus('idle', 'Disconnected');
    console.log('[DualWS] Disconnected.');
  }
}

// Global Singleton Instance
export const liveDualSessionService = new LiveDualSessionService();
