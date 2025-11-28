import type { KeyboardLayout } from "../types/keyboard-simple.ts";

interface KbdgenTransform {
  [deadkey: string]: {
    [baseChar: string]: string;
  };
}

interface KbdgenLayers {
  default?: string;
  shift?: string;
  caps?: string;
  "caps+shift"?: string;
  alt?: string;
  "alt+shift"?: string;
  cmd?: string;
  "cmd+shift"?: string;
  ctrl?: string;
  "ctrl+shift"?: string;
  "alt+caps"?: string;
  "cmd+alt"?: string;
  "cmd+alt+shift"?: string;
}

interface KbdgenPrimary {
  layers?: KbdgenLayers;
}

interface KbdgenSpace {
  default?: string;
  shift?: string;
  caps?: string;
  alt?: string;
}

interface KbdgenDeadKeys {
  default?: string[];
  shift?: string[];
  caps?: string[];
  alt?: string[];
}

interface KbdgenMacOS {
  primary?: KbdgenPrimary;
  space?: KbdgenSpace;
  deadKeys?: KbdgenDeadKeys;
  transforms?: KbdgenTransform;
}

interface KbdgenPlatform {
  layers?: KbdgenLayers;
  transforms?: KbdgenTransform;
}

interface KbdgenLayout {
  displayNames?: { [lang: string]: string };
  locale?: string;
  macOS?: KbdgenMacOS;
  windows?: KbdgenPlatform;
  android?: KbdgenPlatform;
  iOS?: KbdgenPlatform;
  chrome?: KbdgenPlatform;
  transforms?: KbdgenTransform;
}

