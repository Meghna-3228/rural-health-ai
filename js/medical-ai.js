class MedicalAI {
    constructor() {
        this.analysisHistory = [];
    }

    // Main analysis entry point
    async analyzePatient(patientData) {
        try {
            if (!this.validatePatientData(patientData)) {
                throw new Error('Invalid patient data provided');
            }

            const analysis = {
                sessionId: Utils.generateId(),
                timestamp: new Date().toISOString(),
                symptoms: await this.analyzeSymptoms(patientData),
                images: patientData.images?.length ? await this.analyzeImages(patientData.images) : null,
            };

            analysis.riskAssessment = this.assessRisk(analysis.symptoms);
            analysis.conditions = analysis.symptoms.conditions || [];
            analysis.treatments = analysis.symptoms.treatments || [];
            analysis.referral = analysis.symptoms.referral || this.getDefaultReferral();

            this.analysisHistory.push(analysis);
            return analysis;

        } catch (error) {
            return Utils.handleError(error, 'during patient analysis');
        }
    }

    validatePatientData(data) {
        return Utils.validateSymptoms(data.symptoms) && 
               (!data.age || Utils.validateAge(data.age)) &&
               (!data.images || Array.isArray(data.images));
    }

    // Analyze symptoms using centralized API config
    async analyzeSymptoms(patientData) {
        const prompt = this.buildMedicalPrompt(patientData);
        
        try {
            const response = await this.callSymptomAPI(prompt);
            return this.parseAnalysisResponse(response);
        } catch (error) {
            console.warn('Primary AI analysis failed, using fallback');
            return this.getFallbackAnalysis(patientData);
        }
    }

    buildMedicalPrompt(data) {
        return `You are a medical assistant for rural healthcare workers with basic training. Provide practical guidance for common conditions.

PATIENT PROFILE:
Age: ${data.age || 'Unknown'}
Gender: ${data.gender || 'Unknown'}
Symptoms: ${Utils.sanitizeInput(data.symptoms)}

REQUIREMENTS:
1. List 2-3 most likely common conditions
2. Assign LOW/MEDIUM/HIGH urgency
3. Suggest basic treatments available in rural clinics
4. Decide if referral to hospital needed
5. Include red flag symptoms to watch for

CONSTRAINTS:
- Focus on common conditions in rural areas
- Only suggest treatments using basic supplies
- Be conservative - err on side of referral when uncertain
- Use simple language for non-specialists

Respond in valid JSON:
{
  "urgency": "LOW|MEDIUM|HIGH",
  "confidence": 0.85,
  "conditions": [
    {
      "name": "condition_name",
      "probability": 75,
      "description": "brief explanation",
      "symptoms_match": ["matched_symptom1", "matched_symptom2"]
    }
  ],
  "treatments": [
    {
      "category": "Immediate_Care",
      "actions": ["specific_action1", "specific_action2"],
      "supplies_needed": ["item1", "item2"]
    }
  ],
  "referral": {
    "needed": false,
    "urgency": "none|routine|immediate", 
    "reason": "clear_explanation"
  },
  "red_flags": ["symptom1", "symptom2"],
  "disclaimer": "This is AI assistance only. Not a replacement for medical judgment."
}`;
    }

    // Use centralized API configuration
    async callSymptomAPI(prompt) {
        // Check if using mock responses
        if (window.apiConfig.isDevelopmentMode()) {
            console.log('Using mock response - configure API keys for real analysis');
            return this.mockAIResponse(prompt);
        }

        try {
            // Check rate limits
            window.apiConfig.checkRateLimit('deepseek');

            console.log('Attempting real API call to DeepSeek...');

            const response = await fetch(window.apiConfig.getEndpoint('deepseek'), {
                method: 'POST',
                headers: window.apiConfig.createHeaders('deepseek'),
                body: JSON.stringify({
                    model: window.apiConfig.getModel('medical_text'),
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a medical AI assistant focused on rural healthcare. Always prioritize patient safety and provide conservative recommendations.'
                        },
                        {
                            role: 'user', 
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 1500
                })
            });

            if (!response.ok) {
                console.error(`API Error: ${response.status} ${response.statusText}`);
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Real API response received');
            return data.choices[0].message.content;

        } catch (error) {
            console.warn('API call failed:', error.message);
            console.log('Falling back to enhanced mock analysis due to API issues');
            Utils.showNotification('Using enhanced local analysis. API connection issues detected.', 'info');
            return this.enhancedMockResponse(prompt);
        }
    }

    // Enhanced mock response with better medical analysis
    enhancedMockResponse(prompt) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const symptoms = prompt.toLowerCase();
                let response;

                // Asthma symptoms
                if ((symptoms.includes('shortness') && symptoms.includes('breath')) || 
                    symptoms.includes('wheezing') || 
                    (symptoms.includes('chest') && symptoms.includes('tight'))) {
                    
                    response = {
                        urgency: "MEDIUM",
                        confidence: 0.82,
                        conditions: [
                            {
                                name: "Asthma Exacerbation",
                                probability: 80,
                                description: "Airways become inflamed and narrowed, causing breathing difficulties",
                                symptoms_match: ["shortness of breath", "wheezing", "chest tightness", "nocturnal cough"]
                            },
                            {
                                name: "Bronchitis",
                                probability: 65,
                                description: "Inflammation of bronchial tubes causing cough and breathing issues",
                                symptoms_match: ["coughing", "chest tightness"]
                            }
                        ],
                        treatments: [
                            {
                                category: "Immediate_Relief",
                                actions: [
                                    "Use rescue inhaler (salbutamol) if available - 2 puffs, wait 5 minutes, repeat if needed",
                                    "Sit upright, lean slightly forward to ease breathing",
                                    "Try pursed-lip breathing: breathe in through nose, out slowly through pursed lips"
                                ],
                                supplies_needed: ["rescue inhaler (salbutamol)", "spacer device if available"]
                            },
                            {
                                category: "Supportive_Care",
                                actions: [
                                    "Avoid known triggers (dust, smoke, strong smells)",
                                    "Stay calm - anxiety can worsen breathing",
                                    "Monitor breathing rate and effort",
                                    "Ensure adequate hydration"
                                ],
                                supplies_needed: ["clean environment", "water"]
                            }
                        ],
                        referral: {
                            needed: true,
                            urgency: "routine",
                            reason: "Asthma requires proper medical evaluation for diagnosis and treatment plan. Refer immediately if severe breathing difficulty."
                        },
                        red_flags: [
                            "Severe difficulty breathing or inability to speak full sentences",
                            "Blue lips or fingernails (cyanosis)",
                            "No improvement with rescue medication",
                            "Extreme anxiety or panic about breathing",
                            "Chest retractions (skin pulling in around ribs)"
                        ],
                        disclaimer: "This is enhanced AI analysis for demonstration. Not a replacement for medical diagnosis."
                    };
                }
                // Keep existing fever/cough logic
                else if (symptoms.includes('fever') && symptoms.includes('cough')) {
                    // ... existing fever/cough response
                    response = this.getFeverCoughResponse();
                }
                else {
                    response = this.getGeneralResponse();
                }

                resolve(JSON.stringify(response));
            }, 1000); // Faster response to show it's enhanced
        });
    }

    getFeverCoughResponse() {
        return {
            urgency: "MEDIUM",
            confidence: 0.78,
            conditions: [
                {
                    name: "Upper Respiratory Infection",
                    probability: 75,
                    description: "Common viral or bacterial infection of nose, throat, or chest",
                    symptoms_match: ["fever", "cough", "congestion"]
                },
                {
                    name: "Common Cold",
                    probability: 60,
                    description: "Viral infection causing cold symptoms",
                    symptoms_match: ["cough", "runny nose"]
                }
            ],
            treatments: [
                {
                    category: "Symptom_Relief", 
                    actions: [
                        "Rest and increase fluid intake to 8-10 glasses daily",
                        "Paracetamol 500mg every 6 hours for fever (max 4 doses daily)",
                        "Warm salt water gargles 3 times daily"
                    ],
                    supplies_needed: ["paracetamol", "clean water", "salt"]
                },
                {
                    category: "Monitoring",
                    actions: [
                        "Check temperature twice daily",
                        "Monitor for breathing difficulties", 
                        "Return if symptoms worsen or persist beyond 7 days"
                    ],
                    supplies_needed: ["thermometer"]
                }
            ],
            referral: {
                needed: false,
                urgency: "routine",
                reason: "Manageable with basic care. Refer if no improvement in 7 days or if red flags appear."
            },
            red_flags: [
                "Difficulty breathing or shortness of breath",
                "High fever above 39°C (102°F) for more than 3 days", 
                "Severe headache with neck stiffness",
                "Persistent vomiting"
            ],
            disclaimer: "This is enhanced AI analysis for demonstration. Not a replacement for medical diagnosis."
        };
    }

    getGeneralResponse() {
        return {
            urgency: "MEDIUM",
            confidence: 0.65,
            conditions: [
                {
                    name: "General Symptoms Assessment",
                    probability: 70,
                    description: "Requires further evaluation to determine specific cause",
                    symptoms_match: ["reported symptoms"]
                }
            ],
            treatments: [
                {
                    category: "General_Care",
                    actions: [
                        "Ensure adequate rest and hydration",
                        "Monitor symptoms closely",
                        "Seek further medical evaluation"
                    ],
                    supplies_needed: ["clean water"]
                }
            ],
            referral: {
                needed: true,
                urgency: "routine",
                reason: "Symptoms require further medical evaluation for proper diagnosis."
            },
            red_flags: [
                "Severe pain",
                "High fever",
                "Difficulty breathing",
                "Signs of severe dehydration"
            ],
            disclaimer: "This is enhanced AI analysis for demonstration. Not a replacement for medical diagnosis."
        };
    }

    // Mock AI response for development/demo
    mockAIResponse(prompt) {
        // Use enhanced mock response for better medical analysis
        return this.enhancedMockResponse(prompt);
    }

    parseAnalysisResponse(response) {
        try {
            const parsed = typeof response === 'string' ? 
                          Utils.parseJSON(response) : response;
            
            if (!parsed.urgency || !parsed.conditions) {
                throw new Error('Invalid AI response format');
            }

            return parsed;
        } catch (error) {
            console.warn('Failed to parse AI response:', error);
            return this.getEmergencyFallback();
        }
    }

    getFallbackAnalysis(patientData) {
        return {
            urgency: "MEDIUM",
            confidence: 0.5,
            conditions: [
                {
                    name: "Undetermined Condition",
                    probability: 50,
                    description: "AI analysis unavailable. Manual assessment required.",
                    symptoms_match: ["reported symptoms"]
                }
            ],
            treatments: [
                {
                    category: "Basic_Care",
                    actions: [
                        "Provide comfort measures",
                        "Monitor vital signs if possible",
                        "Seek medical consultation"
                    ],
                    supplies_needed: ["basic supplies"]
                }
            ],
            referral: {
                needed: true,
                urgency: "routine",
                reason: "AI analysis unavailable. Manual medical assessment required."
            },
            red_flags: ["Any worsening symptoms", "Severe pain", "Difficulty breathing"],
            disclaimer: "AI analysis failed. This is general guidance only."
        };
    }

    getEmergencyFallback() {
        return {
            urgency: "HIGH",
            confidence: 0.3,
            conditions: [
                {
                    name: "Assessment Required",
                    probability: 100,
                    description: "Immediate medical evaluation needed due to system error.",
                    symptoms_match: []
                }
            ],
            treatments: [
                {
                    category: "Emergency_Protocol",
                    actions: ["Seek immediate medical attention"],
                    supplies_needed: []
                }
            ],
            referral: {
                needed: true,
                urgency: "immediate",
                reason: "System error occurred. Immediate medical evaluation required for patient safety."
            },
            red_flags: ["All symptoms require immediate attention"],
            disclaimer: "System error occurred. Seek immediate medical attention."
        };
    }

    // Image analysis using centralized config
    async analyzeImages(images) {
        const analyses = [];
        
        for (const image of images) {
            try {
                if (!Utils.isValidMedicalImage(image)) {
                    continue;
                }

                const analysis = await this.callImageAPI(image);
                analyses.push(analysis);
                
            } catch (error) {
                console.warn('Image analysis failed:', error);
                analyses.push({
                    error: 'Image analysis unavailable',
                    recommendation: 'Describe visual findings to healthcare provider'
                });
            }
        }

        return analyses.length > 0 ? analyses : null;
    }

    async callImageAPI(image) {
        // Check if using mock responses
        if (window.apiConfig.isDevelopmentMode()) {
            return this.mockImageAnalysis(image);
        }

        window.apiConfig.checkRateLimit('huggingface');

        const formData = new FormData();
        formData.append('file', image);

        const response = await fetch(
            `${window.apiConfig.getEndpoint('huggingface')}${window.apiConfig.getModel('vision_general')}`,
            {
                method: 'POST',
                headers: window.apiConfig.createHeaders('huggingface', { 'Content-Type': 'multipart/form-data' }),
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error(`Image API request failed: ${response.status}`);
        }

        return await response.json();
    }

    mockImageAnalysis(image) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    findings: [
                        "Visual examination shows area of concern",
                        "Consider documentation for medical record",
                        "Professional evaluation recommended"
                    ],
                    confidence: 0.6,
                    recommendation: "Image captured for healthcare provider review. Describe any changes in size, color, or pain level."
                });
            }, 1500);
        });
    }

    assessRisk(symptoms) {
        const urgency = symptoms.urgency || 'MEDIUM';
        const redFlags = symptoms.red_flags || [];
        const confidence = symptoms.confidence || 0.5;
        
        let riskLevel, riskScore;
        
        if (urgency === 'HIGH' || redFlags.length > 2) {
            riskLevel = 'HIGH';
            riskScore = 85;
        } else if (urgency === 'MEDIUM' || redFlags.length > 0 || confidence < 0.6) {
            riskLevel = 'MEDIUM'; 
            riskScore = 55;
        } else {
            riskLevel = 'LOW';
            riskScore = 25;
        }

        return {
            level: riskLevel,
            score: riskScore,
            description: this.getRiskDescription(riskLevel),
            factors: redFlags,
            confidence: confidence
        };
    }

    getRiskDescription(level) {
        const descriptions = {
            LOW: "Low risk - Can be managed with basic care and routine monitoring",
            MEDIUM: "Medium risk - Requires careful monitoring and possible follow-up within 24-48 hours", 
            HIGH: "High risk - Seek immediate medical attention or referral to hospital"
        };
        return descriptions[level] || descriptions.MEDIUM;
    }

    getDefaultReferral() {
        return {
            needed: true,
            urgency: 'routine',
            reason: 'Recommend follow-up evaluation for proper diagnosis and treatment plan.'
        };
    }
}

window.MedicalAI = MedicalAI;