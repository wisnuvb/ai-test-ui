export interface APIConfig {
  baseURL: string;
  stt: string;
  llm: string;
  tts: string;
}

export interface STTResult {
  text: string;
  duration?: number;
  confidence?: number;
}

export interface LLMRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface LLMResult {
  response: string;
  model?: string;
  tokens_used?: number;
}

export interface TTSRequest {
  text: string;
  language?: string;
  speaker?: string;
}

export interface TTSResult {
  audioUrl: string;
  duration?: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  type: 'stt' | 'llm' | 'tts';
  input: string;
  output: string;
  metadata?: Record<string, any>;
}

export interface AudioFile {
  file: File;
  name: string;
  duration?: number;
  size: number;
}