// ISO keyboard physical key layout
const ISO_KEY_POSITIONS = [
  // Row 1
  ["Backquote", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0", "Minus", "Equal"],
  // Row 2
  ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP", "BracketLeft", "BracketRight"],
  // Row 3
  ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon", "Quote", "Backslash"],
  // Row 4
  ["IntlBackslash", "KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM", "Comma", "Period", "Slash"],
];

const SPECIAL_KEYS = [
  { id: "Backspace", output: "\b", label: "⌫", width: 2.0, type: "modifier" },
  { id: "Tab", output: "\t", label: "Tab", width: 1.5, type: "modifier" },
  { id: "Enter", output: "\n", label: "Enter", width: 1.3, height: 2.075, type: "enter" },
  { id: "CapsLock", output: "", label: "Caps", width: 1.75, type: "modifier" },
  { id: "ShiftLeft", output: "", label: "Shift", width: 1.25, type: "modifier" },
  { id: "ShiftRight", output: "", label: "Shift", width: 2.75, type: "modifier" },
  { id: "ControlLeft", output: "", label: "Ctrl", width: 1.25, type: "modifier" },
  { id: "MetaLeft", output: "", label: "⌘", width: 1.25, type: "modifier" },
  { id: "AltLeft", output: "", label: "Alt", width: 1.25, type: "modifier" },
  { id: "Space", output: " ", label: "", width: 6.25, type: "space" },
  { id: "AltRight", output: "", label: "Alt", width: 1.25, type: "modifier" },
  { id: "MetaRight", output: "", label: "⌘", width: 1.25, type: "modifier" },
  { id: "ControlRight", output: "", label: "Ctrl", width: 1.25, type: "modifier" },
];

function parseLayerString(layerString: string): string[][] {
  // Each line represents a row of keys, with keys separated by spaces
  const lines = layerString.trim().split("\n");
  return lines.map(line => line.trim().split(/\s+/));
}

export function transformKbdgenToLayout(
  kbdgenData: KbdgenLayout,
  platform: string,
  repoCode: string,
  layoutName: string
): KeyboardLayout {
  let layers: KbdgenLayers | undefined;
  let transforms: KbdgenTransform = {};

  // Start with top-level transforms (shared across platforms)
  if (kbdgenData.transforms) {
    transforms = { ...kbdgenData.transforms };
  }

  if (platform === "macOS") {
    const macOSData = kbdgenData.macOS;
    if (!macOSData) {
      throw new Error(`Platform "${platform}" not found in layout`);
    }
    layers = macOSData.primary?.layers;
    // Merge platform-specific transforms
    if (macOSData.transforms) {
      transforms = { ...transforms, ...macOSData.transforms };
    }
  } else {
    const platformData = kbdgenData[platform as keyof KbdgenLayout] as KbdgenPlatform | undefined;
    if (!platformData) {
      throw new Error(`Platform "${platform}" not found in layout`);
    }
    layers = platformData.layers;
    // Merge platform-specific transforms
    if (platformData.transforms) {
      transforms = { ...transforms, ...platformData.transforms };
    }
  }

  if (!layers || !layers.default) {
    throw new Error(`No layers found for platform "${platform}"`);
  }

  const defaultLayer = parseLayerString(layers.default);
  const shiftLayer = layers.shift ? parseLayerString(layers.shift) : null;

  // Build deadkeys from transforms
  const deadkeys: { [deadkey: string]: { [baseChar: string]: string } } = {};
  for (const [deadkey, combinations] of Object.entries(transforms)) {
    deadkeys[deadkey] = combinations;
  }

  // Build rows
  const rows = [];

  // Row 1: Number row + Backspace
  if (defaultLayer[0]) {
    rows.push({
      keys: [
        ...ISO_KEY_POSITIONS[0].map((keyId, idx) => ({
          id: keyId,
          output: defaultLayer[0][idx] || "",
          shiftOutput: shiftLayer?.[0]?.[idx] || undefined,
          width: 1.0,
        })),
        SPECIAL_KEYS[0], // Backspace
      ],
    });
  }

  // Row 2: Tab + QWERTY row + Enter
  if (defaultLayer[1]) {
    rows.push({
      keys: [
        SPECIAL_KEYS[1], // Tab
        ...ISO_KEY_POSITIONS[1].map((keyId, idx) => ({
          id: keyId,
          output: defaultLayer[1][idx] || "",
          shiftOutput: shiftLayer?.[1]?.[idx] || undefined,
        })),
        SPECIAL_KEYS[2], // Enter
      ],
    });
  }

  // Row 3: CapsLock + ASDF row
  if (defaultLayer[2]) {
    rows.push({
      keys: [
        SPECIAL_KEYS[3], // CapsLock
        ...ISO_KEY_POSITIONS[2].map((keyId, idx) => ({
          id: keyId,
          output: defaultLayer[2][idx] || "",
          shiftOutput: shiftLayer?.[2]?.[idx] || undefined,
        })),
      ],
    });
  }

  // Row 4: ShiftLeft + ZXCV row + ShiftRight
  if (defaultLayer[3]) {
    rows.push({
      keys: [
        SPECIAL_KEYS[4], // ShiftLeft
        ...ISO_KEY_POSITIONS[3].map((keyId, idx) => ({
          id: keyId,
          output: defaultLayer[3][idx] || "",
          shiftOutput: shiftLayer?.[3]?.[idx] || undefined,
        })),
        SPECIAL_KEYS[5], // ShiftRight
      ],
    });
  }

  // Row 5: Bottom row
  rows.push({
    keys: [
      SPECIAL_KEYS[6], // ControlLeft
      SPECIAL_KEYS[7], // MetaLeft
      SPECIAL_KEYS[8], // AltLeft
      SPECIAL_KEYS[9], // Space
      SPECIAL_KEYS[10], // AltRight
      SPECIAL_KEYS[11], // MetaRight
      SPECIAL_KEYS[12], // ControlRight
    ],
  });

  // Generate display name
  const displayName = kbdgenData.displayNames?.en ||
    kbdgenData.locale ||
    `${repoCode} - ${layoutName} (${platform})`;

  return {
    id: `${repoCode}-${layoutName}-${platform}`,
    name: displayName,
    deadkeys,
    rows,
  };
}

export function getAvailablePlatforms(kbdgenData: KbdgenLayout): string[] {
  const platforms: string[] = [];
  if (kbdgenData.macOS) platforms.push("macOS");
  if (kbdgenData.windows) platforms.push("windows");
  if (kbdgenData.android) platforms.push("android");
  if (kbdgenData.iOS) platforms.push("iOS");
  if (kbdgenData.chrome) platforms.push("chrome");
  return platforms;
}
