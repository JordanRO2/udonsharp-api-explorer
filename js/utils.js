// Utility functions module

export const Utils = {
    // Format type names for display
    formatTypeName(udonType) {
        if (!udonType) return 'void';
        
        const mappings = {
            'SystemVoid': 'void',
            'SystemString': 'string',
            'SystemInt32': 'int',
            'SystemInt64': 'long',
            'SystemSingle': 'float',
            'SystemDouble': 'double',
            'SystemBoolean': 'bool',
            'SystemObject': 'object',
            'SystemByte': 'byte',
            'SystemChar': 'char',
            'SystemUInt32': 'uint',
            'SystemUInt64': 'ulong',
            'UnityEngineVector3': 'Vector3',
            'UnityEngineVector2': 'Vector2',
            'UnityEngineVector4': 'Vector4',
            'UnityEngineQuaternion': 'Quaternion',
            'UnityEngineTransform': 'Transform',
            'UnityEngineGameObject': 'GameObject',
            'UnityEngineColor': 'Color',
            'UnityEngineColor32': 'Color32',
            'UnityEngineMatrix4x4': 'Matrix4x4',
            'UnityEngineRay': 'Ray',
            'UnityEngineRect': 'Rect',
            'UnityEngineBounds': 'Bounds',
            'VRCSDKBaseVRCPlayerApi': 'VRCPlayerApi'
        };
        
        // Try direct mapping first
        if (mappings[udonType]) {
            return mappings[udonType];
        }
        
        // Clean up common prefixes
        let cleaned = udonType;
        cleaned = cleaned.replace(/^System/, '');
        cleaned = cleaned.replace(/^UnityEngine/, '');
        cleaned = cleaned.replace(/^VRCSDKBase/, '');
        cleaned = cleaned.replace(/^Cinemachine/, '');
        cleaned = cleaned.replace(/^TMPro/, '');
        
        // Handle underscores in parameters
        if (cleaned.includes('_')) {
            const parts = cleaned.split('_');
            return parts.map(p => this.formatTypeName(p)).join(', ');
        }
        
        return cleaned || udonType;
    },

    // Get type icon based on kind
    getTypeIcon(kind) {
        const icons = {
            'class': '📦',
            'struct': '📐',
            'enum': '🔢',
            'interface': '🔌',
            'array': '📚'
        };
        return icons[kind] || '📄';
    },

    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Copied to clipboard!');
        }
    },

    // Show notification
    showNotification(message) {
        const existing = document.querySelector('.copy-notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    },

    // Escape string for HTML attribute
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Debounce function
    debounce(func, wait) {
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
};