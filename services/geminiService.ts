import { GoogleGenAI, Modality } from "@google/genai";
import { AnalysisResult, Message, Material, ChatSession, PersistentMemory } from "../types";

// Helper to get API key safely
const getApiKey = () => process.env.API_KEY || '';

// Initialize client
const ai = new GoogleGenAI({ apiKey: getApiKey() });

/**
 * Decode base64 audio string (Raw PCM 16-bit, 24kHz) to AudioBuffer
 */
export async function decodeAudioData(
  base64String: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Gemini TTS returns raw PCM: 16-bit integer, 24000Hz, 1 channel (Mono)
  // We need to decode this manually as browser decodeAudioData expects file headers (WAV/MP3)
  const pcm16 = new Int16Array(bytes.buffer);
  const numChannels = 1;
  const sampleRate = 24000;
  
  const frameCount = pcm16.length / numChannels;
  const audioBuffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 [-32768, 32767] to Float32 [-1.0, 1.0]
      channelData[i] = pcm16[i * numChannels + channel] / 32768.0;
    }
  }

  return audioBuffer;
}

/**
 * Generate TTS audio from text
 */
export async function generateSpeech(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
}

/**
 * Chat with Course Agent
 */
export async function chatWithCourseAgent(
  history: Message[], 
  newMessage: string, 
  systemInstruction: string
): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }], // Enable Google Search Grounding
      },
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }))
    });

    const response = await chat.sendMessage({ message: newMessage });
    let text = response.text || "I couldn't generate a response.";

    // Extract and append grounding sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const uniqueLinks = new Map<string, string>();
      
      // Collect unique web sources
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          uniqueLinks.set(chunk.web.uri, chunk.web.title);
        }
      });

      // Append sources to text in Markdown format
      if (uniqueLinks.size > 0) {
        text += "\n\n**Search Sources:**\n";
        uniqueLinks.forEach((title, uri) => {
          text += `- [${title}](${uri})\n`;
        });
      }
    }

    return text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
}

/**
 * Generate a short title for a chat session based on the first user message
 */
export async function generateChatTitle(userMessage: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: `Generate a very short, concise title (max 4-5 words) for a chat conversation that begins with this user message. Do not use quotes or prefixes. Message: "${userMessage}"` }] },
    });
    const title = response.text?.trim();
    return title ? title.replace(/^["']|["']$/g, '') : null;
  } catch (error) {
    console.error("Chat Title Generation Error:", error);
    return null;
  }
}

/**
 * Generate a high-level course synthesis/syllabus from all materials
 */
