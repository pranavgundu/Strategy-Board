import fs from "fs";
import path from "path";

const BUILD_INFO = {
  sha: "test-build",
  fullSha: "test-build-full",
  message: "Test build",
  author: "Test",
  date: new Date().toISOString(),
  url: "https://github.com/pranavgundu/Strategy-Board",
};

const buildFilePath = path.join(process.cwd(), "src", "build.ts");
const content = `// Auto-generated for testing\nexport const BUILD_COMMIT = ${JSON.stringify(BUILD_INFO, null, 2)};\n`;

if (!fs.existsSync(buildFilePath)) {
  fs.writeFileSync(buildFilePath, content);
}
