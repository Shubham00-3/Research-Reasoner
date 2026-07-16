import OpenAI from 'openai';

// Default Groq model (updated to avoid decommissioned models)
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";

// Function to get the model to use
function getGroqModel(): string {
  const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  
  // Check for known decommissioned models
  const decommissionedModels = ['llama3-8b-8192', 'llama-3-8b-8192'];
  if (decommissionedModels.includes(model)) {
    console.warn(`⚠️  WARNING: Model "${model}" has been decommissioned. Using default model "${DEFAULT_GROQ_MODEL}" instead.`);
    console.warn(`   Please update your GROQ_MODEL environment variable to a supported model.`);
    return DEFAULT_GROQ_MODEL;
  }
  
  return model;
}

// Function to get Groq client (lazy initialization)
function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is missing');
  }
  
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1'
  });
}

// Helper function to extract JSON from AI response
function extractJSON(content: string): any {
  try {
    // First try direct parsing
    return JSON.parse(content);
  } catch (error) {
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found in response');
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', content.substring(0, 100));
      throw new Error('Invalid JSON response from AI');
    }
  }
}

// Search and analyze papers using Groq AI
export async function searchPapersWithGroq(topic: string) {
  try {
    console.log(`🤖 Using Groq AI to analyze: ${topic}`);
    
    const groq = getGroqClient();
    
    const prompt = `You must respond with ONLY valid JSON, no other text.

    Analyze "${topic}" research and return this exact JSON structure:
    {
      "papersFound": 127,
      "authorsAnalyzed": 89,
      "connectionsDiscovered": 342,
      "summary": "detailed summary of ${topic} research landscape"
    }

    Return only the JSON object, nothing else.`;

    const model = getGroqModel();
    console.log(`📌 Using Groq model: ${model}`);
    
    const response = await groq.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3, // Lower temperature for more consistent JSON
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from Groq');

    const analysis = extractJSON(content);
    
    console.log(`✅ Groq analyzed ${topic}`);
    return analysis;
    
  } catch (error: any) {
    // Check for model decommission errors
    const errorMessage = error?.message || error?.response?.data?.message || '';
    const statusCode = error?.status || error?.response?.status || error?.statusCode;
    
    if (errorMessage.toLowerCase().includes('decommissioned') || 
        errorMessage.toLowerCase().includes('no longer supported') ||
        (statusCode === 400 && errorMessage.toLowerCase().includes('model'))) {
      const currentModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
      console.error(`❌ Groq API error: Model "${currentModel}" may be decommissioned or invalid.`);
      console.error(`   Error details: ${errorMessage}`);
      console.error(`   Please update GROQ_MODEL environment variable to a supported model.`);
      console.error(`   Recommended models: llama-3.1-8b-instant, llama-3.1-70b-versatile, llama-3.3-70b-versatile`);
      throw new Error(`Groq model error: Model may be decommissioned. Please update GROQ_MODEL environment variable.`);
    }
    console.error('❌ Groq API error:', error);
    throw error;
  }
}

export async function generateInsightsWithGroq(prompt: string) {
  try {
    console.log(`🧠 Groq generating insights...`);
    
    const groq = getGroqClient();
    
    const enhancedPrompt = `You must respond with ONLY valid JSON, no other text or explanations.

    ${prompt}

    Return only the JSON object with the exact structure requested, nothing else.`;

    const model = getGroqModel();
    
    const response = await groq.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: enhancedPrompt }],
      temperature: 0.3, // Lower temperature for more consistent JSON
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No insights from Groq');

    const insights = extractJSON(content);
    console.log('✅ Groq insights generated successfully');
    return insights;
    
  } catch (error: any) {
    // Check for model decommission errors
    const errorMessage = error?.message || error?.response?.data?.message || '';
    const statusCode = error?.status || error?.response?.status || error?.statusCode;
    
    if (errorMessage.toLowerCase().includes('decommissioned') || 
        errorMessage.toLowerCase().includes('no longer supported') ||
        (statusCode === 400 && errorMessage.toLowerCase().includes('model'))) {
      const currentModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
      console.error(`❌ Groq API error: Model "${currentModel}" may be decommissioned or invalid.`);
      console.error(`   Error details: ${errorMessage}`);
      console.error(`   Please update GROQ_MODEL environment variable to a supported model.`);
      throw new Error(`Groq model error: Model may be decommissioned. Please update GROQ_MODEL environment variable.`);
    }
    console.error('❌ Groq insights error:', error);
    throw error;
  }
}

class GroqService {
  async generateCompletion(prompt: string, options: { maxTokens: number; temperature: number }): Promise<string> {
    try {
      const groq = getGroqClient();
      const model = getGroqModel();
      
      const response = await groq.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: options.temperature,
        max_tokens: options.maxTokens
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from Groq');
      
      return content;
    } catch (error: any) {
      // Check for model decommission errors
      const errorMessage = error?.message || error?.response?.data?.message || '';
      const statusCode = error?.status || error?.response?.status || error?.statusCode;
      
      if (errorMessage.toLowerCase().includes('decommissioned') || 
          errorMessage.toLowerCase().includes('no longer supported') ||
          (statusCode === 400 && errorMessage.toLowerCase().includes('model'))) {
        const currentModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
        console.error(`❌ Groq API error: Model "${currentModel}" may be decommissioned or invalid.`);
        console.error(`   Error details: ${errorMessage}`);
        console.error(`   Please update GROQ_MODEL environment variable to a supported model.`);
        throw new Error(`Groq model error: Model may be decommissioned. Please update GROQ_MODEL environment variable.`);
      }
      console.error('❌ Groq completion error:', error);
      throw error;
    }
    
  }
  async generateResponse(prompt: string): Promise<string> {
    try {
      const groq = getGroqClient();
      const model = getGroqModel();
      
      const response = await groq.chat.completions.create({
        model: model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from Groq');
      
      return content;
    } catch (error: any) {
      // Check for model decommission errors
      const errorMessage = error?.message || error?.response?.data?.message || '';
      const statusCode = error?.status || error?.response?.status || error?.statusCode;
      
      if (errorMessage.toLowerCase().includes('decommissioned') || 
          errorMessage.toLowerCase().includes('no longer supported') ||
          (statusCode === 400 && errorMessage.toLowerCase().includes('model'))) {
        const currentModel = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
        console.error(`❌ Groq API error: Model "${currentModel}" may be decommissioned or invalid.`);
        console.error(`   Error details: ${errorMessage}`);
        console.error(`   Please update GROQ_MODEL environment variable to a supported model.`);
        throw new Error(`Groq model error: Model may be decommissioned. Please update GROQ_MODEL environment variable.`);
      }
      console.error('❌ Groq response error:', error);
      throw error;
    }
  }
}



export const groqService = new GroqService();