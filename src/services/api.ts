/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { STTResult, LLMRequest, LLMResult, TTSRequest, TTSResult, APIConfig } from '../types';

class APIService {
  private api: AxiosInstance;
  private config: APIConfig;

  constructor(baseURL: string = 'http://localhost:8000') {
    this.config = {
      baseURL,
      stt: `${baseURL}/api/stt`,
      llm: `${baseURL}/api/llm`,
      tts: `${baseURL}/api/tts`,
    };

    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setBaseURL(baseURL: string) {
    this.config.baseURL = baseURL;
    this.config.stt = `${baseURL}/api/stt`;
    this.config.llm = `${baseURL}/api/llm`;
    this.config.tts = `${baseURL}/api/tts`;
    this.api.defaults.baseURL = baseURL;
  }

  // STT (Whisper)
  async transcribe(audioFile: File | Blob, language: string = 'id'): Promise<STTResult> {
    const formData = new FormData();

    const fileToUpload = audioFile instanceof File
      ? audioFile
      : new File([audioFile], 'audio.wav', { type: audioFile.type || 'audio/wav' });

    formData.append('file', fileToUpload);
    formData.append('language', language);

    // Call Whisper directly via Vite proxy to avoid CORS.
    const timeout = (this.api.defaults.timeout as number | undefined) ?? 30000;
    const response = await axios.post('/whisper/transcribe/simple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout,
    });

    const data = response.data;
    return {
      text: data?.text ?? data?.transcript ?? data?.transcription ?? (typeof data === 'string' ? data : ''),
      duration: data?.duration,
      confidence: data?.confidence,
    };
  }

  async transcribeFromURL(audioURL: string): Promise<STTResult> {
    const response = await this.api.post('/api/stt', { audio_url: audioURL });
    return response.data;
  }

  // LLM (Qwen)
  async generateResponse(request: LLMRequest): Promise<LLMResult> {
    // OpenRouter Chat Completions (proxied via Vite dev/preview server).
    // The API key is injected server-side by the Vite proxy so it won't be exposed to the browser.

    const model =
      (import.meta as any).env.OPENROUTER_MODEL ||
      (import.meta as any).env.OPENROUTRER_MODEL ||
      request.model ||
      'openai/gpt-4o';

    const temperature = request.temperature ?? 0.7;
    const max_tokens = request.max_tokens ?? 2048;

    const openrouterResponse = await axios.post(
      '/openrouter/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: request.prompt }],
        temperature,
        max_tokens,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const data = openrouterResponse.data;
    const content = data?.choices?.[0]?.message?.content ?? '';

    return {
      response: content,
      model: data?.model ?? model,
      tokens_used: data?.usage?.total_tokens,
    };
  }

  // TTS (Piper)
  async synthesize(request: TTSRequest): Promise<TTSResult> {
    const timeout = (this.api.defaults.timeout as number | undefined) ?? 30000;
    const response = await axios.post(
      '/piper/synthesize',
      { text: request.text },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      },
    );

    const blob = response.data as Blob;
    const audioUrl = URL.createObjectURL(blob);

    return { audioUrl };
  }

  async synthesizeAndGetBlob(request: TTSRequest): Promise<Blob> {
    const timeout = (this.api.defaults.timeout as number | undefined) ?? 30000;
    const response = await axios.post(
      '/piper/synthesize',
      { text: request.text },
      {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout,
      },
    );

    return response.data;
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Get config
  getConfig(): APIConfig {
    return this.config;
  }
}

export const apiService = new APIService();
