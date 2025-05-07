#!/usr/bin/env node
//ToDo license? 
//https://github.com/microsoft/vscode-eslint/issues/1602#issuecomment-1524128714

import { execSync, spawn } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scribtDir = dirname(fileURLToPath(import.meta.url))
console.log('currentDir: ',scribtDir)
process.chdir(scribtDir);


const nodeOptions = execSync("yarn node -p process.env.NODE_OPTIONS")
  .toString()
  .slice(0, -1);

const child = spawn("node", [...process.argv.slice(2)], {
  env: {
    ...process.env,
    NODE_OPTIONS: nodeOptions,
  },
  stdio: ["inherit", "inherit", "inherit", "ipc"],
}).on("message", (data) => {
  if (process.send !== undefined) {
    process.send(data);
  }
});

process.on("message", (data) => {
  // @ts-expect-error
  child.send(data);
});
