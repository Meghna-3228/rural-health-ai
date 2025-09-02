class RuralHealthApp {
    constructor() {
        this.medicalAI = new MedicalAI();
        this.uploadedImages = [];
        this.isRecording = false;
        this.recognition = null;
        this.currentLanguage = 'en';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initSpeechRecognition();
        Utils.showNotification('Rural Health AI Assistant ready', 'success');
    }

    setupEventListeners() {
        // Language selector
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.changeLanguage(e.target.value);
        });

        // Voice input
        document.getElementById('voiceInput').addEventListener('click', () => {
            this.toggleVoiceInput();
        });

        // Analysis button
        document.getElementById('analyzeBtn').addEventListener('click', () => {
            this.analyzePatient();
        });

        // Image upload handlers
        const imageInput = document.getElementById('imageInput');
        const uploadArea = document.getElementById('uploadArea');

        imageInput.addEventListener('change', (e) => {
            this.handleImageUpload(Array.from(e.target.files));
        });

        uploadArea.addEventListener('click', () => imageInput.click());

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleImageUpload(Array.from(e.dataTransfer.files));
        });

        // Input validation
        document.getElementById('symptoms').addEventListener('input', 
            Utils.debounce(this.validateForm.bind(this), 300));
    }

    initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            document.getElementById('voiceInput').style.display = 'none';
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const symptomsField = document.getElementById('symptoms');
            const currentValue = symptomsField.value;
            
            symptomsField.value = currentValue + (currentValue ? ' ' : '') + transcript;
            this.validateForm();
        };

        this.recognition.onend = () => {
            this.stopRecording();
        };

        this.recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            this.stopRecording();
            Utils.showNotification('Voice input failed. Please try again.', 'error');
        };
    }

    toggleVoiceInput() {
        if (!this.recognition) {
            Utils.showNotification('Voice input not supported', 'warning');
            return;
        }

        if (this.isRecording) {
            this.recognition.stop();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.isRecording = true;
        const voiceBtn = document.getElementById('voiceInput');
        voiceBtn.classList.add('recording');
        voiceBtn.textContent = '🛑 Stop Recording';
        
        try {
            this.recognition.start();
            Utils.showNotification('Voice recording started...', 'info');
        } catch (error) {
            this.stopRecording();
            Utils.showNotification('Could not start voice recording', 'error');
        }
    }

    stopRecording() {
        this.isRecording = false;
        const voiceBtn = document.getElementById('voiceInput');
        voiceBtn.classList.remove('recording');
        voiceBtn.textContent = '🎤 Voice Input';
    }

    async handleImageUpload(files) {
        const validFiles = files.filter(Utils.isValidMedicalImage);
        
        if (validFiles.length === 0) {
            Utils.showNotification('Please select valid image files (JPEG, PNG, WebP)', 'warning');
            return;
        }

        const imagePreview = document.getElementById('imagePreview');
        
        for (const file of validFiles) {
            // Compress image
            const compressedFile = await Utils.compressImage(file);
            this.uploadedImages.push(compressedFile);
            
            // Create preview
            this.createImagePreview(compressedFile, imagePreview);
        }

        // Clear input
        document.getElementById('imageInput').value = '';
        this.validateForm();
    }

    createImagePreview(file, container) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.alt = 'Medical image';
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'image-remove';
        removeBtn.textContent = '×';
        removeBtn.title = 'Remove image';
        
        removeBtn.addEventListener('click', () => {
            const index = this.uploadedImages.indexOf(file);
            if (index > -1) {
                this.uploadedImages.splice(index, 1);
            }
            imageItem.remove();
            URL.revokeObjectURL(img.src); // Clean up
            this.validateForm();
        });
        
        imageItem.appendChild(img);
        imageItem.appendChild(removeBtn);
        container.appendChild(imageItem);
    }

    validateForm() {
        const symptoms = document.getElementById('symptoms').value;
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        const isValid = Utils.validateSymptoms(symptoms);
        analyzeBtn.disabled = !isValid;
        
        return isValid;
    }

    collectPatientData() {
        return {
            age: document.getElementById('patientAge').value,
            gender: document.getElementById('patientGender').value,
            symptoms: Utils.sanitizeInput(document.getElementById('symptoms').value),
            images: this.uploadedImages,
            language: this.currentLanguage,
            timestamp: new Date().toISOString()
        };
    }

    async analyzePatient() {
        if (!this.validateForm()) {
            Utils.showNotification('Please provide valid symptom description', 'warning');
            return;
        }

        const patientData = this.collectPatientData();
        
        this.showLoading(true);
        this.setAnalyzeButtonState(false);

        try {
            const analysis = await this.medicalAI.analyzePatient(patientData);
            
            if (analysis.success === false) {
                throw new Error(analysis.message);
            }

            this.displayResults(analysis);
            Utils.showNotification('Analysis completed successfully', 'success');
            
        } catch (error) {
            console.error('Analysis failed:', error);
            Utils.showNotification('Analysis failed. Please try again.', 'error');
            this.displayErrorState(error.message);
        } finally {
            this.showLoading(false);
            this.setAnalyzeButtonState(true);
        }
    }

    showLoading(show) {
        document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
    }

    setAnalyzeButtonState(enabled) {
        const btn = document.getElementById('analyzeBtn');
        btn.disabled = !enabled;
        btn.textContent = enabled ? '🔍 Analyze Symptoms' : 'Analyzing...';
    }

    displayResults(analysis) {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';
        
        this.displayRiskAssessment(analysis.riskAssessment);
        this.displayConditions(analysis.conditions);
        this.displayTreatments(analysis.treatments);
        this.displayReferralAdvice(analysis.referral);
        
        // Smooth scroll to results
        setTimeout(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    displayRiskAssessment(risk) {
        const indicator = document.getElementById('riskIndicator');
        const description = document.getElementById('riskDescription');
        const meter = indicator.querySelector('.risk-meter');
        
        // Set risk level and animation
        meter.className = `risk-meter risk-${risk.level.toLowerCase()}`;
        
        // Animate risk meter
        setTimeout(() => {
            meter.style.width = `${risk.score}%`;
        }, 200);
        
        description.textContent = risk.description;
    }

    displayConditions(conditions) {
        const container = document.getElementById('conditionsList');
        container.innerHTML = '';
        
        if (!conditions || conditions.length === 0) {
            container.innerHTML = '<p>No specific conditions identified.</p>';
            return;
        }

        conditions.forEach((condition, index) => {
            const conditionDiv = document.createElement('div');
            conditionDiv.className = 'condition-item';
            conditionDiv.style.opacity = '0';
            
            conditionDiv.innerHTML = `
                <div class="condition-name">${condition.name}</div>
                <div class="condition-probability">Probability: ${condition.probability}%</div>
                <div class="condition-description">${condition.description}</div>
            `;
            
            container.appendChild(conditionDiv);
            
            // Stagger animations
            setTimeout(() => {
                conditionDiv.style.transition = 'opacity 0.5s ease';
                conditionDiv.style.opacity = '1';
            }, index * 150);
        });
    }

    displayTreatments(treatments) {
        const container = document.getElementById('treatmentPlan');
        container.innerHTML = '';
        
        if (!treatments || treatments.length === 0) {
            container.innerHTML = '<p>No specific treatments recommended at this time.</p>';
            return;
        }

        treatments.forEach((treatment, index) => {
            const treatmentDiv = document.createElement('div');
            treatmentDiv.className = 'treatment-item';
            treatmentDiv.style.opacity = '0';
            
            const actionsList = treatment.actions
                .map(action => `<li>${action}</li>`)
                .join('');
            
            const suppliesList = treatment.supplies_needed && treatment.supplies_needed.length > 0
                ? `<p class="supplies-needed"><strong>Supplies needed:</strong> ${treatment.supplies_needed.join(', ')}</p>`
                : '';
            
            treatmentDiv.innerHTML = `
                <div class="treatment-category">${treatment.category.replace(/_/g, ' ')}</div>
                <ul class="treatment-actions">${actionsList}</ul>
                ${suppliesList}
            `;
            
            container.appendChild(treatmentDiv);
            
            // Stagger animations
            setTimeout(() => {
                treatmentDiv.style.transition = 'opacity 0.5s ease';
                treatmentDiv.style.opacity = '1';
            }, index * 200);
        });
    }

    displayReferralAdvice(referral) {
        const container = document.getElementById('referralAdvice');
        
        let className = 'referral-none';
        if (referral.urgency === 'immediate') {
            className = 'referral-urgent';
        } else if (referral.urgency === 'routine') {
            className = 'referral-routine';
        }
        
        container.className = `referral-advice ${className}`;
        
        const urgencyText = referral.needed 
            ? `Referral ${referral.urgency === 'immediate' ? 'URGENT' : 'recommended'}: `
            : 'No referral needed: ';
            
        container.innerHTML = `<strong>${urgencyText}</strong>${referral.reason}`;
    }

    displayErrorState(message) {
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.style.display = 'block';
        resultsSection.innerHTML = `
            <div class="error-state">
                <h3>Analysis Error</h3>
                <p>${message}</p>
                <p>Please try again or consult with a healthcare professional.</p>
            </div>
        `;
        
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        
        if (this.recognition) {
            // Update speech recognition language
            const langCodes = {
                'en': 'en-US',
                'es': 'es-ES', 
                'fr': 'fr-FR',
                'hi': 'hi-IN',
                'sw': 'sw-KE'
            };
            this.recognition.lang = langCodes[lang] || 'en-US';
        }
        
        Utils.showNotification(`Language changed to ${lang.toUpperCase()}`, 'info');
    }

    // Reset form for new patient
    resetForm() {
        document.getElementById('patientAge').value = '';
        document.getElementById('patientGender').value = '';
        document.getElementById('symptoms').value = '';
        
        // Clear images
        this.uploadedImages = [];
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('imageInput').value = '';
        
        // Hide results
        document.getElementById('resultsSection').style.display = 'none';
        
        this.validateForm();
        Utils.showNotification('Form reset for new patient', 'info');
    }

    // Add reset button functionality
    addResetButton() {
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '🔄 New Patient';
        resetBtn.className = 'reset-btn';
        resetBtn.addEventListener('click', () => this.resetForm());
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.parentNode.insertBefore(resetBtn, analyzeBtn.nextSibling);
    }
}

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.ruralHealthApp = new RuralHealthApp();
});

// Add some additional CSS for error states and reset button
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .error-state {
        background: #fef2f2;
        border: 2px solid #ef4444;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        color: #991b1b;
    }
    
    .reset-btn {
        width: 100%;
        background: #64748b;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        margin-top: 10px;
        transition: background-color 0.2s ease;
    }
    
    .reset-btn:hover {
        background: #475569;
    }
    
    .supplies-needed {
        margin-top: 10px;
        font-size: 0.9rem;
        color: #475569;
        font-style: italic;
    }
`;
document.head.appendChild(additionalStyles);