# 🔍 UdonSharp API Explorer

An interactive web-based documentation explorer for all available types and methods in UdonSharp for VRChat world development.

🌐 **Live Demo**: [https://jordanro2.github.io/udonsharp-api-explorer](https://jordanro2.github.io/udonsharp-api-explorer)

## ✨ Features

- **📊 Complete API Coverage**: Browse all 1,295 types with 56,766 members
- **🔍 Smart Search**: Real-time search across types, methods, properties, and fields
- **📁 Namespace Navigation**: Organized tree view of all namespaces
- **✅ Exposure Status**: Clearly see what's available in UdonSharp (41,650 exposed members)
- **📋 Click to Copy**: Instantly copy Udon method names to clipboard
- **🎨 Dark Theme**: Easy on the eyes with a professional dark interface
- **📱 Responsive**: Works on desktop and mobile devices
- **⚡ Fast**: All data is embedded for instant loading

## 🚀 Quick Start

### Using the Web Version

Simply visit the GitHub Pages URL to start exploring the API. No installation required!

### Running Locally

1. Clone the repository:
```bash
git clone https://github.com/JordanRO2/udonsharp-api-explorer.git
cd udonsharp-api-explorer
```

2. Open `index.html` in your browser (or use a local server):
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Then open http://localhost:8000
```

## 📝 How to Update Data

The API data is generated from Unity using the UdonExposureExporter tool.

### Step 1: Export from Unity

1. In Unity, go to `VRChat SDK > Udon Sharp > Export Udon Exposure to JSON`
2. Click "Export Complete Udon Exposure Data"
3. Files will be saved to `Claude-Segregation/` folder

### Step 2: Convert for Web

1. Copy the exported files to this repository:
   - `udon_exposure_complete.json`
   - `all_udon_names.txt`

2. Run the converter script:
```bash
node data-converter.js
```

3. Commit and push the updated `data.js` file

## 🏗️ Project Structure

```
udonsharp-api-explorer/
├── index.html          # Main HTML page
├── app.js             # Application logic
├── styles.css         # Styling
├── data.js            # Embedded API data (generated)
├── data-converter.js  # Conversion script
└── README.md          # This file
```

## 🔧 Technical Details

### Data Format

The explorer uses a custom JSON structure that includes:
- Type information (classes, structs, enums, interfaces)
- Member details (methods, properties, fields, constructors)
- Udon method names in the format: `TypeName.__methodName__ReturnType`
- Exposure status for each type and member

### Udon Name Format

UdonSharp uses a specific naming convention:
```
UnityEngineTransform.__get_position__UnityEngineVector3
│                    │   │            │
└─ Type              │   └─ Property  └─ Return Type
                     └─ Accessor (get/set)
```

## 🎯 Common Use Cases

### Finding a Method
1. Use the search bar to type the method name
2. Filter by methods only for cleaner results
3. Click on the Udon name to copy it

### Exploring a Type
1. Browse namespaces in the sidebar
2. Click on a type to see all its members
3. Green checkmarks show exposed members

### Quick Access
Use the quick access buttons for commonly used types:
- Transform
- VRCPlayerApi
- GameObject
- Vector3
- String
- Mathf

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Ideas for Contributions

- Add more example patterns
- Improve search algorithm
- Add syntax highlighting for code examples
- Create a favorites/bookmarks system
- Add export functionality for subsets of the API

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- VRChat for creating UdonSharp
- The VRChat community for continuous support
- All contributors to this project

## 📮 Contact

For questions, suggestions, or issues, please:
- Open an issue on GitHub
- Join the VRChat Discord

---

Made with ❤️ for VRChat creators