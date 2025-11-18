import type {
  Key as KeyType,
  KeyboardLayout as LayoutType,
} from "../types/keyboard-simple.ts";
import { Key } from "./Key.tsx";

interface KeyboardLayoutProps {
  layout: LayoutType;
  onKeyClick?: (key: KeyType) => void;
}

export function KeyboardLayout({ layout, onKeyClick }: KeyboardLayoutProps) {
  const baseWidth = 3.5; // rem - matches Key component
  const gap = 0.25; // rem - gap between keys

  // Find the ISO Enter key and calculate its position
  let enterKeyInfo:
    | { rowIndex: number; leftOffset: number; enterKey: KeyType }
    | null = null;

  layout.rows.forEach((row, rowIndex) => {
    let currentOffset = (row.offset ?? 0) * (baseWidth + gap);

    for (let keyIndex = 0; keyIndex < row.keys.length; keyIndex++) {
      const key = row.keys[keyIndex];

      if (key.id === "Enter" && key.height && key.height > 1) {
        // Found the ISO Enter - save its position and the key itself
        enterKeyInfo = { rowIndex, leftOffset: currentOffset, enterKey: key };
        break; // Don't process further keys in this row
      }

      // Add this key's width and the gap after it
      currentOffset += (key.width ?? 1.0) * baseWidth;
      if (keyIndex < row.keys.length - 1) {
        currentOffset += gap;
      }
    }
  });

  return (
    <div class="inline-block p-4 bg-gray-200 rounded-lg shadow-lg">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
          gap: `${gap}rem`,
        }}
      >
        {layout.rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            class="flex"
            style={{
              gap: `${gap}rem`,
              marginLeft: row.offset
                ? `${row.offset * (baseWidth + gap)}rem`
                : "0",
            }}
          >
            {row.keys.map((key) => {
              // Skip ISO Enter in normal flow - it's rendered absolutely below
              if (key.id === "Enter" && key.height && key.height > 1) {
                return null;
              }

              return <Key key={key.id} keyData={key} onClick={onKeyClick} />;
            })}
          </div>
        ))}

        {/* Render ISO Enter key absolutely positioned */}
        {enterKeyInfo && (
          <div
            style={{
              position: "absolute",
              left: `${enterKeyInfo.leftOffset}rem`,
              top: `${enterKeyInfo.rowIndex * (baseWidth + gap)}rem`,
              zIndex: 10,
            }}
          >
            <Key keyData={enterKeyInfo.enterKey} onClick={onKeyClick} />
          </div>
        )}
      </div>
    </div>
  );
}
