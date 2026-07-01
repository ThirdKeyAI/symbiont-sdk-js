# Examples

Runnable examples for the Symbiont JS SDK.

The examples import the workspace package `symbi-core`, so build the workspace
first:

```bash
npm install
npm run build
```

Then start a Symbiont runtime (`symbi up` or the Docker quick-start in the main
[Symbiont README](https://github.com/thirdkeyai/symbiont)) and run:

```bash
# from the repo root
SYMBIONT_API_URL=http://localhost:8080/api/v1 node apps/examples/hello-runtime.mjs
```

Set `SYMBIONT_API_KEY` as well if your runtime requires authentication.

| Example | What it shows |
|---------|---------------|
| [`hello-runtime.mjs`](hello-runtime.mjs) | Connect, health-check, create an agent, and execute it. |
