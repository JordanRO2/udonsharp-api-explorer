// UdonSharp API Explorer - Main Application
// This version works with embedded data for GitHub Pages

// Global variables
let apiData = null;
let allUdonNames = [];
let currentType = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    try {
        // Use the embedded data from data.js
        if (typeof API_DATA === 'undefined' || typeof ALL_UDON_NAMES === 'undefined') {
            throw new Error('Data not loaded. Make sure data.js is included before app.js');
        }
        
        apiData = API_DATA;
        allUdonNames = ALL_UDON_NAMES;
        
        console.log('📂 API Data loaded:', apiData);
        console.log('📝 Udon names loaded:', allUdonNames.length, 'names');
        console.log('Sample Udon names:', allUdonNames.slice(0, 5));
        
        // Process Udon names to populate members
        processUdonNames();
        
        // Update statistics
        updateStats();
        
        // Build namespace tree with filter
        buildNamespaceTree();
        
        // Set export date
        document.getElementById('exportDate').textContent = apiData.exportDate;
        
        // Setup event listeners
        setupEventListeners();
        
        // Hide loading, show welcome
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'block';
        
        console.log('✅ UdonSharp API Explorer loaded successfully!');
        console.log(`📊 Loaded ${apiData.totalTypes} types with ${apiData.totalMembers} members`);
        console.log(`📝 Loaded ${allUdonNames.length} Udon method names`);
        
    } catch (error) {
        console.error('❌ Error initializing app:', error);
        document.getElementById('loadingScreen').innerHTML = `
            <div class="error-message">
                <h3>Error Loading Data</h3>
                <p>${error.message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
    }
}

function processUdonNames() {
    // Group Udon names by type and populate members
    allUdonNames.forEach(udonName => {
        if (!udonName) return;
        
        // Parse Udon name format: TypeName.__methodName__ReturnType
        const parts = udonName.split('__');
        if (parts.length >= 2) {
            const typeName = parts[0];
            const memberInfo = parts[1];
            const returnType = parts[2] || '';
            
            // Find the type in our data
            const type = findTypeByUdonName(typeName);
            
            if (type) {
                if (!type.members) type.members = [];
                
                // Determine member type
                let memberType = 'Method';
                if (memberInfo === 'ctor') {
                    memberType = 'Constructor';
                } else if (memberInfo.startsWith('get_') || memberInfo.startsWith('set_')) {
                    memberType = 'Property';
                } else if (memberInfo === 'Get' || memberInfo === 'Set' || memberInfo === 'Address') {
                    memberType = 'Array';
                }
                
                type.members.push({
                    name: memberInfo,
                    udonName: udonName,
                    memberType: memberType,
                    isExposed: true,
                    returnType: returnType,
                    signature: formatSignature(memberInfo, returnType)
                });
            }
        }
    });
}

function findTypeByUdonName(udonTypeName) {
    // Search for type by Udon name pattern
    for (const namespace in apiData.typesByNamespace) {
        for (const type of apiData.typesByNamespace[namespace]) {
            const typeUdonName = type.fullName.replace(/\./g, '');
            if (typeUdonName === udonTypeName || 
                typeUdonName === udonTypeName.replace('Array', '[]') ||
                type.fullName === udonTypeName) {
                return type;
            }
        }
    }
    return null;
}

function formatSignature(memberName, returnType) {
    if (memberName === 'ctor') {
        return 'Constructor()';
    } else if (memberName.startsWith('get_')) {
        return `get ${memberName.substring(4)}`;
    } else if (memberName.startsWith('set_')) {
        return `set ${memberName.substring(4)}`;
    } else {
        return `${memberName}() : ${formatTypeName(returnType) || 'void'}`;
    }
}

function updateStats() {
    document.getElementById('totalTypes').textContent = apiData.totalTypes.toLocaleString();
    document.getElementById('exposedTypes').textContent = apiData.exposedTypes.toLocaleString();
    document.getElementById('totalMembers').textContent = apiData.totalMembers.toLocaleString();
    document.getElementById('exposedMembers').textContent = apiData.exposedMembers.toLocaleString();
}

function buildNamespaceTree() {
    const treeContainer = document.getElementById('namespaceTree');
    treeContainer.innerHTML = '';
    
    const showOnlyExposed = document.getElementById('filterExposed')?.checked ?? true;
    const namespaces = Object.keys(apiData.typesByNamespace).sort();
    
    namespaces.forEach(namespace => {
        const allTypes = apiData.typesByNamespace[namespace];
        const types = showOnlyExposed ? allTypes.filter(t => t.isExposed) : allTypes;
        
        if (types.length === 0) return; // Skip empty namespaces
        
        const exposedCount = allTypes.filter(t => t.isExposed).length;
        
        const namespaceDiv = document.createElement('div');
        namespaceDiv.className = 'namespace-node';
        
        const header = document.createElement('div');
        header.className = 'namespace-header';
        header.innerHTML = `
            <span class="expand-icon">▶</span>
            <span class="namespace-name">${namespace || 'Global'}</span>
            <span class="namespace-count">${exposedCount}/${allTypes.length}</span>
        `;
        header.onclick = () => toggleNamespace(namespaceDiv);
        
        const typesList = document.createElement('div');
        typesList.className = 'namespace-types collapsed';
        
        types.sort((a, b) => a.name.localeCompare(b.name)).forEach(type => {
            const typeDiv = document.createElement('div');
            typeDiv.className = `type-item ${type.isExposed ? 'exposed' : 'not-exposed'}`;
            typeDiv.innerHTML = `
                <span class="type-icon">${getTypeIcon(type.kind)}</span>
                <span class="type-name" title="${type.fullName}">${type.name}</span>
                <span class="member-badge">${type.exposedMemberCount}/${type.memberCount}</span>
            `;
            typeDiv.onclick = () => loadType(type.fullName);
            typesList.appendChild(typeDiv);
        });
        
        namespaceDiv.appendChild(header);
        namespaceDiv.appendChild(typesList);
        treeContainer.appendChild(namespaceDiv);
    });
}

function toggleNamespace(namespaceDiv) {
    const typesList = namespaceDiv.querySelector('.namespace-types');
    const icon = namespaceDiv.querySelector('.expand-icon');
    
    if (typesList.classList.contains('collapsed')) {
        typesList.classList.remove('collapsed');
        icon.textContent = '▼';
    } else {
        typesList.classList.add('collapsed');
        icon.textContent = '▶';
    }
}

function getTypeIcon(kind) {
    const icons = {
        'class': '📦',
        'struct': '📐',
        'enum': '🔢',
        'interface': '🔌',
        'array': '📚'
    };
    return icons[kind] || '📄';
}

function loadType(fullName) {
    console.log('loadType called with:', fullName);
    
    // First try the flat map
    let type = apiData.types[fullName];
    
    if (!type) {
        // Try to find in nested structure
        for (const namespace in apiData.typesByNamespace) {
            const found = apiData.typesByNamespace[namespace].find(t => t.fullName === fullName);
            if (found) {
                type = found;
                break;
            }
        }
    }
    
    if (!type) {
        console.error('Type not found:', fullName);
        alert(`Type not found: ${fullName}`);
        return;
    }
    
    currentType = type;
    displayType(type);
    
    // Clear search input when navigating to a type
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}

function displayType(type) {
    // Hide other screens, show type details
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('typeDetails').style.display = 'block';
    
    // Update type header
    document.getElementById('typeKind').textContent = type.kind.toUpperCase();
    document.getElementById('typeName').textContent = type.name;
    document.getElementById('typeStatus').textContent = type.isExposed ? '✅ Exposed' : '❌ Not Exposed';
    document.getElementById('typeStatus').className = `type-status ${type.isExposed ? 'exposed' : 'not-exposed'}`;
    
    // Update type info
    document.getElementById('typeFullName').textContent = type.fullName;
    document.getElementById('typeNamespace').textContent = type.namespace || 'Global';
    document.getElementById('typeMemberCount').textContent = `${type.exposedMemberCount} exposed / ${type.memberCount} total`;
    
    // Load members
    loadTypeMembers(type);
}

function loadTypeMembers(type) {
    const constructors = [];
    const methods = [];
    const properties = [];
    const fields = [];
    
    console.log(`Loading members for: ${type.fullName}`);
    
    // Check if the type has members data from JSON
    if (type.members && type.members.length > 0) {
        console.log(`Found ${type.members.length} members in JSON data`);
        
        // Process members from JSON data
        type.members.forEach(member => {
            const memberData = {
                name: member.name,
                udonName: member.udonName || '',
                returnType: member.returnType || 'void',
                isExposed: member.isExposed,
                isStatic: member.isStatic,
                signature: member.signature
            };
            
            // Categorize by member type
            if (member.memberType === 'Constructor' || member.name === 'Constructor') {
                constructors.push(memberData);
            } else if (member.memberType === 'Method') {
                methods.push(memberData);
            } else if (member.memberType === 'Property') {
                // Group properties by name
                const baseName = member.name.replace(' (get)', '').replace(' (set)', '');
                let existing = properties.find(p => p.name === baseName);
                
                if (existing) {
                    if (member.name.includes('(get)')) {
                        existing.hasGetter = true;
                        existing.getterUdon = member.udonName;
                        if (!existing.returnType || existing.returnType === 'void') {
                            existing.returnType = member.returnType;
                        }
                    } else if (member.name.includes('(set)')) {
                        existing.hasSetter = true;
                        existing.setterUdon = member.udonName;
                    }
                    // Update exposure status - exposed if any accessor is exposed
                    existing.isExposed = existing.isExposed || member.isExposed;
                } else {
                    const propData = {
                        name: baseName,
                        udonName: member.udonName,
                        returnType: member.returnType,
                        isExposed: member.isExposed,
                        isStatic: member.isStatic,
                        hasGetter: member.name.includes('(get)'),
                        hasSetter: member.name.includes('(set)'),
                        signature: member.signature
                    };
                    
                    if (member.name.includes('(get)')) {
                        propData.getterUdon = member.udonName;
                    } else if (member.name.includes('(set)')) {
                        propData.setterUdon = member.udonName;
                    }
                    
                    properties.push(propData);
                }
            } else if (member.memberType === 'Field') {
                // Group fields by name
                const baseName = member.name.replace(' (get)', '').replace(' (set)', '');
                let existing = fields.find(f => f.name === baseName);
                
                if (existing) {
                    if (member.name.includes('(get)')) {
                        existing.hasGetter = true;
                        existing.getterUdon = member.udonName;
                        if (!existing.returnType || existing.returnType === 'void') {
                            existing.returnType = member.returnType;
                        }
                    } else if (member.name.includes('(set)')) {
                        existing.hasSetter = true;
                        existing.setterUdon = member.udonName;
                    }
                    // Update exposure status
                    existing.isExposed = existing.isExposed || member.isExposed;
                } else {
                    const fieldData = {
                        name: baseName,
                        udonName: member.udonName,
                        returnType: member.returnType,
                        isExposed: member.isExposed,
                        isStatic: member.isStatic,
                        hasGetter: member.name.includes('(get)'),
                        hasSetter: member.name.includes('(set)'),
                        signature: member.signature
                    };
                    
                    if (member.name.includes('(get)')) {
                        fieldData.getterUdon = member.udonName;
                    } else if (member.name.includes('(set)')) {
                        fieldData.setterUdon = member.udonName;
                    }
                    
                    fields.push(fieldData);
                }
            }
        });
    } else {
        console.log('No members found in JSON data for this type');
    }
    
    // Sort members alphabetically
    constructors.sort((a, b) => a.name.localeCompare(b.name));
    methods.sort((a, b) => a.name.localeCompare(b.name));
    properties.sort((a, b) => a.name.localeCompare(b.name));
    fields.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Categorized: ${constructors.length} constructors, ${methods.length} methods, ${properties.length} properties, ${fields.length} fields`);
    
    // Display members with filtering
    const showOnlyExposed = document.getElementById('filterExposed')?.checked ?? false;
    
    displayMembers('constructorList', 
        showOnlyExposed ? constructors.filter(m => m.isExposed) : constructors, 
        'constructorCount');
    displayMembers('methodList', 
        showOnlyExposed ? methods.filter(m => m.isExposed) : methods, 
        'methodCount');
    displayMembers('propertyList', 
        showOnlyExposed ? properties.filter(m => m.isExposed) : properties, 
        'propertyCount');
    displayMembers('fieldList', 
        showOnlyExposed ? fields.filter(m => m.isExposed) : fields, 
        'fieldCount');
}

