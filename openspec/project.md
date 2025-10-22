# Project Context

## Purpose
This project is a companion application for "Feed the Kraken", an interactive experience that likely involves user interaction via webcam. It serves as a web-based interface built with Next.js, utilizing OpenSpec for managing project specifications and changes.

## Tech Stack
- **Framework**: Next.js 16.0.0 (React-based full-stack framework)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI Components**: React 19.2.0 with Lucide React icons
- **Utilities**: clsx and tailwind-merge for conditional styling
- **Camera Integration**: react-webcam for webcam functionality
- **Linting/Formatting**: Biome 2.2.0
- **Build Tools**: Babel with React Compiler plugin

## Project Conventions

### Code Style
- Use Biome for code linting and formatting (run `npm run lint` and `npm run format`)
- Follow TypeScript strict mode and best practices
- Use descriptive variable and function names
- Prefer functional components with hooks in React
- Use Tailwind CSS utility classes for styling, with clsx for conditional classes

### Architecture Patterns
- Next.js App Router for routing and layout
- Component-based architecture with reusable React components
- Server and client components as appropriate for Next.js
- Modular CSS with Tailwind utilities

### Testing Strategy
- No specific testing framework configured yet
- Plan to implement unit tests with Jest and React Testing Library
- Integration tests for key user flows

### Git Workflow
- Use feature branches for development
- Follow conventional commit messages (e.g., "feat:", "fix:", "docs:")
- Pull requests for code review before merging to main

## Domain Context
This application appears to be part of an interactive or gaming experience involving a "kraken" (sea monster), with webcam integration suggesting real-time user interaction, possibly augmented reality or video processing features.

## Important Constraints
- Must be compatible with modern web browsers supporting webcam access
- Performance considerations for real-time webcam processing
- Accessibility compliance for web application

## External Dependencies
- Vercel for deployment (recommended by Next.js)
- Webcam hardware for full functionality
