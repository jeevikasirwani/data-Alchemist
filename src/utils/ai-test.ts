import { calculateSimilarity } from './ai-config';

export async function testAISetup() {
    try {
        // Test with two similar column headers
        const similarity = await calculateSimilarity('customer_name', 'client_name');
        console.log('AI Setup Test Results:');
        console.log('Similarity between "customer_name" and "client_name":', similarity);
        console.log('AI setup is working correctly!');
        return true;
    } catch (error) {
        console.error('AI Setup Test Failed:', error);
        return false;
    }
} 