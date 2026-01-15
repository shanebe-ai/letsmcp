/**
 * AI Provider Types for LetsMCP
 */

export interface AIProvider {
    name: string;
    generateText(prompt: string): Promise<string>;
    extractJobDetails(text: string): Promise<JobDetails>;
    analyzeResume(jobDescription: string, resumeText: string): Promise<ResumeAnalysis>;
    draftEmail(context: EmailDraftContext): Promise<EmailDraft>;
    isConfigured(): boolean;
}

export interface JobDetails {
    title: string;
    company: string;
    location: string;
    description: string;
    salary?: string;
    requirements?: string[];
    source?: string;
}

export interface ResumeAnalysis {
    matchScore: number;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    keywords: {
        matched: string[];
        missing: string[];
    };
}

export interface EmailDraftContext {
    recipientName: string;
    recipientRole: string;
    companyName: string;
    jobTitle: string;
    tone: 'Formal' | 'Casual' | 'Enthusiastic' | 'Professional';
    intent: 'Connect' | 'FollowUp' | 'ReferralRequest' | 'PeerOutreach';
    jobDescription?: string;
    userBackground?: string;
}

export interface EmailDraft {
    subject: string;
    body: string;
    confidence: number;
}

export interface AIServiceConfig {
    groq?: {
        apiKey: string;
        model?: string;
    };
    claude?: {
        apiKey: string;
        model?: string;
    };
    gemini?: {
        apiKey: string;
        model?: string;
    };
    defaultProvider?: 'groq' | 'claude' | 'gemini';
}
