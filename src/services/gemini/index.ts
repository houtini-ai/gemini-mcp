import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from '@google/generative-ai';
import { BaseService } from '../base-service.js';
import { GeminiConfig } from '../../config/types.js';
import { 
  ChatRequest,
  ImageAnalysisRequest,
  ChatResponse, 
  ListModelsResponse, 
  ModelInfo,
  GeminiGenerationConfig 
} from './types.js';
import { GeminiError } from '../../utils/error-handler.js';
import { GeminiVideoService, GenerateVideoOptions, GeneratedVideoResult } from './video-service.js';

// Gemini 3+ models require temperature 1.0.
// Google's docs warn lower values cause looping or degraded reasoning.
// Gemini 3 also supports thinkingConfig.thinkingLevel.
const GEMINI3_MODEL_PREFIXES = [
  'gemini-3-pro',
  'gemini-3-flash',
  'gemini-3-pro-image',
  'gemini-3.1-pro',
];

function isGemini3(modelName: string): boolean {
  return GEMINI3_MODEL_PREFIXES.some(prefix => modelName.startsWith(prefix));
}

export class GeminiService extends BaseService {
  private genAI: GoogleGenerativeAI;
  private config: GeminiConfig;
  private availableModels: ModelInfo[] = [];
  private defaultModel: string;
  private modelsInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private videoService: GeminiVideoService;

  constructor(config: GeminiConfig, outputDir?: string) {
    super();
    this.config = config;
    
    if (!config.apiKey) {
      throw new GeminiError('Missing API key for Gemini service');
    }
    
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.defaultModel = config.defaultModel;
    this.availableModels = this.getFallbackModels();
    this.videoService = new GeminiVideoService(config, outputDir);
    
    this.logInfo('Gemini service initialized');
  }

  private async ensureModelsInitialized(): Promise<void> {
    if (this.modelsInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeModels();
    await this.initializationPromise;
    this.modelsInitialized = true;
  }

  private async initializeModels(): Promise<void> {
    try {
      const models = await this.fetchModelsFromAPI();
      this.availableModels = models;
      
      const selectedDefault = this.selectDefaultModel(models);
      if (selectedDefault) {
        this.defaultModel = selectedDefault;
      }
      
      this.logInfo('Models discovered from API', {
        count: models.length,
        defaultModel: this.defaultModel,
        modelNames: models.map(m => m.name).slice(0, 5).join(', ') + (models.length > 5 ? '...' : '')
      });
    } catch (error) {
      this.logInfo('Using fallback model list (API discovery failed)', {
        error: (error as Error).message
      });
    }
  }

  private async fetchModelsFromAPI(): Promise<ModelInfo[]> {
    try {
      const apiKey = this.config.apiKey;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }
      
      const data: any = await response.json();
      const models: ModelInfo[] = [];
      
      for (const model of data.models || []) {
        const supportedMethods = model.supportedGenerationMethods || [];
        
        if (supportedMethods.includes('generateContent')) {
          const cleanName = model.name.replace('models/', '');
          
          models.push({
            name: cleanName,
            displayName: model.displayName || cleanName,
            description: model.description || `${cleanName} model`,
            contextWindow: model.inputTokenLimit || 32_000
          });
        }
      }
      
      return models;
    } catch (error) {
      throw new GeminiError(`Failed to fetch models: ${(error as Error).message}`);
    }
  }

