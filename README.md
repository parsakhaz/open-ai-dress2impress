# 👗 Dress to Impress: AI Fashion Showdown

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.4.6-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/OpenAI-API-74aa9c?style=for-the-badge&logo=openai" alt="OpenAI" />
  <img src="https://img.shields.io/badge/React-19.1.0-61dafb?style=for-the-badge&logo=react" alt="React" />
</div>

<div align="center">
  <h3>An AI-powered fashion game where creativity meets competition</h3>
  <p>Create your avatar, shop for clothes, style your outfit, and compete against an AI opponent in this immersive fashion experience.</p>
</div>

---

## ✨ Features

### 🎮 Core Gameplay
- **Avatar Creation**: Capture your photo via webcam and transform it into 4 unique AI-generated avatars
- **Theme-Based Challenges**: Spin the wheel to receive your fashion theme challenge
- **Real-Time Shopping**: Browse and shop from Amazon's catalog with integrated product search
- **Virtual Try-On**: Use FASHN AI to virtually try on clothes on your avatar
- **AI-Powered Editing**: Enhance your looks with OpenAI's image editing capabilities
- **Competitive Mode**: Face off against an AI player that strategically shops and styles outfits
- **Runway Experience**: Generate walkout videos of your final look (Kling AI integration)
- **AI Judge**: Get your outfit evaluated by an AI fashion expert

### 🎯 Game Phases
1. **Character Select** - Create your avatar using webcam capture
2. **Theme Select** - Spin the wheel for your fashion challenge
3. **Shopping Spree** (2:00) - Browse and add items to your wardrobe
4. **Styling Round** (1:30) - Try on different combinations
5. **Accessorize** - Add final touches with AI editing
6. **Evaluation** - AI judges your outfit against the theme
7. **Results** - See your score and compete against the AI player

### 🛠️ Technical Features
- **Type-Safe Architecture**: 100% TypeScript with strict mode enabled
- **Real-Time State Management**: Zustand for reactive game state
- **Server-Side API Protection**: All external APIs secured server-side
- **Responsive Design**: Tailwind CSS with glass-morphism UI
- **Error Handling**: Comprehensive error recovery and retry mechanisms
- **Performance Optimized**: Next.js 15 with Turbopack

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17 or higher
- npm or yarn
- API keys for required services (see Configuration)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/open-ai-dress2impress.git
cd open-ai-dress2impress

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start playing!

## ⚙️ Configuration

Create a `.env.local` file in the root directory:

```env
# Amazon Product Search (via RapidAPI)
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=real-time-amazon-data.p.rapidapi.com

# OpenAI API (for avatar generation and image editing)
OPENAI_API_KEY=your_openai_api_key
# Optional: Use a proxy endpoint
# OPENAI_BASE_URL=https://api.openai.com

# FASHN AI (for virtual try-on)
FASHN_AI_API_KEY=your_fashn_api_key

# Kling AI (for video generation - optional)
# KLING_ACCESS_KEY=your_kling_access_key
# KLING_SECRET_KEY=your_kling_secret_key
```

### API Services Setup

