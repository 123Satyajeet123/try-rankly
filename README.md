# Rankly - AI-Powered Brand Visibility Platform

> Get more traffic from LLMs with AEO (Answer Engine Optimization)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB Atlas account (already configured)
- npm or yarn

### 1. Install Dependencies

```bash
cd tryrankly
npm install
```

### 2. Set Up Environment Variables

The `.env.local` file is already configured with:
- MongoDB connection
- Google OAuth credentials
- OpenRouter API key
- JWT secrets

**No changes needed unless deploying to production.**

### 3. Start the Backend Server

The existing Express backend handles API requests:

```bash
# In a separate terminal
cd ../rankly-onboarding/backend
npm install
npm start
```

Backend runs on `http://localhost:5000`

### 4. Start the Frontend

```bash
# In the tryrankly directory
npm run dev
```

Frontend runs on `http://localhost:3000`

### 5. Open Your Browser

Navigate to `http://localhost:3000`

You'll be redirected to the onboarding flow!

## 📁 Project Structure

```
tryrankly/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx          # Home (redirects to onboarding)
│   ├── onboarding/       # Onboarding flow
│   └── dashboard/        # Analytics dashboard
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── charts/          # Data visualizations
│   ├── layout/          # Layout components
│   └── tabs/            # Dashboard tabs
├── contexts/            # React contexts
├── services/            # API client
├── lib/                 # Utilities
└── .env.local          # Environment variables
```

## 🔑 Features

### Onboarding Flow
1. **Authentication** - Google OAuth or email login
2. **Website Analysis** - AI analyzes your website
3. **Competitor Selection** - Choose up to 4 competitors
4. **Topic Selection** - Pick 2 relevant topics
5. **Persona Definition** - Select 2 user personas
6. **Prompt Generation** - Auto-generate AEO-optimized prompts

### Dashboard
- **Visibility Tab** - Brand visibility metrics
- **Prompts Tab** - Manage and test prompts
- **Sentiment Tab** - Brand sentiment analysis
- **Citations Tab** - Citation tracking
- **Agent Analytics** - AI agent traffic metrics

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Components**: shadcn/ui + Radix UI
- **Charts**: Recharts, Chart.js, D3.js
- **Theme**: next-themes (dark/light mode)
- **Icons**: Lucide React

### Backend (Existing)
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **Auth**: JWT + Google OAuth
- **AI**: OpenRouter (multi-LLM platform)
- **Analysis**: Website scraping & AI processing

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## 🔄 Flow Diagram

```
User → Onboarding → Website Analysis → AI Suggestions
  ↓
Select Preferences (Competitors, Topics, Personas)
  ↓
Generate Prompts → Test with Multiple LLMs
  ↓
Dashboard → View Analytics & Scorecards
```

## 🌐 API Integration

The frontend connects to the backend via the API service (`services/api.ts`):

```typescript
import apiService from '@/services/api'

// Example usage
const response = await apiService.analyzeWebsite(url)
const prompts = await apiService.generatePrompts()
```

### Main API Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/onboarding/analyze-website` - Analyze website
- `POST /api/prompts/generate` - Generate prompts
- `POST /api/prompts/test` - Test prompts with LLMs

## 🎨 Theming

The app supports light and dark modes with automatic system detection.

Toggle theme using the switch in the onboarding page or dashboard.

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:5000/api) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM access |

## 📦 Deployment

### Frontend (Vercel Recommended)

```bash
# Build
npm run build

# Deploy to Vercel
vercel deploy
```

### Backend

Deploy the Express backend to:
- Railway
- Render
- Heroku
- AWS/GCP/Azure

**Important**: Update `NEXT_PUBLIC_API_URL` in `.env.local` to point to your deployed backend.

## 🐛 Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### API Connection Issues

1. Ensure backend is running on port 5000
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Verify MongoDB connection in backend

### Theme Not Working

The theme provider requires JavaScript. Ensure:
- `'use client'` is present in ThemeToggle
- ThemeProvider wraps the app in layout.tsx

## 📚 Documentation

- [Migration Summary](./MIGRATION_SUMMARY.md) - Full migration details
- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui Docs](https://ui.shadcn.com)
- [Tailwind CSS Docs](https://tailwindcss.com)

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

## 📄 License

Proprietary - All rights reserved

---

**Built with ❤️ using Next.js, React, and TypeScript**
