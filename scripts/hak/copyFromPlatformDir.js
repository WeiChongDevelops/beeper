const path = require("path");
const os = require("os");
const fs = require("fs");

const deps = ["keytar", "matrix-seshat"];
const hakModulesDir = path.join(".hak", "hakModules");

for (const dep of deps) {
    const modulePlatformDir = path.join(".hak", "hakModules", os.platform(), dep);
    const moduleDir = path.join(hakModulesDir, dep);
    console.log(`copying ${modulePlatformDir} to ${moduleDir}`);
    fs.cpSync(modulePlatformDir, moduleDir, { recursive: true });
}