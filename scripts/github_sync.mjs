import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data");
const OUT_PATH = path.join(DATA_DIR, "github_data.json");

const GITHUB_USERNAME = process.env.GITHUB_USERNAME || "nikolajflojgaard";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

async function fetchGitHub(url) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "nikolajflojgaard.me-sync",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchUser() {
  return fetchGitHub(`https://api.github.com/users/${GITHUB_USERNAME}`);
}

async function fetchRepos() {
  const repos = await fetchGitHub(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`
  );
  // Filter out forks and sort by stars
  return repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 6)
    .map((r) => ({
      name: r.name,
      description: r.description,
      html_url: r.html_url,
      stargazers_count: r.stargazers_count,
      language: r.language,
      updated_at: r.updated_at,
    }));
}

async function fetchRecentActivity() {
  // Get recent events
  const events = await fetchGitHub(
    `https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=20`
  );
  
  const activity = [];
  for (const event of events.slice(0, 10)) {
    const repo = event.repo?.name || "unknown";
    let type = event.type;
    let description = "";
    
    switch (event.type) {
      case "PushEvent":
        type = "push";
        description = `Pushed ${event.payload?.commits?.length || 0} commits to ${repo}`;
        break;
      case "CreateEvent":
        type = "create";
        description = `Created ${event.payload?.ref_type || "repository"} in ${repo}`;
        break;
      case "PullRequestEvent":
        type = "pr";
        description = `${event.payload?.action || "opened"} PR in ${repo}`;
        break;
      case "IssuesEvent":
        type = "issue";
        description = `${event.payload?.action || "opened"} issue in ${repo}`;
        break;
      case "ReleaseEvent":
        type = "release";
        description = `Released ${event.payload?.release?.tag_name || "version"} in ${repo}`;
        break;
      default:
        continue; // Skip unknown event types
    }
    
    activity.push({
      type,
      description,
      repo,
      created_at: event.created_at,
    });
  }
  
  return activity;
}

async function main() {
  console.log(`Fetching GitHub data for ${GITHUB_USERNAME}...`);
  
  try {
    const [user, repos, activity] = await Promise.all([
      fetchUser(),
      fetchRepos(),
      fetchRecentActivity(),
    ]);
    
    const data = {
      username: user.login,
      name: user.name,
      bio: user.bio,
      public_repos: user.public_repos,
      followers: user.followers,
      following: user.following,
      avatar_url: user.avatar_url,
      html_url: user.html_url,
      created_at: user.created_at,
      repos,
      recent_activity: activity,
      fetched_at: new Date().toISOString(),
    };
    
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
    
    console.log(`✅ GitHub data saved to ${OUT_PATH}`);
    console.log(`   Repos: ${repos.length}`);
    console.log(`   Activity items: ${activity.length}`);
  } catch (err) {
    console.error("❌ Error fetching GitHub data:", err.message);
    process.exit(1);
  }
}

main();
