import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { ethers } from 'ethers';

interface GeneratedCandidate {
  name: string;
  party: string;
  description: string;
  background: string;
  agenda: string[];
  experience: string[];
}

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const generatePrompt = (count: number) => `
Generate ${count} unique and realistic political candidates with the following structure for each candidate:
{
  "name": "Full Name",
  "party": "Political Party",
  "description": "Brief 1-2 sentence description",
  "background": "2-3 sentences about their background",
  "agenda": ["3-4 key agenda items"],
  "experience": ["3-4 relevant experience items"]
}

Requirements:
- Names should be diverse and realistic
- Parties should include major and minor parties
- Descriptions should highlight key campaign focus
- Background should include education and career highlights
- Agenda items should be specific policy proposals
- Experience should include relevant political and professional roles

Return the data in a JSON array format.
`;

export async function generateCandidateData(count: number = 5): Promise<GeneratedCandidate[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    const prompt = generatePrompt(count);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    const candidates = JSON.parse(text);
    
    if (!Array.isArray(candidates)) {
      throw new Error('Invalid response format from Gemini');
    }
    
    return candidates;
  } catch (error) {
    console.error('Error generating candidate data:', error);
    throw error;
  }
}

export async function syncGeneratedCandidates(contract: ethers.Contract): Promise<void> {
  try {
    // Check if candidates exist in the blockchain
    const candidateCount = await contract.getCandidateCount();
    
    if (candidateCount.toNumber() === 0) {
      // Generate new candidates
      const candidates = await generateCandidateData();
      
      // Add candidates to blockchain
      for (const candidate of candidates) {
        await contract.addCandidate(
          candidate.name,
          candidate.party,
          candidate.description
        );
        
        // Store additional data in Supabase
        const { error } = await supabase
          .from('candidates')
          .upsert({
            name: candidate.name,
            party: candidate.party,
            description: candidate.description,
            background: candidate.background,
            agenda: candidate.agenda,
            experience: candidate.experience
          });
          
        if (error) {
          console.error('Error syncing candidate to Supabase:', error);
        }
      }
      
      console.log('Successfully generated and synced candidates');
    } else {
      console.log('Candidates already exist in the blockchain');
    }
  } catch (error) {
    console.error('Error in syncGeneratedCandidates:', error);
    throw error;
  }
} 