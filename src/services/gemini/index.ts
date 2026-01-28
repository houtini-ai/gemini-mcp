import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { BaseService } from '../base-service.js';
import { GeminiConfig } from '../../config/types.js';
import { 
  ChatRequest, 
  ChatResponse, 
  ListModelsResponse, 
  ModelInfo,
  GeminiGenerationConfig 
} from './types.js';
import { GeminiError } from '../../utils/error-handler.js';

export class GeminiService extends BaseService {
  private genAI: GoogleGenerativeAI;
  private config: GeminiConfig;
  private availableModels: ModelInfo[] = [];
  private defaultModel: string;
  private modelsInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(config: GeminiConfig) {
    super();
    this.config = config;
    
    if (!config.apiKey) {
      throw new GeminiError('Missing API key for Gemini service');
    }
    
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.defaultModel = config.defaultModel;
    this.availableModels = this.getFallbackModels();
    
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

    let geminiModels = models.filter(m => 
      m.name.toLowerCase().includes('gemini')
    );

    if (geminiModels.length === 0) {
      return models[0].name;
    }

    // Filter out experimental/preview models unless explicitly allowed
    if (!this.config.allowExperimentalModels) {
      const stableModels = geminiModels.filter(m => {
        const name = m.name.toLowerCase();
        return !name.includes('-exp') && 
               !name.includes('-preview') && 
               !name.includes('experimental') &&
               !name.includes('-thinking-');
      });
      
      // Use stable models if available, otherwise fall back to all models
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
    const match = modelName.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private getFallbackModels(): ModelInfo[] {
    return [
      {
        name: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        description: 'Latest Gemini 2.5 Flash - Fast, versatile performance',
        contextWindow: 1_000_000
      },
      {
        name: 'gemini-2.0-flash',
        displayName: 'Gemini 2.0 Flash', 
        description: 'Gemini 2.0 Flash - Fast, efficient model',
        contextWindow: 1_000_000
      },
      {
        name: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        description: 'Gemini 1.5 Flash - Fast, efficient model',
        contextWindow: 1_000_000
      },
      {
        name: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        description: 'Gemini 1.5 Pro - Advanced reasoning',
        contextWindow: 2_000_000
      },
      {
        name: 'gemini-pro',
        displayName: 'Gemini Pro',
        description: 'Gemini Pro - Balanced performance',
        contextWindow: 32_000
      },
      {
        name: 'gemini-pro-vision',
        displayName: 'Gemini Pro Vision',
        description: 'Gemini Pro Vision - Multimodal understanding',
        contextWindow: 16_000
      }
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
      
      // Determine if grounding should be used
      const shouldUseGrounding = request.grounding ?? this.config.defaultGrounding;
      const modelName = request.model || this.defaultModel;

      this.logInfo(`Chat request to ${modelName}`, {
        messageLength: request.message.length,
        hasSystemPrompt: !!request.systemPrompt,
        grounding: shouldUseGrounding
      });
      
      // Configure generation parameters
      const generationConfig: GeminiGenerationConfig = {
        temperature: request.temperature ?? this.config.temperature,
        maxOutputTokens: request.maxTokens ?? this.config.maxTokens
      };

      // Initialize model with safety settings and optional grounding
      const modelConfig: any = {
        model: modelName,
        safetySettings: this.mapSafetySettings(),
        generationConfig
      };

      // Add grounding tool if enabled
      if (shouldUseGrounding) {
        modelConfig.tools = [{ googleSearch: {} }];
      }

      const model = this.genAI.getGenerativeModel(modelConfig);

      // Prepare prompt
      const prompt = request.systemPrompt 
        ? `${request.systemPrompt}\n\nUser: ${request.message}\n\nAssistant:`
        : request.message;

      // Generate response
      const result = await model.generateContent(prompt);
      const response = result.response;

      // Check if response was blocked
      if (result.response.promptFeedback?.blockReason) {
        const blockReason = result.response.promptFeedback.blockReason;
        throw new GeminiError(
          `Response was blocked by safety filters. Reason: ${blockReason}. ` +
          'Try rephrasing your query or using different parameters.'
        );
      }

      // Extract response text
      let responseText: string;
      
      try {
        responseText = response.text();
      } catch {
        // Handle cases where content was filtered
        const candidate = response.candidates?.[0];
        if (candidate?.finishReason) {
          const finishReasonMap: Record<string, string> = {
            '1': 'STOP - Natural ending',
            '2': 'SAFETY - Content was filtered',
            '3': 'MAX_TOKENS - Hit token limit',
            '4': 'UNSPECIFIED',
            '5': 'OTHER'
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

      // Extract grounding metadata if available
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;

      // Capture usage metadata from response
      const usageMetadata = response.usageMetadata;

      // Debug log the grounding metadata structure
      if (groundingMetadata) {
        this.logInfo('Raw grounding metadata structure', {
          keys: Object.keys(groundingMetadata),
          webSearchQueries: groundingMetadata.webSearchQueries,
          hasSearchQueries: !!groundingMetadata.webSearchQueries,
          searchQueriesLength: groundingMetadata.webSearchQueries?.length || 0
        });
      }

      // Log usage metadata
      if (usageMetadata) {
        this.logInfo('Token usage', {
          promptTokens: usageMetadata.promptTokenCount,
          candidatesTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount
        });
      }

      // Process inline citations if grounding metadata exists
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
        usageMetadata
      };

      this.logInfo('Chat response generated successfully', {
        model: modelName,
        responseLength: responseText.length,
        finishReason: chatResponse.finishReason,
        hasGroundingMetadata: !!groundingMetadata,
        searchQueries: groundingMetadata?.webSearchQueries?.length || 0
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

  getAvailableModels(): string[] {
    return this.availableModels.map(model => model.name);
  }

  getModelContextWindow(modelName: string): number {
    const model = this.availableModels.find(m => m.name === modelName);
    return model?.contextWindow || 32_000;
  }
}
