---
name: google-genai-sdk
description: Comprehensive expert guidance for the new Google GenAI SDK (google-genai), Gemini 2.0 Multimodal Live API (BiDi WebSockets), real-time audio/speech streaming, function calling/tools, and advanced Gemini API development.
license: Apache-2.0
metadata:
  author: rabbly-team
  version: "2.0.0"
  category: ai-development
  tags: ["gemini", "google-genai", "live-api", "multimodal", "audio-streaming", "function-calling", "websockets"]
---

# Google GenAI SDK (`google-genai`) & Gemini Multimodal Live API

## Overview

The `google-genai` package is Google's next-generation unified SDK for Python and TypeScript/Node.js, supporting Gemini 2.0 models with native **Multimodal Live API** (bidirectional low-latency audio, video, and text streaming with function calling over WebSockets).

### Installation & Environment

```bash
# Python
pip install google-genai
# or with uv
uv add google-genai
```

```bash
# Set your API key from Google AI Studio (https://aistudio.google.com/apikey)
export GEMINI_API_KEY="your-gemini-api-key"
```

---

## 1. Gemini Multimodal Live API (Bidirectional Streaming)

The Multimodal Live API enables real-time, low-latency, two-way conversational voice and multimodal interactions with bidirectional WebSocket streaming.

### Core Architecture

- **Protocol**: Bidirectional asynchronous WebSocket session.
- **Client Entrypoint**: `client.aio.live.connect(model=model, config=config)`.
- **Input Modalities**: 16kHz mono 16-bit linear PCM audio, text, video/images.
- **Output Modalities**: 24kHz mono 16-bit linear PCM audio, text transcripts, tool calls.
- **Interruption Support**: Server automatically detects student speech and emits `interrupted=True`.

### Complete Live API Python Implementation

```python
import asyncio
import base64
from google import genai
from google.genai import types

client = genai.Client(api_key="your-api-key")

# Define tools for the agent
weather_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="get_weather",
            description="Get current weather for a city",
            parameters={
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name"}
                },
                "required": ["city"],
            },
        )
    ]
)

config = types.LiveConnectConfig(
    response_modalities=["AUDIO"], # "AUDIO" or ["TEXT", "AUDIO"]
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(
                voice_name="Aoede"  # Aoede, Puck, Charon, Fenrir, Kore
            )
        )
    ),
    system_instruction=types.Content(
        parts=[types.Part.from_text(text="You are a friendly live voice tutor.")]
    ),
    tools=[weather_tool],
)

async def run_live_session():
    # Connect to live session
    async with client.aio.live.connect(model="gemini-2.0-flash-exp", config=config) as session:
        print("Connected to Gemini Live session!")

        # 1. Background task to receive streaming audio, text, and tool calls
        async def receive_loop():
            async for response in session.receive():
                # Check for interruption
                if response.server_content:
                    if response.server_content.interrupted:
                        print("[Interrupted] User spoke, stop playing audio queue!")

                    model_turn = response.server_content.model_turn
                    if model_turn:
                        for part in model_turn.parts:
                            # Audio chunk (PCM 24kHz)
                            if part.inline_data and part.inline_data.mime_type.startswith("audio/"):
                                audio_bytes = part.inline_data.data
                                print(f"Received {len(audio_bytes)} bytes audio PCM")

                            # Subtitle / Text transcript chunk
                            if part.text:
                                print(f"Transcript: {part.text}")

                # Check for Tool / Function calls
                if response.tool_call:
                    function_responses = []
                    for call in response.tool_call.function_calls:
                        print(f"Tool requested: {call.name} with args: {call.args}")
                        
                        # Execute your tool
                        result = {"weather": "Sunny, 22°C"}

                        function_responses.append(
                            types.FunctionResponse(
                                name=call.name,
                                id=call.id,
                                response=result,
                            )
                        )
                    # Reply with tool results back to Gemini Live
                    await session.send_tool_response(function_responses=function_responses)

        receive_task = asyncio.create_task(receive_loop())

        # 2. Sending Realtime Input (e.g. 16kHz audio or text)
        # Send raw 16kHz mono PCM audio chunk from microphone
        sample_pcm_bytes = b"..." # 16000Hz 16-bit linear PCM
        await session.send_realtime_input(
            media_chunks=[types.Blob(data=sample_pcm_bytes, mime_type="audio/pcm;rate=16000")]
        )

        # Or send text input
        await session.send_client_content(
            turns=[
                types.Content(
                    role="user",
                    parts=[types.Part.from_text(text="Hello Gemini!")]
                )
            ]
        )

        await receive_task
```

