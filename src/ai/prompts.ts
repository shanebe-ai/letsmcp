/**
 * Shared prompts for AI providers
 */

export const PROMPTS = {
    extractJobDetails: (text: string) => `Extract job details from the following text. Return a JSON object with these fields:
- title: job title
- company: company name
- location: job location
- description: job description (summarized if very long)
- salary: salary range if mentioned
- requirements: array of key requirements
- source: where this job was posted (LinkedIn, Indeed, etc.) if detectable

Text to analyze:
${text}

Return ONLY valid JSON, no markdown or explanation.`,

    analyzeResume: (jobDescription: string, resumeText: string) => `Analyze how well this resume matches the job description.

Job Description:
${jobDescription}

Resume:
${resumeText}

Provide analysis as JSON with:
- matchScore: number 0-100 representing match percentage
- strengths: array of strengths that align with the job
- gaps: array of gaps or missing qualifications
- recommendations: array of suggestions to improve the match
- keywords: object with "matched" (keywords found in both) and "missing" (keywords in job but not resume) arrays

Return ONLY valid JSON, no markdown or explanation.`,

    draftEmail: (context: {
        recipientName: string;
        recipientRole: string;
        companyName: string;
        jobTitle: string;
        tone: string;
        intent: string;
        jobDescription?: string;
        userBackground?: string;
    }) => {
        const toneGuide = {
            'Formal': 'Use formal, professional language. Be respectful and businesslike.',
            'Casual': 'Use friendly, conversational tone. Be approachable but professional.',
            'Enthusiastic': 'Show genuine excitement and energy. Be positive and engaging.',
            'Professional': 'Balance warmth with professionalism. Be clear and confident.'
        };

        const intentGuide = {
            'Connect': 'General networking - express interest in connecting and learning more about their work.',
            'FollowUp': 'Following up on a previous application or conversation. Be polite but persistent.',
            'ReferralRequest': 'Requesting a referral for a position. Be gracious and make it easy for them.',
            'PeerOutreach': 'Reaching out to a potential future peer. Focus on shared interests and culture fit.'
        };

        return `Draft a cold outreach email with the following context:

Recipient: ${context.recipientName}, ${context.recipientRole} at ${context.companyName}
Target Job: ${context.jobTitle}
Tone: ${context.tone} - ${toneGuide[context.tone as keyof typeof toneGuide] || toneGuide['Professional']}
Intent: ${context.intent} - ${intentGuide[context.intent as keyof typeof intentGuide] || intentGuide['Connect']}
${context.jobDescription ? `\nJob Description:\n${context.jobDescription}` : ''}
${context.userBackground ? `\nSender Background:\n${context.userBackground}` : ''}

Generate a concise, compelling email.
Format the 'body' with clear paragraph breaks.
IMPORTANT: Ensure newline characters are properly escaped for JSON (use \\n\\n). Do NOT use actual line breaks in the JSON string.
Return as JSON with:
- subject: email subject line
- body: email body text (using \n\n for new paragraphs)
- confidence: number 0-100 indicating how well this matches the request

Return ONLY valid JSON, no markdown or explanation.`;
    },

    generateText: (prompt: string) => prompt
};

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
export function parseAIJson<T>(response: string): T {
    // Remove markdown code blocks if present
    let cleaned = response.trim();
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
}
