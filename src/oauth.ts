import { networkInterfaces } from "os";
import { createServer, Server } from "http";
import { AddressInfo } from "net";

const successResponse = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>Beeper</title>
    <meta charset="utf-8"/>
    <style>
        body {
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>Successfully logged in</h1>
    <p>You can close this tab and return to the Beeper app</p>
</body>
</html>
`;

let promisedServer: Promise<Server> | null = null;

function handleRequest(request, response) {
    if (request.method === "HEAD") {
        response.writeHead(200);
        response.end();
    } else if (request.method !== "GET") {
        response.writeHead(405, { Allow: "GET" });
        response.end();
    } else {
        const url = new URL(request.url, "http://localhost");
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(successResponse);
        global.mainWindow.webContents.send("oauthServerEvent", Object.fromEntries(url.searchParams as any));
    }
}

function makeServer(): Promise<Server> {
    return new Promise((resolve, reject) => {
        const listenAddress = Object.values(networkInterfaces())
            .flatMap((x) => x)
            .find((addr) => addr.internal)?.address;
        if (!listenAddress) {
            reject(new Error("No loopback address found"));
            return;
        }

        const newServer = createServer(handleRequest);
        newServer.on("error", (err) => reject(err));
        newServer.on("listening", () => resolve(newServer));
        newServer.listen(0, listenAddress);
    });
}

export function stopOAuthServer() {
    promisedServer?.then((server) => server.close());
    promisedServer = null;
}

export function startOAuthServer(): Promise<string> {
    if (!promisedServer) {
        promisedServer = makeServer();
    }
    return promisedServer.then(
        (server) => {
            const addr = server.address() as AddressInfo;
            const hostname = addr.family.toLowerCase() == "ipv6" ? `[${addr.address}]` : addr.address;
            const port = addr.port;
            return `http://${hostname}:${port}`;
        },
        (error) => {
            promisedServer = null;
            throw error;
        },
    );
}
