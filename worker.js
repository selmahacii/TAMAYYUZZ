export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Forward API requests to the deployed backend server if configured
    if (url.pathname.startsWith("/api/")) {
      const backendUrl = env.BACKEND_API_URL;
      if (!backendUrl) {
        return new Response(
          JSON.stringify({
            error: "Le serveur backend n'est pas encore déployé ou connecté à Cloudflare.",
            details: "Configurez la variable BACKEND_API_URL dans Cloudflare (ou utilisez http://localhost:5173 en local pour tester avec votre backend local).",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }
        );
      }

      const targetUrl = new URL(url.pathname + url.search, backendUrl);
      const newHeaders = new Headers(request.headers);
      newHeaders.set("Host", targetUrl.host);

      const modifiedRequest = new Request(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
        redirect: "follow",
      });

      return fetch(modifiedRequest);
    }

    // Otherwise serve static SPA assets
    return env.ASSETS.fetch(request);
  },
};