  private selectDefaultModel(models: ModelInfo[]): string | null {
    if (models.length === 0) {
      return null;
    }

    // Configured default wins unconditionally - no experimental filter applied
    if (this.config.defaultModel) {
      const configured = models.find(m => m.name === this.config.defaultModel);
      if (configured) {
        return configured.name;
      }
      // Not in discovered list but configured explicitly - trust the config
      return this.config.defaultModel;
    }

    // Only Gemini 3+ models supported
    let geminiModels = models.filter(m => {
      const name = m.name.toLowerCase();
      if (!name.includes('gemini')) return false;
      const version = this.extractVersion(m.name);
      return version >= 3;
    });

    if (geminiModels.length === 0) {
      return models[0].name;
    }

    // Filter out experimental/preview models for auto-discovery fallback only
    if (!this.config.allowExperimentalModels) {
      const stableModels = geminiModels.filter(m => {
        const name = m.name.toLowerCase();
        return !name.includes('-exp') && 
               !name.includes('-preview') && 
               !name.includes('experimental') &&
               !name.includes('-thinking-');
      });
      
      if (stableModels.length > 0) {
        geminiModels = stableModels;
      }
    }

    const sorted = geminiModels.sort((a, b) => {
      const versionA = this.extractVersion(a.name);
      const versionB = this.extractVersion(b.name);
      
      if (versionB !== versionA) {
        return versionB - versionA;
      }
      
      // Prefer "flash" models for speed
      const aIsFlash = a.name.toLowerCase().includes('flash');
      const bIsFlash = b.name.toLowerCase().includes('flash');
      
      if (aIsFlash && !bIsFlash) return -1;
      if (bIsFlash && !aIsFlash) return 1;
      
      return 0;
    });

    return sorted[0].name;
  }

