const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const allowedFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/script.js", "script.js"],
  ["/assets/maison-sante-verjoulot.jpg", "assets/maison-sante-verjoulot.jpg"],
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const fileName = allowedFiles.get(url.pathname);

    if (!fileName) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    const filePath = path.join(root, fileName);
    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "text/plain",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500);
    response.end(error.message);
  }
});

function listen() {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  const text = await response.text();
  return { status: response.status, text };
}

(async () => {
  const port = await listen();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const [index, css, js, image] = await Promise.all([
      fetchText(`${baseUrl}/index.html`),
      fetchText(`${baseUrl}/styles.css`),
      fetchText(`${baseUrl}/script.js`),
      fetchText(`${baseUrl}/assets/maison-sante-verjoulot.jpg`),
    ]);

    const checks = {
      indexStatus: index.status === 200,
      cssStatus: css.status === 200,
      jsStatus: js.status === 200,
      imageStatus: image.status === 200,
      hasCabinetTitle: index.text.includes("Cabinet infirmier"),
      hasEmergencyNotice: index.text.includes("15 ou le 112"),
      hasBuildingPhoto: index.text.includes("assets/maison-sante-verjoulot.jpg"),
      hasResponsiveCss: css.text.includes("@media (max-width: 680px)"),
      hasMenuScript: js.text.includes("data-menu-toggle"),
    };

    const failed = Object.entries(checks)
      .filter(([, value]) => !value)
      .map(([name]) => name);

    console.log(JSON.stringify({ url: `${baseUrl}/index.html`, checks, failed }, null, 2));

    if (failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    server.close();
  }
})();