function displayMembers(containerId, members, countId) {
    const container = document.getElementById(containerId);
    const count = document.getElementById(countId);
    
    container.innerHTML = '';
    count.textContent = `(${members.length})`;
    
    if (members.length === 0) {
        container.innerHTML = '<div class="no-members">No members found</div>';
        return;
    }
    
    members.forEach(member => {
        const memberDiv = document.createElement('div');
        memberDiv.className = `member-item ${member.isExposed ? 'exposed' : 'not-exposed'}`;
        
        let displayName = member.name;
        let csharpSyntax = '';
        
        // Generate C# syntax based on member type
        if (member.memberType === 'Constructor' || member.name === 'Constructor') {
            // Extract just the type name without namespace
            const typeName = currentType ? currentType.name.split('+').pop() : 'TypeName';
            // Parse constructor parameters if available
            let params = '';
            if (member.signature && member.signature.includes('(')) {
                const match = member.signature.match(/\((.*?)\)/);
                params = match ? match[1] : '';
            }
            csharpSyntax = `${typeName} instance = new ${typeName}(${params});`;
        } else if (member.memberType === 'Method') {
            // Extract method name and parameters from signature
            const methodName = member.name.replace('op_', 'operator ');
            let paramList = '';
            
            if (member.signature && member.signature.includes('(')) {
                const params = member.signature.match(/\((.*?)\)/);
                paramList = params ? params[1] : '';
            }
            
            // Generate C# syntax examples
            const objName = currentType ? currentType.name.toLowerCase().replace(/[^a-z]/g, '') : 'obj';
            const returnTypeStr = formatTypeName(member.returnType || 'void');
            
            // For common methods, show typical usage
            if (methodName === 'Equals') {
                csharpSyntax = `bool result = ${objName}.Equals(otherObject);`;
            } else if (methodName === 'GetHashCode') {
                csharpSyntax = `int hash = ${objName}.GetHashCode();`;
            } else if (methodName === 'GetType') {
                csharpSyntax = `Type type = ${objName}.GetType();`;
            } else if (methodName === 'ToString') {
                csharpSyntax = `string str = ${objName}.ToString();`;
            } else if (methodName.startsWith('Get')) {
                // Getter-style methods
                const varType = returnTypeStr !== 'void' ? returnTypeStr : 'var';
                csharpSyntax = paramList ? 
                    `${varType} result = ${objName}.${methodName}(${paramList});` :
                    `${varType} result = ${objName}.${methodName}();`;
            } else if (methodName.startsWith('Set')) {
                // Setter-style methods
                csharpSyntax = paramList ? 
                    `${objName}.${methodName}(${paramList});` :
                    `${objName}.${methodName}(value);`;
            } else if (returnTypeStr !== 'void') {
                // Methods with return values
                const varType = returnTypeStr;
                csharpSyntax = paramList ? 
                    `${varType} result = ${objName}.${methodName}(${paramList});` :
                    `${varType} result = ${objName}.${methodName}();`;
            } else {
                // Void methods
                csharpSyntax = paramList ? 
                    `${objName}.${methodName}(${paramList});` :
                    `${objName}.${methodName}();`;
            }
        } else if (member.memberType === 'Property') {
                // For properties, show both get and set syntax if applicable
                const propName = member.name.replace(' (get)', '').replace(' (set)', '');
                if (member.hasGetter && member.hasSetter) {
                    displayName = `${propName} { get; set; }`;
                    csharpSyntax = `// Get: var value = obj.${propName};\n// Set: obj.${propName} = value;`;
                } else if (member.hasGetter) {
                    displayName = `${propName} { get; }`;
                    csharpSyntax = `var value = obj.${propName};`;
                } else if (member.hasSetter) {
                    displayName = `${propName} { set; }`;
                    csharpSyntax = `obj.${propName} = value;`;
                } else if (member.name.includes('(get)')) {
                    displayName = `${propName} { get; }`;
                    csharpSyntax = `var value = obj.${propName};`;
                } else if (member.name.includes('(set)')) {
                    displayName = `${propName} { set; }`;
                    csharpSyntax = `obj.${propName} = value;`;
                }
            } else if (member.memberType === 'Field') {
                // For fields
                const fieldName = member.name.replace(' (get)', '').replace(' (set)', '');
                const objName = currentType ? currentType.name.toLowerCase().replace(/[^a-z]/g, '') : 'obj';
                const fieldType = formatTypeName(member.returnType || 'var');
                
                if (member.hasGetter && member.hasSetter) {
                    displayName = `${fieldName} { get; set; }`;
                    csharpSyntax = `// Get value\n${fieldType} value = ${objName}.${fieldName};\n// Set value\n${objName}.${fieldName} = newValue;`;
                } else if (member.hasGetter || member.name.includes('(get)')) {
                    displayName = `${fieldName} { get; }`;
                    csharpSyntax = `${fieldType} value = ${objName}.${fieldName};`;
                } else if (member.hasSetter || member.name.includes('(set)')) {
                    displayName = `${fieldName} { set; }`;
                    csharpSyntax = `${objName}.${fieldName} = value;`;
                } else {
                    // Simple field
                    displayName = fieldName;
                    csharpSyntax = `${fieldType} value = ${objName}.${fieldName};`;
                }
            }
        }
        
        // Build the content based on member type
        let udonContent = '';
        
        // Helper function to escape quotes for HTML attributes
        const escapeQuotes = (str) => {
            if (!str) return '';
            return str.replace(/\\/g, '\\\\').replace(/'/g, '\\\'');
        };
        
        if (member.getterUdon && member.setterUdon) {
            // Property with both getter and setter
            const escapedGetter = escapeQuotes(member.getterUdon);
            const escapedSetter = escapeQuotes(member.setterUdon);
            udonContent = `
                ${csharpSyntax ? `<div class="member-csharp"><code>${csharpSyntax.replace(/\n/g, '<br>')}</code></div>` : ''}
                <div class="member-udon">
                    <span class="udon-label">Udon getter:</span>
                    <code class="udon-name" onclick="copyToClipboard('${escapedGetter}')">${member.getterUdon}</code>
                </div>
                <div class="member-udon">
                    <span class="udon-label">Udon setter:</span>
                    <code class="udon-name" onclick="copyToClipboard('${escapedSetter}')">${member.setterUdon}</code>
                </div>
            `;
        } else if (member.udonName) {
            // Single Udon name (method, constructor, or property with only get/set)
            const escapedName = escapeQuotes(member.udonName);
            udonContent = `
                ${csharpSyntax ? `<div class="member-csharp"><code>${csharpSyntax.replace(/\n/g, '<br>')}</code></div>` : ''}
                <div class="member-udon">
                    <span class="udon-label">Udon name:</span>
                    <code class="udon-name" onclick="copyToClipboard('${escapedName}')">${member.udonName}</code>
                </div>
            `;
        } else {
            // No Udon name (not exposed)
            udonContent = `
                ${csharpSyntax ? `<div class="member-csharp"><code>${csharpSyntax.replace(/\n/g, '<br>')}</code></div>` : ''}
                <div class="member-not-exposed">Not exposed to Udon</div>
            `;
        }
        
        memberDiv.innerHTML = `
            <div class="member-header">
                <span class="member-status">${member.isExposed ? '✅' : '❌'}</span>
                <span class="member-name">${displayName}</span>
                ${member.returnType && member.returnType !== 'void' ? 
                  `<span class="member-return">→ ${formatTypeName(member.returnType)}</span>` : ''}
            </div>
            ${udonContent}
        `;
        
        container.appendChild(memberDiv);
    });
}

