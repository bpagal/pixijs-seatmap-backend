import { execSync } from "child_process";

try {
  console.log("Building TypeScript...");
  execSync(
    "npx tsc server.ts --outDir dist --target es2020 --module nodenext --moduleResolution nodenext --allowSyntheticDefaultImports",
    { stdio: "inherit" },
  );
  console.log("Build complete!");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
}