  private extractVersion(modelName: string): number {
    // Match major.minor (e.g. 3.1) or major only (e.g. 3)
    const match = modelName.match(/gemini-(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private getFallbackModels(): ModelInfo[] {
    return [
      // Gemini 3.1 family (newest)
      {
        name: 'gemini-3.1-pro-preview',
        displayName: 'Gemini 3.1 Pro Preview',
        description: 'Gemini 3.1 Pro — adaptive thinking, 1M context, agentic workflows (Feb 2026)',
        contextWindow: 1_000_000
      },
      {
        name: 'gemini-3.1-pro-preview-customtools',
        displayName: 'Gemini 3.1 Pro Preview (Custom Tools)',
        description: 'Gemini 3.1 Pro optimised for custom tool usage',
        contextWindow: 1_000_000
      },
      // Gemini 3 family
      {
        name: 'gemini-3-pro-preview',
        displayName: 'Gemini 3 Pro Preview',
        description: 'Gemini 3 Pro — advanced reasoning, 1M context',
        contextWindow: 1_000_000
      },
      {
        name: 'gemini-3-flash-preview',
        displayName: 'Gemini 3 Flash Preview',
        description: 'Gemini 3 Flash — frontier multimodal at Flash speed',
        contextWindow: 1_000_000
      },
    ];
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  private addInlineCitations(text: string, groundingMetadata: any): string {
    // Use correct field names (typos were fixed in recent SDK versions)
    const supports = groundingMetadata.groundingSupports || [];
    const chunks = groundingMetadata.groundingChunks || [];
    
    // Add comprehensive debug logging
    this.logInfo('Grounding metadata debug', {
      allKeys: Object.keys(groundingMetadata),
      hasSupports: !!supports,
      supportsLength: supports.length,
      hasChunks: !!chunks,  
      chunksLength: chunks.length,
      webSearchQueries: groundingMetadata.webSearchQueries?.length || 0,
      supportsSample: supports.length > 0 ? supports[0] : null,
      chunksSample: chunks.length > 0 ? chunks[0] : null,
      fullMetadata: groundingMetadata
    });
    
    // Try to extract sources even if supports/chunks are empty or missing
    // Maybe webSearchQueries alone can provide some value
    if (groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
      const searchInfo = `\n\nSearch queries used: ${groundingMetadata.webSearchQueries.join(', ')}`;
      
      if (!supports.length && !chunks.length) {
        return text + searchInfo;
      }
    }
    
    if (!supports.length || !chunks.length) {
      this.logInfo('No supports or chunks found - skipping citations');
      return text;
    }

    let processedText = text;
    const citationLinks: string[] = [];
    const usedChunkIndices = new Set<number>();

    for (const support of supports) {
      // Use correct field name (typo was fixed in recent SDK versions)
      const indices = support.groundingChunkIndices || [];
      if (indices.length) {
        for (const chunkIndex of indices) {
          if (chunkIndex < chunks.length && !usedChunkIndices.has(chunkIndex)) {
            const chunk = chunks[chunkIndex];
            const uri = chunk.web?.uri;
            if (uri) {
              citationLinks.push(uri);
              usedChunkIndices.add(chunkIndex);
            }
          }
        }
      }
    }

    if (citationLinks.length > 0) {
      processedText += '\n\nSources: ' + citationLinks.map(url => `(${url})`).join(' ');
    }

    // Add search queries if available
    if (groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0) {
      processedText += `\n\nSearch queries used: ${groundingMetadata.webSearchQueries.join(', ')}`;
    }

    return processedText;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      await this.ensureModelsInitialized();
      
      const shouldUseGrounding = request.grounding ?? this.config.defaultGrounding;
      const modelName = request.model || this.defaultModel;
      const gemini3 = isGemini3(modelName);

      this.logInfo(`Chat request to ${modelName}`, {
        messageLength: request.message.length,
        hasSystemPrompt: !!request.systemPrompt,
        grounding: shouldUseGrounding,
        gemini3,
        thinkingLevel: request.thinkingLevel,
      });

      // Gemini 3 docs: keep temperature at default 1.0.
      // Values below 1.0 can cause looping or degraded reasoning.
      const temperature = gemini3 ? 1.0 : (request.temperature ?? this.config.temperature);

      const generationConfig: GeminiGenerationConfig & { thinkingConfig?: { thinkingLevel: string } } = {
        temperature,
        maxOutputTokens: request.maxTokens ?? this.config.maxTokens,
      };

      if (gemini3 && request.thinkingLevel) {
        generationConfig.thinkingConfig = { thinkingLevel: request.thinkingLevel };
      }

      const modelConfig: any = {
        model: modelName,
        safetySettings: this.mapSafetySettings(),
        generationConfig,
      };

      if (shouldUseGrounding) {
        modelConfig.tools = [{ googleSearch: {} }];
      }

      const model = this.genAI.getGenerativeModel(modelConfig);

      const prompt = request.systemPrompt
        ? `${request.systemPrompt}\n\nUser: ${request.message}\n\nAssistant:`
        : request.message;

      const result = await model.generateContent(prompt);
      const response = result.response;

      if (result.response.promptFeedback?.blockReason) {
        throw new GeminiError(
          `Response was blocked by safety filters. Reason: ${result.response.promptFeedback.blockReason}. ` +
          'Try rephrasing your query or using different parameters.'
        );
      }

      let responseText: string;

      try {
        responseText = response.text();
      } catch {
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason) {
          const finishReasonMap: Record<string, string> = {
            '1': 'STOP - Natural ending',
            '2': 'SAFETY - Content was filtered',
            '3': 'MAX_TOKENS - Hit token limit',
            '4': 'UNSPECIFIED',
            '5': 'OTHER',
          };
          const reason = finishReasonMap[candidate.finishReason.toString()] ||
            `Unknown reason: ${candidate.finishReason}`;
          throw new GeminiError(
            `Response was filtered. Finish reason: ${reason}\n\n` +
            'Try:\n1. Rephrasing your query\n2. Using a different model\n3. Adjusting temperature settings'
          );
        }
        throw new GeminiError('No text content in response. The model may have filtered the content.');
      }

      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const usageMetadata = response.usageMetadata;

      if (groundingMetadata) {
        this.logInfo('Raw grounding metadata structure', {
          keys: Object.keys(groundingMetadata),
          webSearchQueries: groundingMetadata.webSearchQueries,
          searchQueriesLength: groundingMetadata.webSearchQueries?.length || 0,
        });
      }

      if (usageMetadata) {
        this.logInfo('Token usage', {
          promptTokens: usageMetadata.promptTokenCount,
          candidatesTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
        });
      }

      let processedContent = responseText;
      if (groundingMetadata) {
        processedContent = this.addInlineCitations(responseText, groundingMetadata);
      }

      const chatResponse: ChatResponse = {
        content: processedContent,
        model: modelName,
        timestamp: new Date().toISOString(),
        finishReason: response.candidates?.[0]?.finishReason?.toString(),
        groundingMetadata,
        usageMetadata,
      };

      this.logInfo('Chat response generated successfully', {
        model: modelName,
        responseLength: responseText.length,
        finishReason: chatResponse.finishReason,
        hasGroundingMetadata: !!groundingMetadata,
        searchQueries: groundingMetadata?.webSearchQueries?.length || 0,
      });

      return chatResponse;

    } catch (error) {
      if (error instanceof GeminiError) {
        throw error;
      }
      this.logError('Chat generation failed', error as Error);
      throw new GeminiError(`Error generating response: ${(error as Error).message}`);
    }
  }

  async listModels(): Promise<ListModelsResponse> {
    try {
      await this.ensureModelsInitialized();
      
      this.logInfo('Listing available models');
      
      return {
        models: this.availableModels,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return await this.handleError(error as Error, 'listModels');
    }
  }

  async validateConfig(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        this.logError('API key validation failed: missing key');
        return false;
      }

      // Test API access by listing models (much faster than generateContent)
      const apiKey = this.config.apiKey;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (!response.ok) {
        this.logError('API key validation failed: invalid response', new Error(`Status: ${response.status}`));
        return false;
      }
      
      this.logInfo('Gemini API key validation successful');
      return true;
      
    } catch (error) {
      this.logError('Configuration validation failed', error as Error);
      return false;
    }
  }

  private mapSafetySettings() {
    const harmBlockThresholdMap: Record<string, HarmBlockThreshold> = {
      'BLOCK_NONE': HarmBlockThreshold.BLOCK_NONE,
      'BLOCK_LOW_AND_ABOVE': HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
      'BLOCK_MEDIUM_AND_ABOVE': HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      'BLOCK_ONLY_HIGH': HarmBlockThreshold.BLOCK_ONLY_HIGH
    };

    const harmCategoryMap: Record<string, HarmCategory> = {
      'HARM_CATEGORY_HARASSMENT': HarmCategory.HARM_CATEGORY_HARASSMENT,
      'HARM_CATEGORY_HATE_SPEECH': HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      'HARM_CATEGORY_SEXUALLY_EXPLICIT': HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      'HARM_CATEGORY_DANGEROUS_CONTENT': HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT
    };

    return this.config.safetySettings.map(setting => ({
      category: harmCategoryMap[setting.category],
      threshold: harmBlockThresholdMap[setting.threshold]
    }));
  }

  async analyzeImages(request: ImageAnalysisRequest): Promise<string> {
    try {
      await this.ensureModelsInitialized();

      const modelName = request.model || this.config.defaultImageAnalysisModel;
      const prompt = request.prompt || 'Describe this image in detail.';

      this.logInfo(`analyzeImages request to ${modelName}`, {
        imageCount: request.images.length,
        promptLength: prompt.length,
        globalMediaResolution: request.globalMediaResolution
      });

      const generationConfig: any = {
        temperature: request.temperature ?? this.config.temperature,
        maxOutputTokens: request.maxTokens ?? 16384,
        ...(request.globalMediaResolution && {
          mediaResolution: request.globalMediaResolution
        })
      };

      const model = this.genAI.getGenerativeModel({
        model: modelName,
        safetySettings: this.mapSafetySettings(),
        generationConfig
      });

      const parts: Part[] = request.images.map(img => {
        const part: any = {
          inlineData: {
            data: img.data,
            mimeType: img.mimeType
          }
        };
        
        // Add per-image media resolution if specified
        if (img.mediaResolution) {
          part.mediaResolution = img.mediaResolution;
        }
        
        return part;
      });

      parts.push({ text: prompt });

      const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
      const response = result.response;

      if (response.promptFeedback?.blockReason) {
        throw new GeminiError(`Response blocked: ${response.promptFeedback.blockReason}`);
      }

      const text = response.text();

      this.logInfo('analyzeImages completed', {
        model: modelName,
        responseLength: text.length
      });

      return text;

    } catch (error) {
      if (error instanceof GeminiError) {
        throw error;
      }
      this.logError('analyzeImages failed', error as Error);
      throw new GeminiError(`Error analyzing images: ${(error as Error).message}`);
    }
  }

  getAvailableModels(): string[] {
    return this.availableModels.map(model => model.name);
  }

  getModelContextWindow(modelName: string): number {
    const model = this.availableModels.find(m => m.name === modelName);
    return model?.contextWindow || 32_000;
  }

  async generateVideo(options: GenerateVideoOptions): Promise<GeneratedVideoResult> {
    return this.videoService.generateVideo(options);
  }

  getVideoService(): GeminiVideoService {
    return this.videoService;
  }
}
