import { define, getErrorMessage } from "../../../utils.ts";

export const handler = define.handlers({
  async GET() {
    try {
      // Get GitHub token from environment if available
      const githubToken = Deno.env.get("GITHUB_TOKEN");
      const headers: Record<string, string> = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "keyboard-viewer",
      };

      // Add authorization header if token is available
      if (githubToken) {
        headers["Authorization"] = `Bearer ${githubToken}`;
      }

      // Use Search API to find all keyboard-* repos
      const allRepos = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const searchUrl = new URL("https://api.github.com/search/repositories");
        searchUrl.searchParams.set(
          "q",
          "org:giellalt keyboard- in:name archived:false",
        );
        searchUrl.searchParams.set("per_page", "100");
        searchUrl.searchParams.set("page", page.toString());

        const response = await fetch(searchUrl.toString(), { headers });

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.statusText}`);
        }

        const data = await response.json();
        allRepos.push(...data.items);

        // Check if there are more pages
        hasMore = data.items.length === 100 &&
          allRepos.length < data.total_count;
        page++;

        // Safety limit: prevent infinite loops
        if (page > 20) {
          console.warn("Hit pagination safety limit at 20 pages (2000 repos)");
          break;
        }
      }

      // Extract language codes (no filter needed - search already did that)
      const keyboardRepos = allRepos
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
        { error: getErrorMessage(error) },
        { status: 500 },
      );
    }
  },
});