function formatMemberDisplay(member) {
    let name = member.name;
    
    if (name.startsWith('get_')) {
        return `${name.substring(4)} { get; }`;
    } else if (name.startsWith('set_')) {
        return `${name.substring(4)} { set; }`;
    } else if (name === 'ctor') {
        return 'Constructor';
    }
    
    return name;
}

function formatTypeName(udonType) {
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
    
    // Handle underscores in parameters (e.g., SystemInt32_SystemString)
    if (cleaned.includes('_')) {
        const parts = cleaned.split('_');
        return parts.map(p => formatTypeName(p)).join(', ');
    }
    
    return cleaned || udonType;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary notification
        const notification = document.createElement('div');
        notification.className = 'copy-notification';
        notification.textContent = 'Copied to clipboard!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
    
    // Filter checkboxes
    document.getElementById('filterExposed')?.addEventListener('change', () => {
        buildNamespaceTree(); // Rebuild tree with filter
        if (searchInput.value) {
            performSearch(searchInput.value);
        }
        // Also refresh current type display if viewing a type
        if (currentType) {
            loadTypeMembers(currentType);
        }
    });
    
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            performSearch('');
        }
    });
}

function performSearch(query) {
    if (!query || query.length < 2) {
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'block';
        document.getElementById('typeDetails').style.display = 'none';
        return;
    }
    
    const filterExposed = document.getElementById('filterExposed').checked;
    
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    // Search in type names and their members
    for (const namespace in apiData.typesByNamespace) {
        apiData.typesByNamespace[namespace].forEach(type => {
            // Search in type name
            if (type.name.toLowerCase().includes(lowerQuery) ||
                type.fullName.toLowerCase().includes(lowerQuery)) {
                if (!filterExposed || type.isExposed) {
                    results.push({
                        isType: true,
                        fullName: type.fullName,
                        name: type.name,
                        namespace: namespace,
                        kind: type.kind,
                        isExposed: type.isExposed,
                        memberCount: type.memberCount,
                        exposedMemberCount: type.exposedMemberCount
                    });
                }
            }
            
            // Search in members
            if (type.members && type.members.length > 0) {
                type.members.forEach(member => {
                    // Check if member matches the search
                    const memberNameLower = member.name.toLowerCase();
                    const udonNameLower = (member.udonName || '').toLowerCase();
                    
                    if (memberNameLower.includes(lowerQuery) || 
                        udonNameLower.includes(lowerQuery) ||
                        (member.signature && member.signature.toLowerCase().includes(lowerQuery))) {
                        
                        // Apply exposed filter
                        if (!filterExposed || member.isExposed) {
                            results.push({
                                isMember: true,
                                typeName: type.name,
                                typeFullName: type.fullName,
                                memberName: member.name,
                                memberType: member.memberType,
                                udonName: member.udonName || '',
                                returnType: member.returnType,
                                isExposed: member.isExposed,
                                signature: member.signature
                            });
                        }
                    }
                });
            }
        });
    }
    
    displaySearchResults(results);
}

