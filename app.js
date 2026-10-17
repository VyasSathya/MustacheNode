const WebSocket = require("ws");

const localServer = new WebSocket.Server({ port: 3000 });
console.log("WebSocket server is running on ws://localhost:3000");

let audioBuffer = [];
let openAIReady = false;
let isResponseActive = false;
let audioDataPending = false;

localServer.on("connection", (clientWs) => {
    console.log("Client connected.");

    const openAIWs = new WebSocket("wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01", {
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "OpenAI-Beta": "realtime=v1",
        },
    });

    openAIWs.on("open", () => {
        console.log("Connected to OpenAI server.");
        openAIReady = true;
    });

    clientWs.on("message", (message) => {
        console.log("Received audio from Unity.");

        if (Buffer.isBuffer(message)) {
            audioBuffer.push(message);
        } else {
            console.error("Message is not a buffer!");
            return;
        }

        if (!openAIReady) {
            console.log("Waiting for OpenAI to be ready.");
            return;
        }

        if (audioBuffer.length > 0) {
            const fullAudioBuffer = Buffer.concat(audioBuffer);
            console.log("Full audio buffer length:", fullAudioBuffer.length);

            if (openAIWs.readyState === WebSocket.OPEN) {
                const audioAppendMessage = {
                    type: "input_audio_buffer.append",
                    audio: fullAudioBuffer.toString('base64'),
                };
                openAIWs.send(JSON.stringify(audioAppendMessage));
                console.log("Sent audio append message to OpenAI.");
                audioDataPending = true;
                audioBuffer = [];
            } else {
                console.error("OpenAI WebSocket is not open.");
            }
        }
    });

    const commitInterval = setInterval(() => {
        if (openAIWs.readyState !== WebSocket.OPEN) {
            console.log("OpenAI WebSocket is not open; cannot commit.");
            return;
        }

        if (audioDataPending) {
            const commitMessage = {
                type: "input_audio_buffer.commit",
            };
            openAIWs.send(JSON.stringify(commitMessage));
            console.log("Sent commit message to OpenAI.");
            audioDataPending = false;
        }
    }, 500);

    openAIWs.on("message", (message) => {
        console.log("Received response from OpenAI:", message.toString());

        try {
            const response = JSON.parse(message);
            if (response && response.type) {
                switch (response.type) {
                    case "input_audio_buffer.committed":
                        console.log("Audio buffer committed successfully.");
                        if (!isResponseActive) {
                            const responseRequest = {
                                type: "response.create",
                                response: {
                                    modalities: ["text"],
                                }
                            };
                            openAIWs.send(JSON.stringify(responseRequest));
                            console.log("Requested text response from OpenAI.");
                            isResponseActive = true;
                        }
                        break;
                    case "response.created":
                        console.log("Response creation acknowledged.");
                        break;
                    case "response.audio_transcript.done":
                        console.log("Received transcript:", response.transcript);
                        if (clientWs.readyState === WebSocket.OPEN) {
                            clientWs.send(JSON.stringify({ type: "transcript", text: response.transcript }));
                        }
                        break;
                    case "response.done":
                        console.log("Response processing done.");
                        isResponseActive = false;
                        break;
                    case "error":
                        console.error("OpenAI error:", response.error.message);
                        isResponseActive = false;
                        break;
                    default:
                        console.warn("Unhandled OpenAI response type:", response.type);
                        break;
                }
            } else {
                console.warn("Unexpected response:", response);
            }
        } catch (error) {
            console.error("Failed to read OpenAI response:", error);
        }
    });

    clientWs.on("close", () => {
        console.log("Client disconnected.");
        if (openAIWs.readyState === WebSocket.OPEN) {
            openAIWs.close();
        }
        clearInterval(commitInterval);
    });

    openAIWs.on("close", () => {
        console.log("Disconnected from OpenAI.");
    });

    openAIWs.on("error", (err) => {
        console.error("OpenAI WebSocket error:", err);
    });

    clientWs.on("error", (err) => {
        console.error("Client WebSocket error:", err);
    });
});