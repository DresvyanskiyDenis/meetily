# Meetily Installation Guide

## Overview

Meetily is a privacy-first AI meeting assistant that captures, transcribes, and summarizes meetings entirely on your local infrastructure. Unlike cloud-based alternatives, Meetily processes all meeting data on your device, ensuring complete data sovereignty and compliance with privacy regulations.

This customized fork includes advanced **prompt template management**, allowing you to structure AI-generated summaries according to your workflow needs.

**Key Characteristics**:
- **Privacy-First Design**: Local-only transcription, optional cloud LLM integration
- **Open Source**: MIT License, full source code transparency
- **Enterprise-Ready**: Self-hostable, GDPR-compliant architecture
- **Cross-Platform**: macOS, Windows, and Linux support

## Features

### Core Capabilities

1. **Local Transcription**
   - Real-time speech-to-text using OpenAI Whisper models
   - Multiple model sizes: tiny, base, small, medium, large-v3
   - GPU acceleration: Metal (macOS), CUDA (NVIDIA), Vulkan (AMD/Intel)
   - Voice Activity Detection (VAD) for optimized processing

2. **AI-Powered Summaries**
   - Multiple LLM provider support:
     - **Ollama** (local): Full privacy, no external API calls
     - **BuiltInAI** (embedded models): Local processing with smaller models
     - **Claude** (Anthropic): High-quality cloud summaries
     - **Groq**: Fast cloud inference
     - **OpenAI**: GPT-4/GPT-3.5 integration
     - **OpenRouter**: Multi-provider aggregator
   - Customizable summary templates (new in this fork)
   - Auto-summary generation for hands-free operation

3. **Customizable Summary Templates**
   - Built-in templates: Daily Standup, Standard Meeting, Project Sync, Retrospective
   - Custom template creation with structured sections
   - Template sharing via JSON export/import
   - Per-meeting custom prompts for additional context

4. **Privacy-First Architecture**
   - Audio recordings: Never leave your device
   - Transcripts: Stored locally in encrypted app storage
   - Templates: Managed locally, shareable by choice
   - LLM summaries: Only transcript text sent (when using cloud providers)

5. **Professional Audio Processing**
   - Dual-device capture: Microphone + system audio
   - RMS-based audio ducking for clear voice recording
   - Clipping prevention and noise optimization
   - Cross-platform audio backend (WASAPI, ScreenCaptureKit, ALSA)

6. **Meeting Management**
   - Search meetings by content (full-text search)
   - Import existing audio files for transcription
   - Export transcripts and summaries (TXT, Markdown)
   - Edit summaries with rich text editor

## Privacy Guarantees

### What Stays Local

The following data **never leaves your device**:
- Audio recordings (WAV/MP3 files)
- Audio device configurations
- Whisper transcription models
- Summary templates (stored in app data folder)
- User preferences and settings

### What MAY Leave Your Device

When using **cloud LLM providers** (Claude, Groq, OpenAI, OpenRouter):
- **Transcript text only** is sent to the provider's API for summary generation
- Subject to the provider's privacy policy
- No audio, no metadata, no personal identifiers

### Fully Private Configurations

For **zero external data transmission**, use:
- **Ollama** (local): Run LLMs on your machine (recommended for privacy)
- **BuiltInAI** (embedded): Smaller models bundled with the app

These configurations ensure **100% local processing** with no internet dependency.

### Analytics (Optional)

Meetily includes optional **PostHog analytics**:
- **Opt-in only**: Disabled by default
- **Anonymized usage patterns**: Feature usage, session duration, performance metrics
- **No meeting content**: Never collects transcripts, audio, or meeting metadata
- Review [PRIVACY_POLICY.md](../PRIVACY_POLICY.md) for full details

## Prerequisites

### Required Software