export async function generateCourseSynthesis(materials: Material[], courseTitle: string): Promise<string> {
  try {
    if (materials.length === 0) return "No materials available to synthesize.";

    const materialText = materials.map(m => `Title: ${m.title} (${m.type})\nSummary: ${m.summary}`).join('\n\n');
    const prompt = `You are an expert educational consultant.
    Create a high-level executive summary and syllabus for the course "${courseTitle}" based on the uploaded materials below.
    Synthesize the information into a cohesive learning path.
    
    Structure your response as follows:
    1. **Course Executive Summary**: A high-level overview of what the course covers based on the materials.
    2. **Key Learning Outcomes**: What the student will learn.
    3. **Synthesized Syllabus**: Map the materials to a logical flow (Week by Week or thematic).
    4. **Gap Analysis**: What topics seem to be missing or could be strengthened based on standard curriculums for this subject.

    Materials:
    ${materialText}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    return response.text || "Could not generate synthesis.";
  } catch (error) {
    console.error("Synthesis Error:", error);
    throw error;
  }
}

/**
 * Analyze Video using Gemini Pro
 */
export async function analyzeVideo(base64Data: string, mimeType: string, prompt: string, courseContext?: string): Promise<AnalysisResult> {
  try {
    const contextPrompt = courseContext 
      ? `CONTEXT: You are a tutor for the course "${courseContext}". Analyze this video specifically for students of this course.` 
      : "CONTEXT: General educational analysis.";

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: `${contextPrompt}\n\n${prompt}` },
        ],
      },
    });

    return {
      text: response.text || "No analysis generated.",
    };
  } catch (error) {
    console.error("Video Analysis Error:", error);
    throw error;
  }
}

/**
 * Transcribe and Analyze Audio using Gemini Flash
 */
export async function analyzeAudio(base64Data: string, mimeType: string, prompt: string, courseContext?: string): Promise<AnalysisResult> {
  try {
    const contextPrompt = courseContext 
      ? `CONTEXT: You are a tutor for the course "${courseContext}".` 
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
          { text: `${contextPrompt}\n\n${prompt}` },
        ],
      },
    });

    return {
      text: response.text || "No transcription generated.",
    };
  } catch (error) {
    console.error("Audio Analysis Error:", error);
    throw error;
  }
}

/**
 * Research Web Topic using Search Grounding
 */
export async function researchWebTopic(query: string, courseContext?: string): Promise<AnalysisResult> {
  try {
    const contextPrompt = courseContext 
      ? `The user is studying "${courseContext}". Tailor the research to this field.` 
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: `Provide a comprehensive educational overview for the following topic/query. ${contextPrompt} Be detailed and structured: ${query}` }] },
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    // Map SDK GroundingChunk to AnalysisResult expected type
    const mappedChunks = groundingChunks?.map(chunk => ({
      web: chunk.web ? {
        uri: chunk.web.uri || '',
        title: chunk.web.title || ''
      } : undefined
    }));

    return {
      text: response.text || "No result found.",
      groundingMetadata: { groundingChunks: mappedChunks },
    };
  } catch (error) {
    console.error("Web Research Error:", error);
    throw error;
  }
}

/**
 * Generate a persistent memory summary from old chat sessions
 */
export async function generateMemorySummary(sessions: ChatSession[], courseTitle: string): Promise<PersistentMemory | null> {
  try {
    if (sessions.length === 0) return null;

    // Combine all messages from the sessions
    const conversationText = sessions.map(session => {
      const msgs = session.messages.map(m => 
        `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`
      ).join('\n');
      return `Session: "${session.title}"\n${msgs}`;
    }).join('\n\n---\n\n');

    const prompt = `You are analyzing past tutoring conversations for the course "${courseTitle}".
    
    Please create a concise persistent memory summary that captures:
    1. Key concepts and topics the student has learned about
    2. Important questions the student has asked
    3. Areas where the student showed understanding or confusion
    4. Any significant insights or breakthroughs
    5. Relevant context that would help in future tutoring sessions
    
    Format your response as a structured summary that can be used as context for future conversations.
    Be concise but comprehensive. Focus on educational content and learning progress.
    
    Past Conversations:
    ${conversationText}
    
    Provide the summary in a clear, structured format.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
    });

    const summary = response.text || "No summary generated.";
    
    // Extract topics using a simple approach
    const topicsPrompt = `From this conversation summary, extract 3-5 key topics as a comma-separated list (just the topic names, no explanations):\n\n${summary}`;
    const topicsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: topicsPrompt }] },
    });
    
    const topicsText = topicsResponse.text || "";
    const topics = topicsText.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 5);

    return {
      id: Date.now().toString(),
      summary,
      topics,
      timestamp: Date.now(),
      sessionIds: sessions.map(s => s.id)
    };
  } catch (error) {
    console.error("Memory Summary Error:", error);
    return null;
  }
}

/**
 * Analyze Document (Image/PDF/Text)
 */
export async function analyzeDocument(
  base64Data: string | null, 
  mimeType: string | null, 
  textContent: string | null, 
  prompt: string,
  courseContext?: string
): Promise<AnalysisResult> {
  try {
    const parts: any[] = [];
    if (base64Data && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data,
        },
      });
    }
    if (textContent) {
      parts.push({ text: textContent });
    }
    
    const contextPrompt = courseContext 
      ? `CONTEXT: You are a tutor for the course "${courseContext}".` 
      : "";
    
    parts.push({ text: `${contextPrompt}\n\n${prompt}` });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using Pro for complex doc analysis
      contents: { parts },
    });

    return {
      text: response.text || "No analysis generated.",
    };
  } catch (error) {
    console.error("Document Analysis Error:", error);
    throw error;
  }
}