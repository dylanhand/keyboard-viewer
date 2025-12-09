import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";
import { KeyboardDisplay } from "../components/KeyboardDisplay.tsx";
import { useKeyboard } from "../hooks/useKeyboard.ts";
import { getErrorMessage } from "../utils.ts";

interface KeyboardEmbedProps {
  kbd: string;
  layout: string;
  platform: string;
  variant: string;
  interactive: boolean;
}

export function KeyboardEmbed({
  kbd,
  layout,
  platform,
  variant,
  interactive,
}: KeyboardEmbedProps) {
  const keyboardLayout = useSignal<KeyboardLayout | null>(null);
  const loading = useSignal<boolean>(true);
  const error = useSignal<string | null>(null);
  const scale = useSignal<number>(1); // Scale factor for transform
  const scaledHeight = useSignal<number>(0); // Actual visual height after scaling
  const containerRef = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  // Use keyboard hook for state management
  const keyboard = useKeyboard({
    layout: keyboardLayout.value,
  });

  // Fetch the keyboard layout from the API
  useEffect(() => {
    async function fetchLayout() {
      loading.value = true;
      error.value = null;

      try {
        const response = await fetch(
          `/api/github/layout?repo=${kbd}&file=${layout}.yaml&platform=${platform}&variant=${variant}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: response.statusText,
          }));
          throw new Error(
            errorData.error || `Failed to fetch layout (${response.status})`,
          );
        }

        const data = await response.json();
        keyboardLayout.value = data.layout;
      } catch (e) {
        error.value = getErrorMessage(e);
      } finally {
        loading.value = false;
      }
    }

    fetchLayout();
  }, [kbd, layout, platform, variant]);

  // Helper function to send height to parent (accounting for scale)
  const sendHeight = () => {
    // Use the pre-calculated scaledHeight signal value
    if (scaledHeight.value === 0) return;

    // Add 8px bottom padding for drop shadow
    const totalHeight = scaledHeight.value + 8;

    window.parent.postMessage({
      type: "giellalt-keyboard-resize",
      height: totalHeight,
    }, "*");
  };

  // Send height to parent for auto-sizing
  useEffect(() => {
    if (!keyboardLayout.value) return;

    sendHeight();
    window.addEventListener("resize", sendHeight);

    return () => {
      window.removeEventListener("resize", sendHeight);
    };
  }, [keyboardLayout.value]);

  // Auto-scale keyboard to fit container width using CSS transform
  useEffect(() => {
    if (!containerRef.current || !keyboardLayout.value) return;

    const calculateScale = () => {
      if (!containerRef.current || !keyboardRef.current) {
        return;
      }

      const containerWidth = containerRef.current.offsetWidth;
      const keyboardNaturalWidth = keyboardRef.current.scrollWidth; // Use scrollWidth for full width

      if (keyboardNaturalWidth === 0) {
        return;
      }

      // Calculate scale factor to fit keyboard in container
      // Add small buffer (0.98) to prevent horizontal scrollbar from rounding errors
      const scaleFactor = (containerWidth / keyboardNaturalWidth) * 0.98;

      // Clamp scale between 0.2 (minimum for small phones) and 1.0 (natural size, don't upscale)
      const clampedScale = Math.max(0.2, Math.min(scaleFactor, 1.0));

      scale.value = clampedScale;

      // Calculate and store the visual height after scaling
      const naturalHeight = keyboardRef.current.scrollHeight;
      scaledHeight.value = naturalHeight * clampedScale;

      // After scaling, send updated height to parent
      // Use requestAnimationFrame to wait for DOM re-render
      requestAnimationFrame(() => {
        sendHeight();
      });
    };

    // Initial calculation after keyboard renders
    requestAnimationFrame(() => {
      calculateScale();
    });

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [keyboardLayout.value]);

  return (
    <div
      ref={containerRef}
      class="pb-2"
      style={{
        overflow: "hidden",
        height: scaledHeight.value > 0 ? `${scaledHeight.value + 8}px` : "auto",
      }}
    >
      <div
        ref={keyboardRef}
        style={{
          transform: `scale(${scale.value})`,
          transformOrigin: "top left",
          display: "inline-block",
        }}
      >
        <KeyboardDisplay
          layout={keyboardLayout.value}
          loading={loading.value}
          error={error.value}
          onKeyClick={interactive ? keyboard.handleKeyClick : undefined}
          pressedKeyId={keyboard.pressedKeyId.value}
          activeLayer={keyboard.activeLayer.value}
          isShiftActive={keyboard.isShiftActive.value}
          isCapsLockActive={keyboard.isCapsLockActive.value}
          isAltActive={keyboard.isAltActive.value}
          isCmdActive={keyboard.isCmdActive.value}
          isCtrlActive={keyboard.isCtrlActive.value}
          isSymbolsActive={keyboard.isSymbolsActive.value}
          isSymbols2Active={keyboard.isSymbols2Active.value}
          pendingDeadkey={keyboard.pendingDeadkey.value}
          showChrome={false}
        />
      </div>
    </div>
  );
}