function isMethod(memberName) {
    return !memberName.startsWith('get_') && !memberName.startsWith('set_') && memberName !== 'ctor';
}

function isProperty(memberName) {
    return memberName.startsWith('get_') || memberName.startsWith('set_');
}

function displaySearchResults(results) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('welcomeScreen').style.display = 'none';
    document.getElementById('typeDetails').style.display = 'none';
    document.getElementById('searchResults').style.display = 'block';
    
    const container = document.getElementById('searchResultsList');
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }
    
    container.innerHTML = `<div class="results-count">Found ${results.length} results</div>`;
    
    // Group results by type
    const typeResults = results.filter(r => r.isType);
    const memberResults = results.filter(r => r.isMember);
    
    // Display type results first
    if (typeResults.length > 0) {
        const typeSection = document.createElement('div');
        typeSection.className = 'results-section';
        typeSection.innerHTML = '<h3>Types</h3>';
        
        const typeContainer = document.createElement('div');
        
        typeResults.slice(0, 20).forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result-item type-result';
            resultDiv.innerHTML = `
                <span class="type-icon">${getTypeIcon(result.kind)}</span>
                <span class="result-type-name">${result.name}</span>
                <span class="result-namespace">${result.namespace}</span>
                <span class="member-badge">${result.exposedMemberCount}/${result.memberCount}</span>
                <span class="result-status">${result.isExposed ? '✅' : '❌'}</span>
            `;
            resultDiv.style.cursor = 'pointer';
            resultDiv.onclick = () => {
                console.log('Loading type:', result.fullName);
                loadType(result.fullName);
            };
            typeContainer.appendChild(resultDiv);
        });
        
        typeSection.appendChild(typeContainer);
        container.appendChild(typeSection);
    }
    
    // Display member results
    if (memberResults.length > 0) {
        const memberSection = document.createElement('div');
        memberSection.className = 'results-section';
        memberSection.innerHTML = '<h3>Members</h3>';
        
        const memberContainer = document.createElement('div');
        
        memberResults.slice(0, 50).forEach(result => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result-item member-result';
            
            // Format member display based on type
            let displayName = result.memberName;
            if (result.memberName.includes('(get)') || result.memberName.includes('(set)')) {
                displayName = result.memberName;
            } else if (result.memberType === 'Constructor') {
                displayName = 'Constructor';
            }
            
            resultDiv.innerHTML = `
                <div class="result-header">
                    <span class="result-status">${result.isExposed ? '✅' : '❌'}</span>
                    <span class="result-type">${result.typeName}</span>
                    <span class="result-member-type">[${result.memberType}]</span>
                </div>
                <div class="result-member">${displayName}</div>
                ${result.udonName ? `
                    <div class="result-udon">
                        <code onclick="copyToClipboard('${result.udonName.replace(/'/g, "\\'")}')">${result.udonName}</code>
                    </div>
                ` : '<div class="result-no-udon">No Udon name (not exposed)</div>'}
            `;
            
            // Click on the result to load the parent type
            resultDiv.onclick = (e) => {
                if (e.target.tagName !== 'CODE') {
                    loadType(result.typeFullName);
                }
            };
            
            memberContainer.appendChild(resultDiv);
        });
        
        memberSection.appendChild(memberContainer);
        container.appendChild(memberSection);
    }
    
    if (results.length > 70) {
        container.innerHTML += '<div class="more-results">Showing first 70 results. Please refine your search...</div>';
    }
}

// Make loadType globally available for onclick handlers
window.loadType = loadType;
window.copyToClipboard = copyToClipboard;