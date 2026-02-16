# AI Test UI

A lightweight React + Vite application for testing AI services (Whisper, Qwen, and Piper). Built with shadcn/ui and TypeScript for a clean, modern interface.

## Features

✨ **3 Dedicated Pages:**
- **STT (Speech to Text)** - Whisper integration for audio transcription
- **LLM (Large Language Model)** - Qwen integration for text generation
- **TTS (Text to Speech)** - Piper integration for audio synthesis

✨ **Gesture (TensorFlow):**
- Canvas untuk siswa mencoba menulis/menggambar
- Deteksi berjalan di browser via TensorFlow.js (tidak mengirim gambar ke server)

🎯 **Rich Functionality:**
- Audio recording and playback
- File upload support
- History tracking and logging
- Real-time API status monitoring
- Download results as files
- Copy-to-clipboard functionality
- Adjustable parameters (temperature, tokens, language, etc.)

🎨 **Modern UI:**
- shadcn/ui components
- Tailwind CSS v4
- Responsive design
- Dark mode support

## Prerequisites

- Node.js 18+
- npm or yarn
- A running AI server with endpoints:
  - `POST /api/stt` - Speech to text
  - `POST /api/llm` - LLM generation
  - `POST /api/tts` - Text to speech
  - `GET /health` - Health check (optional)

## Installation

```bash
# Clone or download the project
cd ai-test-ui

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Configuration

## TensorFlow (Local / Offline)

Halaman **Gesture** memakai TensorFlow.js dan modelnya dijalankan di browser (bukan di server). Aplikasi akan mencoba memuat model dari folder lokal `public/tf-models/` terlebih dahulu.

Untuk setup **full lokal/offline** (supaya tidak perlu download model dari internet), jalankan:

```bash
npm run download:tf-models
```

Model akan diunduh ke `public/tf-models/` (folder ini di-ignore oleh git karena ukurannya besar).

### Setting Server URL

You can configure the API server URL in two ways:

1. **Via Settings Button** (Top-right of navbar)
   - Click the settings icon
   - Enter your server base URL
   - Click Save

2. **Via Environment Variable**
   ```
   VITE_API_BASE_URL=http://your-server:8000
   ```

3. **Via Browser Storage**
   - The app saves your server URL to localStorage automatically

### Default Server URL

- Development: `http://localhost:8000`
- Can be changed in the Navbar settings panel

## API Endpoints

### STT (Whisper) - `/api/stt`

**Request (multipart/form-data):**
```bash
POST /api/stt
Content-Type: multipart/form-data

file: <audio_file>
```

**Response:**
```json
{
  "text": "transcribed text here",
  "duration": 5.2,
  "confidence": 0.95
}
```

**Or with URL:**
```bash
POST /api/stt
Content-Type: application/json

{
  "audio_url": "https://example.com/audio.wav"
}
```

### LLM (Qwen) - `/api/llm`

**Request:**
```bash
POST /api/llm
Content-Type: application/json

{
  "prompt": "Your prompt here",
  "model": "qwen",
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Response:**
```json
{
  "response": "Generated response here",
  "model": "qwen",
  "tokens_used": 150
}
```

### TTS (Piper) - `/api/tts`

**Request:**
```bash
POST /api/tts
Content-Type: application/json

{
  "text": "Text to synthesize",
  "language": "en",
  "speaker": "default"
}
```

**Response:**
```json
{
  "audioUrl": "data:audio/wav;base64,...",
  "duration": 2.5
}
```

Or returns audio blob directly with `responseType: 'blob'`

### Health Check - `/health`

**Request:**
```bash
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

## Project Structure

```
src/
├── components/
│   ├── common/           # Navbar, Loading
│   ├── ui/               # shadcn/ui components
│   └── lib/utils.ts      # Utility functions
├── hooks/                # Custom React hooks
│   ├── useAudio.ts       # Audio recording/playback
│   ├── useAPI.ts         # API request handling
│   └── useHistory.ts     # History management
├── pages/                # Page components
│   ├── STTPage.tsx
│   ├── LLMPage.tsx
│   └── TTSPage.tsx
├── services/
│   └── api.ts            # API service layer
├── types/
│   └── index.ts          # TypeScript interfaces
├── App.tsx               # Main app component
├── main.tsx              # Entry point
└── index.css             # Global styles
```

## Key Technologies

- **React 19** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **shadcn/ui** - Component library
- **React Router** - Navigation
- **Axios** - HTTP client
- **lucide-react** - Icons

## Custom Hooks

### `useAudio()`

Manages audio recording and playback.

```typescript
const {
  isRecording,
  recordedBlob,
  recordedURL,
  startRecording,
  stopRecording,
  playAudio,
  stopAudio,
  isPlaying,
  clearRecording,
  error
} = useAudio();
```

### `useAPI()`

Handles API requests with loading/error states.

```typescript
const {
  isLoading,
  error,
  data,
  execute,
  reset,
  setData
} = useAPI();

// Usage
await execute(() => apiService.transcribe(file));
```

### `useHistory()`

Manages operation history with localStorage.

```typescript
const {
  history,
  addEntry,
  clearHistory,
  deleteEntry,
  exportHistory,
  importHistory
} = useHistory();
```

## API Service

The `apiService` provides typed methods for all operations:

```typescript
import { apiService } from './services/api';

// STT
const result = await apiService.transcribe(audioFile);

// LLM
const result = await apiService.generateResponse({
  prompt: "Hello",
  temperature: 0.7,
  max_tokens: 2048
});

// TTS
const result = await apiService.synthesize({
  text: "Hello world",
  language: "en",
  speaker: "default"
});

// Health check
const isOnline = await apiService.healthCheck();

// Configure base URL
apiService.setBaseURL('http://new-server:8000');
```

## Build & Deploy

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Output will be in dist/ directory
```

The built app can be deployed to any static hosting (Vercel, Netlify, GitHub Pages, etc.)

## Development

```bash
# Start dev server with hot reload
npm run dev

# Run linting (if configured)
npm run lint

# Check TypeScript
npm run type-check
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Known Limitations

- File size limits depend on your server
- Audio recording requires HTTPS in production
- Some browsers require user interaction to start recording
- History is stored in localStorage (max ~5-10MB)

## Troubleshooting

### Server connection fails
- Check if server is running
- Verify base URL in settings
- Check CORS configuration on server
- Open browser DevTools console for error details

### Audio recording not working
- Allow microphone permissions in browser
- Ensure HTTPS in production (for some browsers)
- Check if another app is using the microphone

### Files not downloading
- Check browser download permissions
- Try a different browser
- Check browser console for errors

## Notes for API Server Implementation

When implementing the API endpoints, ensure:

1. **CORS headers** - Allow requests from your UI origin
2. **Timeout handling** - Set appropriate timeouts (default: 30s)
3. **Error responses** - Return meaningful error messages
4. **File handling** - Support multipart/form-data for file uploads
5. **Audio format** - Support common formats (WAV, MP3, OGG, WebM)
6. **Response format** - Follow the documented JSON structure

## License

MIT

## Support

For issues or questions about the UI, check the browser console for detailed error messages. For API-related issues, verify your server endpoints match the documented API contracts.