1. **RapidAPI** - [Sign up](https://rapidapi.com/) and subscribe to "Real-Time Amazon Data" API
2. **OpenAI** - [Get API key](https://platform.openai.com/api-keys) with Images API access
3. **FASHN AI** - [Request access](https://fashn.ai/) for virtual try-on API
4. **Kling AI** (Optional) - [Apply for access](https://kling.kuaishou.com/) for video generation

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **State Management**: Zustand with persistence
- **API Routes**: Next.js API routes for secure external API calls
- **Image Processing**: Sharp for optimization
- **UI Components**: Custom glass-morphism design system
- **Real-Time Features**: React hooks for timers and game flow

### Project Structure
```
src/
├── app/                    # Next.js app directory
│   ├── (app)/             # Game routes and components
│   │   └── components/    # Game UI components
│   ├── api/               # Server-side API routes
│   └── page.tsx           # Main game page
├── components/            # Shared components
├── hooks/                 # Custom React hooks
├── lib/                   # Core logic
│   ├── adapters/         # API client adapters
│   ├── ai-player/        # AI opponent logic
│   ├── constants/        # Game configuration
│   ├── state/           # Zustand stores
│   └── util/            # Utility functions
└── types/                # TypeScript definitions
```

### API Routes

#### `/api/avatar` - Avatar Generation
- **Method**: POST
- **Body**: `{ imageDataUrl: string }`
- **Returns**: `{ images: string[] }` - 4 avatar variants

#### `/api/amazon` - Product Search
- **Method**: POST
- **Body**: `{ query: string }`
- **Returns**: Amazon product results

#### `/api/tryon` - Virtual Try-On
- **Method**: POST
- **Body**: `{ characterImageUrl: string, clothingImageUrl: string }`
- **Returns**: Try-on result images

#### `/api/edit` - AI Image Editing
- **Method**: POST
- **Body**: `{ baseImageUrl: string, instruction: string }`
- **Returns**: `{ images: string[] }` - 4 edited variants

#### `/api/video` - Runway Video Generation
- **Method**: POST
- **Body**: `{ imageUrl: string }`
- **Returns**: Video generation status and URL

## 🎮 Game Flow

### Phase 1: Avatar Creation
1. Allow camera access when prompted
2. Take a selfie using the webcam
3. AI generates 4 avatar variants
4. Select your favorite to continue

### Phase 2: Theme Challenge
1. Click to spin the theme wheel
2. Receive your fashion challenge (e.g., "Beach Vacation", "Business Meeting")
3. Timer starts for shopping phase

### Phase 3: Shopping (2:00)
1. Search for clothing items using the search bar
2. Browse Amazon products in real-time
3. Add items to your wardrobe (max 6 items)
4. Timer automatically advances to styling when complete

### Phase 4: Styling (1:30)
1. Open your wardrobe to see collected items
2. Click "Try On" to see how items look on your avatar
3. Mix and match different combinations
4. Select your best look

### Phase 5: Final Touches
1. Use AI editing for accessories or adjustments
2. Enter instructions like "add sunglasses and a hat"
3. Choose from 4 AI-generated options

### Phase 6: Judging
1. AI evaluates your outfit based on:
   - Theme adherence
   - Style cohesion
   - Creativity
2. Compete against the AI player's outfit
3. See detailed scoring and feedback

## 🤖 AI Player System

The AI opponent uses a sophisticated strategy system:

- **Intelligent Shopping**: Searches based on theme keywords and color palettes
- **Strategic Selection**: Balances preset wardrobe with new items
- **Adaptive Behavior**: Adjusts strategy based on remaining time
- **Try-On Optimization**: Tests multiple outfit combinations
- **Logging System**: Transparent decision-making process

## 🚀 Development

### Running Locally
```bash
# Development mode with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Production build
npm run build
npm start
```

### Debug Features
- Press `D` to toggle debug panel
- View AI player logs in real-time
- Manual phase controls for testing
- Toast notification controls

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration for consistency
- Comprehensive error boundaries
- Structured logging system

## 📦 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables
Set the following in your deployment platform:
- All variables from `.env.local`
- `NODE_ENV=production`

### Performance Considerations
- Configure image domains in `next.config.ts`
- Set appropriate API timeouts (default: 600s)
- Enable caching for static assets
- Use CDN for image delivery

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Maintain TypeScript type safety
- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and descriptive

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for avatar generation and image editing
- FASHN AI for virtual try-on technology
- Amazon & RapidAPI for product data
- Kling AI for video generation capabilities
- The open-source community for amazing tools and libraries

---

<div align="center">
  <p>Built with ❤️ by the Dress to Impress Team</p>
  <p>
    <a href="https://github.com/yourusername/open-ai-dress2impress/issues">Report Bug</a>
    ·
    <a href="https://github.com/yourusername/open-ai-dress2impress/issues">Request Feature</a>
  </p>
</div>