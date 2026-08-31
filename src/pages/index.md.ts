import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const markdownContent = `# Nikolaj Fløjgaard

Senior integration architect with a passion for writing articles and building stuff. Sharing my learnings along the way here.

## Navigation

- [About](/about.md)
- [Posts](/posts.md)
- [Resume](/resume.md)
- [RSS Feed](/rss.xml)

## Links

- X: https://x.com/
- GitHub: https://github.com/nikolajflojgaard
- LinkedIn: https://www.linkedin.com/in/nikolaj-fløjgaard-reichkendler-90a71b109/
- Email: Nikolaj_Fl@hotmail.com

---

*This is the markdown-only version of the site. Visit the homepage for the full experience.*`;

  return new Response(markdownContent, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
