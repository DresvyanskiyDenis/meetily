<div align="center" style="border-bottom: none">
    <h1>
        <img src="docs/Meetily-6.png" style="border-radius: 10px;" />
        <br>
        Meetily — Privacy-First AI Meeting Assistant
    </h1>
    <h3>
    Customized Fork with Prompt Templates
    </h3>
    <p>
        <a href="https://github.com/DresvyanskiyDenis/meetily/actions/runs/22950968104"><img src="https://img.shields.io/badge/macOS_Build-passing-brightgreen" alt="macOS Build"></a>
        <a href="https://github.com/DresvyanskiyDenis/meetily/actions/runs/22950968102"><img src="https://img.shields.io/badge/Linux_Build-passing-brightgreen" alt="Linux Build"></a>
        <a href="https://github.com/DresvyanskiyDenis/meetily"><img src="https://img.shields.io/badge/License-MIT-blue" alt="License"></a>
        <a href="https://github.com/DresvyanskiyDenis/meetily"><img src="https://img.shields.io/badge/Supported_OS-macOS,_Linux-white" alt="Supported OS"></a>
    </p>
</div>

---

> This is a **customized fork** of [Meetily](https://github.com/Zackriya-Solutions/meetily) by Zackriya Solutions. We added **customizable summary prompt templates** so team members can create and manage their own summarization prompts. All data stays on your machine.

---

## Downloads

### macOS (Apple Silicon)

1. Download **[meetily-macos-aarch64-release-0.3.0](https://github.com/DresvyanskiyDenis/meetily/actions/runs/22950968104)** from GitHub Actions artifacts
2. Unzip, open the `.dmg` file, drag **Meetily** to Applications
3. On first launch: right-click the app > **Open** (required for unsigned builds)

### Linux (Ubuntu/Debian x64)

1. Download **[meetily-linux-ubuntu-22.04-x64-release-0.3.0](https://github.com/DresvyanskiyDenis/meetily/actions/runs/22950968102)** from GitHub Actions artifacts
2. Install:
   ```bash
   sudo dpkg -i meetily_0.3.0_amd64.deb
   ```
3. Runtime dependencies (if not already installed):
   ```bash
   sudo apt install libwebkit2gtk-4.1-0 libasound2
   ```

### Build from source (any platform)

```bash
git clone https://github.com/DresvyanskiyDenis/meetily.git
cd meetily
./build.sh --install-deps --clean
```

The build script auto-detects your platform and GPU (Metal on macOS, CUDA/Vulkan/OpenBLAS on Linux).

---

## What's Different in This Fork

### Customizable Prompt Templates

The original Meetily has hardcoded summary prompts. This fork adds a **Templates** tab in Settings where you can:

- **Create** custom templates with named sections (e.g., "Action Items", "Key Decisions", "Follow-ups")
- **Edit** existing templates
- **Duplicate** built-in templates as a starting point
- **Delete** custom templates (built-in templates are preserved)
- **Select** which template to use when generating summaries

Each template defines sections with:
- **Title** — section heading in the summary
- **Instruction** — what the AI should extract/generate
- **Format** — paragraph, list, or string

Templates are stored locally as JSON files in your app data directory.

### 6 Built-in Templates

| Template | Use Case |
|----------|----------|
| Standard Meeting | General meetings with agenda, decisions, action items |
| Daily Standup | Yesterday/today/blockers format |
| Project Sync | Project status, milestones, risks |
| Retrospective | What went well, what didn't, improvements |
| Psychiatric Session | Clinical session notes |
| Sales/Client Call | Client needs, objections, next steps |

### Unified Build Script

`./build.sh` replaces the separate platform-specific build scripts:
```bash
./build.sh                    # Auto-detect platform & GPU, build
./build.sh --install-deps     # Install Rust, Node, pnpm, CMake
./build.sh --clean            # Clean previous build artifacts
./build.sh --gpu cpu          # Force CPU-only build
./build.sh --gpu metal        # Force Metal GPU
```

---

## Privacy

All processing happens locally on your machine:

- Audio recordings **never leave your device**
- Transcription uses **local Whisper.cpp** (GPU-accelerated)
- Templates and configuration stored **locally**
- Summaries generated using your chosen LLM provider

| LLM Provider | Data Leaves Machine? |
|-------------|---------------------|
| BuiltInAI (embedded models) | No |
| Ollama (local) | No |
| Claude / Groq / OpenAI / OpenRouter | Transcript text is sent for summarization |

For fully private operation, use **BuiltInAI** or **Ollama**.

---

## Features

- **Local Transcription** — Whisper.cpp with GPU acceleration (Metal, CUDA, Vulkan)
- **AI Summaries** — Multiple LLM providers, customizable templates
- **Professional Audio** — Mic + system audio capture with intelligent mixing
- **Import & Enhance** — Import existing audio files for transcription
- **GPU Acceleration** — Metal (macOS), CUDA (NVIDIA), Vulkan (AMD/Intel)
- **Cross-Platform** — macOS and Linux (Windows via upstream)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop Framework | Tauri 2.x (Rust) |
| Frontend | Next.js 14, React 18, TypeScript |
| UI Components | ShadCN/Radix UI, Tailwind CSS |
| Transcription | Whisper.cpp (local, GPU-accelerated) |
| Audio | cpal, ScreenCaptureKit (macOS), WASAPI (Windows) |
| Database | SQLite (local) |
| LLM Integration | Ollama, Claude, Groq, OpenRouter, OpenAI |

---

## Contributing

Issues and PRs welcome. For major changes, please open an issue first.

This fork is maintained for internal team use. For the main project, contribute to [Zackriya-Solutions/meetily](https://github.com/Zackriya-Solutions/meetily).

## License

MIT License — same as the original project.

## Acknowledgments

Based on [Meetily](https://github.com/Zackriya-Solutions/meetily) by [Zackriya Solutions](https://www.zackriya.com/). See the original repo for full credits.
