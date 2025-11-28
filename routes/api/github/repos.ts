import { define } from "../../../utils.ts";

export const handler = define.handlers({
  async GET() {
    try {
      // Fetch all repos from giellalt organization
      const response = await fetch(
        "https://api.github.com/orgs/giellalt/repos?per_page=100",
        {
          headers: {
            "Accept": "application/vnd.github+json",
            "User-Agent": "keyboard-viewer",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repos = await response.json();

      // Filter for keyboard-* repos and extract language codes
      const keyboardRepos = repos
        .filter((repo: { name: string }) => repo.name.startsWith("keyboard-"))
        .map((repo: { name: string; description: string }) => ({
          code: repo.name.replace("keyboard-", ""),
          name: repo.name,
          description: repo.description || "",
        }))
        .sort((a: { code: string }, b: { code: string }) =>
          a.code.localeCompare(b.code)
        );

      return Response.json(keyboardRepos);
    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }
  },
});
