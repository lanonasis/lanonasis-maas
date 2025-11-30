/**
 * Multi-Modal Memory Example
 * Shows how to use Lanonasis Memory SDK for different content types
 */

import { MultiModalMemoryClient } from '../dist/index.js';
import fs from 'fs';

// Initialize the client
const memory = new MultiModalMemoryClient({
  apiUrl: 'https://api.lanonasis.com',
  apiKey: process.env.LANONASIS_API_KEY || 'your-api-key-here'
});

async function demonstrateMultiModalCapabilities() {
  console.log('🚀 Demonstrating Multi-Modal Memory Capabilities');
  console.log('================================================\n');

  // 1. Store an image with OCR and description
  console.log('📸 Storing image with OCR extraction...');
  const imageBuffer = fs.readFileSync('./sample-screenshot.png');
  
  const imageMemory = await memory.createImageMemory(
    'Product Dashboard Screenshot',
    imageBuffer,
    { extractText: true, generateDescription: true }
  );
  console.log('✅ Image stored:', imageMemory.data?.id);

  // 2. Store audio with transcription
  console.log('🎵 Storing audio with transcription...');
  const audioBuffer = fs.readFileSync('./meeting-recording.mp3');
  
  const audioMemory = await memory.createAudioMemory(
    'Team Meeting Recording',
    audioBuffer
  );
  console.log('✅ Audio stored:', audioMemory.data?.id);

  // 3. Store code with semantic analysis
  console.log('💻 Storing code with analysis...');
  const codeContent = `
    import React, { useState } from 'react';
    
    interface UserProps {
      name: string;
      email: string;
    }
    
    export const UserProfile: React.FC<UserProps> = ({ name, email }) => {
      const [isEditing, setIsEditing] = useState(false);
      
      return (
        <div className="user-profile">
          <h2>{name}</h2>
          <p>{email}</p>
          <button onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Save' : 'Edit'}
          </button>
        </div>
      );
    };
  `;
  
  const codeMemory = await memory.createCodeMemory(
    'User Profile React Component',
    codeContent,
    'typescript',
    { extractFunctions: true, generateDocs: true }
  );
  console.log('✅ Code stored:', codeMemory.data?.id);

  // 4. Store document with text extraction
  console.log('📄 Storing PDF document...');
  const documentBuffer = fs.readFileSync('./project-requirements.pdf');
  
  const documentMemory = await memory.createDocumentMemory(
    'Project Requirements Document',
    documentBuffer,
    'pdf'
  );
  console.log('✅ Document stored:', documentMemory.data?.id);

  // 5. Search across all modalities
  console.log('\n🔍 Searching across all content types...');
  const searchResults = await memory.getMultiModalContext('user interface design', {
    includeImages: true,
    includeAudio: true,
    includeDocuments: true,
    includeCode: true
  });
  
  console.log(`Found ${searchResults.length} relevant memories:`);
  searchResults.slice(0, 3).forEach((result, index) => {
    console.log(`${index + 1}. ${result.title} (similarity: ${result.similarity_score?.toFixed(3)})`);
  });

  console.log('\n🎉 Multi-modal memory demonstration complete!');
}

// Run the demo
demonstrateMultiModalCapabilities().catch(console.error);