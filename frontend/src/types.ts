export type AiStatus = 'idle' | 'thinking' | 'explaining' | 'diagramming' | 'listening' | 'answering';

export interface CurriculumModule {
  id: string;
  title: string;
  duration: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  description: string;
  keyTakeaways: string[];
}

export interface LessonPlan {
  id: string;
  topic: string;
  overview: string;
  subject?: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  modules: CurriculumModule[];
  lectureNotes: string[];
  suggestedQuestions: string[];
}

export type WhiteboardColor =
  | 'black'
  | 'grey'
  | 'light-violet'
  | 'violet'
  | 'blue'
  | 'light-blue'
  | 'yellow'
  | 'orange'
  | 'green'
  | 'light-green'
  | 'light-red'
  | 'red';

export interface WhiteboardShapeAction {
  action:
    | 'create_card'
    | 'create_geo'
    | 'draw_right_triangle'
    | 'draw_circle'
    | 'draw_formula'
    | 'create_arrow'
    | 'zoom_to'
    | 'clear';
  id: string;
  title?: string;
  text?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  color?: WhiteboardColor;
  fromId?: string;
  toId?: string;
  label?: string;
  // Specialized parameters for geometry and trigonometry
  geometryParams?: {
    base?: number;
    height?: number;
    radius?: number;
    showRightAngleMarker?: boolean;
    showAngleArc?: boolean;
    angleLabel?: string;
    hypotenuseLabel?: string;
    oppositeLabel?: string;
    adjacentLabel?: string;
    formulaLatex?: string;
  };
}

// ---------------------------------------------------------------------------
// Two-Channel WebSocket Whiteboard Protocol
// Channel 1: OUTPUT (AI Backend -> Frontend)
// Channel 2: INPUT  (Frontend Canvas -> AI Backend)
// ---------------------------------------------------------------------------

export interface BoardElementSummary {
  id: string;
  type: string;
  label?: string;
  text?: string;
  bounds: { x: number; y: number; width: number; height: number };
  color?: string;
}

export interface BoardStatePayload {
  canonicalWidth: number;
  canonicalHeight: number;
  elementCount: number;
  elements: BoardElementSummary[];
  spatialSummary: string;
}

// Message from AI backend to frontend (Channel: output)
export interface BoardOutputMessage {
  channel: 'output';
  messageId: string;
  timestamp: number;
  command:
    | { type: 'draw_shape'; shape: WhiteboardShapeAction }
    | { type: 'batch_draw'; shapes: WhiteboardShapeAction[] }
    | { type: 'clear_board' }
    | { type: 'request_state' }
    | { type: 'highlight_element'; id: string; durationMs?: number };
}

// Message from frontend canvas to AI backend (Channel: input)
export interface BoardInputMessage {
  channel: 'input';
  messageId: string;
  timestamp: number;
  event: 'board_state' | 'action_ack' | 'ready';
  boardState: BoardStatePayload;
  ackCommandId?: string;
}

export interface LectureCue {
  timeOffsetSec: number;
  status: AiStatus;
  aiSpeech: string;
  whiteboardActions?: WhiteboardShapeAction[];
}

export interface ClassroomParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isMuted: boolean;
  joinedAt: string;
}

export interface ExternalResource {
  id: string;
  type: 'file' | 'link' | 'note' | 'youtube';
  title: string;
  detail?: string;
  file?: File;
  url?: string;
  content?: string;
  videoId?: string;
}

export interface RecentSessionData {
  id: string;
  topic: string;
  subject: string;
  date: string;
  timestamp: string;
  lastCheckpoint: string;
  completedModules: number;
  totalModules: number;
  progressPercent: number;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  hasExternalResources?: boolean;
  resourceName?: string;
}
