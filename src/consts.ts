// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

interface SocialLink {
  href: string;
  label: string;
}

interface Site {
  website: string;
  author: string;
  profile: string;
  desc: string;
  title: string;
  ogImage: string;
  lightAndDarkMode: boolean;
  postPerIndex: number;
  postPerPage: number;
  scheduledPostMargin: number;
  showArchives: boolean;
  showBackButton: boolean;
  editPost: {
    enabled: boolean;
    text: string;
    url: string;
  };
  dynamicOgImage: boolean;
  lang: string;
  timezone: string;
}

// Site configuration
export const SITE: Site = {
  // TODO: set this to your canonical domain once you deploy.
  website: "https://example.com/",
  author: "Nikolaj Fløjgaard",
  profile: "https://example.com/about",
  desc: "Senior integration architect with a passion for writing articles and building stuff. Sharing my learnings along the way here.",
  title: "Nikolaj Fløjgaard",
  ogImage: "avatar.jpg",
  lightAndDarkMode: true,
  postPerIndex: 10,
  postPerPage: 10,
  scheduledPostMargin: 15 * 60 * 1000,
  showArchives: false,
  showBackButton: false,
  editPost: {
    enabled: false,
    text: "Edit on GitHub",
    url: "",
  },
  dynamicOgImage: true,
  lang: "en",
  timezone: "Europe/Copenhagen",
};

export const SITE_TITLE = SITE.title;
export const SITE_DESCRIPTION = SITE.desc;

// Navigation links
export const NAV_LINKS: SocialLink[] = [
  {
    href: "/",
    label: "Blog",
  },
  {
    href: "/about",
    label: "About",
  },
  {
    href: "/resume",
    label: "Resume",
  },
];

// Social media links
export const SOCIAL_LINKS: SocialLink[] = [
  {
    href: "https://github.com/nikolajflojgaard",
    label: "GitHub",
  },
  {
    href: "https://x.com/FlJgaard",
    label: "X",
  },
  {
    href: "https://dk.linkedin.com/in/nikolaj-fl%C3%B8jgaard-90a71b109",
    label: "LinkedIn",
  },
  {
    href: "mailto:Nikolaj_Fl@hotmail.com",
    label: "Email",
  },
];

// Icon map for social media
export const ICON_MAP: Record<string, string> = {
  GitHub: "github",
  X: "twitter",
  LinkedIn: "linkedin",
  Email: "mail",
};
