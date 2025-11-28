import { useSignal, useComputed } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";

interface Repo {
  code: string;
  name: string;
  description: string;
}

interface LayoutFile {
  name: string;
  displayName: string;
}

interface LayoutResponse {
  layout: KeyboardLayout;
  availablePlatforms: string[];
  selectedPlatform: string;
}

interface GitHubKeyboardSelectorProps {
  onLayoutLoaded: (layout: KeyboardLayout) => void;
}

export function GitHubKeyboardSelector({ onLayoutLoaded }: GitHubKeyboardSelectorProps) {
  const repos = useSignal<Repo[]>([]);
  const layouts = useSignal<LayoutFile[]>([]);
  const platforms = useSignal<string[]>([]);
  const selectedRepo = useSignal<string>("");
  const selectedLayout = useSignal<string>("");
  const selectedPlatform = useSignal<string>("macOS");
  const loading = useSignal<boolean>(false);
  const error = useSignal<string | null>(null);

  // Fetch repos on mount
  useEffect(() => {
    async function fetchRepos() {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch("/api/github/repos");
        if (!response.ok) throw new Error("Failed to fetch repos");
        const data = await response.json();
        repos.value = data;
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }
    fetchRepos();
  }, []);

  // Fetch layouts when repo changes
  useEffect(() => {
    if (!selectedRepo.value) return;

    async function fetchLayouts() {
      loading.value = true;
      error.value = null;
      layouts.value = [];
      selectedLayout.value = "";
      try {
        const response = await fetch(`/api/github/layouts?repo=${selectedRepo.value}`);
        if (!response.ok) throw new Error("Failed to fetch layouts");
        const data: LayoutFile[] = await response.json();
        layouts.value = data;

        // Auto-select first layout
        if (data.length > 0) {
          selectedLayout.value = data[0].name;
        }
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }
    fetchLayouts();
  }, [selectedRepo.value]);

  // Fetch layout and platforms when layout or platform changes
  useEffect(() => {
    if (!selectedRepo.value || !selectedLayout.value) return;

    async function fetchLayout() {
      loading.value = true;
      error.value = null;
      try {
        const response = await fetch(
          `/api/github/layout?repo=${selectedRepo.value}&file=${selectedLayout.value}&platform=${selectedPlatform.value}`
        );
        if (!response.ok) throw new Error("Failed to fetch layout");
        const data: LayoutResponse = await response.json();

        platforms.value = data.availablePlatforms;

        // Auto-select macOS if available, otherwise first platform
        if (data.availablePlatforms.includes("macOS") && selectedPlatform.value !== "macOS") {
          selectedPlatform.value = "macOS";
          return; // Will trigger another fetch with macOS
        } else if (!data.availablePlatforms.includes(selectedPlatform.value)) {
          selectedPlatform.value = data.availablePlatforms[0] || "macOS";
          return; // Will trigger another fetch with the new platform
        }

        onLayoutLoaded(data.layout);
      } catch (e) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }
    fetchLayout();
  }, [selectedRepo.value, selectedLayout.value, selectedPlatform.value]);

  return (
    <div class="w-full space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
      <h2 class="text-lg font-bold text-gray-800">Load from GitHub (giellalt)</h2>

      {error.value && (
        <div class="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error.value}
        </div>
      )}

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Repo selector */}
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            1. Select Language
          </label>
          <select
            value={selectedRepo.value}
            onChange={(e) => {
              selectedRepo.value = (e.target as HTMLSelectElement).value;
            }}
            disabled={loading.value || repos.value.length === 0}
            class="w-full p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select a language --</option>
            {repos.value.map((repo) => (
              <option key={repo.code} value={repo.code}>
                {repo.code} - {repo.description || repo.name}
              </option>
            ))}
          </select>
        </div>

        {/* Layout selector */}
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            2. Select Layout
          </label>
          <select
            value={selectedLayout.value}
            onChange={(e) => {
              selectedLayout.value = (e.target as HTMLSelectElement).value;
            }}
            disabled={loading.value || layouts.value.length === 0}
            class="w-full p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- Select a layout --</option>
            {layouts.value.map((layout) => (
              <option key={layout.name} value={layout.name}>
                {layout.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Platform selector */}
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            3. Select Platform
          </label>
          <select
            value={selectedPlatform.value}
            onChange={(e) => {
              selectedPlatform.value = (e.target as HTMLSelectElement).value;
            }}
            disabled={loading.value || platforms.value.length === 0}
            class="w-full p-2 border-2 border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            {platforms.value.length === 0 ? (
              <option value="">-- Select platform --</option>
            ) : (
              platforms.value.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loading.value && (
        <div class="text-center text-sm text-gray-600">
          Loading...
        </div>
      )}
    </div>
  );
}
