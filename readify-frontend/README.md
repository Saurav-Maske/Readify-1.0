# Readify Frontend

React + TypeScript + Vite frontend for Readify. Provides the user interface
for authentication, book discovery, reading tracking, reviews, profiles,
the social feed, and AI-powered Discover recommendations.

## Stack

- **Framework:** React
- **Language:** TypeScript
- **Build Tool:** Vite
- **Routing:** React Router
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios

## Project Structure

```
src/
  components/   # reusable UI components
  hooks/        # custom React hooks
  lib/          # API client, utilities, validation
  pages/        # application pages
  types/        # shared TypeScript types
  App.tsx
  main.tsx
```

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and configure the backend URL.

3. Start the development server

   ```bash
   npm run dev
   ```

4. Build for production

   ```bash
   npm run build
   ```

## Pages

- Login & Signup
- OTP Verification
- Google Signup Complete 
- Forgot Password
- Home 
- Feed
- Discover
- Book Details
- Search
- User Profile
- My Shelf
- Questions

## Backend & AI

The frontend communicates only with the Readify backend. AI-generated
Discover recommendations are retrieved through backend API endpoints—the
frontend does not communicate directly with the Python recommendation
engine.