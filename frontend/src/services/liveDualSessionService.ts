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
import type { BoardStatePayload, LessonPlan, ClassroomParticipant } from '../types';
import { getWebSocketBaseUrl } from './apiConfig';

export type AgentLiveStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'paused' | 'error';

export interface ClientUserInfo {
  userId?: string;
  name?: string;
  avatar?: string;
  isHost?: boolean;
  isClassroom?: boolean;
}

export interface LiveSessionCallbacks {
  onStatusChange?: (status: AgentLiveStatus, message?: string) => void;
  onTranscript?: (text: string) => void;
  onAudioLevel?: (level: number) => void;
  onRosterUpdate?: (participants: ClassroomParticipant[], count: number) => void;
  onBoardSync?: (boardState: BoardStatePayload) => void;
  onCurriculumSync?: (curriculum: LessonPlan) => void;
  onHandRaisedAlert?: (data: { userId: string; studentName: string; raised: boolean }) => void;
  onClassEndedByHost?: (data: { reason: string; roomCode?: string }) => void;
}

/**
 * High-fidelity linear interpolation downsampler from arbitrary browser/hardware
 * AudioContext sampleRate (e.g. 48000Hz or 44100Hz) to 16000Hz 16-bit linear PCM.
 */
function downsampleTo16kHz(inputData: Float32Array, inputSampleRate: number): Int16Array {
  if (inputSampleRate === 16000) {
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(inputData.length / ratio);
  const pcm16 = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const originIdx = i * ratio;
    const idxFloor = Math.floor(originIdx);
    const idxCeil = Math.min(inputData.length - 1, idxFloor + 1);
    const fraction = originIdx - idxFloor;

    const interpolated = inputData[idxFloor] + fraction * (inputData[idxCeil] - inputData[idxFloor]);
    const clamped = Math.max(-1, Math.min(1, interpolated));
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return pcm16;
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
  private lastVoiceActivityTime: number = 0;
  private hasSpokenInUtterance: boolean = false;

  // Audio Playback & Jitter Buffering (Output WS -> Speakers)
  private playbackContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlayTime: number = 0;
  private isSpeakerMuted: boolean = false;

  // Jitter buffer and queue state
  private audioQueue: AudioBuffer[] = [];
  private isJitterBuffering: boolean = false;
  private jitterBufferTimeout: number | null = null;
  private isPaused: boolean = false;
  private isInterrupted: boolean = false;
  private interruptionCooldownTimeout: number | null = null;
  private readonly MIN_JITTER_CHUNKS: number = 3;

  // Board State Streaming
  private lastStreamedElementCount: number = -1;
  private boardStreamDebounceTimer: number | null = null;

  // Pedagogical Curriculum Plan
  private curriculumPlan: LessonPlan | null = null;

  // Outbound message queue for Input channel (prevents dropped MCP responses)
  private inputQueue: string[] = [];

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
   * Set and immediately synchronize the active curriculum plan (topic, modules, notes)
   * with the backend Gemini Live agent over the Input WebSocket channel.
   */
  public setCurriculumPlan(plan: LessonPlan | null): void {
    this.curriculumPlan = plan;
    if (plan && this.inputSocket && this.inputSocket.readyState === WebSocket.OPEN) {
      console.log(`[DualWS:Input] Transmitting curriculum context to live agent: "${plan.topic}"`);
      this.sendToInput({
        type: 'curriculum_context',
        sessionId: this.sessionId,
        payload: plan,
      });
    }
  }

  /**
   * Connect to both /input and /output WebSocket endpoints for the given session or classroom.
   */
  public async connect(
    sessionId: string,
    baseWsUrl?: string,
    initialPlan?: LessonPlan | null,
    userInfo?: ClientUserInfo
  ): Promise<void> {
    this.sessionId = sessionId;
    this.isPaused = false;
    this.hasSpokenInUtterance = false;
    if (initialPlan) {
      this.curriculumPlan = initialPlan;
    }
    this.updateStatus('connecting', 'Connecting to Rabbly AI Tutor live session...');

    const host = (baseWsUrl || getWebSocketBaseUrl()).replace(/\/+$/, '');

    const queryParts: string[] = [];
    if (userInfo?.userId) queryParts.push(`user_id=${encodeURIComponent(userInfo.userId)}`);
    if (userInfo?.name) queryParts.push(`name=${encodeURIComponent(userInfo.name)}`);
    if (userInfo?.avatar) queryParts.push(`avatar=${encodeURIComponent(userInfo.avatar)}`);
    if (userInfo?.isHost !== undefined) queryParts.push(`is_host=${userInfo.isHost}`);
    if (userInfo?.isClassroom) queryParts.push(`is_classroom=true`);
    const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    const inputUrl = `${host}/ws/live/${sessionId}/input${queryStr}`;
    const outputUrl = `${host}/ws/live/${sessionId}/output${queryStr}`;

    console.log(`[DualWS] Connecting to channels for session '${sessionId}':`);
    console.log(`[DualWS:Input] URL: ${inputUrl}`);
    console.log(`[DualWS:Output] URL: ${outputUrl}`);

    try {
      // 1. Establish both Output and Input channels concurrently
      await Promise.all([
        this.initOutputChannel(outputUrl),
        this.initInputChannel(inputUrl),
      ]);

      // 2. Initialize Audio Playback Context
      this.initPlaybackContext();

      // 3. Send initial board state immediately
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
        // Flush any queued messages (e.g. MCP tool responses or initial sync payloads)
        while (this.inputQueue.length > 0) {
          const item = this.inputQueue.shift();
          if (item && this.inputSocket && this.inputSocket.readyState === WebSocket.OPEN) {
            console.log('[DualWS:Input] Delivering queued message to backend.');
            this.inputSocket.send(item);
          }
        }
        // Transmit curriculum context if available upon connection
        if (this.curriculumPlan) {
          console.log(`[DualWS:Input] Transmitting curriculum context on open for session '${this.sessionId}': "${this.curriculumPlan.topic}"`);
          this.sendToInput({
            type: 'curriculum_context',
            sessionId: this.sessionId,
            payload: this.curriculumPlan,
          });
        }
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
    // Drop all incoming messages if service is disconnected or idle
    if (this.status === 'idle' || !this.outputSocket) {
      return;
    }

    const type = data.type as string;

    // 1. Agent Status Update
    if (type === 'agent_status') {
      const status = (data.status as AgentLiveStatus) || 'listening';
      const message = data.message as string | undefined;
      console.log(`[DualWS:Output] Status: ${status} - ${message || ''}`);

      if (status === 'interrupted') {
        this.clearAudioPlaybackQueue(true);
      } else if (status === 'speaking') {
        this.isInterrupted = false;
      }

      this.updateStatus(status, message);
    }

    // 2. Agent Live Speech Subtitles
    else if (type === 'transcript') {
      const text = String(data.text || '');
      if (text.trim()) {
        this.isInterrupted = false;
      }
      console.log(`[DualWS:Output] Transcript: "${text}"`);
      this.callbacks.onTranscript?.(text);
    }

    // 3. Agent Audio PCM Stream
    else if (type === 'audio') {
      const base64Data = data.data as string;
      if (base64Data && !this.isPaused && !this.isInterrupted) {
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
        setTimeout(() => this.streamBoardState(true), 300);
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

    // 5. Classroom Roster & Participant Presence
    else if (type === 'roster_update') {
      const participants = (data.participants as ClassroomParticipant[]) || [];
      const count = typeof data.count === 'number' ? data.count : participants.length;
      console.log(`[DualWS:Output] Roster update: ${count} participant(s).`);
      this.callbacks.onRosterUpdate?.(participants, count);
    }

    // 6. Blackboard State Catch-Up Sync (for joining students)
    else if (type === 'board_sync') {
      const payload = data.payload as BoardStatePayload;
      console.log(`[DualWS:Output] Board sync snapshot received:`, payload);
      this.callbacks.onBoardSync?.(payload);
    }

    // 7. Blackboard Draw History Replay (for joining students)
    else if (type === 'board_history') {
      const history = (data.history as Array<Record<string, unknown>>) || [];
      console.log(`[DualWS:Output] Replaying ${history.length} board action(s) for joining student.`);
      (async () => {
        for (const item of history) {
          const toolName = (item.name || item.tool) as string;
          const toolArgs = (item.arguments || item.args || {}) as Record<string, unknown>;
          if (toolName) {
            try {
              await whiteboardMcpServer.callTool(toolName, toolArgs);
            } catch (err) {
              console.warn(`[DualWS:Output] Error replaying board tool '${toolName}':`, err);
            }
          }
        }
        try {
          await whiteboardMcpServer.callTool('adjust_view', { mode: 'zoom_to_fit' });
        } catch {
          // Ignore zoom adjustment if canvas is empty
        }
      })();
    }

    // 8. Pedagogical Curriculum Sync (for joining students)
    else if (type === 'curriculum_sync') {
      const payload = data.payload as LessonPlan;
      console.log(`[DualWS:Output] Curriculum sync received for classroom:`, payload?.topic);
      if (payload) {
        this.curriculumPlan = payload;
        this.callbacks.onCurriculumSync?.(payload);
      }
    }

    // 9. Classroom Hand Raised Alert
    else if (type === 'hand_raised_alert') {
      console.log(`[DualWS:Output] Hand raised alert: ${data.studentName}`);
      this.callbacks.onHandRaisedAlert?.({
        userId: String(data.userId || ''),
        studentName: String(data.studentName || 'A student'),
        raised: Boolean(data.raised),
      });
    }

    // 10. Classroom Ended by Host
    else if (type === 'class_ended_by_host') {
      console.log(`[DualWS:Output] Classroom ended by host:`, data.reason);
      this.callbacks.onClassEndedByHost?.({
        reason: String(data.reason || 'The instructor has ended this classroom session.'),
        roomCode: String(data.roomCode || this.sessionId || ''),
      });
    }
  }

  /**
   * Raise or lower hand in the classroom.
   */
  public raiseHand(userId: string, raised: boolean = true, userName?: string): void {
    this.sendToInput({
      type: 'raise_hand',
      sessionId: this.sessionId,
      userId,
      userName,
      raised,
    });
  }

  /**
   * Broadcast end of classroom session (host only).
   */
  public endClassroom(): void {
    this.sendToInput({
      type: 'end_class',
      sessionId: this.sessionId,
    });
  }

  /**
   * Broadcast microphone mute status toggle.
   */
  public toggleMute(userId: string, isMuted: boolean): void {
    this.sendToInput({
      type: 'mute_toggle',
      sessionId: this.sessionId,
      userId,
      isMuted,
    });
  }

  /**
   * Broadcast participant metadata when entering classroom.
   */
  public joinClassroom(participant: ClassroomParticipant): void {
    this.sendToInput({
      type: 'join_classroom',
      sessionId: this.sessionId,
      participant,
    });
  }

  /**
   * Helper to transmit data over the Input WebSocket channel.
   * If the input socket is still connecting, buffers the message to ensure
   * critical payloads (such as MCP tool call responses) are never dropped.
   */
  public sendToInput(data: Record<string, unknown>): boolean {
    const serialized = JSON.stringify(data);
    if (this.inputSocket && this.inputSocket.readyState === WebSocket.OPEN) {
      this.inputSocket.send(serialized);
      return true;
    }
    console.warn(`[DualWS:Input] Socket not open yet (readyState=${this.inputSocket?.readyState}). Queuing message: ${data.type}`);
    this.inputQueue.push(serialized);
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
   * Start capturing student microphone audio, resample to 16kHz PCM, and stream to backend.
   */
  public async startAudioCapture(): Promise<void> {
    if (this.mediaStream && this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.isMicMuted = false;
      return;
    }

    try {
      console.log('[AudioBridge] Requesting microphone access with acoustic processing...');
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const inputRate = this.audioContext.sampleRate;
      console.log(`[AudioBridge] AudioContext active at native rate: ${inputRate}Hz. Resampling to 16000Hz PCM.`);

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      // 2048 buffer size gives ~42ms chunks at 48kHz, ~128ms at 16kHz
      this.processorNode = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processorNode.onaudioprocess = (e) => {
        if (this.isMicMuted || this.isPaused) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Calculate audio RMS level for visual meter
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.callbacks.onAudioLevel?.(Math.min(rms * 5, 1));

        // Barge-in: if student speaks while agent is playing speech or has active/queued buffers,
        // instantly silence AI audio and notify backend
        if (
          rms > 0.04 &&
          (this.status === 'speaking' || this.activeSources.length > 0 || this.audioQueue.length > 0)
        ) {
          this.clearAudioPlaybackQueue(true);
          this.sendToInput({
            type: 'student_interrupted',
            sessionId: this.sessionId,
          });
        }

        // Track voice activity timing
        const now = Date.now();
        if (rms > 0.008) {
          this.hasSpokenInUtterance = true;
          this.lastVoiceActivityTime = now;
        }

        // Token Compression & Silence Gating: If audio energy is negligible and holdover
        // period (>500ms) has expired:
        if (rms < 0.006 && now - this.lastVoiceActivityTime > 500) {
          // If student was just speaking and has now paused, dispatch audio_stream_end
          if (this.hasSpokenInUtterance) {
            this.sendToInput({
              type: 'audio_stream_end',
              sessionId: this.sessionId,
            });
            this.hasSpokenInUtterance = false;
            console.log('[AudioBridge] Dispatched audio_stream_end after speech pause.');
          }
          return;
        }

        // Downsample input from native sample rate to exact 16kHz 16-bit linear PCM
        const pcm16 = downsampleTo16kHz(inputData, inputRate);

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
      console.log('[AudioBridge] Microphone streaming active (resampled to 16kHz mono PCM).');
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
    this.callbacks.onAudioLevel?.(0);
    console.log('[AudioBridge] Microphone stopped.');
  }

  public setMicMuted(muted: boolean): void {
    const wasUnmuted = !this.isMicMuted;
    this.isMicMuted = muted;
    if (!muted) {
      this.isPaused = false;
    }
    console.log(`[AudioBridge] Mic muted state: ${muted}`);

    if (muted) {
      this.callbacks.onAudioLevel?.(0);
      if (wasUnmuted) {
        // Dispatched end-of-speech to prompt Gemini Live to reply immediately
        this.sendToInput({
          type: 'audio_stream_end',
          sessionId: this.sessionId,
        });
      }
    } else {
      if (!this.mediaStream) {
        this.startAudioCapture();
      } else if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Agent Audio Playback (Output WebSocket -> User Speakers)
  // ---------------------------------------------------------------------------

  private initPlaybackContext(): void {
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      // Gemini Live natively outputs 24kHz mono linear PCM
      this.playbackContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 24000,
      });

      this.gainNode = this.playbackContext.createGain();
      this.gainNode.gain.setValueAtTime(this.isSpeakerMuted ? 0 : 1, this.playbackContext.currentTime);
      this.gainNode.connect(this.playbackContext.destination);

      this.nextPlayTime = 0;
      this.activeSources = [];
      console.log('[AudioPlayback] Initialized at 24kHz with Master Gain.');
    }
  }

  /**
   * Set speaker output mute status.
   */
  public setSpeakerMuted(muted: boolean): void {
    this.isSpeakerMuted = muted;
    console.log(`[AudioPlayback] Speaker muted: ${muted}`);
    if (this.gainNode && this.playbackContext) {
      this.gainNode.gain.setValueAtTime(muted ? 0 : 1, this.playbackContext.currentTime);
    }
  }

  /**
   * Queue raw 24kHz 1-channel PCM audio chunk from Gemini for smooth playback.
   */
  private queueAudioChunk(base64Data: string): void {
    if (this.status === 'idle' || this.isSpeakerMuted || this.isPaused || this.isInterrupted) {
      return;
    }

    if (!this.playbackContext) {
      this.initPlaybackContext();
    }
    if (!this.playbackContext || !this.gainNode) return;

    if (this.playbackContext.state === 'suspended') {
      this.playbackContext.resume();
    }

    try {
      const binary = window.atob(base64Data);
      const len = binary.length;
      if (len < 2) return;

      // Ensure length is an even number of bytes for 16-bit PCM samples
      const evenLen = len - (len % 2);
      const bytes = new Uint8Array(evenLen);
      for (let i = 0; i < evenLen; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Convert 16-bit PCM little-endian bytes to Float32 [-1.0, 1.0]
      const int16 = new Int16Array(bytes.buffer, bytes.byteOffset, evenLen / 2);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
      }

      const audioBuffer = this.playbackContext.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      this.enqueueAudioBuffer(audioBuffer);
    } catch (err) {
      console.error('[AudioPlayback] Failed to decode audio chunk:', err);
    }
  }

  /**
   * Jitter-buffered queue ingestion. Prevents voice breaking / gaps by pre-buffering
   * a tiny window of audio before starting playout, and then continuously streaming.
   */
  private enqueueAudioBuffer(buffer: AudioBuffer): void {
    if (this.isPaused || this.isInterrupted || !this.playbackContext || !this.gainNode) return;

    this.audioQueue.push(buffer);

    const currentTime = this.playbackContext.currentTime;
    const isActivelyPlaying = this.activeSources.length > 0 && this.nextPlayTime > currentTime;

    if (isActivelyPlaying) {
      // Playout is already active and ahead of clock: drain immediately without re-buffering
      this.drainAudioQueue();
    } else {
      // Playout is idle or experienced an underrun: accumulate jitter buffer before launching
      if (!this.isJitterBuffering) {
        this.isJitterBuffering = true;
        this.jitterBufferTimeout = window.setTimeout(() => {
          this.startPlayoutAfterJitterBuffer();
        }, 60);
      } else if (this.audioQueue.length >= this.MIN_JITTER_CHUNKS) {
        if (this.jitterBufferTimeout) {
          clearTimeout(this.jitterBufferTimeout);
          this.jitterBufferTimeout = null;
        }
        this.startPlayoutAfterJitterBuffer();
      }
    }
  }

  private startPlayoutAfterJitterBuffer(): void {
    this.isJitterBuffering = false;
    this.jitterBufferTimeout = null;

    if (this.isPaused || this.isInterrupted || !this.playbackContext || !this.gainNode) {
      return;
    }
    if (this.audioQueue.length === 0) return;

    const currentTime = this.playbackContext.currentTime;
    // Schedule playout starting with 80ms headroom ahead of current hardware clock
    this.nextPlayTime = Math.max(this.nextPlayTime, currentTime + 0.08);
    this.drainAudioQueue();
  }

  private drainAudioQueue(): void {
    if (!this.playbackContext || !this.gainNode || this.isPaused || this.isInterrupted) return;

    const currentTime = this.playbackContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.04;
    }

    while (this.audioQueue.length > 0) {
      const buffer = this.audioQueue.shift();
      if (!buffer) break;

      const source = this.playbackContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      source.start(this.nextPlayTime);
      this.nextPlayTime += buffer.duration;
      this.activeSources.push(source);

      this.updateStatus('speaking');

      source.onended = () => {
        this.activeSources = this.activeSources.filter((s) => s !== source);
        if (
          this.activeSources.length === 0 &&
          this.audioQueue.length === 0 &&
          !this.isPaused &&
          !this.isJitterBuffering
        ) {
          if (this.playbackContext && this.playbackContext.currentTime >= this.nextPlayTime - 0.05) {
            this.updateStatus('listening');
          }
        }
      };
    }
  }

  /**
   * Instantly halt playback of all scheduled buffers and clear the entire audio queue.
   * Triggered on student speech, server interruption, lecture pause, restart, or student questions.
   */
  public clearAudioPlaybackQueue(markInterrupted: boolean = true): void {
    console.log(
      `[AudioPlayback] Clearing playback queue & buffer. Stopping ${this.activeSources.length} active sources, discarding ${this.audioQueue.length} queued chunks.`
    );

    if (this.jitterBufferTimeout) {
      clearTimeout(this.jitterBufferTimeout);
      this.jitterBufferTimeout = null;
    }
    this.isJitterBuffering = false;
    this.audioQueue = [];

    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch {}
    }
    this.activeSources = [];

    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    } else {
      this.nextPlayTime = 0;
    }

    if (markInterrupted) {
      this.isInterrupted = true;
      if (this.interruptionCooldownTimeout) {
        clearTimeout(this.interruptionCooldownTimeout);
      }
      this.interruptionCooldownTimeout = window.setTimeout(() => {
        this.isInterrupted = false;
        this.interruptionCooldownTimeout = null;
      }, 350);
    }

    if (!this.isPaused) {
      this.updateStatus('listening');
    }
  }

  /**
   * Pause or resume the live session.
   * On pause, immediately silences playback, purges the audio queue, and stops mic streaming.
   */
  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      console.log('[AudioPlayback] Pausing lecture: stopping audio playback and clearing queue.');
      this.clearAudioPlaybackQueue(true);
      this.sendToInput({
        type: 'session_pause',
        sessionId: this.sessionId,
      });
      this.updateStatus('paused', 'Lecture Paused');
    } else {
      console.log('[AudioPlayback] Resuming lecture.');
      this.isInterrupted = false;
      this.clearAudioPlaybackQueue(false);
      this.sendToInput({
        type: 'session_resume',
        sessionId: this.sessionId,
      });
      this.updateStatus('listening', 'Ready');
    }
  }

  public isLecturePaused(): boolean {
    return this.isPaused;
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
    this.status = 'idle';
    this.stopAudioCapture();
    this.clearAudioPlaybackQueue(false);

    if (this.jitterBufferTimeout) {
      clearTimeout(this.jitterBufferTimeout);
      this.jitterBufferTimeout = null;
    }
    if (this.interruptionCooldownTimeout) {
      clearTimeout(this.interruptionCooldownTimeout);
      this.interruptionCooldownTimeout = null;
    }
    this.audioQueue = [];
    this.isPaused = false;
    this.isInterrupted = false;

    if (this.inputSocket) {
      this.inputSocket.onclose = null;
      this.inputSocket.onerror = null;
      this.inputSocket.onmessage = null;
      try {
        this.inputSocket.close();
      } catch {}
      this.inputSocket = null;
    }
    if (this.outputSocket) {
      this.outputSocket.onclose = null;
      this.outputSocket.onerror = null;
      this.outputSocket.onmessage = null;
      try {
        this.outputSocket.close();
      } catch {}
      this.outputSocket = null;
    }

    if (this.playbackContext && this.playbackContext.state !== 'closed') {
      try {
        this.playbackContext.close();
      } catch {}
      this.playbackContext = null;
      this.gainNode = null;
    }

    this.callbacks.onStatusChange?.('idle', 'Disconnected');
    console.log('[DualWS] Disconnected.');
  }
}

// Global Singleton Instance
export const liveDualSessionService = new LiveDualSessionService();
