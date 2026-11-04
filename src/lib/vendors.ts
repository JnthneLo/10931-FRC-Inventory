export const VENDORS: Record<string, { label: string; searchUrl: (q: string) => string }> = {
  wcp: { label: "WCP", searchUrl: (q) => `https://wcproducts.com/search?q=${encodeURIComponent(q)}` },
  rev: { label: "REV Robotics", searchUrl: (q) => `https://www.revrobotics.com/search/?q=${encodeURIComponent(q)}` },
  andymark: { label: "AndyMark", searchUrl: (q) => `https://www.andymark.com/search?q=${encodeURIComponent(q)}` },
  vex: { label: "VEX", searchUrl: (q) => `https://www.vexrobotics.com/catalogsearch/result/?q=${encodeURIComponent(q)}` },
  ctre: { label: "CTRE", searchUrl: (q) => `https://store.ctr-electronics.com/search?q=${encodeURIComponent(q)}` },
  mcmaster: { label: "McMaster-Carr", searchUrl: (q) => `https://www.mcmaster.com/products/${encodeURIComponent(q)}/` },
  thrifty: { label: "Thrifty Bot", searchUrl: (q) => `https://www.thethriftybot.com/search?q=${encodeURIComponent(q)}` },
  other: { label: "Other", searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
};

export function partLink(part: { vendor: string; url: string; part_number: string }): string | null {
  if (part.url) return part.url;
  if (part.vendor && part.part_number && VENDORS[part.vendor]) {
    return VENDORS[part.vendor].searchUrl(part.part_number);
  }
  return null;
}
