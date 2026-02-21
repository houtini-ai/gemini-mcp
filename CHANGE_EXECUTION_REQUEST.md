# Change Execution Request: Gemini 3.1 Pro + Image Analysis

**Version:** 1.4.5 → 1.5.0  
**Branch:** feature/gemini-3-1-pro-image-analysis  
**Date:** 2025-02-20  

---

## Context

This request upgrades the MCP to:

1. Ensure `gemini-3.1-pro-preview` is always used as the default, regardless of the auto-discovery filter that currently strips `-preview` models
2. Add a new `analyze_image` tool that routes image+prompt requests through `gemini-3.1-pro-preview` via the Google Generative AI SDK (not the REST image service), returning HTML/text

The current `describe_image` tool routes through `GeminiImageService` which only accepts the 3 Imagen-style generation models. That is the wrong service for analysis. `gemini-3.1-pro-preview` accepts image input through the standard `generateContent` path — the same path used by `gemini_chat`.

---

## Change 1: Fix selectDefaultModel in services/gemini/index.ts

The `selectDefaultModel` method filters out `-preview` models unless `allowExperimentalModels=true`. This means even though `config.defaultModel` is set to `gemini-3.1-pro-preview`, if the API returns that model during discovery, it falls back to something else.

The fix: check the configured default *before* applying the experimental filter. If the configured default exists in the discovered model list, use it unconditionally.

**File:** `src/services/gemini/index.ts`

Find this block:

```typescript
private selectDefaultModel(models: ModelInfo[]): string | null {
  if (models.length === 0) {
    return null;
  }

  // Prefer the configured default if it exists in the model list
  if (this.config.defaultModel) {
    const configured = models.find(m => m.name === this.config.defaultModel);
    if (configured) {
      return configured.name;
    }
  }

  let geminiModels = models.filter(m => 
    m.name.toLowerCase().includes('gemini')
  );
```

Replace with:

```typescript
private selectDefaultModel(models: ModelInfo[]): string | null {
  if (models.length === 0) {
    return null;
  }

  // Configured default takes absolute priority - no experimental filter applied
  if (this.config.defaultModel) {
    const configured = models.find(m => m.name === this.config.defaultModel);
    if (configured) {
      return configured.name;
    }
    // Configured model not in discovered list - use it anyway as it was explicitly set
    return this.config.defaultModel;
  }

  let geminiModels = models.filter(m => 
    m.name.toLowerCase().includes('gemini')
  );
```

Also update the fallback models list to include 3.1-pro-preview at the top:

```typescript
private getFallbackModels(): ModelInfo[] {
  return [
    {
      name: 'gemini-3.1-pro-preview',
      displayName: 'Gemini 3.1 Pro Preview',
      description: 'Gemini 3.1 Pro - Advanced reasoning, multimodal, 1M context',
      contextWindow: 1_000_000
    },
    {
      name: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash',
      description: 'Latest Gemini 2.5 Flash - Fast, versatile performance',
      contextWindow: 1_000_000
    },
    // ... rest unchanged
  ];
}
```

---

## Change 2: Add ImageAnalysisRequest support to GeminiService

The `GeminiService.chat()` method only accepts text. We need a second method that accepts images alongside a prompt, using the same Google Generative AI SDK path (`model.generateContent`).

The types file already has `ImageAnalysisRequest` defined — it just isn't implemented.

**File:** `src/services/gemini/index.ts`

Add this method to the `GeminiService` class, after the `chat()` method:

```typescript
async analyzeImages(request: ImageAnalysisRequest): Promise<ChatResponse> {
  try {
    await this.ensureModelsInitialized();
    
    const modelName = request.model || this.defaultModel;
    
    this.logInfo(`Image analysis request to ${modelName}`, {
      imageCount: request.images.length,
      promptLength: request.prompt.length,
      hasSystemPrompt: !!request.systemPrompt
    });

    const generationConfig: GeminiGenerationConfig = {
      temperature: request.temperature ?? this.config.temperature,
      maxOutputTokens: request.maxTokens ?? this.config.maxTokens
    };

    const model = this.genAI.getGenerativeModel({
      model: modelName,
      safetySettings: this.mapSafetySettings(),
      generationConfig
    });

    const parts: Part[] = [];

    if (request.systemPrompt) {
      parts.push({ text: `${request.systemPrompt}\n\n` });
    }

    parts.push({ text: request.prompt });

    for (const img of request.images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.data
        }
      });
    }

    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const response = result.response;

    if (response.promptFeedback?.blockReason) {
      throw new GeminiError(
        `Response blocked by safety filters. Reason: ${response.promptFeedback.blockReason}`
      );
    }

    let responseText: string;
    try {
      responseText = response.text();
    } catch {
      throw new GeminiError('No text content in image analysis response');
    }

    this.logInfo('Image analysis completed', {
      model: modelName,
      responseLength: responseText.length
    });

    return {
      content: responseText,
      model: modelName,
      timestamp: new Date().toISOString(),
      finishReason: response.candidates?.[0]?.finishReason?.toString()
    };

  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    this.logError('Image analysis failed', error as Error);
    throw new GeminiError(`Error analysing images: ${(error as Error).message}`);
  }
}
```

