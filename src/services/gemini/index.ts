import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { BaseService } from '../base-service';
import { GeminiConfig } from '../../config/types';
import { 
  ChatRequest, 
  ChatResponse, 
  ListModelsResponse, 
  ModelInfo,
  GeminiGenerationConfig 
} from './types';
import { GeminiError } from '../../utils/error-handler';

export class GeminiService extends BaseService {
  private genAI: GoogleGenerativeAI;
  private config: GeminiConfig;

  // Available models mapping
  private readonly availableModels: ModelInfo[] = [
    {
      name: 'gemini-2.5-flash',
      displayName: 'Gemini 2.5 Flash',
      description: 'Latest Gemini 2.5 Flash - Fast, versatile performance'
    },
    {
      name: 'gemini-2.0-flash',
      displayName: 'Gemini 2.0 Flash', 
      description: 'Gemini 2.0 Flash - Fast, efficient model'
    },
    {
      name: 'gemini-1.5-flash',
      displayName: 'Gemini 1.5 Flash',
      description: 'Gemini 1.5 Flash - Fast, efficient model'
    },
    {
      name: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      description: 'Gemini 1.5 Pro - Advanced reasoning'
    },
    {
      name: 'gemini-pro',
      displayName: 'Gemini Pro',
      description: 'Gemini Pro - Balanced performance'
    },
    {
      name: 'gemini-pro-vision',
      displayName: 'Gemini Pro Vision',
      description: 'Gemini Pro Vision - Multimodal understanding'
    }
  ];

  constructor(config: GeminiConfig) {
    super();
    this.config = config;
    
    if (!config.apiKey) {
      throw new GeminiError('Missing API key for Gemini service');
    }
    
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.logInfo('Gemini service initialized');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      this.logInfo(`Chat request to ${request.model || this.config.defaultModel}`, {
        messageLength: request.message.length,
        hasSystemPrompt: !!request.systemPrompt
      });

      const modelName = request.model || this.config.defaultModel;
      
      // Configure generation parameters
      const generationConfig: GeminiGenerationConfig = {
        temperature: request.temperature ?? this.config.temperature,
        maxOutputTokens: request.maxTokens ?? this.config.maxTokens
      };

      // Initialize model with safety settings
      const model = this.genAI.getGenerativeModel({
        model: modelName,
        safetySettings: this.mapSafetySettings(),
        generationConfig
      });

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
      } catch (error) {
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

      const chatResponse: ChatResponse = {
        content: responseText,
        model: modelName,
        timestamp: new Date().toISOString(),
        finishReason: response.candidates?.[0]?.finishReason?.toString()
      };

      this.logInfo('Chat response generated successfully', {
        model: modelName,
        responseLength: responseText.length,
        finishReason: chatResponse.finishReason
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

      // Test API access with a minimal request
      const model = this.genAI.getGenerativeModel({ 
        model: this.config.defaultModel,
        safetySettings: this.mapSafetySettings()
      });
      
      await model.generateContent('API validation check');
      
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
}