---

## 2. Standard API Development (`generate_content`)

### Basic Generation & System Instructions

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Explain Pythagorean theorem in two sentences.",
    config=types.GenerateContentConfig(
        system_instruction="You are an encouraging STEM educator.",
        temperature=0.7,
        max_output_tokens=300,
    ),
)

print(response.text)
```

### Multimodal Input (Images, Audio, PDF)

```python
from pathlib import Path
from google import genai
from google.genai import types

client = genai.Client()

# Image file
image_bytes = Path("diagram.png").read_bytes()

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
        "Identify all geometric shapes and angles in this diagram.",
    ],
)
print(response.text)
```

### Structured Output with Pydantic Schemas

```python
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

class LessonTopic(BaseModel):
    title: str
    difficulty: str
    key_formulas: list[str] = Field(description="Key equations taught in this lesson")

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Generate curriculum outline for right triangle trigonometry.",
    config=types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=LessonTopic,
    ),
)

topic: LessonTopic = LessonTopic.model_validate_json(response.text)
print(topic.title, topic.key_formulas)
```

### Streaming Responses

```python
import asyncio
from google import genai

async def stream_explanation():
    client = genai.Client()
    response_stream = await client.aio.models.generate_content_stream(
        model="gemini-2.0-flash",
        contents="Derive the trigonometric identity sin^2(x) + cos^2(x) = 1 step by step.",
    )
    async for chunk in response_stream:
        print(chunk.text, end="", flush=True)

asyncio.run(stream_explanation())
```

### Grounding with Google Search

```python
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="What are the latest breakthroughs in AI math reasoning this year?",
    config=types.GenerateContentConfig(
        tools=[types.Tool(google_search=types.GoogleSearch())],
    ),
)

print(response.text)
# Inspect grounding search metadata
if response.candidates[0].grounding_metadata:
    print("Sources:", response.candidates[0].grounding_metadata.grounding_chunks)
```

---

## 3. Tool Calling / Function Calling Lifecycle

```python
from google import genai
from google.genai import types

# 1. Declare tool schema
canvas_tool = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="draw_shape",
            description="Draws a shape on the digital canvas",
            parameters={
                "type": "object",
                "properties": {
                    "shape": {"type": "string", "enum": ["circle", "triangle", "rectangle"]},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                },
                "required": ["shape", "x", "y"],
            },
        )
    ]
)

client = genai.Client()

# 2. Call model with tool declaration
response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents="Draw a blue triangle at x=100, y=200 on the board.",
    config=types.GenerateContentConfig(tools=[canvas_tool]),
)

# 3. Handle tool calls
if response.function_calls:
    for call in response.function_calls:
        print(f"Tool to invoke: {call.name} with args: {call.args}")
        # Execute tool locally...
        tool_result = {"status": "success", "id": "shape-101"}

        # 4. Feed result back to model
        follow_up = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Part.from_function_response(
                    name=call.name,
                    response={"result": tool_result},
                )
            ],
            config=types.GenerateContentConfig(tools=[canvas_tool]),
        )
        print(follow_up.text)
```

---

## 4. Best Practices & Gotchas

1. **Audio Sample Rates**:
   - Live API input audio **must** be 16kHz (16,000 samples/sec) mono 16-bit linear PCM (`audio/pcm;rate=16000`).
   - Live API output audio is delivered in 24kHz (24,000 samples/sec) mono 16-bit linear PCM (`audio/pcm;rate=24000`).
2. **Handling Interruption**:
   - Always listen for `server_content.interrupted`. When `True`, immediately discard remaining queued audio buffers in the client playback queue so old speech doesn't overlap student input.
3. **Voice Names**:
   - Supported prebuilt voices: `Aoede` (warm, natural), `Puck` (crisp, playful), `Charon` (deep, formal), `Fenrir` (authoritative), `Kore` (clear, balanced).
4. **Environment Variables**:
   - The SDK automatically checks `GEMINI_API_KEY` and `GOOGLE_API_KEY`.