1. **Node.js 20+** and **pnpm 8+**
   - Download: [nodejs.org](https://nodejs.org/)
   - Install pnpm: `npm install -g pnpm`

2. **Rust Toolchain**
   - Install via rustup: [rustup.rs](https://rustup.rs/)
   - Ensure `cargo` is in your PATH: `cargo --version`

### Platform-Specific Requirements

#### macOS
- **Xcode Command Line Tools**: `xcode-select --install`
- **macOS 13+** recommended (for ScreenCaptureKit system audio)
- **Virtual Audio Device** (for system audio capture): [BlackHole 2ch](https://existential.audio/blackhole/)

#### Windows
- **Visual Studio Build Tools** with C++ workload
  - Download: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/)
  - Select "Desktop development with C++"
- **NVIDIA GPU** (optional): Install CUDA Toolkit for GPU acceleration

#### Linux
- **Build Tools**: `sudo apt install build-essential cmake llvm libomp-dev`
- **Audio Dependencies**:
  - Ubuntu/Debian: `sudo apt install libasound2-dev libpulse-dev`
  - Fedora: `sudo dnf install alsa-lib-devel pulseaudio-libs-devel`
- **GPU Acceleration** (optional):
  - NVIDIA: Install CUDA drivers
  - AMD/Intel: Install Vulkan drivers

### Optional: Ollama (Recommended for Privacy)

For local LLM summarization without cloud dependencies:

1. Download Ollama: [ollama.ai](https://ollama.ai/)
2. Install and start Ollama service
3. Pull a model: `ollama pull llama3.2` (or `mistral`, `phi3`)
4. Verify: `ollama list`

Ollama runs a local API server on port 11434.

## Building from Source

### Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/meetily.git
cd meetily
```

### Frontend Build (Desktop App)

The frontend is a Tauri-based desktop application combining Rust (backend logic) and Next.js (UI).

#### macOS

**Development Mode** (with hot-reload):
```bash
cd frontend
pnpm install
./clean_run.sh          # Standard build with info logging
./clean_run.sh debug    # Verbose debug logging
```

**Production Build**:
```bash
cd frontend
./clean_build.sh
# Output: frontend/src-tauri/target/release/bundle/dmg/Meetily_0.3.0_aarch64.dmg
```

**GPU-Specific Builds** (for testing acceleration):
```bash
pnpm run tauri:dev:metal    # Force Metal GPU acceleration
pnpm run tauri:dev:cpu      # CPU-only (no GPU)
```

#### Windows

**Development Mode**:
```cmd
cd frontend
pnpm install
clean_run_windows.bat
```

**Production Build**:
```cmd
cd frontend
clean_build_windows.bat
# Output: frontend\src-tauri\target\release\bundle\msi\Meetily_0.3.0_x64_en-US.msi
```

**GPU-Specific Builds**:
```cmd
pnpm run tauri:dev:cuda     # NVIDIA CUDA acceleration
pnpm run tauri:dev:vulkan   # AMD/Intel Vulkan acceleration
```

#### Linux

```bash
cd frontend
pnpm install
./build-gpu.sh              # Automatic GPU detection and build
# Or manual:
pnpm run tauri:build        # CPU-only
pnpm run tauri:build:cuda   # NVIDIA CUDA
pnpm run tauri:build:vulkan # AMD/Intel Vulkan
```

### Backend Build (Optional)

The backend is a FastAPI server for meeting storage and LLM-based summarization. It is **optional** for standalone use (local Whisper only), but **required** for:
- Meeting persistence and search
- AI-powered summaries
- Template management
- Multi-device sync

#### macOS/Linux

```bash
cd backend
pip install -r requirements.txt

# Build Whisper server with model (choose: tiny, base, small, medium, large-v3)
./build_whisper.sh small

# Start backend
./clean_start_backend.sh
# Server runs on http://localhost:5167
```

#### Windows

```cmd
cd backend
pip install -r requirements.txt

# Build Whisper server
build_whisper.cmd small

# Start backend (interactive setup)
powershell -ExecutionPolicy Bypass -File start_with_output.ps1
# Or direct start:
clean_start_backend.cmd
```

#### Docker (Recommended for Production)

**macOS/Linux**:
```bash
cd backend
./run-docker.sh start --interactive
# Follow interactive prompts to configure Whisper model and API keys
```

**Windows**:
```powershell
cd backend
.\run-docker.ps1 start -Interactive
```

**View Logs**:
```bash
./run-docker.sh logs --service app
```

**Stop Services**:
```bash
./run-docker.sh stop
```

## Configuration

### First Run: Onboarding Wizard

On first launch, Meetily guides you through:
1. **Permissions Setup**: Grant microphone and (on macOS) screen recording permissions
2. **Audio Device Selection**: Choose microphone and system audio devices
3. **Transcription Model**: Download and configure Whisper model
4. **LLM Provider** (optional): Configure AI summarization provider

### LLM Provider Setup

Navigate to **Settings > Summary** tab:

1. **Choose Provider**:
   - **Ollama** (recommended for privacy): Ensure Ollama is running (`ollama serve`)
   - **BuiltInAI**: No configuration needed (embedded models)
   - **Claude/Groq/OpenAI/OpenRouter**: Enter API key

2. **Configure API Endpoint** (if using custom provider):
   - OpenAI-compatible endpoint: `https://your-server.com/v1`
   - API key: Your provider's key

3. **Test Connection**: Click "Test" to verify configuration

4. **Enable Auto-Summary** (optional): Toggle to automatically generate summaries after recording stops

### Transcription Model Selection

Navigate to **Settings > Transcription** tab:

1. **Choose Model Size**:
   - **tiny**: Fastest, lowest accuracy (39M params)
   - **base**: Good balance for laptops (74M params)
   - **small**: Recommended for desktops (244M params)
   - **medium**: High accuracy, slower (769M params)
   - **large-v3**: Best accuracy, GPU required (1550M params)

2. **GPU Acceleration**: Automatically detected and enabled
   - macOS: Metal + CoreML
   - Windows/Linux: CUDA (NVIDIA), Vulkan (AMD/Intel), or CPU fallback

3. **Language**: Select target language (or "auto" for detection)

### Service Ports

Default ports for development:
- **Frontend Dev Server**: 3118 (Next.js)
- **Backend API**: 5167 (FastAPI)
- **Whisper Server**: 8178 (transcription engine)
- **Ollama API**: 11434 (if using local LLM)

**Production**: Frontend is bundled as a standalone app; only backend port (5167) needs to be accessible.

## Using Summary Templates

### What Are Templates?

Templates are structured formats that control how AI organizes meeting summaries. Instead of generic summaries, templates ensure consistent output with predefined sections.

**Example Template Structure**:
```
Meeting Outcomes:
- Action items assigned to specific people
- Decisions made and rationale
- Open questions requiring follow-up

Next Steps:
- Upcoming deadlines
- Scheduled follow-up meetings
```

### Built-In Templates

Meetily includes templates for common scenarios:
- **Daily Standup**: What did you do? What will you do? Blockers?
- **Standard Meeting**: Agenda, discussion points, decisions, action items
- **Project Sync**: Project status, milestones, risks, blockers
- **Retrospective**: What went well? What needs improvement? Action items
- **1:1 Meeting**: Topics discussed, feedback given, goals set
- **Client Call**: Client needs, proposed solutions, next steps

### Selecting a Template

1. Record a meeting or import audio
2. Navigate to the meeting details page
3. Before generating summary, click the **"Template"** dropdown
4. Select desired template
5. Click **"Generate Summary"** (or enable Auto-Summary)

The AI will structure the summary according to the selected template.

### Creating Custom Templates

1. Navigate to **Settings > Templates** tab
2. Click **"New Template"** button
3. Fill in template details:
   - **Name**: Template identifier (e.g., "Engineering Standup")
   - **Description**: Brief explanation of use case
   - **Sections**: Define each section with:
     - **Title**: Section heading (e.g., "Action Items")
     - **Instruction**: Guidance for AI (e.g., "List all action items with assigned person and deadline")
     - **Format**: Bullet list, numbered list, paragraph, table

4. Click **"Save Template"**

**Tips for Effective Templates**:
- Be specific in section instructions ("List action items with assigned person")
- Use consistent format types for similar content
- Limit to 5-7 sections for readability
- Test templates on sample meetings and iterate

### Custom Prompts (Per-Meeting)

For meeting-specific instructions:

1. On the meeting details page, expand the **"Transcript"** panel
2. Locate the **"Custom Prompt"** textarea
3. Enter additional context or instructions:
   ```
   This was a quarterly planning meeting. Focus on strategic initiatives
   and long-term goals rather than tactical details.
   ```
4. Generate summary (custom prompt is combined with template)

### Sharing Templates

Templates are stored as JSON files in:
- **macOS**: `~/Library/Application Support/Meetily/templates/`
- **Windows**: `%APPDATA%\Meetily\templates\`
- **Linux**: `~/.local/share/Meetily/templates/`

**To share with team members**:
1. Copy template JSON file from the directory above
2. Share file via email, Slack, or shared drive
3. Recipient places file in their templates directory
4. Restart Meetily to load new template

## How to Use the App

### Step-by-Step: Recording a Meeting

1. **Launch Meetily**: Open the application
2. **Select Audio Devices**:
   - Click the **microphone icon** to choose microphone
   - Click the **speaker icon** to choose system audio device
   - Adjust volume levels using sliders
3. **Start Recording**: Click the red **"Record"** button
4. **View Live Transcript**: Transcribed text appears in real-time below
5. **Stop Recording**: Click **"Stop"** when meeting ends
6. **Select Template** (optional): Choose summary template from dropdown
7. **Generate Summary**: Click **"Generate Summary"** button
   - If using Ollama/BuiltInAI: Processing happens locally
   - If using cloud provider: Transcript is sent to API
8. **Edit Summary**: Use rich text editor to refine output
9. **Export**: Click **"Export"** to save as TXT or Markdown

### Auto-Summary

Enable in **Settings > Summary > Auto Summary** toggle:
- Summaries are generated automatically after recording stops
- Requires LLM provider configuration
- Uses default template if none selected

### Searching Meetings

1. Navigate to the **sidebar** (left panel)
2. Click the **search icon** at the top
3. Enter keywords (searches meeting names, transcripts, summaries)
4. Click matching meeting to open details

### Importing Audio Files

1. Click **"Import"** button on home screen
2. Select audio file (WAV, MP3, M4A, FLAC)
3. Meetily transcribes the file using local Whisper
4. Generate summary as with live recordings

### Enhancing Existing Meetings (Beta)

1. Open a recorded meeting
2. Click **"Enhance"** button
3. Choose new transcription model or language
4. Re-transcribe with improved settings

## Troubleshooting

### Common Issues

#### 1. Ollama Not Running

**Symptom**: "Failed to connect to Ollama" error when generating summary

**Solution**:
```bash
# Start Ollama service
ollama serve

# In a new terminal, verify:
ollama list
```

Ensure a model is pulled: `ollama pull llama3.2`

#### 2. Missing Audio Permissions

**macOS**: Grant permissions in **System Settings > Privacy & Security**:
- Microphone: Required for audio capture
- Screen Recording: Required for system audio (ScreenCaptureKit)

**Windows**: Grant microphone access in **Settings > Privacy > Microphone**

**Linux**: Ensure user is in `audio` group:
```bash
sudo usermod -a -G audio $USER
# Log out and back in
```

#### 3. Whisper Model Not Downloaded

**Symptom**: "Model not found" error when starting transcription

**Solution**:
- Navigate to **Settings > Transcription**
- Click **"Download Model"** button
- Wait for download to complete (models are 40MB-1.5GB)

**Manual Download** (if automatic fails):
```bash
# macOS/Linux
cd ~/Library/Application\ Support/Meetily/models/
# Windows
cd %APPDATA%\Meetily\models\

# Download model (example: small model)
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin -o ggml-small.bin
```

#### 4. GPU Acceleration Not Working

**Verify GPU Support**:
- macOS: Metal is automatically enabled on Apple Silicon
- Windows: Check NVIDIA driver installation (`nvidia-smi`)
- Linux: Check CUDA/Vulkan drivers (`nvidia-smi` or `vulkaninfo`)

**Force CPU Mode** (if GPU causes issues):
```bash
cd frontend
pnpm run tauri:dev:cpu
```

#### 5. Backend API Not Responding

**Check Backend Status**:
```bash
curl http://localhost:5167/health
# Expected: {"status": "healthy"}
```

**Restart Backend**:
```bash
cd backend
./clean_start_backend.sh  # macOS/Linux
clean_start_backend.cmd   # Windows
```

**View Logs**:
```bash
# Docker deployment
./run-docker.sh logs --service app

# Manual deployment
# Check terminal output where backend was started
```

#### 6. System Audio Not Capturing

**macOS**:
- Install [BlackHole 2ch](https://existential.audio/blackhole/)
- Configure Multi-Output Device in **Audio MIDI Setup**:
  1. Create Multi-Output Device
  2. Add BlackHole 2ch and your speakers
  3. Select BlackHole as system audio device in Meetily

**Windows**:
- Ensure WASAPI loopback is enabled
- Select "Stereo Mix" or equivalent in Meetily's system audio dropdown
- If "Stereo Mix" is missing, enable in **Sound Settings > Recording Devices**

**Linux**:
- Use PulseAudio monitor source:
  ```bash
  pactl list sources | grep monitor
  # Select monitor source in Meetily
  ```

### Developer Tools

**Open Developer Console** (for debugging):
- **macOS**: `Cmd+Shift+I`
- **Windows**: `Ctrl+Shift+I`
- **Linux**: `Ctrl+Shift+I`

**View Rust Logs** (when running in dev mode):
```bash
# Enable verbose logging
RUST_LOG=debug ./clean_run.sh  # macOS/Linux
$env:RUST_LOG="debug"; ./clean_run_windows.bat  # Windows
```

**Check Application Logs**:
- macOS: `~/Library/Logs/Meetily/`
- Windows: `%APPDATA%\Meetily\logs\`
- Linux: `~/.local/share/Meetily/logs/`

### Getting Help

If issues persist:
1. Check [GitHub Issues](https://github.com/Zackriya-Solutions/meeting-minutes/issues)
2. Join [Discord Community](https://discord.gg/crRymMQBFH)
3. Review [CONTRIBUTING.md](../CONTRIBUTING.md) for development support

## Next Steps

- **Explore Templates**: Create custom templates for your workflow
- **Configure Privacy**: Set up Ollama for fully local processing
- **Integrate with Workflow**: Export summaries to note-taking apps
- **Contribute**: See [CONTRIBUTING.md](../CONTRIBUTING.md) to improve Meetily

---

**License**: MIT - See [LICENSE](../LICENSE) for details.

**Privacy Policy**: [PRIVACY_POLICY.md](../PRIVACY_POLICY.md)

**Community**: [Discord](https://discord.gg/crRymMQBFH) | [Reddit](https://www.reddit.com/r/meetily/)
