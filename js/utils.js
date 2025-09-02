class Utils {
    // Compress images for upload
    static compressImage(file, maxWidth = 800, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
                canvas.width = img.width * ratio;
                canvas.height = img.height * ratio;
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    // Convert image to base64
    static imageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
        });
    }

    // Sanitize user input
    static sanitizeInput(input) {
        if (!input || typeof input !== 'string') return '';
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                   .replace(/[<>]/g, '')
                   .trim();
    }

    // Validate medical input
    static validateSymptoms(symptoms) {
        return symptoms && 
               typeof symptoms === 'string' && 
               symptoms.trim().length >= 10 &&
               symptoms.trim().length <= 2000;
    }

    // Validate patient age
    static validateAge(age) {
        const numAge = parseInt(age);
        return !isNaN(numAge) && numAge > 0 && numAge <= 120;
    }

    // Debounce function calls
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Format dates for medical records
    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Generate unique ID for sessions
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Check if file is valid medical image
    static isValidMedicalImage(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        return validTypes.includes(file.type) && 
               file.size <= maxSize && 
               file.size > 0;
    }

    // Handle errors gracefully
    static handleError(error, context = '') {
        console.error(`Error ${context}:`, error);
        
        const userMessage = error.message || 'An unexpected error occurred';
        return {
            success: false,
            message: userMessage,
            timestamp: new Date().toISOString()
        };
    }

    // Show user notifications
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            background: ${type === 'error' ? '#ef4444' : 
                        type === 'success' ? '#10b981' : 
                        type === 'warning' ? '#f59e0b' : '#2563eb'};
        `;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    // Parse API responses safely
    static parseJSON(jsonString, fallback = {}) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON parse error:', error);
            return fallback;
        }
    }

    // Throttle function calls
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Add slide-in animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);

window.Utils = Utils;