
'use server';
/**
 * @fileOverview AI agent to identify a stock item from a photo.
 *
 * - searchItemByPhoto - Function to identify an item based on its photo.
 * - SearchItemByPhotoInput - Input type for the searchItemByPhoto function.
 * - SearchItemByPhotoOutput - Return type for the searchItemByPhoto function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const SearchItemByPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a stock item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type SearchItemByPhotoInput = z.infer<typeof SearchItemByPhotoInputSchema>;

const SearchItemByPhotoOutputSchema = z.object({
  itemName: z.string().nullable().describe('The identified name of the item in the photo, or null if not identifiable.'),
});
export type SearchItemByPhotoOutput = z.infer<typeof SearchItemByPhotoOutputSchema>;

export async function searchItemByPhoto(input: SearchItemByPhotoInput): Promise<SearchItemByPhotoOutput> {
    console.log("Calling searchItemByPhotoFlow with input URI starting:", input.photoDataUri.substring(0, 30) + "...");
    try {
        const result = await searchItemByPhotoFlow(input);
        console.log("Flow result:", result);
        // Ensure null is returned if itemName is empty string from AI
        return { itemName: result.itemName || null };
    } catch (error) {
        console.error("Error in searchItemByPhotoFlow call:", error);
        // Return null on error to handle gracefully
        return { itemName: null };
    }
}


const prompt = ai.definePrompt({
  name: 'searchItemByPhotoPrompt',
  input: {
    schema: SearchItemByPhotoInputSchema,
  },
  output: {
    schema: SearchItemByPhotoOutputSchema,
  },
  prompt: `Analyze the provided image of a stock item. Identify the primary item visible in the photo.
Respond with the most likely name of the item. If you cannot reasonably identify an item, respond with null for the itemName.

Photo: {{media url=photoDataUri}}`,
});


// Define the flow using defineFlow
const searchItemByPhotoFlow = ai.defineFlow<
  typeof SearchItemByPhotoInputSchema,
  typeof SearchItemByPhotoOutputSchema // Ensure output schema matches expected type
>(
  {
    name: 'searchItemByPhotoFlow',
    inputSchema: SearchItemByPhotoInputSchema,
    outputSchema: SearchItemByPhotoOutputSchema, // Use the defined output schema
  },
  async (input) => {
     console.log("searchItemByPhotoFlow: Generating response...");
      // Use the gemini-pro-vision model explicitly for image analysis
      const llmResponse = await ai.generate({
          model: 'googleai/gemini-1.5-flash', // Vision-capable model
          prompt: prompt.compile({ input }), // Use the compiled prompt with input
           config: { temperature: 0.3 }, // Optional: Adjust temperature for more deterministic output
           output: { schema: SearchItemByPhotoOutputSchema }, // Request structured output
      });

      console.log("searchItemByPhotoFlow: LLM Response Output:", llmResponse.output);

      // Extract the output. If output is null/undefined or itemName is missing, return null.
      const output = llmResponse.output;
      if (!output || typeof output !== 'object' || !('itemName' in output)) {
         console.warn("searchItemByPhotoFlow: Invalid or missing output from LLM.");
          return { itemName: null }; // Return null if output is not as expected
      }

      return { itemName: output.itemName || null }; // Return the identified name or null
  }
);

