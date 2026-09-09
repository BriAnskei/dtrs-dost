import { GoogleGenerativeAI, ModelParams } from '@google/generative-ai';

let aiInstance: GoogleGenerativeAI | null = null;

function getAi(): GoogleGenerativeAI {
  if (!aiInstance) {
    const apiKey = process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_KEY is not configured');
    }
    aiInstance = new GoogleGenerativeAI(apiKey);
  }
  return aiInstance;
}

export function getGenerativeModel(
  config?: Partial<Omit<ModelParams, 'model'>>,
) {
  return getAi().getGenerativeModel({
    model: 'gemini-2.5-flash',
    ...config,
  });
}
