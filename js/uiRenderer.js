// UI Rendering module

import { Utils } from './utils.js';

export class UIRenderer {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    // Update statistics display
    updateStats() {
        const stats = this.dataManager.getStats();
        document.getElementById('totalTypes').textContent = stats.totalTypes.toLocaleString();
        document.getElementById('exposedTypes').textContent = stats.exposedTypes.toLocaleString();
        document.getElementById('totalMembers').textContent = stats.totalMembers.toLocaleString();
        document.getElementById('exposedMembers').textContent = stats.exposedMembers.toLocaleString();
    }

    // Build namespace tree
    buildNamespaceTree(onlyExposed = true, searchQuery = '') {
        const container = document.getElementById('namespaceTree');
        container.innerHTML = '';
        
        const namespaces = this.dataManager.getNamespaces();
        const lowerQuery = searchQuery.toLowerCase();
        
        namespaces.forEach(namespace => {
            const allTypes = this.dataManager.getTypesByNamespace(namespace);
            let types = this.dataManager.getTypesByNamespace(namespace, onlyExposed);
            
            // Filter types based on search query if provided
            if (searchQuery && searchQuery.length >= 2) {
                types = types.filter(type => 
                    type.name.toLowerCase().includes(lowerQuery) ||
                    type.fullName.toLowerCase().includes(lowerQuery) ||
                    namespace.toLowerCase().includes(lowerQuery)
                );
            }
            
            // Skip namespace if no types match after filtering
            if (types.length === 0) return;
            
            const exposedCount = allTypes.filter(t => t.isExposed).length;
            
            // Highlight namespace if it matches search
            const displayName = namespace || 'Global';
            const isNamespaceMatch = searchQuery && namespace.toLowerCase().includes(lowerQuery);
            
            const namespaceDiv = this.createNamespaceNode(
                displayName,
                exposedCount,
                allTypes.length,
                types,
                isNamespaceMatch
            );
            
            // Auto-expand if search is active and there are matching types
            if (searchQuery && types.length > 0) {
                const typesList = namespaceDiv.querySelector('.namespace-types');
                const icon = namespaceDiv.querySelector('.expand-icon');
                if (typesList && icon) {
                    typesList.classList.remove('collapsed');
                    icon.textContent = '▼';
                }
            }
            
            container.appendChild(namespaceDiv);
        });
        
        // Show message if no results
        if (container.children.length === 0 && searchQuery) {
            container.innerHTML = '<div class="no-results">No namespaces or types found</div>';
        }
    }

    // Create namespace node
    createNamespaceNode(namespace, exposedCount, totalCount, types, isHighlighted = false) {
        const div = document.createElement('div');
        div.className = 'namespace-node';
        
        const header = document.createElement('div');
        header.className = 'namespace-header' + (isHighlighted ? ' search-highlight' : '');
        header.innerHTML = `
            <span class="expand-icon">▶</span>
            <span class="namespace-name" title="${namespace}">${namespace}</span>
            <span class="namespace-count">${exposedCount}/${totalCount}</span>
        `;
        header.onclick = () => this.toggleNamespace(div);
        
        const typesList = document.createElement('div');
        typesList.className = 'namespace-types collapsed';
        
        types.sort((a, b) => a.name.localeCompare(b.name)).forEach(type => {
            const typeDiv = this.createTypeNode(type);
            typesList.appendChild(typeDiv);
        });
        
        div.appendChild(header);
        div.appendChild(typesList);
        
        return div;
    }

    // Create type node
    createTypeNode(type) {
        const div = document.createElement('div');
        div.className = `type-item ${type.isExposed ? 'exposed' : 'not-exposed'}`;
        div.innerHTML = `
            <span class="type-icon">${Utils.getTypeIcon(type.kind)}</span>
            <span class="type-name" title="${type.fullName}">${type.name}</span>
            <span class="member-badge">${type.exposedMemberCount}/${type.memberCount}</span>
        `;
        div.onclick = () => window.app.loadType(type.fullName);
        return div;
    }

