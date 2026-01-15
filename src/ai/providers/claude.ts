/**
 * Claude AI Provider (Anthropic)
 */

import type { AIProvider, JobDetails, ResumeAnalysis, EmailDraftContext, EmailDraft } from '../types.js';
import { PROMPTS, parseAIJson } from '../prompts.js';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export class ClaudeProvider implements AIProvider {
    name = 'claude';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
        this.apiKey = apiKey;
        this.model = model;
    }

    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    private async callAPI(prompt: string): Promise<string> {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: 4096,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Claude API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as { content: Array<{ type: string; text: string }> };
        const textContent = data.content.find(c => c.type === 'text');
        return textContent?.text || '';
    }

    async generateText(prompt: string): Promise<string> {
        return this.callAPI(prompt);
    }

    async extractJobDetails(text: string): Promise<JobDetails> {
        const prompt = PROMPTS.extractJobDetails(text);
        const response = await this.callAPI(prompt);

        try {
            return parseAIJson<JobDetails>(response);
        } catch {
            return {
                title: '',
                company: '',
                location: '',
                description: text.slice(0, 500),
            };
        }
    }

    async analyzeResume(jobDescription: string, resumeText: string): Promise<ResumeAnalysis> {
        const prompt = PROMPTS.analyzeResume(jobDescription, resumeText);
        const response = await this.callAPI(prompt);

        try {
            return parseAIJson<ResumeAnalysis>(response);
        } catch {
            return {
                matchScore: 50,
                strengths: [],
                gaps: [],
                recommendations: ['Unable to complete AI analysis'],
                keywords: { matched: [], missing: [] }
            };
        }
    }

    async draftEmail(context: EmailDraftContext): Promise<EmailDraft> {
        const prompt = PROMPTS.draftEmail(context);
        const response = await this.callAPI(prompt);

        try {
            return parseAIJson<EmailDraft>(response);
        } catch {
            return {
                subject: `Reaching out about ${context.jobTitle}`,
                body: 'Unable to generate email draft.',
                confidence: 0
            };
        }
    }
}
