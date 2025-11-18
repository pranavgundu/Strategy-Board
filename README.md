<div align="center">

# Strategy Board

![Strategy Board Banner](https://github.com/user-attachments/assets/68c6635c-eaad-45e4-87e1-3e189cd4fb50)

A powerful strategy planning tool for FIRST Robotics Competition teams

[![Live Demo](https://img.shields.io/badge/demo-strategyboard.app-blue?style=for-the-badge)](https://strategyboard.app)
[![Vercel](https://img.shields.io/badge/vercel-deployment-black?style=for-the-badge&logo=vercel)](https://strategyboard.vercel.app)
[![GitHub Pages](https://img.shields.io/badge/github-pages-green?style=for-the-badge&logo=github)](https://pranavgundu.github.io/Strategy-Board)

</div>

---

## Features

- Interactive Field Drawing 
- Robot Positioning 
- The Blue Alliance Integration 
- QR Code Export/Import
- Multi-Phase Planning
- Auto-Save
- Match Management

---

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/pranavgundu/Strategy-Board.git
   cd Strategy-Board
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables (optional)
   ```bash
   cp .env.example .env
   # Add your TBA API key to .env
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Open your browser
   Navigate to `http://localhost:5173`

---

## Configuration

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

## Usage

### Creating a Match

1. Click "New Match" on the home screen
2. Enter match name and team numbers
3. Start planning your strategy!

### Importing from TBA

1. Click "Import from TBA"
2. Enter your API key (if not configured)
3. Search for your event
4. Select your team
5. Choose matches to import

### Drawing and Planning

- Auto/Teleop/Endgame Tabs
- Drawing Tools
- Robot Controls
- Text Annotations
- Color Options

### Sharing Strategies

- Export via QR
- Import via QR

---

## Tech Stack

- TypeScript
- Vite
- Canvas API
- IndexedDB
- Tailwind CSS
- The Blue Alliance API

---

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Contact

Pranav Gundu

- Email: [pranav@strategyboard.app](mailto:pranav@strategyboard.app)
- Website: [strategyboard.app](https://strategyboard.app)
- Website: [strategyboard.vercel.app](https://strategyboard.vercel.app)

---

## Acknowledgments

- [The Blue Alliance](https://www.thebluealliance.com) - For providing comprehensive FRC data
- [Team 834](https://www.team834.org/about/) - For inspiring this tool
  - This project is being conducted with their **explicit permission**!
- All the teams using Strategy Board to plan their winning strategies

---

<div align="center">



Made for the FRC community

Star this repo if you find it helpful!

<a href="https://www.star-history.com/#pranavgundu/Strategy-Board&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=pranavgundu/Strategy-Board&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=pranavgundu/Strategy-Board&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=pranavgundu/Strategy-Board&type=date&legend=top-left" />
 </picture>
</a>

</div>
