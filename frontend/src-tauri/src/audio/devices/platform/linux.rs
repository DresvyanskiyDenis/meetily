use anyhow::Result;
use cpal::traits::{DeviceTrait, HostTrait};
use log::{debug, warn};

use crate::audio::devices::configuration::{AudioDevice, DeviceType};

/// Substrings that identify a "loopback / monitor" capture source on Linux.
///
/// PulseAudio surfaces speaker output as `*.monitor` sources. PipeWire's
/// pulse compatibility layer keeps the same naming, but the native PipeWire
/// graph also uses "Monitor of …" and "loopback" for similar nodes. We match
/// case-insensitively so user-renamed devices still get tagged.
const MONITOR_HINTS: &[&str] = &["monitor", "loopback", "pulse_monitor"];

fn is_monitor_source(name: &str) -> bool {
    let lower = name.to_ascii_lowercase();
    MONITOR_HINTS.iter().any(|h| lower.contains(h))
}

/// Configure Linux audio devices using ALSA / PulseAudio / PipeWire.
///
/// On Linux, cpal exposes a single ALSA host. Pulse and PipeWire are visible
/// through ALSA's `pulse` plugin (when installed) and surface monitor sources
/// in the *input* device list — we don't need a second host enumeration.
/// Monitor sources are re-tagged as `Output` so the UI presents them as the
/// "system audio" capture choice, matching the macOS/Windows model.
pub fn configure_linux_audio(host: &cpal::Host) -> Result<Vec<AudioDevice>> {
    let mut devices = Vec::new();
    let mut saw_monitor = false;

    for device in host.input_devices()? {
        let Ok(name) = device.name() else { continue };

        if is_monitor_source(&name) {
            saw_monitor = true;
            debug!("Detected monitor/loopback source: {}", name);
            devices.push(AudioDevice::new(
                format!("{} (System Audio)", name),
                DeviceType::Output,
            ));
        } else {
            devices.push(AudioDevice::new(name, DeviceType::Input));
        }
    }

    if !saw_monitor {
        // PipeWire-only setups without the pulse-alsa shim won't expose any
        // monitor source through cpal. Surface a clear hint instead of
        // silently failing system-audio capture.
        warn!(
            "No PulseAudio/PipeWire monitor source found via ALSA. \
             System-audio capture will be unavailable. Install \
             `pipewire-alsa` (or `alsa-plugins-pulse`) and restart the audio stack."
        );
    }

    Ok(devices)
}