const url = process.argv[2] || "https://www.facebook.com/share/p/19N6vix4k/";

function parseOg(html, prop) {
  const patterns = [
    new RegExp(`property=["']og:${prop}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`content=["']([^"']+)["'][^>]*property=["']og:${prop}["']`, "i"),
    new RegExp(`name=["']twitter:${prop === "image" ? "image" : prop}["'][^>]*content=["']([^"']+)["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].replace(/&amp;/g, "&").replace(/&#x27;/g, "'");
  }
  return undefined;
}

const res = await fetch(url, {
  redirect: "follow",
  headers: {
    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Accept-Language": "es-MX,es;q=0.9,en;q=0.8",
  },
});
console.log("status", res.status, "final", res.url);
const html = await res.text();
console.log("og:title", parseOg(html, "title")?.slice(0, 150));
console.log("og:description", parseOg(html, "description")?.slice(0, 150));
console.log("og:image", parseOg(html, "image")?.slice(0, 150));
console.log("html len", html.length);
