#!/usr/bin/env node

/**
 * Data Converter Script
 * Converts the JSON and text files into embedded JavaScript for GitHub Pages
 * Run this script to update the data after exporting from Unity
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 Converting UdonSharp API data...');

try {
    // Read the JSON file
    const jsonPath = path.join(__dirname, '..', 'udon_exposure_complete.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    
    // Read the Udon names file
    const namesPath = path.join(__dirname, '..', 'all_udon_names.txt');
    const namesContent = fs.readFileSync(namesPath, 'utf8');
    
    // Parse and process the data
    const apiData = parseCustomJSON(jsonContent);
    // Clean up the Udon names - remove \r and trim whitespace
    const udonNames = namesContent
        .split('\n')
        .map(n => n.replace(/\r/g, '').trim())
        .filter(n => n)
        .sort();
    
    // Create the data.js file content
    const dataJsContent = `// Auto-generated data file for UdonSharp API Explorer
// Generated: ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - Use data-converter.js to regenerate

const API_DATA = ${JSON.stringify(apiData, null, 2)};

const ALL_UDON_NAMES = ${JSON.stringify(udonNames, null, 2)};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_DATA, ALL_UDON_NAMES };
}
`;

    // Write the data.js file
    const outputPath = path.join(__dirname, 'data.js');
    fs.writeFileSync(outputPath, dataJsContent);
    
    console.log('✅ Data conversion complete!');
    console.log(`📊 Stats: ${apiData.totalTypes} types, ${apiData.totalMembers} members`);
    console.log(`📁 Output: ${outputPath}`);
    
} catch (error) {
    console.error('❌ Error converting data:', error);
    process.exit(1);
}

function parseCustomJSON(jsonText) {
    // Parse the JSON data
    const rawData = JSON.parse(jsonText);
    
    // Process and reorganize the data for easier access
    const processedData = {
        exportDate: rawData.exportDate,
        unityVersion: rawData.unityVersion,
        totalTypes: rawData.totalTypes,
        exposedTypes: rawData.exposedTypes,
        totalMembers: rawData.totalMembers,
        exposedMembers: rawData.exposedMembers,
        typesByNamespace: {},
        types: {} // Flat map for quick access
    };
    
    // Process namespaces and types
    for (const [namespace, types] of Object.entries(rawData.typesByNamespace)) {
        processedData.typesByNamespace[namespace] = types.map(type => ({
            ...type,
            namespace: namespace,
            members: type.members || [] // Include members from JSON
        }));
        
        // Add to flat map
        types.forEach(type => {
            processedData.types[type.fullName] = {
                ...type,
                namespace: namespace,
                members: type.members || []
            };
        });
    }
    
    return processedData;
}