const fs = require('fs');
const path = require('path');

console.log('🔄 Converting Udon exposure data with array type merging...');

try {
    // Read the input file from Claude-Segregation folder
    const inputPath = path.join(__dirname, '..', 'udon_exposure_complete.json');
    
    if (!fs.existsSync(inputPath)) {
        console.error(`❌ Input file not found: ${inputPath}`);
        console.log('Please run the Unity exporter first: VRChat SDK > Udon Sharp > Export Udon Exposure to JSON');
        process.exit(1);
    }
    
    const jsonData = fs.readFileSync(inputPath, 'utf8');
    const inputData = JSON.parse(jsonData);
    
    console.log(`📂 Found ${inputData.totalTypes} types in ${Object.keys(inputData.typesByNamespace).length} namespaces`);
    
    // Process and merge array types with base types
    const mergedData = mergeArrayTypes(inputData);
    
    // Read Udon names
    const udonNamesPath = path.join(__dirname, '..', 'all_udon_names.txt');
    let allUdonNames = [];
    if (fs.existsSync(udonNamesPath)) {
        const udonNamesText = fs.readFileSync(udonNamesPath, 'utf8');
        allUdonNames = udonNamesText.split('\n').filter(name => name.trim());
        console.log(`📝 Loaded ${allUdonNames.length} Udon names`);
    }
    
    // Create the data.js content
    const dataJsContent = `// Auto-generated from udon_exposure_complete.json with array type merging
// Generated: ${new Date().toISOString()}

const API_DATA = ${JSON.stringify(mergedData, null, 2)};

const ALL_UDON_NAMES = ${JSON.stringify(allUdonNames, null, 2)};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_DATA, ALL_UDON_NAMES };
}
`;
    
    // Write the data.js file
    const outputPath = path.join(__dirname, 'data.js');
    fs.writeFileSync(outputPath, dataJsContent);
    
    console.log('✅ Data conversion complete with array merging!');
    console.log(`📊 Original: ${inputData.totalTypes} types`);
    console.log(`📊 After merging: ${mergedData.totalTypes} types`);
    console.log(`📊 Members: ${mergedData.totalMembers} total`);
    console.log(`📁 Output: ${outputPath}`);
    
} catch (error) {
    console.error('❌ Error converting data:', error);
    process.exit(1);
}

function mergeArrayTypes(inputData) {
    const processedData = {
        exportDate: inputData.exportDate,
        unityVersion: inputData.unityVersion,
        totalTypes: 0,
        exposedTypes: 0,
        totalMembers: 0,
        exposedMembers: 0,
        typesByNamespace: {},
        types: {}
    };
    
    // First pass: collect all types and identify base/array pairs
    const typeMap = new Map();
    const arrayTypes = new Map();
    
    for (const [namespace, types] of Object.entries(inputData.typesByNamespace)) {
        for (const type of types) {
            // Ensure each type has the namespace property
            type.namespace = namespace;
            
            // Clean up generic type names for display
            if (type.name && type.name.includes('`')) {
                // Convert IEnumerable`1 to IEnumerable<T>
                type.name = type.name.replace(/`(\d+)/, (match, count) => {
                    const params = Array(parseInt(count)).fill('T').map((t, i) => i > 0 ? `T${i+1}` : 'T').join(', ');
                    return `<${params}>`;
                });
            }
            
            if (type.kind === 'array' && type.name.endsWith('[]')) {
                // This is an array type
                const baseName = type.name.slice(0, -2);
                const baseFullName = type.fullName.slice(0, -2);
                arrayTypes.set(baseFullName, type);
            } else {
                // Regular type
                typeMap.set(type.fullName, type);
            }
        }
    }
    
    console.log(`Found ${typeMap.size} base types and ${arrayTypes.size} array types`);
    
    // Second pass: merge array types into base types
    let mergedCount = 0;
    for (const [baseFullName, arrayType] of arrayTypes) {
        if (typeMap.has(baseFullName)) {
            const baseType = typeMap.get(baseFullName);
            console.log(`Merging ${arrayType.name} into ${baseType.name}`);
            
            // Create a merged type
            const mergedType = {
                ...baseType,
                hasArrayVersion: true,
                arrayMembers: []
            };
            
            // Add array members with special marking
            for (const member of arrayType.members) {
                const arrayMember = {
                    ...member,
                    name: `[Array] ${member.name}`,
                    isArrayMember: true
                };
                mergedType.members.push(arrayMember);
                mergedType.arrayMembers.push(arrayMember);
            }
            
            // Update counts
            mergedType.memberCount = baseType.memberCount + arrayType.memberCount;
            mergedType.exposedMemberCount = baseType.exposedMemberCount + arrayType.exposedMemberCount;
            
            // If array has exposed members, consider the type as practically exposed
            if (arrayType.exposedMemberCount > 0 || baseType.isExposed) {
                mergedType.isExposed = true;
            }
            
            // Replace the base type with merged version
            typeMap.set(baseFullName, mergedType);
            mergedCount++;
        } else {
            // No base type found, keep array type as standalone
            console.log(`No base type found for ${arrayType.name}, keeping as standalone`);
            typeMap.set(arrayType.fullName, arrayType);
        }
    }
    
    console.log(`Merged ${mergedCount} array types into their base types`);
    
    // Third pass: organize into namespaces and calculate stats
    for (const type of typeMap.values()) {
        const namespace = type.namespace || 'Global';
        
        // Initialize namespace if needed
        if (!processedData.typesByNamespace[namespace]) {
            processedData.typesByNamespace[namespace] = [];
        }
        
        // Add to namespace
        processedData.typesByNamespace[namespace].push(type);
        
        // Add to flat map
        processedData.types[type.fullName] = type;
        
        // Update stats
        processedData.totalTypes++;
        if (type.isExposed) {
            processedData.exposedTypes++;
        }
        processedData.totalMembers += type.memberCount || 0;
        processedData.exposedMembers += type.exposedMemberCount || 0;
    }
    
    // Sort types in each namespace
    for (const namespace in processedData.typesByNamespace) {
        processedData.typesByNamespace[namespace].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
    }
    
    return processedData;
}