export interface Env {
  locationTestDO: DurableObjectNamespace;
  locationTest2DO: DurableObjectNamespace;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const doName = url.searchParams.get("name");
    if (!doName) {
      return new Response("Missing name", { status: 400 });
    }
    console.log(
      "worker",
      JSON.stringify([...request.headers.entries()], undefined, 2)
    );
    return env.locationTestDO
      .get(env.locationTestDO.idFromName(doName))
      .fetch(request);
  },
};

class LocationTestDO implements DurableObject {
  private _env: Env;

  constructor(_: DurableObjectState, env: Env) {
    this._env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const traceResponse = await fetch("https://cloudflare.com/cdn-cgi/trace");
    const traceText = await traceResponse.text();
    console.log(
      "do",
      JSON.stringify([...request.headers.entries()], undefined, 2),
      traceText
    );
    const url = new URL(request.url);
    const doName = url.searchParams.get("name");
    if (!doName) {
      return new Response("Missing name", { status: 400 });
    }
    const hint = url.searchParams.get("hint") ?? "eeur";
    const response = await this._env.locationTest2DO
      .get(this._env.locationTest2DO.idFromName(doName), {
        locationHint: hint as DurableObjectLocationHint,
      })
      .fetch(request);
    return new Response(
      "do1\n" + traceText + "\n\ndo2\n" + (await response.text())
    );
  }
}

class LocationTest2DO implements DurableObject {
  async fetch(request: Request): Promise<Response> {
    const traceResponse = await fetch("https://cloudflare.com/cdn-cgi/trace");
    const traceText = await traceResponse.text();
    console.log(
      "do2",
      JSON.stringify([...request.headers.entries()], undefined, 2),
      traceText
    );
    return new Response(traceText);
  }
}

export { worker as default, LocationTestDO, LocationTest2DO };