    // Toggle namespace expansion
    toggleNamespace(namespaceDiv) {
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

    // Display type details
    displayType(type) {
        // Hide other screens
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('typeDetails').style.display = 'block';
        
        // Update header
        document.getElementById('typeKind').textContent = type.kind.toUpperCase();
        document.getElementById('typeName').textContent = type.name;
        document.getElementById('typeStatus').textContent = type.isExposed ? '✅ Exposed' : '❌ Not Exposed';
        document.getElementById('typeStatus').className = `type-status ${type.isExposed ? 'exposed' : 'not-exposed'}`;
        
        // Update info
        document.getElementById('typeFullName').textContent = Utils.cleanGenericType(type.fullName);
        document.getElementById('typeNamespace').textContent = type.namespace || 'Global';
        document.getElementById('typeMemberCount').textContent = 
            `${type.exposedMemberCount} exposed / ${type.memberCount} total`;
        
        // Display members
        this.displayTypeMembers(type);
    }

    // Display type members
    displayTypeMembers(type) {
        const onlyExposed = document.getElementById('filterExposed')?.checked ?? false;
        const members = this.dataManager.getTypeMembers(type, onlyExposed);
        
        this.displayMemberCategory('constructorList', members.constructors, 'constructorCount', type);
        this.displayMemberCategory('methodList', members.methods, 'methodCount', type);
        this.displayMemberCategory('propertyList', members.properties, 'propertyCount', type);
        this.displayMemberCategory('fieldList', members.fields, 'fieldCount', type);
    }

    // Display a category of members
    displayMemberCategory(containerId, members, countId, currentType) {
        const container = document.getElementById(containerId);
        const count = document.getElementById(countId);
        
        container.innerHTML = '';
        
        // Separate array members from regular members
        const regularMembers = members.filter(m => !m.isArrayMember);
        const arrayMembers = members.filter(m => m.isArrayMember);
        
        count.textContent = `(${members.length})`;
        
        if (members.length === 0) {
            container.innerHTML = '<div class="no-members">No members found</div>';
            return;
        }
        
        // Display regular members first
        if (regularMembers.length > 0) {
            regularMembers.forEach(member => {
                const memberElement = this.createMemberElement(member, currentType);
                container.appendChild(memberElement);
            });
        }
        
        // Display array members with a separator if both exist
        if (arrayMembers.length > 0 && regularMembers.length > 0) {
            const separator = document.createElement('div');
            separator.className = 'array-separator';
            separator.innerHTML = '<span>Array Operations</span>';
            container.appendChild(separator);
        }
        
        // Display array members
        if (arrayMembers.length > 0) {
            arrayMembers.forEach(member => {
                const memberElement = this.createMemberElement(member, currentType);
                memberElement.classList.add('array-member');
                container.appendChild(memberElement);
            });
        }
    }

    // Create member element
    createMemberElement(member, currentType) {
        const div = document.createElement('div');
        div.className = `member-item ${member.isExposed ? 'exposed' : 'not-exposed'}`;
        
        // Generate display name and C# syntax
        const { displayName, csharpSyntax } = this.generateMemberSyntax(member, currentType);
        
        // Create header
        const header = document.createElement('div');
        header.className = 'member-header';
        header.innerHTML = `
            <span class="member-status">${member.isExposed ? '✅' : '❌'}</span>
            <span class="member-name">${displayName}</span>
            ${member.returnType && member.returnType !== 'void' ? 
              `<span class="member-return">→ ${Utils.cleanGenericType(Utils.formatTypeName(member.returnType))}</span>` : ''}
        `;
        
        div.appendChild(header);
        
        // Add C# syntax if available
        if (csharpSyntax) {
            const csharpDiv = document.createElement('div');
            csharpDiv.className = 'member-csharp';
            csharpDiv.innerHTML = `<code>${csharpSyntax.replace(/\n/g, '<br>')}</code>`;
            div.appendChild(csharpDiv);
        }
        
        // Add Udon names
        if (member.getterUdon && member.setterUdon) {
            this.addUdonName(div, 'Udon getter:', member.getterUdon);
            this.addUdonName(div, 'Udon setter:', member.setterUdon);
        } else if (member.udonName) {
            this.addUdonName(div, 'Udon name:', member.udonName);
        } else {
            const notExposed = document.createElement('div');
            notExposed.className = 'member-not-exposed';
            notExposed.textContent = 'Not exposed to Udon';
            div.appendChild(notExposed);
        }
        
        return div;
    }

    // Add Udon name element
    addUdonName(container, label, udonName) {
        const div = document.createElement('div');
        div.className = 'member-udon';
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'udon-label';
        labelSpan.textContent = label;
        
        const code = document.createElement('code');
        code.className = 'udon-name';
        code.textContent = Utils.cleanGenericType(udonName);
        code.dataset.udon = udonName;
        code.onclick = () => Utils.copyToClipboard(udonName);
        
        div.appendChild(labelSpan);
        div.appendChild(code);
        container.appendChild(div);
    }

    // Generate member syntax
    generateMemberSyntax(member, currentType) {
        let displayName = member.name;
        let csharpSyntax = '';
        
        const typeName = currentType ? currentType.name.split('+').pop() : 'TypeName';
        const objName = currentType ? currentType.name.toLowerCase().replace(/[^a-z]/g, '') : 'obj';
        
        if (member.memberType === 'Constructor' || member.name === 'Constructor') {
            displayName = 'Constructor';
            let params = '';
            if (member.signature && member.signature.includes('(')) {
                const match = member.signature.match(/\((.*?)\)/);
                params = match ? match[1] : '';
            }
            csharpSyntax = `${typeName} instance = new ${typeName}(${params});`;
            
        } else if (member.memberType === 'Method') {
            const methodName = member.name.replace('op_', 'operator ');
            let paramList = '';
            
            if (member.signature && member.signature.includes('(')) {
                const params = member.signature.match(/\((.*?)\)/);
                paramList = params ? params[1] : '';
            }
            
            csharpSyntax = this.generateMethodSyntax(methodName, paramList, member.returnType, objName);
            
        } else if (member.memberType === 'Property') {
            const propName = member.name.replace(' (get)', '').replace(' (set)', '');
            
            if (member.hasGetter && member.hasSetter) {
                displayName = `${propName} { get; set; }`;
                csharpSyntax = `// Get value\nvar value = ${objName}.${propName};\n// Set value\n${objName}.${propName} = newValue;`;
            } else if (member.hasGetter) {
                displayName = `${propName} { get; }`;
                csharpSyntax = `var value = ${objName}.${propName};`;
            } else if (member.hasSetter) {
                displayName = `${propName} { set; }`;
                csharpSyntax = `${objName}.${propName} = value;`;
            }
            
        } else if (member.memberType === 'Field') {
            const fieldName = member.name.replace(' (get)', '').replace(' (set)', '');
            const fieldType = Utils.formatTypeName(member.returnType || 'var');
            
            if (member.hasGetter && member.hasSetter) {
                displayName = `${fieldName} { get; set; }`;
                csharpSyntax = `// Get value\n${fieldType} value = ${objName}.${fieldName};\n// Set value\n${objName}.${fieldName} = newValue;`;
            } else if (member.hasGetter) {
                displayName = `${fieldName} { get; }`;
                csharpSyntax = `${fieldType} value = ${objName}.${fieldName};`;
            } else if (member.hasSetter) {
                displayName = `${fieldName} { set; }`;
                csharpSyntax = `${objName}.${fieldName} = value;`;
            } else {
                displayName = fieldName;
                csharpSyntax = `${fieldType} value = ${objName}.${fieldName};`;
            }
        }
        
        return { displayName, csharpSyntax };
    }

    // Generate method syntax
    generateMethodSyntax(methodName, paramList, returnType, objName) {
        const returnTypeStr = Utils.cleanGenericType(Utils.formatTypeName(returnType || 'void'));
        
        // Special cases
        const specialMethods = {
            'Equals': `bool result = ${objName}.Equals(otherObject);`,
            'GetHashCode': `int hash = ${objName}.GetHashCode();`,
            'GetType': `Type type = ${objName}.GetType();`,
            'ToString': `string str = ${objName}.ToString();`
        };
        
        if (specialMethods[methodName]) {
            return specialMethods[methodName];
        }
        
        // Getter-style methods
        if (methodName.startsWith('Get')) {
            const varType = returnTypeStr !== 'void' ? returnTypeStr : 'var';
            return paramList ? 
                `${varType} result = ${objName}.${methodName}(${paramList});` :
                `${varType} result = ${objName}.${methodName}();`;
        }
        
        // Setter-style methods
        if (methodName.startsWith('Set')) {
            return paramList ? 
                `${objName}.${methodName}(${paramList});` :
                `${objName}.${methodName}(value);`;
        }
        
        // Methods with return values
        if (returnTypeStr !== 'void') {
            return paramList ? 
                `${returnTypeStr} result = ${objName}.${methodName}(${paramList});` :
                `${returnTypeStr} result = ${objName}.${methodName}();`;
        }
        
        // Void methods
        return paramList ? 
            `${objName}.${methodName}(${paramList});` :
            `${objName}.${methodName}();`;
    }

    // Display search results
    displaySearchResults(results) {
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
        
        // Group and display results
        const typeResults = results.filter(r => r.isType);
        const memberResults = results.filter(r => r.isMember);
        
        if (typeResults.length > 0) {
            this.displayTypeResults(container, typeResults.slice(0, 20));
        }
        
        if (memberResults.length > 0) {
            this.displayMemberResults(container, memberResults.slice(0, 50));
        }
        
        if (results.length > 70) {
            container.innerHTML += '<div class="more-results">Showing first 70 results. Please refine your search...</div>';
        }
    }

    // Display type search results
    displayTypeResults(container, results) {
        const section = document.createElement('div');
        section.className = 'results-section';
        section.innerHTML = '<h3>Types</h3>';
        
        const typeContainer = document.createElement('div');
        
        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'search-result-item type-result';
            div.innerHTML = `
                <span class="type-icon">${Utils.getTypeIcon(result.kind)}</span>
                <span class="result-type-name">${result.name}</span>
                <span class="result-namespace">${result.namespace}</span>
                <span class="member-badge">${result.exposedMemberCount}/${result.memberCount}</span>
                <span class="result-status">${result.isExposed ? '✅' : '❌'}</span>
            `;
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                if (window.app && window.app.loadType) {
                    window.app.loadType(result.fullName);
                } else {
                    console.error('App not initialized or loadType not available');
                }
            });
            typeContainer.appendChild(div);
        });
        
        section.appendChild(typeContainer);
        container.appendChild(section);
    }

    // Display member search results
    displayMemberResults(container, results) {
        const section = document.createElement('div');
        section.className = 'results-section';
        section.innerHTML = '<h3>Members</h3>';
        
        const memberContainer = document.createElement('div');
        
        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'search-result-item member-result';
            
            const displayName = result.memberType === 'Constructor' ? 'Constructor' : result.memberName;
            
            div.innerHTML = `
                <div class="result-header">
                    <span class="result-status">${result.isExposed ? '✅' : '❌'}</span>
                    <span class="result-type">${result.typeName}</span>
                    <span class="result-member-type">[${result.memberType}]</span>
                </div>
                <div class="result-member">${displayName}</div>
                ${result.udonName ? `
                    <div class="result-udon">
                        <code data-udon="${Utils.escapeHtml(result.udonName)}">${result.udonName}</code>
                    </div>
                ` : '<div class="result-no-udon">No Udon name (not exposed)</div>'}
            `;
            
            // Click handler for code
            const code = div.querySelector('code');
            if (code) {
                code.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Utils.copyToClipboard(result.udonName);
                });
            }
            
            // Click handler for result
            div.addEventListener('click', () => {
                if (window.app && window.app.loadType) {
                    window.app.loadType(result.typeFullName);
                } else {
                    console.error('App not initialized or loadType not available');
                }
            });
            
            memberContainer.appendChild(div);
        });
        
        section.appendChild(memberContainer);
        container.appendChild(section);
    }

    // Show welcome screen
    showWelcomeScreen() {
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('welcomeScreen').style.display = 'block';
        document.getElementById('typeDetails').style.display = 'none';
        document.getElementById('searchResults').style.display = 'none';
    }

    // Show loading screen
    showLoadingScreen() {
        document.getElementById('loadingScreen').style.display = 'block';
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('typeDetails').style.display = 'none';
        document.getElementById('searchResults').style.display = 'none';
    }

    // Show error
    showError(message) {
        document.getElementById('loadingScreen').innerHTML = `
            <div class="error-message">
                <h3>Error Loading Data</h3>
                <p>${message}</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
    }
}