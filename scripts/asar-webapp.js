let path = require("path");
let asar = require("asar");
let fs = require("fs/promises");
let jszip = require("jszip");
let _glob = require("glob");
let stringReplaceStream = require("string-replace-stream");

function glob(...args) {
    return new Promise((resolve, reject) => {
        _glob(
            ...args.concat((err, result) => {
                if (err) reject(err);
                else resolve(result);
            }),
        );
    });
}

function filter(regex) {
    return function (s) {
        return regex.test(s);
    };
}

function not(f) {
    return function (s) {
        return !f(s);
    };
}

// turn windows separators into unix ones, becuase minimatch/glob can't cope
let source = process.argv[2].replace(/\\/g, "/");
let dest = process.argv[3];
let channel = process.argv[4];

console.log("Packaging webapp for ", channel, "source", source, "dest", dest, "cwd", process.cwd());

function transform(filename) {
    return filename.endsWith(".js")
        ? new stringReplaceStream("\n//# sourceMappingURL=", "\n//# sourceMappingURL=http://localhost:9876/")
        : null;
}

async function bundleSourcemaps() {
    console.log("Bundling sourcemaps.zip");

    let maps = await glob(`${source}/**/*.map`);
    let zip = new jszip();

    for (let map of maps) {
        //let filename = path.relative(source, map)
        let filename = path.basename(map);
        let data = await fs.readFile(map);

        console.log(filename, " -> ", map);
        zip.file(filename, require("fs").createReadStream(map));
    }

    zip.generateNodeStream().pipe(require("fs").createWriteStream("sourcemaps.zip"));
}

async function bundleAsar() {
    let files = await glob(`${source}/**/*`);

    console.log("Bundling webapp.asar");

    let options = {};

    // For non beta builds, strip source maps and update references in the source files
    if (channel != "beta") {
        console.log("Stripping sourcemaps for", channel, "build");
        files = files.filter(not(filter(/\.map$/)));
        // Disable transformation, it corrupts some binary files
        // and it's risky, resulting slighly different files for production vs beta.
        // options.transform = transform;
    }

    asar.createPackageFromFiles(source, dest, files, undefined, options);

    console.log("Done");
}

async function main() {
    await bundleAsar();
    await bundleSourcemaps();
}

main();
