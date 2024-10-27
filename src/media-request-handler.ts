// Exists to hook outgoing HTTP requests and find requests for media that need authentication. Need to do it at this
// level so the app can use media URLs in <img> tags and the Electron process can seamlessly add auth to those requests.
// There is some complexity here as only the request to our media repository should have the auth, if the request
// is redirected to another domain the auth should be removed.
export class MediaRequestHandler {
    accessToken: string | undefined;
    homeserverHost: string | undefined;

    hostnameDenylist = new Set();

    saveMatrixAccessToken(newAccessToken: string | undefined, newHomeserverHost: string | undefined) {
        this.accessToken = newAccessToken;
        this.homeserverHost = newHomeserverHost;
    }

    private isUrlAnAuthenticatedMediaRequest(url: string): boolean {
        return (
            url.startsWith(`${this.homeserverHost}/_matrix/client/v1/media/download`) ||
            url.startsWith(`${this.homeserverHost}/_matrix/client/v1/media/thumbnail`)
        );
    }

    onBeforeSendHeadersListener(
        details: Electron.OnBeforeSendHeadersListenerDetails,
        callback: (beforeSendResponse: Electron.BeforeSendResponse) => void,
    ): void {
        if (this.isUrlAnAuthenticatedMediaRequest(details.url)) {
            // It's a media request, add the authentication header
            callback({
                requestHeaders: {
                    ...details.requestHeaders,
                    authorization: `Bearer ${this.accessToken}`,
                },
            });
        } else if (this.hostnameDenylist.has(new URL(details.url).hostname)) {
            // This is a denylisted domain, strip the authorization header
            const requestHeaders = details.requestHeaders;
            delete requestHeaders.authorization;
            callback({ requestHeaders });
        } else {
            callback({});
        }
    }

    onBeforeRedirectListener(details: Electron.OnBeforeRedirectListenerDetails): void {
        if (this.isUrlAnAuthenticatedMediaRequest(details.url)) {
            const newHostname = new URL(details.redirectURL).hostname;
            if (newHostname === new URL(this.homeserverHost).hostname) {
                // We're redirecting to our own media repo, never denylist it
                return;
            }

            // Our media request got redirected somewhere, add the target hostname to a denylist so that the CDN
            // we're redirecting to never gets auth headers sent to it
            if (!this.hostnameDenylist.has(newHostname)) {
                this.hostnameDenylist.add(newHostname);
            }
        }
    }
}
