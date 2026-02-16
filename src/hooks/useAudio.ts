import { useState, useRef, useCallback } from 'react';

export interface UseAudioReturn {
  isRecording: boolean;
  recordedBlob: Blob | null;
  recordedURL: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  playAudio: (url: string | Blob) => void;
  stopAudio: () => void;
  isPlaying: boolean;
  clearRecording: () => void;
  error: string | null;
}

export const useAudio = (): UseAudioReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedURL, setRecordedURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedURL(url);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, [isRecording]);

  const playAudio = useCallback((url: string | Blob) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    if (url instanceof Blob) {
      const blobUrl = URL.createObjectURL(url);
      audioRef.current.src = blobUrl;
    } else {
      audioRef.current.src = url;
    }

    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onended = () => setIsPlaying(false);
    audioRef.current.onerror = () => {
      setError('Failed to play audio');
      setIsPlaying(false);
    };

    audioRef.current.play().catch(err => {
      setError(`Failed to play audio: ${err.message}`);
    });
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (recordedURL) {
      URL.revokeObjectURL(recordedURL);
    }
    setRecordedBlob(null);
    setRecordedURL(null);
    chunksRef.current = [];
  }, [recordedURL]);

  return {
    isRecording,
    recordedBlob,
    recordedURL,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    isPlaying,
    clearRecording,
    error,
  };
};
