import { PUBLIC_GROK_API_KEY, PUBLIC_GROK_API_URL } from '$env/static/public';

export class GrokService {
    static async generateComplaintFromImage(imageFile) {
        console.log('=== 🚀 GrokService Started ===');
        console.log('Image File:', imageFile.name, imageFile.type, imageFile.size + ' bytes');
        
        // Validate environment variables
        if (!PUBLIC_GROK_API_KEY) {
            const error = 'Grok API key is missing. Please check your .env file.';
            console.error('❌', error);
            throw new Error(error);
        }
        
        if (PUBLIC_GROK_API_KEY.startsWith('your_') || PUBLIC_GROK_API_KEY.length < 10) {
            const error = 'Grok API key appears to be invalid or placeholder. Please update your .env file with a valid key.';
            console.error('❌', error);
            throw new Error(error);
        }
        
        if (!PUBLIC_GROK_API_URL) {
            const error = 'Grok API URL is missing.';
            console.error('❌', error);
            throw new Error(error);
        }
        
        console.log('✅ Environment variables validated');
        console.log('API Key length:', PUBLIC_GROK_API_KEY.length);
        console.log('API URL:', PUBLIC_GROK_API_URL);

        try {
            // Convert image to base64
            console.log('📷 Converting image to base64...');
            const base64Image = await this.fileToBase64(imageFile);
            console.log('✅ Base64 conversion successful, length:', base64Image.length);

            // Prepare the API payload
            const payload = {
                model: "grok-beta",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: "Analyze this campus issue image and generate a complaint report. Return ONLY valid JSON with these exact fields: title (short descriptive title), description (detailed description), category (choose from: Facilities, Safety, Academic, Technology, Food Services, Transportation, Housing, Other), priority (low, medium, high), location (if identifiable). Be specific and practical. Return format: { \"title\": \"\", \"description\": \"\", \"category\": \"\", \"priority\": \"\", \"location\": \"\" }"
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${imageFile.type};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7
            };

            console.log('📤 Sending request to Grok API...');
            console.log('Payload size:', JSON.stringify(payload).length, 'bytes');

            // Set up timeout (30 seconds)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                console.error('⏰ API request timed out after 30 seconds');
            }, 30000);

            try {
                const response = await fetch(PUBLIC_GROK_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${PUBLIC_GROK_API_KEY}`
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                console.log('📥 Response received, status:', response.status, response.statusText);

                if (!response.ok) {
                    let errorDetails = '';
                    try {
                        const errorBody = await response.text();
                        errorDetails = ` - Response: ${errorBody.substring(0, 200)}`;
                    } catch (e) {
                        errorDetails = ' - Could not read error response body';
                    }
                    
                    const errorMessage = `API Error ${response.status}: ${response.statusText}${errorDetails}`;
                    console.error('❌', errorMessage);
                    
                    // Provide user-friendly error messages
                    if (response.status === 401) {
                        throw new Error('Invalid API key. Please check your Grok API key.');
                    } else if (response.status === 403) {
                        throw new Error('API access forbidden. Check your API key permissions.');
                    } else if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please try again in a moment.');
                    } else if (response.status >= 500) {
                        throw new Error('Grok API server error. Please try again later.');
                    } else {
                        throw new Error(`API error: ${response.status} ${response.statusText}`);
                    }
                }

                const responseData = await response.json();
                console.log('✅ API call successful');
                console.log('Response data structure:', Object.keys(responseData));

                // Extract content from response
                const content = responseData.choices?.[0]?.message?.content;
                
                if (!content) {
                    console.error('❌ No content in AI response:', responseData);
                    throw new Error('AI service returned an empty response. Please try again.');
                }

                console.log('AI Response content:', content);

                // Parse the JSON response
                let parsedData;
                try {
                    // Try to extract JSON from the response
                    const jsonMatch = content.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsedData = JSON.parse(jsonMatch[0]);
                    } else {
                        // If no JSON object found, try parsing the entire content
                        parsedData = JSON.parse(content);
                    }
                    console.log('✅ JSON parsed successfully:', parsedData);
                } catch (parseError) {
                    console.error('❌ JSON parsing failed:', parseError);
                    console.error('Content that failed to parse:', content);
                    
                    // Create a fallback response
                    parsedData = this.createFallbackResponse();
                    console.log('🔄 Using fallback response:', parsedData);
                }

                // Validate the parsed data
                parsedData = this.validateResponse(parsedData);
                console.log('✅ Final validated data:', parsedData);

                return parsedData;

            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                if (fetchError.name === 'AbortError') {
                    console.error('⏰ Request timeout');
                    throw new Error('AI analysis took too long. Please try again with a smaller image or better connection.');
                }
                throw fetchError;
            }

        } catch (error) {
            console.error('💥 GrokService fatal error:', error);
            
            // Provide fallback data for user to manually edit
            if (error.message.includes('API') || error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error(`AI service unavailable: ${error.message}. Please fill out the form manually.`);
            }
            
            throw error;
        }
    }

    /**
     * Create a fallback response when AI fails
     */
    static createFallbackResponse() {
        return {
            title: 'Campus Issue Detected',
            description: 'I detected an issue in the image. Please provide specific details about what you see and how it affects the campus community.',
            category: 'Other',
            priority: 'medium',
            location: ''
        };
    }

    /**
     * Validate and clean the AI response
     */
    static validateResponse(data) {
        const validCategories = ['Facilities', 'Safety', 'Academic', 'Technology', 'Food Services', 'Transportation', 'Housing', 'Other'];
        const validPriorities = ['low', 'medium', 'high'];

        const validated = {
            title: data.title || 'Campus Issue',
            description: data.description || 'Please describe the issue you observed.',
            category: validCategories.includes(data.category) ? data.category : 'Other',
            priority: validPriorities.includes(data.priority) ? data.priority : 'medium',
            location: data.location || ''
        };

        // Ensure title and description are not too long
        if (validated.title.length > 100) {
            validated.title = validated.title.substring(0, 97) + '...';
        }
        
        if (validated.description.length > 500) {
            validated.description = validated.description.substring(0, 497) + '...';
        }

        return validated;
    }

    /**
     * Convert file to base64 string
     */
    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            // Validate file
            if (!file || !file.type.startsWith('image/')) {
                reject(new Error('Invalid image file'));
                return;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                reject(new Error('Image file too large (max 10MB)'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = () => {
                if (reader.result && typeof reader.result === 'string') {
                    const base64 = reader.result.split(',')[1];
                    if (base64) {
                        resolve(base64);
                    } else {
                        reject(new Error('Failed to convert image to base64'));
                    }
                } else {
                    reject(new Error('Invalid file read result'));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read file: ' + reader.error));
            };
            
            reader.onabort = () => {
                reject(new Error('File reading was aborted'));
            };
            
            try {
                reader.readAsDataURL(file);
            } catch (error) {
                reject(new Error('Error reading file: ' + error.message));
            }
        });
    }

    /**
     * Test if the Grok API is accessible (for debugging)
     */
    static async testConnection() {
        console.log('🔧 Testing Grok API connection...');
        
        if (!PUBLIC_GROK_API_KEY) {
            return { success: false, error: 'API key not configured' };
        }
        
        try {
            const response = await fetch(PUBLIC_GROK_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PUBLIC_GROK_API_KEY}`
                },
                body: JSON.stringify({
                    model: "grok-beta",
                    messages: [{ role: "user", content: "Say 'Hello' in JSON format: {\"message\": \"hello\"}" }],
                    max_tokens: 10
                })
            });
            
            return { 
                success: response.ok, 
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}