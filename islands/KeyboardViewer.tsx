import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { KeyboardLayout, Key } from "../types/keyboard-simple.ts";
import { KeyboardLayout as KeyboardLayoutComponent } from "../components/KeyboardLayout.tsx";

interface KeyboardViewerProps {
  layout: KeyboardLayout;
}

export default function KeyboardViewer({ layout }: KeyboardViewerProps) {
  const text = useSignal("");
  const pressedKeyId = useSignal<string | null>(null);
  const isShiftActive = useSignal(false);
  const shiftClickMode = useSignal(false); // true if shift was clicked, false if held
  const isCapsLockActive = useSignal(false);

  // Helper: Check if a key is a Shift key
  const isShiftKey = (key: Key): boolean => {
    return key.id === "ShiftLeft" || key.id === "ShiftRight";
  };

  // Helper: Check if a key is the Caps Lock key
  const isCapsLockKey = (key: Key): boolean => {
    return key.id === "CapsLock";
  };

  // Helper: Get the character to output based on shift and caps lock state
  const getOutputChar = (key: Key): string => {
    // For letter keys, caps lock affects output
    // Use Unicode property escape to match all lowercase letters (including accented and non-Latin)
    const isLetter = key.output.length === 1 && /\p{Ll}/u.test(key.output);

    if (isLetter) {
      // Shift inverts caps lock for letters
      const shouldBeUppercase = isCapsLockActive.value !== isShiftActive.value;
      return shouldBeUppercase ? key.output.toUpperCase() : key.output;
    } else {
      // For non-letters, only shift matters
      return isShiftActive.value && key.shiftOutput ? key.shiftOutput : key.output;
    }
  };

  // Helper: Exit shift mode if in click mode (one-shot shift)
  const exitShiftClickMode = () => {
    if (shiftClickMode.value) {
      isShiftActive.value = false;
      shiftClickMode.value = false;
    }
  };

  // Find a key in the layout by its physical key code
  const findKeyByCode = (code: string): Key | undefined => {
    for (const row of layout.rows) {
      const key = row.keys.find(k => k.id === code);
      if (key) return key;
    }
    return undefined;
  };

  // Handle physical keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in the textarea
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }

      e.preventDefault();

      const key = findKeyByCode(e.code);
      if (key) {
        // Handle Shift key specially - activate shift mode but don't call handleKeyClick
        if (isShiftKey(key)) {
          pressedKeyId.value = key.id;
          isShiftActive.value = true;
          shiftClickMode.value = false; // Physical hold, not click
          return;
        }

        // Handle Caps Lock key specially - toggle on each press
        // Don't set pressedKeyId for toggle keys - we show active state instead
        if (isCapsLockKey(key)) {
          isCapsLockActive.value = !isCapsLockActive.value;
          return;
        }

        pressedKeyId.value = key.id;
        handleKeyClick(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = findKeyByCode(e.code);

      // If releasing Shift and not in click mode, deactivate shift
      if (key && isShiftKey(key) && !shiftClickMode.value) {
        isShiftActive.value = false;
      }

      pressedKeyId.value = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [layout]);

  const handleKeyClick = (key: Key) => {
    // Handle Shift key clicks
    if (isShiftKey(key)) {
      isShiftActive.value = !isShiftActive.value;
      shiftClickMode.value = isShiftActive.value; // Only set clickMode when toggling on
      return;
    }

    // Handle Caps Lock key clicks
    if (isCapsLockKey(key)) {
      isCapsLockActive.value = !isCapsLockActive.value;
      return;
    }

    // Handle special keys
    if (key.id === "Backspace") {
      text.value = text.value.slice(0, -1);
      exitShiftClickMode();
      return;
    }

    if (key.id === "Enter") {
      text.value += "\n";
      exitShiftClickMode();
      return;
    }

    if (key.id === "Tab") {
      text.value += "\t";
      exitShiftClickMode();
      return;
    }

    // Ignore modifier keys that don't produce output
    if (!key.output || key.output === "") {
      return;
    }

    // Add the character to the text
    const charToAdd = getOutputChar(key);
    text.value += charToAdd;

    // Exit shift mode if in click mode (one-shot shift)
    exitShiftClickMode();
  };

  const handleClear = () => {
    text.value = "";
  };

  return (
    <div class="flex flex-col gap-6">
      {/* Output text area */}
      <div class="w-full">
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-semibold text-gray-700">
            Output
          </label>
          <button
            onClick={handleClear}
            class="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Clear
          </button>
        </div>
        <textarea
          value={text.value}
          onInput={(e) => {
            text.value = (e.target as HTMLTextAreaElement).value;
          }}
          class="w-full h-32 p-3 border-2 border-gray-300 rounded font-mono text-sm resize-y focus:outline-none focus:border-blue-500"
          placeholder="Click keys on the keyboard below to type..."
        />
      </div>

      {/* Keyboard */}
      <div class="flex justify-center">
        <KeyboardLayoutComponent
          layout={layout}
          onKeyClick={handleKeyClick}
          pressedKeyId={pressedKeyId.value}
          isShiftActive={isShiftActive.value}
          isCapsLockActive={isCapsLockActive.value}
        />
      </div>

      {/* Info */}
      <div class="text-center text-sm text-gray-600">
        <p>Layout: <strong>{layout.name}</strong></p>
        <p class="text-xs mt-1">Click keys to type, or type directly in the text area</p>
      </div>
    </div>
  );
}
