import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const markdownContent = `# Nikolaj Fløjgaard

Senior integration architect with a passion for writing articles, bulding and shipping project, sharing my learnings along the way. 

## Navigation

- [About](/about.md)
- [Posts](/posts.md)
- [RSS Feed](/rss.xml)

## Links

- X: https://x.com/
- GitHub: https://github.com/nikolajflojgaard
- LinkedIn: https://dk.linkedin.com/in/nikolaj-fl%C3%B8jgaard-90a71b109
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
