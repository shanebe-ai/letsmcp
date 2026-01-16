/**
 * Groq AI Provider
 * Fast inference with Llama models
 */

import type { AIProvider, JobDetails, ResumeAnalysis, EmailDraftContext, EmailDraft } from '../types.js';
import { PROMPTS, parseAIJson } from '../prompts.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqProvider implements AIProvider {
    name = 'groq';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'llama-3.1-70b-versatile') {
        this.apiKey = apiKey;
        this.model = model;
    }

    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    private async callAPI(prompt: string): Promise<string> {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4096,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        return data.choices[0]?.message?.content || '';
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
            // Return basic structure if parsing fails
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
        } catch (e) {
            console.error('Groq JSON Parse Error:', e);
            console.error('Raw Response:', response);
            return {
                subject: `Reaching out about ${context.jobTitle}`,
                body: 'Unable to generate email draft.',
                confidence: 0
            };
        }
    }
}
