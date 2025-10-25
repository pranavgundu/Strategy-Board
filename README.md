# 🎯 Strategy Board

<div align="center">

![Strategy Board Banner](https://github.com/user-attachments/assets/bb049aef-19a5-44c0-8b29-64799408ee6a)

**A powerful strategy planning tool for FIRST Robotics Competition teams**

[![Live Demo](https://img.shields.io/badge/demo-strategyboard.app-blue?style=for-the-badge)](https://strategyboard.app)
[![Vercel](https://img.shields.io/badge/vercel-deployment-black?style=for-the-badge&logo=vercel)](https://strategyboard.vercel.app)
[![GitHub Pages](https://img.shields.io/badge/github-pages-green?style=for-the-badge&logo=github)](https://pranavgundu.github.io/Strategy-Board)

</div>

---

## ✨ Features

- **🎨 Interactive Field Drawing** - Visualize your strategy with intuitive drawing tools
- **🤖 Robot Positioning** - Place and orient robots on the field for each match phase
- **📊 The Blue Alliance Integration** - Import match schedules and team data directly from TBA
- **📱 QR Code Export/Import** - Share strategies instantly with your team via QR codes
- **🔄 Multi-Phase Planning** - Separate views for Auto, Teleop, Endgame, and Notes
- **💾 Auto-Save** - Your work is automatically saved to local storage
- **🎯 Match Management** - Create, organize, and manage multiple match strategies

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pranavgundu/Strategy-Board.git
   cd Strategy-Board
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp .env.example .env
   # Add your TBA API key to .env
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

---

## 🔧 Configuration

### The Blue Alliance API

To use TBA integration features, you'll need an API key:

1. Go to [The Blue Alliance Account Page](https://www.thebluealliance.com/account)
2. Generate an API key
3. Add it to your `.env` file:
   ```
   VITE_TBA_API_KEY=your_api_key_here
   ```

Alternatively, users can enter their own API key in the application settings.

---

## 📖 Usage

### Creating a Match

1. Click **"New Match"** on the home screen
2. Enter match name and team numbers
3. Start planning your strategy!

### Importing from TBA

1. Click **"Import from TBA"**
2. Enter your API key (if not configured)
3. Search for your event
4. Select your team
5. Choose matches to import

### Drawing and Planning

- **Auto/Teleop/Endgame Tabs** - Switch between match phases
- **Drawing Tools** - Marker and eraser for field annotations
- **Robot Controls** - Drag robots to position them, use rotation handles to orient
- **Text Annotations** - Add notes directly on the field
- **Color Options** - Multiple colors for different alliance strategies

### Sharing Strategies

- **Export via QR** - Generate QR codes for quick sharing with team members
- **Import via QR** - Scan QR codes to load strategies on other devices

---

## 🛠️ Tech Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Canvas API** - High-performance field rendering
- **IndexedDB** - Local data persistence
- **Tailwind CSS** - Utility-first styling
- **The Blue Alliance API** - FRC match data integration

---

## 📦 Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 📧 Contact

**Pranav Gundu**

- Email: [pranav@strategyboard.app](mailto:pranav@strategyboard.app)
- Website: [strategyboard.app](https://strategyboard.app)

---

## 🙏 Acknowledgments

- [The Blue Alliance](https://www.thebluealliance.com) - For providing comprehensive FRC data
- [FIRST Robotics Competition](https://www.firstinspires.org/robotics/frc) - For inspiring this tool
- All the teams using Strategy Board to plan their winning strategies!

---

<div align="center">

**Made with ❤️ for the FRC community**

⭐ Star this repo if you find it helpful!

</div>