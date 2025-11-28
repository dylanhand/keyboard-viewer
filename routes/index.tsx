import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import KeyboardViewer from "../islands/KeyboardViewer.tsx";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";

export default define.page(async function Home() {
  // Load the keyboard layout from JSON file
  const layoutPath = new URL("../data/layouts/iso-qwerty.json", import.meta.url);
  const layoutJson = await Deno.readTextFile(layoutPath);
  const layout: KeyboardLayout = JSON.parse(layoutJson);

  return (
    <div class="px-4 py-8 mx-auto min-h-screen bg-gray-50">
      <Head>
        <title>Keyboard Viewer</title>
      </Head>
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-8">
          <h1 class="text-4xl font-bold text-gray-900 mb-2">
            Interactive Keyboard Viewer
          </h1>
          <p class="text-gray-600">
            Click keys on the keyboard to type into the text area
          </p>
        </div>

        <KeyboardViewer layout={layout} />
      </div>
    </div>
  );
});
