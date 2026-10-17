# Mustache Node

A small Node.js WebSocket bridge between a Unity audio client and OpenAI's Realtime API. The server receives binary audio, forwards it to the API, and sends transcript events back to the client.

## Repository layout

- [app.js](app.js): WebSocket bridge and response event handling
- [package.json](package.json) and [package-lock.json](package-lock.json): the `ws` dependency
- `hi-cutiepie.wav`: a bundled audio sample; its provenance is not documented

The companion Unity project is [MustacheUnity](https://github.com/VyasSathya/MustacheUnity).

## Local setup

Install Node.js and npm, then install the locked dependency:

```sh
npm ci
```

Set `OPENAI_API_KEY` in your shell environment and start the actual entry point:

```sh
node app.js
```

The client connects to `ws://localhost:3000` and sends binary audio. The source collects incoming chunks, commits pending audio every 500 milliseconds, and handles transcript messages. API usage can incur charges.

## Status and compatibility

This is a historical integration prototype. It uses the preview model `gpt-4o-realtime-preview-2024-10-01` and the `realtime=v1` beta header. Compatibility with the current API has not been verified. Audio format/session negotiation, per-client state isolation, and client authentication are not implemented as a complete deployment configuration. The server logs API response messages, so use non-sensitive audio while evaluating it.

`npm test` is the package's default placeholder and exits with an error; it is not a test suite. The documentation review did not connect to the API or run a Unity audio session.

## License

`package.json` declares ISC. A standalone license file and provenance for the bundled audio sample are not included.

## Removed for publication

The sample audio file `hi-cutiepie.wav` is not included; use any short WAV file in its place.
