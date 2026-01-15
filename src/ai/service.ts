/**
 * Unified AI Service
 * Manages multiple AI providers with automatic fallback
 */

import type { AIProvider, AIServiceConfig, JobDetails, ResumeAnalysis, EmailDraftContext, EmailDraft } from './types.js';
import { GroqProvider, ClaudeProvider, GeminiProvider } from './providers/index.js';

export class AIService {
    private providers: Map<string, AIProvider> = new Map();
    private defaultProvider: string = 'groq';
    private providerOrder: string[] = ['groq', 'claude', 'gemini'];

    constructor(config: AIServiceConfig) {
        // Initialize providers based on config
        if (config.groq?.apiKey) {
            this.providers.set('groq', new GroqProvider(config.groq.apiKey, config.groq.model));
        }
        if (config.claude?.apiKey) {
            this.providers.set('claude', new ClaudeProvider(config.claude.apiKey, config.claude.model));
        }
        if (config.gemini?.apiKey) {
            this.providers.set('gemini', new GeminiProvider(config.gemini.apiKey, config.gemini.model));
        }

        if (config.defaultProvider) {
            this.defaultProvider = config.defaultProvider;
        }
    }

    /**
     * Update provider configuration at runtime
     */
    updateConfig(config: Partial<AIServiceConfig>) {
        if (config.groq?.apiKey) {
            this.providers.set('groq', new GroqProvider(config.groq.apiKey, config.groq.model));
        }
        if (config.claude?.apiKey) {
            this.providers.set('claude', new ClaudeProvider(config.claude.apiKey, config.claude.model));
        }
        if (config.gemini?.apiKey) {
            this.providers.set('gemini', new GeminiProvider(config.gemini.apiKey, config.gemini.model));
        }
        if (config.defaultProvider) {
            this.defaultProvider = config.defaultProvider;
        }
    }

    /**
     * Get list of configured providers
     */
    getConfiguredProviders(): string[] {
        return Array.from(this.providers.keys());
    }

    /**
     * Check if any provider is configured
     */
    hasProvider(): boolean {
        return this.providers.size > 0;
    }

    /**
     * Get a specific provider
     */
    getProvider(name?: string): AIProvider | undefined {
        if (name) {
            return this.providers.get(name);
        }
        return this.providers.get(this.defaultProvider) || this.providers.values().next().value;
    }

    /**
     * Execute with fallback - tries providers in order until one succeeds
     */
    private async executeWithFallback<T>(
        operation: (provider: AIProvider) => Promise<T>,
        preferredProvider?: string
    ): Promise<{ result: T; provider: string }> {
        const errors: string[] = [];

        // Build provider order: preferred first, then default, then others
        const order = [...new Set([
            preferredProvider,
            this.defaultProvider,
            ...this.providerOrder
        ].filter(Boolean) as string[])];

        for (const providerName of order) {
            const provider = this.providers.get(providerName);
            if (!provider || !provider.isConfigured()) continue;

            try {
                const result = await operation(provider);
                return { result, provider: providerName };
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                errors.push(`${providerName}: ${msg}`);
                console.error(`Provider ${providerName} failed:`, msg);
            }
        }

        throw new Error(`All providers failed:\n${errors.join('\n')}`);
    }

    /**
     * Generate text using AI
     */
    async generateText(prompt: string, preferredProvider?: string): Promise<{ text: string; provider: string }> {
        const { result, provider } = await this.executeWithFallback(
            (p) => p.generateText(prompt),
            preferredProvider
        );
        return { text: result, provider };
    }

    /**
     * Extract job details from text
     */
    async extractJobDetails(text: string, preferredProvider?: string): Promise<{ data: JobDetails; provider: string }> {
        const { result, provider } = await this.executeWithFallback(
            (p) => p.extractJobDetails(text),
            preferredProvider
        );
        return { data: result, provider };
    }

    /**
     * Analyze resume against job description
     */
    async analyzeResume(
        jobDescription: string,
        resumeText: string,
        preferredProvider?: string
    ): Promise<{ data: ResumeAnalysis; provider: string }> {
        const { result, provider } = await this.executeWithFallback(
            (p) => p.analyzeResume(jobDescription, resumeText),
            preferredProvider
        );
        return { data: result, provider };
    }

    /**
     * Draft outreach email
     */
    async draftEmail(
        context: EmailDraftContext,
        preferredProvider?: string
    ): Promise<{ data: EmailDraft; provider: string }> {
        const { result, provider } = await this.executeWithFallback(
            (p) => p.draftEmail(context),
            preferredProvider
        );
        return { data: result, provider };
    }
}

// Singleton instance - configured via environment or API
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
    if (!aiServiceInstance) {
        aiServiceInstance = new AIService({
            groq: {
                apiKey: process.env.GROQ_API_KEY || '',
                model: process.env.GROQ_MODEL,
            },
            claude: {
                apiKey: process.env.CLAUDE_API_KEY || '',
                model: process.env.CLAUDE_MODEL,
            },
            gemini: {
                apiKey: process.env.GEMINI_API_KEY || '',
                model: process.env.GEMINI_MODEL,
            },
            defaultProvider: (process.env.DEFAULT_AI_PROVIDER as 'groq' | 'claude' | 'gemini') || 'groq',
        });
    }
    return aiServiceInstance;
}

export function configureAIService(config: AIServiceConfig): AIService {
    aiServiceInstance = new AIService(config);
    return aiServiceInstance;
}
