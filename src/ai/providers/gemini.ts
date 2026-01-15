/**
 * Google Gemini AI Provider
 */

import type { AIProvider, JobDetails, ResumeAnalysis, EmailDraftContext, EmailDraft } from '../types.js';
import { PROMPTS, parseAIJson } from '../prompts.js';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiProvider implements AIProvider {
    name = 'gemini';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gemini-1.5-flash') {
        this.apiKey = apiKey;
        this.model = model;
    }

    isConfigured(): boolean {
        return !!this.apiKey && this.apiKey.length > 0;
    }

    private async callAPI(prompt: string): Promise<string> {
        const url = `${GEMINI_API_URL}/${this.model}:generateContent?key=${this.apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 4096,
                }
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${response.status} - ${error}`);
        }

        const data = await response.json() as {
            candidates: Array<{
                content: {
                    parts: Array<{ text: string }>
                }
            }>
        };

        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
