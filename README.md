# Psachno - Open Source Issue Finder

Psachno is a modern, developer-friendly web application designed to help beginners find their first open-source contribution. It aggregates "good first issues" and "help wanted" tasks from GitHub repositories, presenting them in a clean, filterable interface with gamified elements.

![Psachno Banner](public/logo.png)

## 🚀 Features

- **Smart Filtering**: Filter issues by programming language, difficulty label, and repository popularity.
- **Multi-Select Filters**: Select multiple labels (e.g., "bug", "enhancement") and categories at once using OR logic.
- **Live Star Counts**: See real-time GitHub star counts on issue cards to gauge repository popularity.
- **Hot Repos**: Discover hot repositories with a dedicated explore view.
- **Resource Hub**: Gamified learning resources to master Git and GitHub (Oh My Git!, Learn Git Branching).
- **GitHub Integration**: Sign in with GitHub to increase API rate limits (5000 req/hour vs 60 req/hour).
- **Modern UI/UX**: Glassmorphism design, smooth transitions, and interactive elements.

## 🛠️ Tech Stack

- **Frontend**: React.js (Vite), CSS3 (Variables, Flexbox/Grid), ReactBits
- **Backend (Auth)**: Node.js, Express.js (Proxy for GitHub OAuth)
- **Styling**: Pure CSS with CSS Variables for theming (Dark Mode default)
- **Deployment**: Vercel (Frontend), Railway/Render (Backend recommended)

## 📂 Project Structure

```
psachno/
├── src/
│   ├── components/       # UI Components from Reactbits
│   │   ├── ColorBends/   # Hero background effect
│   │   ├── RotatingText/ # Animated text component
│   │   └── ShinyText/    # Shiny text effect
│   ├── hooks/            # Custom React Hooks
│   │   └── useGitHubAuth.js # GitHub OAuth logic
│   ├── App.jsx           # Main Application Logic
│   ├── App.css           # Global Styles & Component Styles
│   └── main.jsx          # Entry Point
├── server/               # Backend Server for Auth
│   ├── index.js          # Express Server Entry
│   └── .env              # Backend Secrets
├── public/               # Static Assets
└── index.html            # HTML Entry
```

## 🏗️ Architecture

The application uses a **Client-Server architecture** specifically for handling GitHub OAuth secure authentication, while the main application logic runs client-side.

```mermaid
graph TD
    User[User] -->|Interacts| Frontend[React Frontend (Vite)]
    Frontend -->|Fetches Issues| GitHubAPI[GitHub Public API]
    
    subgraph "Authentication Flow"
    Frontend -->|1. Request Login| AuthServer[Express Auth Server]
    AuthServer -->|2. Redirect to GitHub| GitHubAuth[GitHub OAuth]
    GitHubAuth -->|3. Callback Code| AuthServer
    AuthServer -->|4. Exchange Code for Token| GitHubAuth
    AuthServer -->|5. Return Token| Frontend
    end
    
    Frontend -->|6. Auth Requests (Higher Rate Limit)| GitHubAPI
```

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js (v16+)
- GitHub Account (for API credentials)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/psachno.git
   cd psachno
   ```

2. **Setup Frontend**
   ```bash
   npm install
   npm run dev
   ```

3. **Setup Backend (Auth Server)**
   ```bash
   cd server
   npm install
   
   # Create .env file
   cp .env.example .env
   # Add your GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET
   
   npm run dev
   ```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [Aditya Ojha](https://github.com/adityaojha)
