// API Configuration Management
class APIConfig {
    constructor() {
        // API Endpoints
        this.endpoints = {
            deepseek: 'https://api.deepseek.com/chat/completions',
            huggingface: 'https://api-inference.huggingface.co/models/',
            translation: 'https://api.mymemory.translated.net/get'
        };

        // API Keys - Replace with your actual keys
        this.keys = {
			deepseek: '',
			huggingface: ''
        };

        // Model configurations
        this.models = {
            medical_text: 'deepseek-chat',
            medical_image: 'microsoft/BiomedNLP-BiomedBERT-base-uncased-abstract-fulltext',
            vision_general: 'microsoft/DialoGPT-medium'
        };

        // Rate limiting
        this.rateLimits = {
            deepseek: { requests: 60, window: 60000 }, // 60 req/min
            huggingface: { requests: 30, window: 60000 }, // 30 req/min
            translation: { requests: 100, window: 60000 } // 100 req/min
        };

        this.requestCounts = new Map();
    }

    // Get API key securely
    getApiKey(service) {
        const key = this.keys[service];
        if (!key || key.includes('YOUR_') || key.includes('_HERE')) {
            throw new Error(`${service} API key not configured. Please add your key to config.js`);
        }
        return key;
    }

    // Get endpoint URL
    getEndpoint(service) {
        return this.endpoints[service];
    }

    // Get model name
    getModel(type) {
        return this.models[type];
    }

    // Check rate limit
    checkRateLimit(service) {
        const limit = this.rateLimits[service];
        if (!limit) return true;

        const now = Date.now();
        const key = `${service}_${Math.floor(now / limit.window)}`;
        const count = this.requestCounts.get(key) || 0;

        if (count >= limit.requests) {
            throw new Error(`Rate limit exceeded for ${service}. Try again later.`);
        }

        this.requestCounts.set(key, count + 1);
        return true;
    }

    // Create authenticated headers
    createHeaders(service, additionalHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...additionalHeaders
        };

        // Add authentication based on service
        switch (service) {
            case 'deepseek':
                headers['Authorization'] = `Bearer ${this.getApiKey('deepseek')}`;
                break;
            case 'huggingface':
                headers['Authorization'] = `Bearer ${this.getApiKey('huggingface')}`;
                break;
        }

        return headers;
    }

    // Validate configuration
    validateConfig() {
        const issues = [];

        // Check required keys
        if (this.keys.deepseek.includes('YOUR_')) {
            issues.push('DeepSeek API key not set');
        }
        if (this.keys.huggingface.includes('YOUR_')) {
            issues.push('Hugging Face token not set');
        }

        // Check endpoints
        Object.entries(this.endpoints).forEach(([service, url]) => {
            try {
                new URL(url);
            } catch {
                issues.push(`Invalid ${service} endpoint URL`);
            }
        });

        return {
            valid: issues.length === 0,
            issues: issues
        };
    }

    // Get service status
    async checkServiceHealth() {
        const status = {};

        // Check DeepSeek
        try {
            await this.testDeepSeekConnection();
            status.deepseek = 'healthy';
        } catch (error) {
            status.deepseek = `error: ${error.message}`;
        }

        // Check Hugging Face
        try {
            await this.testHuggingFaceConnection();
            status.huggingface = 'healthy';
        } catch (error) {
            status.huggingface = `error: ${error.message}`;
        }

        return status;
    }

    // Test connections
    async testDeepSeekConnection() {
        const response = await fetch(this.endpoints.deepseek, {
            method: 'POST',
            headers: this.createHeaders('deepseek'),
            body: JSON.stringify({
                model: this.models.medical_text,
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 5
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    async testHuggingFaceConnection() {
        const response = await fetch(
            `${this.endpoints.huggingface}${this.models.medical_image}`,
            {
                method: 'POST',
                headers: this.createHeaders('huggingface'),
                body: JSON.stringify({ inputs: 'test' })
            }
        );

        if (!response.ok && response.status !== 503) { // 503 is loading
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    }

    // Development mode toggle
    setDevelopmentMode(enabled) {
        this.developmentMode = enabled;
        if (enabled) {
            console.log('🔧 Development mode enabled - using enhanced mock responses');
        }
    }

    isDevelopmentMode() {
        // Force development mode if API issues detected
        return this.developmentMode || 
               this.keys.deepseek.includes('YOUR_') || 
               this.keys.huggingface.includes('YOUR_') ||
               this.apiIssuesDetected;
    }
}

// Create global configuration instance
window.apiConfig = new APIConfig();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConfig;
}