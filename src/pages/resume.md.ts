import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const markdownContent = `# Resume - Nikolaj Fløjgaard

Senior Integration Architect focused on scalable architecture, pragmatic delivery, and modern automation.

## Contact

- Email: nikolaj_fl@hotmail.com
- LinkedIn: https://www.linkedin.com/in/nikolaj-fløjgaard-reichkendler-90a71b109/
- PDF CV: /resume/nikolaj-flojgaard-cv.pdf

## Core Competencies

- Architecture and solution design
- Business process alignment and application ownership
- Servant leadership and collaboration
- Java, REST, MuleSoft, Kafka, JIRA
- Agile/Scrum and SAFe
- TMF APIs, Camunda, Sparx

## Latest Roles

- Senior Integration Architect, TDC NET (May 2025 - Present)
- Integration Architect, TDC NET (Nov 2022 - Apr 2025)
- Solution Architect, Telia (Aug 2021 - Oct 2022)

---

[Back to Home](/index.md)`;

  return new Response(markdownContent, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