---

## Change 3: Register analyze_image tool in index.ts

**File:** `src/index.ts`

Add after the `describe_image` tool registration block (before the `logger.info('Tools registered'...)`):

```typescript
// Register analyze_image tool
this.server.registerTool(
  'analyze_image',
  {
    title: 'Analyze Image with Gemini Pro',
    description:
      'Analyze one or more images using gemini-3.1-pro-preview. ' +
      'Pass a screenshot or design and get back HTML, CSS, analysis, or any text output. ' +
      'Ideal for: screenshot-to-HTML conversion, design analysis, UI recreation, ' +
      'extracting structured data from images. Returns text — no image is generated.',
    inputSchema: {
      prompt: z.string()
        .describe('What to do with the image(s). E.g. "Convert this screenshot to HTML/CSS" or "Describe the UI components"'),
      images: z.array(
        z.object({
          data: z.string().describe('Base64 encoded image data'),
          mimeType: z.string().describe('MIME type of the image (e.g., image/png, image/jpeg)')
        })
      )
        .min(1)
        .describe('One or more images to analyse'),
      model: z.string()
        .optional()
        .default('gemini-3.1-pro-preview')
        .describe('Model to use (default: gemini-3.1-pro-preview)'),
      temperature: z.number()
        .min(0.0)
        .max(1.0)
        .optional()
        .default(0.7)
        .describe('Controls randomness (0.0 to 1.0)'),
      max_tokens: z.number()
        .int()
        .min(1)
        .max(65536)
        .optional()
        .default(16384)
        .describe('Maximum tokens in response'),
      system_prompt: z.string()
        .optional()
        .describe('Optional system instruction')
    },
    outputSchema: {
      content: z.string(),
      success: z.boolean()
    }
  },
  async ({ prompt, images, model, temperature, max_tokens, system_prompt }) => {
    try {
      logger.info('Executing analyze_image tool', {
        model,
        imageCount: images.length,
        promptLength: prompt.length
      });

      const response = await this.geminiService.analyzeImages({
        prompt,
        images: images as { data: string; mimeType: string }[],
        model,
        temperature,
        maxTokens: max_tokens,
        systemPrompt: system_prompt
      });

      return {
        content: createToolResult(true, response.content),
        structuredContent: { content: response.content, success: true }
      };

    } catch (error) {
      logger.error('analyze_image tool failed', { error });
      const msg = error instanceof McpError
        ? error.message
        : `Failed to analyse image: ${(error as Error).message}`;
      return {
        content: createToolResult(false, msg, error as Error),
        structuredContent: { content: msg, success: false }
      };
    }
  }
);
```

Update the tools count log immediately after all registrations:

```typescript
logger.info('Tools registered', {
  toolCount: 7,
  tools: ['gemini_chat', 'gemini_list_models', 'gemini_deep_research', 'generate_image', 'edit_image', 'describe_image', 'analyze_image']
});
```

Also update the `start()` method log:

```typescript
logger.info('Gemini MCP Server started successfully', {
  transport: 'stdio',
  toolsAvailable: ['gemini_chat', 'gemini_list_models', 'gemini_deep_research', 'generate_image', 'edit_image', 'describe_image', 'analyze_image']
});
```

---

## Change 4: Bump version and update CHANGELOG

**File:** `package.json`

```json
"version": "1.5.0"
```

**File:** `CHANGELOG.md` — prepend:

```markdown
## [1.5.0] - 2025-02-20

### Added
- `analyze_image` tool: pass images + prompt to gemini-3.1-pro-preview, get back HTML/text
- Ideal for screenshot-to-HTML, design analysis, UI recreation workflows

### Fixed
- `selectDefaultModel` now honours explicitly configured `defaultModel` unconditionally — no longer overridden by experimental model filter
- Updated fallback model list to include gemini-3.1-pro-preview at top position

### Changed
- Default model confirmed as `gemini-3.1-pro-preview` (1M context, 64K output, multimodal)
- Tool count updated to 7
```

---

## Build and Test

```bash
cd C:\MCP\gemini-mcp
npm run build
```

Expected: clean TypeScript compile, no errors.

Then restart Claude Desktop and verify:
- `gemini:gemini_list_models` shows gemini-3.1-pro-preview
- `gemini:analyze_image` appears in tool list
- Test with a screenshot: pass base64 image + prompt "Convert this to HTML/CSS"

---

## Architecture Notes

The key architectural point: `analyze_image` uses `GeminiService.analyzeImages()` which goes through the Google Generative AI SDK (`@google/generative-ai`). This is the same path as `gemini_chat`. The `GeminiImageService` (which uses raw REST fetch) is only for the Imagen-style generation models. Do not route analysis through `GeminiImageService` — those models are image *generators*, not *analysers*.

`gemini-3.1-pro-preview` accepts up to 900 images per prompt via `inlineData` parts in the standard `generateContent` call. The response is always text.

---

## Files Modified

- `src/services/gemini/index.ts` — `selectDefaultModel` fix + `analyzeImages` method + fallback model update
- `src/index.ts` — register `analyze_image` tool, update tool counts
- `package.json` — version bump to 1.5.0
- `CHANGELOG.md` — release notes
