
export enum TutorMode {
  DASHBOARD = 'DASHBOARD',
  COURSE = 'COURSE',
}

export interface Course {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
}

export interface Material {
  id: string;
  type: 'video' | 'audio' | 'document' | 'web';
  title: string;
  summary: string;
  originalContent?: string; // For short text or base64 if needed, mostly we store the summary
  timestamp: number;
  folder: string;
}

export interface AnalysisResult {
  text: string;
  groundingMetadata?: {
    groundingChunks?: Array<{
      web?: { uri: string; title: string };
    }>;
  };
  relatedLinks?: Array<{ title: string; url: string }>;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastModified: number;
  summarized?: boolean; // Track if session has been summarized for memory
}

export interface PersistentMemory {
  id: string;
  summary: string; // AI-generated summary of conversation
  topics: string[]; // Key topics discussed
  timestamp: number;
  sessionIds: string[]; // Original session IDs that were summarized
}

export type FileInput = {
  file: File | null;
  base64: string | null;
  mimeType: string;
};
