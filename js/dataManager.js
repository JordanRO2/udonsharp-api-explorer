// Data management module

export class DataManager {
    constructor() {
        this.apiData = null;
        this.allUdonNames = [];
        this.currentType = null;
    }

    // Initialize data from embedded sources
    initialize() {
        if (typeof API_DATA === 'undefined' || typeof ALL_UDON_NAMES === 'undefined') {
            throw new Error('Data not loaded. Make sure data.js is included before app modules');
        }
        
        this.apiData = API_DATA;
        this.allUdonNames = ALL_UDON_NAMES;
        
        // If types flat map doesn't exist, build it from typesByNamespace
        if (!this.apiData.types) {
            this.apiData.types = {};
            for (const namespace in this.apiData.typesByNamespace) {
                this.apiData.typesByNamespace[namespace].forEach(type => {
                    this.apiData.types[type.fullName] = type;
                });
            }
        }
        
        console.log('📂 API Data loaded:', this.apiData);
        console.log('📝 Udon names loaded:', this.allUdonNames.length, 'names');
        console.log('🔍 Types indexed:', Object.keys(this.apiData.types).length);
        
        return true;
    }

    // Get statistics
    getStats() {
        return {
            totalTypes: this.apiData.totalTypes,
            exposedTypes: this.apiData.exposedTypes,
            totalMembers: this.apiData.totalMembers,
            exposedMembers: this.apiData.exposedMembers
        };
    }

    // Get all namespaces
    getNamespaces() {
        return Object.keys(this.apiData.typesByNamespace).sort();
    }

    // Get types by namespace
    getTypesByNamespace(namespace, onlyExposed = false) {
        const types = this.apiData.typesByNamespace[namespace] || [];
        return onlyExposed ? types.filter(t => t.isExposed) : types;
    }

    // Find type by full name
    findType(fullName) {
        // Try flat map first
        if (this.apiData.types && this.apiData.types[fullName]) {
            return this.apiData.types[fullName];
        }
        
        // Search in namespaces
        for (const namespace in this.apiData.typesByNamespace) {
            const found = this.apiData.typesByNamespace[namespace].find(
                t => t.fullName === fullName
            );
            if (found) return found;
        }
        
        return null;
    }

    // Search functionality
    search(query, options = {}) {
        const { onlyExposed = false, includeMembers = true } = options;
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        // Search in types
        for (const namespace in this.apiData.typesByNamespace) {
            this.apiData.typesByNamespace[namespace].forEach(type => {
                // Search in type name
                if (type.name.toLowerCase().includes(lowerQuery) ||
                    type.fullName.toLowerCase().includes(lowerQuery)) {
                    if (!onlyExposed || type.isExposed) {
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
                if (includeMembers && type.members && type.members.length > 0) {
                    type.members.forEach(member => {
                        const memberNameLower = member.name.toLowerCase();
                        const udonNameLower = (member.udonName || '').toLowerCase();
                        
                        if (memberNameLower.includes(lowerQuery) || 
                            udonNameLower.includes(lowerQuery) ||
                            (member.signature && member.signature.toLowerCase().includes(lowerQuery))) {
                            
                            if (!onlyExposed || member.isExposed) {
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
        
        return results;
    }

    // Get and process members for a type
    getTypeMembers(type, onlyExposed = false) {
        const result = {
            constructors: [],
            methods: [],
            properties: [],
            fields: []
        };
        
        if (!type.members || type.members.length === 0) {
            return result;
        }
        
        type.members.forEach(member => {
            if (onlyExposed && !member.isExposed) return;
            
            const memberData = {
                name: member.name,
                udonName: member.udonName || '',
                returnType: member.returnType || 'void',
                isExposed: member.isExposed,
                isStatic: member.isStatic,
                signature: member.signature,
                memberType: member.memberType
            };
            
            // Categorize by type
            if (member.memberType === 'Constructor' || member.name === 'Constructor') {
                result.constructors.push(memberData);
            } else if (member.memberType === 'Method') {
                result.methods.push(memberData);
            } else if (member.memberType === 'Property') {
                this.processProperty(result.properties, member, memberData);
            } else if (member.memberType === 'Field') {
                this.processField(result.fields, member, memberData);
            }
        });
        
        // Sort each category
        Object.keys(result).forEach(key => {
            result[key].sort((a, b) => a.name.localeCompare(b.name));
        });
        
        return result;
    }

    // Process property grouping
    processProperty(properties, member, memberData) {
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
            existing.isExposed = existing.isExposed || member.isExposed;
        } else {
            const propData = {
                ...memberData,
                name: baseName,
                hasGetter: member.name.includes('(get)'),
                hasSetter: member.name.includes('(set)')
            };
            
            if (member.name.includes('(get)')) {
                propData.getterUdon = member.udonName;
            } else if (member.name.includes('(set)')) {
                propData.setterUdon = member.udonName;
            }
            
            properties.push(propData);
        }
    }

    // Process field grouping
    processField(fields, member, memberData) {
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
            existing.isExposed = existing.isExposed || member.isExposed;
        } else {
            const fieldData = {
                ...memberData,
                name: baseName,
                hasGetter: member.name.includes('(get)'),
                hasSetter: member.name.includes('(set)')
            };
            
            if (member.name.includes('(get)')) {
                fieldData.getterUdon = member.udonName;
            } else if (member.name.includes('(set)')) {
                fieldData.setterUdon = member.udonName;
            }
            
            fields.push(fieldData);
        }
    }
}