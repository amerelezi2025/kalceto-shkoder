import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const types = { ".css": "text/css", ".js": "application/javascript", ".svg": "image/svg+xml", ".html": "text/html" };

createServer((request, response) => {
  const pathname = request.url.split("?")[0] === "/" ? "/index.html" : request.url.split("?")[0];
  const filePath = normalize(join(root, pathname));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404); response.end("Not found"); return;
  }
  response.writeHead(200, { "Content-Type": `${types[extname(filePath)] || "application/octet-stream"}; charset=utf-8"` });
  createReadStream(filePath).pipe(response);
}).listen(4173, () => console.log("Kalceto preview: http://localhost:4173"));
