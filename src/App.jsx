import { useState, useEffect, useCallback } from 'react'
import './App.css'

// Import ReactBits components
import ShinyText from './components/ShinyText/ShinyText'
import RotatingText from './components/RotatingText/RotatingText'
import ColorBends from './components/ColorBends/ColorBends'

// Import auth hook
import { useGitHubAuth } from './hooks/useGitHubAuth'

// ============================================
// OPEN SOURCE CONTRIBUTION FINDER
// Helping beginners find their first contribution
// ============================================

// GitHub API configuration
const GITHUB_API = 'https://api.github.com'

// Beginner-friendly labels to search for
const BEGINNER_LABELS = [
  'good first issue',
  'beginner',
  'beginner-friendly',
  'easy',
  'first-timers-only',
  'help wanted',
  'starter',
  'low-hanging-fruit',
  'up-for-grabs',
  'newbie',
  'contributions welcome'
]

// Popular programming languages
const LANGUAGES = [
  { value: '', label: 'All Languages' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' }
]

// Languages for rotating text animation
const ROTATING_LANGUAGES = [
  'JavaScript',
  'Python',
  'TypeScript',
  'React',
  'Go',
  'Rust',
  'Java'
]

// Sort options
const SORT_OPTIONS = [
  { value: 'created', label: 'Newest First' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'comments', label: 'Most Discussed' },
  { value: 'reactions', label: 'Most Reactions' }
]

// Repository popularity options (for trending-like filtering)
const POPULARITY_OPTIONS = [
  { value: '', label: 'All Repositories', description: 'Any repository' },
  { value: 'stars:>10000', label: '🔥 Very Popular (10k+ ⭐)', description: 'Top trending repos' },
  { value: 'stars:>1000', label: '⭐ Popular (1k+ ⭐)', description: 'Well-known projects' },
  { value: 'stars:>100', label: '📈 Growing (100+ ⭐)', description: 'Up and coming repos' },
  { value: 'stars:<100', label: '🌱 New Projects (<100 ⭐)', description: 'Help new projects grow' }
]

// Label filter options for beginner-friendly issues
const LABEL_OPTIONS = [
  { value: 'good first issue', label: 'Good First Issue' },
  { value: 'up-for-grabs', label: 'Up for Grabs' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'beginner-friendly', label: 'Beginner Friendly' },
  { value: 'first-timers-only', label: 'First Timers Only' },
  { value: 'help wanted', label: 'Help Wanted' },
  { value: 'easy', label: 'Easy' },
  { value: 'low-hanging-fruit', label: 'Low Hanging Fruit' }
]

// GSoC-style categories - using keywords commonly found in issues
const CATEGORIES = [
  { value: '', label: 'All', icon: '✓' },
  { value: 'AI OR machine-learning OR ML', label: 'Artificial Intelligence', icon: '🤖' },
  { value: 'database OR data OR analytics', label: 'Data', icon: '📊' },
  { value: 'CLI OR tooling OR developer', label: 'Development tools', icon: '🛠️' },
  { value: 'app OR mobile OR desktop', label: 'End user applications', icon: '📱' },
  { value: 'docker OR kubernetes OR cloud', label: 'Infrastructure and cloud', icon: '☁️' },
  { value: 'video OR audio OR image', label: 'Media', icon: '🎬' },
  { value: 'linux OR kernel OR OS', label: 'Operating systems', icon: '💻' },
  { value: 'compiler OR parser OR language', label: 'Programming languages', icon: '⚙️' },
  { value: 'science OR research OR medical', label: 'Science and medicine', icon: '🔬' },
  { value: 'security OR auth OR encryption', label: 'Security', icon: '🔒' },
  { value: 'chat OR social OR messaging', label: 'Social and communication', icon: '💬' },
  { value: 'web OR frontend OR backend OR API', label: 'Web', icon: '🌐' },
  { value: 'docs OR documentation OR readme', label: 'Documentation', icon: '📝' }
]

// ============================================
// MAIN APP COMPONENT
// ============================================

function App() {
  // GitHub Auth
  const { user, accessToken, isAuthenticated, isLoading: authLoading, login, logout, handleCallback } = useGitHubAuth()

  // Tab state: 'issues' or 'trending'
  const [activeTab, setActiveTab] = useState('issues')

  // Issues state
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retryCount, setRetryCount] = useState(0) // Track retry attempts for rate limit
  const [searchQuery, setSearchQuery] = useState('')
  const [language, setLanguage] = useState('')
  const [sortBy, setSortBy] = useState('created')
  const [selectedLabels, setSelectedLabels] = useState(['good first issue']) // Array for multi-select
  const [selectedCategories, setSelectedCategories] = useState([]) // Array for multi-select
  const [popularity, setPopularity] = useState('')
  const [currentView, setCurrentView] = useState('hero')
  const [totalCount, setTotalCount] = useState(0)
  const [repoStars, setRepoStars] = useState({}) // Cache for repo star counts
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false) // Mobile menu state

  // Fetch star count for a repository
  const fetchRepoStars = useCallback(async (repoFullName) => {
    // Skip if already cached
    if (repoStars[repoFullName] !== undefined) return

    try {
      const headers = { 'Accept': 'application/vnd.github.v3+json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

      const response = await fetch(`${GITHUB_API}/repos/${repoFullName}`, { headers })
      if (response.ok) {
        const data = await response.json()
        setRepoStars(prev => ({ ...prev, [repoFullName]: data.stargazers_count }))
      } else {
        // Mark as fetched to avoid retrying
        setRepoStars(prev => ({ ...prev, [repoFullName]: null }))
      }
    } catch {
      setRepoStars(prev => ({ ...prev, [repoFullName]: null }))
    }
  }, [accessToken, repoStars])

  // Fetch stars for visible issues (lazy loading)
  useEffect(() => {
    if (issues.length === 0) return

    // Only fetch first 5 repos to avoid rate limiting
    const reposToFetch = [...new Set(issues.slice(0, 5).map(issue => {
      const match = issue.repository_url?.match(/repos\/(.+)$/)
      return match ? match[1] : null
    }).filter(Boolean))]

    reposToFetch.forEach(repo => {
      if (repoStars[repo] === undefined) {
        fetchRepoStars(repo)
      }
    })
  }, [issues, fetchRepoStars, repoStars])

  const navigateTo = (view) => {
    setCurrentView(view)
    window.scrollTo(0, 0)
  }

  // Handle OAuth callback - check URL for code parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')

    if (code) {
      // Exchange code for token
      handleCallback(code).then((success) => {
        // Remove code from URL after processing
        window.history.replaceState({}, document.title, window.location.pathname)
        if (success) {
          navigateTo('app')
        }
      })
    }
  }, [handleCallback])

  // Trending repos state
  const [trendingRepos, setTrendingRepos] = useState([])
  const [trendingLoading, setTrendingLoading] = useState(false)
  const [trendingError, setTrendingError] = useState(null)
  const [trendingLanguage, setTrendingLanguage] = useState('')
  const [trendingPeriod, setTrendingPeriod] = useState('weekly')

  // Fetch issues from GitHub API
  const fetchIssues = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Build the search query
      let query = `is:issue is:open`

      // Add labels (OR logic for multiple labels)
      if (selectedLabels.length > 0) {
        const labelQuery = selectedLabels.map(l => `label:"${l}"`).join(' ')
        query += ` (${labelQuery})`
      }

      if (language) {
        query += ` language:${language}`
      }

      // Add categories (OR logic for multiple categories)
      if (selectedCategories.length > 0) {
        const categoryQuery = selectedCategories.join(' OR ')
        query += ` (${categoryQuery})`
      }

      if (popularity) {
        // Filter by repository star count (trending/popular repos)
        query += ` ${popularity}`
      }

      if (searchQuery) {
        query += ` ${searchQuery}`
      }

      // Build headers - include auth token if available
      const headers = {
        'Accept': 'application/vnd.github.v3+json'
      }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(
        `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&sort=${sortBy}&order=desc&per_page=20`,
        { headers }
      )

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('(403) Rate limit exceeded! GitHub allows 10 requests/minute for unauthenticated users. Sign in with GitHub to get 5,000 requests/hour.')
        }
        throw new Error('Failed to fetch issues. Please try again.')
      }

      const data = await response.json()
      setIssues(data.items || [])
      setTotalCount(data.total_count || 0)
    } catch (err) {
      setError(err.message)
      setIssues([])
    } finally {
      setLoading(false)
    }
  }, [language, sortBy, selectedLabels, selectedCategories, popularity, searchQuery, accessToken])

  // Fetch trending repos from GitHub API
  const fetchTrendingRepos = useCallback(async () => {
    setTrendingLoading(true)
    setTrendingError(null)

    try {
      // Calculate date based on period
      const now = new Date()
      let sinceDate = new Date()

      if (trendingPeriod === 'daily') {
        sinceDate.setDate(now.getDate() - 1)
      } else if (trendingPeriod === 'weekly') {
        sinceDate.setDate(now.getDate() - 7)
      } else {
        sinceDate.setMonth(now.getMonth() - 1)
      }

      const dateStr = sinceDate.toISOString().split('T')[0]

      // Build query for trending repos
      let query = `created:>${dateStr}`

      if (trendingLanguage) {
        query += ` language:${trendingLanguage}`
      }

      // Build headers - include auth token if available
      const headers = {
        'Accept': 'application/vnd.github.v3+json'
      }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const response = await fetch(
        `${GITHUB_API}/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=20`,
        { headers }
      )

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('(403) Rate limit exceeded! GitHub allows 10 requests/minute for unauthenticated users. Sign in with GitHub to get 5,000 requests/hour.')
        }
        throw new Error('Failed to fetch trending repos. Please try again.')
      }

      const data = await response.json()
      setTrendingRepos(data.items || [])
    } catch (err) {
      setTrendingError(err.message)
      setTrendingRepos([])
    } finally {
      setTrendingLoading(false)
    }
  }, [trendingLanguage, trendingPeriod, accessToken])

  // Initial fetch and refetch on filter changes
  // Initial fetch and refetch on filter changes
  useEffect(() => {
    if (currentView === 'app' && activeTab === 'issues') {
      fetchIssues()
    }
  }, [fetchIssues, currentView, activeTab])

  // Fetch trending repos when tab changes or filters change
  useEffect(() => {
    if (currentView === 'app' && activeTab === 'trending') {
      fetchTrendingRepos()
    }
  }, [fetchTrendingRepos, currentView, activeTab])

  // Handle search form submission
  const handleSearch = (e) => {
    e.preventDefault()
    setCurrentView('app')
    if (activeTab === 'issues') {
      fetchIssues()
    } else {
      fetchTrendingRepos()
    }
  }

  // Start exploring (transition from hero to main content)
  const startExploring = () => {
    setCurrentView('app')
    window.scrollTo(0, 0)
  }

  // Switch to trending tab
  const showTrending = () => {
    navigateTo('app')
    setActiveTab('trending')
  }

  // Format date with timestamp in IST
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }) + ' IST'
  }

  // Get color for label based on its name
  const getLabelStyle = (label) => {
    const color = label.color || '6b7280'
    return {
      backgroundColor: `#${color}20`,
      color: `#${color}`,
      border: `1px solid #${color}40`
    }
  }

  // Extract repository info from issue URL
  const getRepoInfo = (issue) => {
    const url = issue.repository_url || ''
    const parts = url.split('/')
    return {
      owner: parts[parts.length - 2] || '',
      name: parts[parts.length - 1] || '',
      full: `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
    }
  }

  return (
    <div className="app">
      {/* Skip to main content link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Header */}
      <header className="header" role="banner">
        <div className="header-content">
          <div
            className="logo"
            onClick={() => navigateTo('hero')}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo('hero')}
            style={{ cursor: 'pointer' }}
            tabIndex={0}
            role="button"
            aria-label="Go to home"
          >
            <img
              src="/psakhno_favicon_optimized.png"
              alt="PSACHNO Logo"
              className="logo-icon"
              style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)' }}
            />
            <span className="text-gradient">Psachno</span>
          </div>

          <nav className="nav-links" aria-label="Main navigation">
            <a href="#" className="nav-link" onClick={(e) => {
              e.preventDefault();
              navigateTo('hero');
            }}>
              Home
            </a>
            <a href="#about" className="nav-link" onClick={(e) => {
              e.preventDefault();
              navigateTo('about');
            }}>
              About
            </a>
            <a href="#explore" className="nav-link" onClick={(e) => {
              e.preventDefault();
              setActiveTab('issues');
              navigateTo('app');
            }}>
              Explore Issues
            </a>
            <a href="#trending" className="nav-link" onClick={(e) => {
              e.preventDefault();
              showTrending();
            }}>
              Hot Repos
            </a>
            <a href="#resources" className="nav-link" onClick={(e) => {
              e.preventDefault();
              navigateTo('resources');
            }}>Resources</a>
          </nav>

          {/* Auth Button */}
          <div className="auth-section">
            {isAuthenticated ? (
              <div className="user-menu">
                <img
                  src={user?.avatar_url}
                  alt={user?.login}
                  className="user-avatar"
                />
                <span className="user-name">{user?.login}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary btn-sm github-login-btn"
                onClick={login}
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <div className="loader-dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                    </svg>
                    Sign in with GitHub
                  </>
                )}
              </button>
            )}
          </div>

          <button
            className="mobile-menu-btn"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" style={{
          position: 'fixed',
          top: '70px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2rem',
          padding: '2rem'
        }}>
          <a href="#" className="nav-link" style={{ fontSize: '1.5rem' }} onClick={(e) => {
            e.preventDefault();
            navigateTo('hero');
            setMobileMenuOpen(false);
          }}>
            Home
          </a>
          <a href="#about" className="nav-link" style={{ fontSize: '1.5rem' }} onClick={(e) => {
            e.preventDefault();
            navigateTo('about');
            setMobileMenuOpen(false);
          }}>
            About
          </a>
          <a href="#explore" className="nav-link" style={{ fontSize: '1.5rem' }} onClick={(e) => {
            e.preventDefault();
            setActiveTab('issues');
            navigateTo('app');
            setMobileMenuOpen(false);
          }}>
            Explore Issues
          </a>
          <a href="#trending" className="nav-link" style={{ fontSize: '1.5rem' }} onClick={(e) => {
            e.preventDefault();
            showTrending();
            setMobileMenuOpen(false);
          }}>
            Hot Repos
          </a>
          <a href="#resources" className="nav-link" style={{ fontSize: '1.5rem' }} onClick={(e) => {
            e.preventDefault();
            navigateTo('resources');
            setMobileMenuOpen(false);
          }}>
            Resources
          </a>

          {/* Mobile Auth Section */}
          <div style={{
            marginTop: '2rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}>
            {isAuthenticated ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <img
                  src={user?.avatar_url}
                  alt={user?.login}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.2)'
                  }}
                />
                <span style={{ color: 'var(--dark-200)', fontSize: '1rem' }}>{user?.login}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  style={{ minWidth: '120px' }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                className="btn btn-primary btn-sm github-login-btn"
                onClick={() => {
                  login();
                  setMobileMenuOpen(false);
                }}
                disabled={authLoading}
                style={{
                  fontSize: '1rem',
                  padding: '0.75rem 1.5rem',
                  minWidth: '200px'
                }}
              >
                {authLoading ? (
                  <>
                    <div className="loader-dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                    <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>Loading...</span>
                  </>
                ) : (
                  <>
                    <svg height="18" viewBox="0 0 16 16" width="18" fill="currentColor">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                    </svg>
                    Sign in with GitHub
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hero Section with ColorBends Background */}
      {currentView === 'hero' && (
        <>
          <section className="hero">
            <ColorBends
              className="hero-background"
              colors={["#ff0080", "#8b5cf6", "#06b6d4"]}
              rotation={45}
              speed={0.5}
              scale={0.7}
              frequency={0.3}
              warpStrength={1.}
              mouseInfluence={0.2}
              parallax={0.1}
              noise={0.02}
              transparent={false}
            />

            <div className="hero-content">
              <div className="hero-eyebrow">Open Soure Finder</div>

              <h1 className="hero-title">
                <span className="hero-title-light">Find your first </span>
                <ShinyText
                  text="open source contribution."
                  speed={3}
                  color="#ffffff"
                  shineColor="#a78bfa"
                  className="hero-title-italic hero-shiny-text"
                  style={{ fontStyle: 'italic' }}
                />
              </h1>

              <p className="hero-subtitle">
                Discover beginner-friendly issues in{' '}
                <RotatingText
                  texts={ROTATING_LANGUAGES}
                  rotationInterval={2500}
                  staggerDuration={0.03}
                  staggerFrom="first"
                  mainClassName="rotating-language"
                  splitBy="characters"
                />
                <br />
                and more. Filter by language, difficulty, and topic.
              </p>

              <div className="hero-actions">
                <button className="btn btn-primary" onClick={startExploring}>
                  🔍 Start Exploring
                </button>
                <a
                  href="https://opensource.guide/how-to-contribute/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                >
                  📖 Contribution Guide
                </a>
              </div>

              <div className="stats">
                <div className="stat-item">
                  <div className="stat-value">50K+</div>
                  <div className="stat-label">Open Issues</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">12+</div>
                  <div className="stat-label">Languages</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">100%</div>
                  <div className="stat-label">Free Forever</div>
                </div>
              </div>
            </div>
          </section>

          <section className="features-section">
            <div className="container">
              <h2 className="section-title" style={{ textAlign: 'center' }}>Core Features</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-eyebrow">REPOSITORY SEARCH</div>
                  <h3 className="feature-title">
                    <span className="feature-title-light">Smart and efficient</span>
                    <br />
                    <span className="feature-title-italic">filtering for developers.</span>
                  </h3>
                  <p className="feature-description">
                    Filter repositories by category, language, and popularity. Find projects that align with your skills and interests instantly.
                  </p>
                  <div className="feature-footer">
                    <span className="feature-link" onClick={() => { setActiveTab('trending'); showTrending(); }} role="button" tabIndex={0}>Explore Repos</span>
                    <span className="arrow">→</span>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="feature-eyebrow">ISSUE DISCOVERY</div>
                  <h3 className="feature-title">
                    <span className="feature-title-light">Beginner friendly</span>
                    <br />
                    <span className="feature-title-italic">issue labels for starters.</span>
                  </h3>
                  <p className="feature-description">
                    Target "good first issue", "help wanted", and other labels to find accessible tasks for your first open source contribution.
                  </p>
                  <div className="feature-footer">
                    <span className="feature-link" onClick={() => { setActiveTab('issues'); startExploring(); }} role="button" tabIndex={0}>Browse Issues</span>
                    <span className="arrow">→</span>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="feature-eyebrow">MULTI-SELECT FILTERS</div>
                  <h3 className="feature-title">
                    <span className="feature-title-light">Select multiple labels</span>
                    <br />
                    <span className="feature-title-italic">and categories at once.</span>
                  </h3>
                  <p className="feature-description">
                    Toggle any label or category on/off with a single click. Combine filters to narrow down your perfect issue match.
                  </p>
                  <div className="feature-footer">
                    <span className="feature-link" onClick={() => { setActiveTab('issues'); startExploring(); }} role="button" tabIndex={0}>Try Multi-Select</span>
                    <span className="arrow">→</span>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="feature-eyebrow">REPO INSIGHTS</div>
                  <h3 className="feature-title">
                    <span className="feature-title-light">See star counts</span>
                    <br />
                    <span className="feature-title-italic">before picking issues.</span>
                  </h3>
                  <p className="feature-description">
                    View repository popularity with live star counts on every issue card. Choose well-maintained projects for better mentorship.
                  </p>
                  <div className="feature-footer">
                    <span className="feature-link" onClick={() => { setActiveTab('issues'); startExploring(); }} role="button" tabIndex={0}>See Star Counts</span>
                    <span className="arrow">→</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* About Section */}
      {currentView === 'about' && (
        <main className="main-content" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '120px' }}>
          <div className="container about-container" style={{ maxWidth: '800px', textAlign: 'center' }}>
            <h1 className="hero-title" style={{ marginBottom: '2rem' }}>About <span className="text-gradient">PSACHNO</span></h1>
            <div className="feature-card" style={{ textAlign: 'left', padding: '3rem' }}>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Our Mission</h3>
              <p className="feature-description" style={{ fontSize: '1.1rem' }}>
                PSACHNO is dedicated to simplifying the open source journey for developers worldwide. We believe that finding the right project should be as exciting as contributing to it.
              </p>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1.5rem' }}>The Creator</h3>
              <p className="feature-description" style={{ fontSize: '1.1rem' }}>
                I love building side projejcts in my free time, playing Chess sometimes and travelling on my bike! This platform was built with <span style={{ color: '#ff5c7a' }}>❤️</span> by <strong>me</strong> driven by a passion for community and code. Want to know more about me? Check out my <a href="https://adityaojha.vercel.app" target="_blank" rel="noopener noreferrer">portfolio</a>.
              </p>
              <div style={{ marginTop: '2rem' }}>
                <button className="btn btn-primary" onClick={() => navigateTo('app')}>Start Finding Issues</button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Resources Section */}
      {currentView === 'resources' && (
        <main className="main-content" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingTop: '120px' }}>
          <div className="container" style={{ maxWidth: '900px', textAlign: 'center' }}>
            <h1 className="hero-title" style={{ marginBottom: '1rem' }}>Learning <span className="text-gradient">Resources</span></h1>
            <p className="hero-subtitle" style={{ marginBottom: '3rem', color: 'var(--dark-200)' }}>
              Master GitHub and open source with these interactive tools
            </p>

            {/* Gamified Learning Section */}
            <div className="feature-card" style={{ textAlign: 'left', padding: '2rem', marginBottom: '2rem' }}>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                🎮 Learn GitHub - The Fun Way
              </h3>
              <p className="feature-description" style={{ fontSize: '1rem', marginBottom: '2rem' }}>
                Interactive games and challenges to master Git and GitHub
              </p>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <a href="https://ohmygit.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(124, 58, 237, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124, 58, 237, 0.2)', transition: 'all var(--transition-fast)' }}>
                    <span style={{ fontSize: '2rem' }}>🎮</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>Oh My Git!</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>An open source game for learning Git visually</p>
                    </div>
                  </div>
                </a>
                <a href="https://learngitbranching.js.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.2)', transition: 'all var(--transition-fast)' }}>
                    <span style={{ fontSize: '2rem' }}>🌳</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>Learn Git Branching</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>Interactive visual tutorial for Git branching</p>
                    </div>
                  </div>
                </a>
                <a href="https://github.com/skills" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34, 197, 94, 0.2)', transition: 'all var(--transition-fast)' }}>
                    <span style={{ fontSize: '2rem' }}>📚</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>GitHub Skills</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>Official hands-on courses from GitHub</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* First Contribution Resources */}
            <div className="feature-card" style={{ textAlign: 'left', padding: '2rem', marginBottom: '2rem' }}>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                🚀 Make Your First Contribution
              </h3>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <a href="https://github.com/firstcontributions/first-contributions" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(249, 115, 22, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                    <span style={{ fontSize: '2rem' }}>🎯</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>First Contributions</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>Step-by-step guide to make your first PR</p>
                    </div>
                  </div>
                </a>
                <a href="https://hacktoberfest.com/" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span style={{ fontSize: '2rem' }}>🎃</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>Hacktoberfest</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>Annual event celebrating open source contributions</p>
                    </div>
                  </div>
                </a>
                <a href="https://opensource.guide/how-to-contribute/" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(124, 58, 237, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124, 58, 237, 0.2)' }}>
                    <span style={{ fontSize: '2rem' }}>📖</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>Open Source Guide</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>Comprehensive guide to contributing</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            {/* More Tools */}
            <div className="feature-card" style={{ textAlign: 'left', padding: '2rem' }}>
              <h3 className="feature-title" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
                🛠️ Useful Tools & Extensions
              </h3>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                <a href="https://gitexplorer.com/" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                    <span style={{ fontSize: '2rem' }}>🔍</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>Git Explorer</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>Find the right Git commands without memorizing</p>
                    </div>
                  </div>
                </a>
                <a href="https://www.conventionalcommits.org/" target="_blank" rel="noopener noreferrer" className="resource-link">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                    <span style={{ fontSize: '2rem' }}>✍️</span>
                    <div>
                      <span style={{ color: 'white', fontWeight: 300 }}>Conventional Commits</span>
                      <p style={{ fontSize: '0.9rem', color: 'var(--dark-300)', margin: 0, fontWeight: 300 }}>Write better commit messages</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn-primary" onClick={() => navigateTo('app')}>Start Finding Issues</button>
            </div>
          </div>
        </main>
      )}

      {/* Main Content */}
      {currentView === 'app' && (
        <main className="main-content" id="main-content" role="main">
          {/* Tab Switcher */}
          <div className="tabs-container">
            <div className="tabs" role="tablist">
              <button
                className={`tab ${activeTab === 'issues' ? 'active' : ''}`}
                onClick={() => setActiveTab('issues')}
                role="tab"
                aria-selected={activeTab === 'issues'}
              >
                Explore Issues
              </button>
              <button
                className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
                onClick={() => setActiveTab('trending')}
                role="tab"
                aria-selected={activeTab === 'trending'}
              >
                Hot Repos
              </button>
            </div>
          </div>

          {/* Issues Tab Content */}
          {activeTab === 'issues' && (
            <>
              <section className="search-section">
                <div className="search-container">
                  <div className="search-header">
                    <h2 className="search-title">
                      Find Your Perfect Issue
                    </h2>
                    <div className="results-badge">
                      <span className="results-count">{totalCount.toLocaleString()}</span>
                      <span className="results-label">issues found</span>
                    </div>
                  </div>

                  <form onSubmit={handleSearch} className="search-bar" role="search">
                    <div className="search-input-wrapper">
                      <span className="search-icon" aria-hidden="true">🔍</span>
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search by keyword, repository, or topic..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search for open source issues"
                        id="search-input"
                      />
                    </div>
                    <button type="submit" className="search-btn">
                      Search
                    </button>
                  </form>

                  <div className="filters" role="group" aria-label="Filter options">
                    <div className="filter-group">
                      <label className="filter-label" htmlFor="language-select">Language</label>
                      <select
                        id="language-select"
                        className="filter-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label className="filter-label" htmlFor="sort-select">Sort By</label>
                      <select
                        id="sort-select"
                        className="filter-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        {SORT_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label className="filter-label" htmlFor="popularity-select">Repo Popularity</label>
                      <select
                        id="popularity-select"
                        className="filter-select"
                        value={popularity}
                        onChange={(e) => setPopularity(e.target.value)}
                      >
                        {POPULARITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Category Pills - Multi-select with toggle */}
                  <div className="category-section">
                    <span className="category-label">Categories:</span>
                    <div className="category-pills" role="group" aria-label="Filter by category">
                      {CATEGORIES.filter(cat => cat.value !== '').map(cat => {
                        const isSelected = selectedCategories.includes(cat.value)
                        return (
                          <button
                            key={cat.value}
                            className={`category-pill ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCategories(prev => prev.filter(c => c !== cat.value))
                              } else {
                                setSelectedCategories(prev => [...prev, cat.value])
                              }
                            }}
                            aria-pressed={isSelected}
                          >
                            <span className="category-icon" aria-hidden="true">{cat.icon}</span>
                            {cat.label}
                            {isSelected && <span className="selected-check">✓</span>}
                          </button>
                        )
                      })}
                      {selectedCategories.length > 0 && (
                        <button
                          className="category-pill clear-btn"
                          onClick={() => setSelectedCategories([])}
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Labels Section - Multi-select with toggle */}
                  <div className="category-section">
                    <span className="category-label">Labels:</span>
                    <div className="category-pills" role="group" aria-label="Filter by label">
                      {LABEL_OPTIONS.map(label => {
                        const isSelected = selectedLabels.includes(label.value)
                        return (
                          <button
                            key={label.value}
                            className={`category-pill ${isSelected ? 'active' : ''}`}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedLabels(prev => prev.filter(l => l !== label.value))
                              } else {
                                setSelectedLabels(prev => [...prev, label.value])
                              }
                            }}
                            aria-pressed={isSelected}
                          >
                            {label.label}
                            {isSelected && <span className="selected-check">✓</span>}
                          </button>
                        )
                      })}
                      {selectedLabels.length > 0 && (
                        <button
                          className="category-pill clear-btn"
                          onClick={() => setSelectedLabels([])}
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Issues Section */}
              <section className="issues-section">
                <div className="issues-header">
                  <h2 className="issues-title">
                    🎁 Beginner-Friendly Issues
                  </h2>
                </div>

                {/* Loading State */}
                {loading && (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Finding the best issues for you...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="empty-state" style={{ borderColor: 'var(--error-500)' }}>
                    <div className="empty-icon">{retryCount >= 2 ? '🛑' : '⚠️'}</div>
                    <h3 className="empty-title">
                      {retryCount >= 2 ? 'Slow down and please sign in with GitHub!' : 'Oops! Something went wrong'}
                    </h3>
                    <p className="empty-description">
                      {retryCount >= 2
                        ? 'You\'ve hit the rate limit multiple times. Sign in with GitHub to get 5,000 requests/hour instead of 10/minute!'
                        : error
                      }
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {retryCount >= 2 && !isAuthenticated && (
                        <button className="btn btn-primary" onClick={login}>
                          Sign in with GitHub
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setRetryCount(prev => prev + 1)
                          fetchIssues()
                        }}
                      >
                        Try Again {retryCount >= 2 && `(${retryCount} attempts)`}
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loading && !error && issues.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">🔎</div>
                    <h3 className="empty-title">No issues found</h3>
                    <p className="empty-description">
                      Try adjusting your filters or search terms to find more issues.
                    </p>
                  </div>
                )}

                {/* Issues Grid with TiltedCard */}
                {!loading && !error && issues.length > 0 && (
                  <div className="issues-grid">
                    {issues.map(issue => {
                      const repo = getRepoInfo(issue)
                      return (
                        <div
                          key={issue.id}
                          className="issue-card-wrapper"
                        >
                          <article className="issue-card">
                            <div className="issue-header">
                              <div className="issue-repo-avatar">
                                {issue.user?.avatar_url ? (
                                  <img
                                    src={issue.user.avatar_url}
                                    alt=""
                                    style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)' }}
                                  />
                                ) : (
                                  '📦'
                                )}
                              </div>
                              <div className="issue-info">
                                <a
                                  href={`https://github.com/${repo.full}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="issue-repo"
                                >
                                  <span>📁</span> {repo.full}
                                </a>
                                <a
                                  href={issue.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="issue-title"
                                >
                                  {issue.title}
                                </a>
                              </div>
                            </div>

                            {issue.body && (
                              <p className="issue-body">
                                {issue.body.slice(0, 200)}
                                {issue.body.length > 200 ? '...' : ''}
                              </p>
                            )}

                            <div className="issue-labels">
                              {issue.labels?.slice(0, 4).map(label => (
                                <span
                                  key={label.id}
                                  className="issue-label"
                                  style={getLabelStyle(label)}
                                >
                                  {label.name}
                                </span>
                              ))}
                              {issue.labels?.length > 4 && (
                                <span className="issue-label" style={{ background: 'var(--dark-600)', color: 'var(--dark-200)' }}>
                                  +{issue.labels.length - 4} more
                                </span>
                              )}
                            </div>

                            <div className="issue-footer">
                              <div className="issue-meta">
                                <span className="issue-meta-item">
                                  ⭐ {repoStars[repo.full] !== undefined && repoStars[repo.full] !== null
                                    ? repoStars[repo.full].toLocaleString()
                                    : <a href={`https://github.com/${repo.full}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{repo.full}</a>
                                  }
                                </span>
                                <span className="issue-meta-item">
                                  💬 {issue.comments}
                                </span>
                                <span className="issue-meta-item">
                                  📅 {formatDate(issue.created_at)}
                                </span>
                              </div>
                              <a
                                href={issue.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="issue-action"
                              >
                                View Issue →
                              </a>
                            </div>
                          </article>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Trending Repos Tab Content */}
          {activeTab === 'trending' && (
            <>
              <section className="search-section">
                <div className="search-container">
                  <div className="search-header">
                    <h2 className="search-title">
                      🔥 Hot Repositories
                    </h2>
                  </div>

                  <div className="filters" role="group" aria-label="Hot filters">
                    <div className="filter-group">
                      <label className="filter-label" htmlFor="trending-language">Language</label>
                      <select
                        id="trending-language"
                        className="filter-select"
                        value={trendingLanguage}
                        onChange={(e) => setTrendingLanguage(e.target.value)}
                      >
                        {LANGUAGES.map(lang => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-group">
                      <label className="filter-label" htmlFor="trending-period">Time Period</label>
                      <select
                        id="trending-period"
                        className="filter-select"
                        value={trendingPeriod}
                        onChange={(e) => setTrendingPeriod(e.target.value)}
                      >
                        <option value="daily">Today</option>
                        <option value="weekly">This Week</option>
                        <option value="monthly">This Month</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="issues-section">
                <div className="issues-header">
                  <h2 className="issues-title">
                    ⭐ Hot Repositories
                  </h2>
                </div>

                {/* Loading State */}
                {trendingLoading && (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p className="loading-text">Finding hot repos...</p>
                  </div>
                )}

                {/* Error State */}
                {trendingError && (
                  <div className="empty-state" style={{ borderColor: 'var(--error-500)' }}>
                    <div className="empty-icon">⚠️</div>
                    <h3 className="empty-title">Oops! Something went wrong</h3>
                    <p className="empty-description">{trendingError}</p>
                    <button className="btn btn-primary" onClick={fetchTrendingRepos} style={{ marginTop: 'var(--space-lg)' }}>
                      Try Again
                    </button>
                  </div>
                )}

                {/* Empty State */}
                {!trendingLoading && !trendingError && trendingRepos.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">🔎</div>
                    <h3 className="empty-title">No hot repos found</h3>
                    <p className="empty-description">
                      Try adjusting your filters to find more repositories.
                    </p>
                  </div>
                )}

                {/* Trending Repos Grid */}
                {!trendingLoading && !trendingError && trendingRepos.length > 0 && (
                  <div className="issues-grid">
                    {trendingRepos.map(repo => (
                      <div
                        key={repo.id}
                        className="issue-card-wrapper"
                      >
                        <article className="issue-card repo-card">
                          <div className="issue-header">
                            <div className="issue-repo-avatar">
                              {repo.owner?.avatar_url ? (
                                <img
                                  src={repo.owner.avatar_url}
                                  alt=""
                                  style={{ width: '100%', height: '100%', borderRadius: 'var(--radius-md)' }}
                                />
                              ) : (
                                '📦'
                              )}
                            </div>
                            <div className="issue-info">
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="issue-repo"
                              >
                                <span>📁</span> {repo.full_name}
                              </a>
                              <a
                                href={repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="issue-title"
                              >
                                {repo.name}
                              </a>
                            </div>
                          </div>

                          {repo.description && (
                            <p className="issue-body">
                              {repo.description.slice(0, 200)}
                              {repo.description.length > 200 ? '...' : ''}
                            </p>
                          )}

                          <div className="issue-labels">
                            <span className="issue-label" style={{ background: 'rgba(251, 146, 60, 0.2)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.4)' }}>
                              ⭐ {repo.stargazers_count.toLocaleString()}
                            </span>
                            <span className="issue-label" style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)' }}>
                              🍴 {repo.forks_count.toLocaleString()}
                            </span>
                            {repo.language && (
                              <span className="issue-label" style={{ background: 'rgba(124, 58, 237, 0.2)', color: '#a78bfa', border: '1px solid rgba(124, 58, 237, 0.4)' }}>
                                {repo.language}
                              </span>
                            )}
                          </div>

                          <div className="issue-footer">
                            <div className="issue-meta">
                              <span className="issue-meta-item">
                                👁️ {repo.watchers_count} watchers
                              </span>
                              <span className="issue-meta-item">
                                🕐 {formatDate(repo.created_at)}
                              </span>
                            </div>
                            <a
                              href={`${repo.html_url}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="issue-action"
                            >
                              Find Issues →
                            </a>
                          </div>
                        </article>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Resources Section */}
          <section className="resources-section" id="resources">
            <div className="section-header">
              <h2 className="section-title">
                📚 Resources for{' '}
                <ShinyText
                  text="Beginners"
                  speed={2}
                  color="#a78bfa"
                  shineColor="#22d3ee"
                />
              </h2>
              <p className="section-subtitle">
                Everything you need to make your first open source contribution with confidence.
              </p>
            </div>

            <div className="resources-grid">
              <div>
                <div className="resource-card">
                  <div className="resource-icon">🎓</div>
                  <h3 className="resource-title">Git Basics</h3>
                  <p className="resource-description">
                    Learn the fundamentals of Git version control - commits, branches, and pull requests.
                  </p>
                </div>
              </div>

              <div>
                <div className="resource-card">
                  <div className="resource-icon">🍴</div>
                  <h3 className="resource-title">Fork & Clone</h3>
                  <p className="resource-description">
                    Understand how to fork repositories and set up your local development environment.
                  </p>
                </div>
              </div>

              <div>
                <div className="resource-card">
                  <div className="resource-icon">📝</div>
                  <h3 className="resource-title">Writing Good PRs</h3>
                  <p className="resource-description">
                    Best practices for creating pull requests that maintainers love to review.
                  </p>
                </div>
              </div>

              <div>
                <div className="resource-card">
                  <div className="resource-icon">💬</div>
                  <h3 className="resource-title">Community Etiquette</h3>
                  <p className="resource-description">
                    How to communicate effectively with maintainers and other contributors.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}

        </main>
      )}

      < footer className="footer global-footer" style={{ padding: '3rem 2rem', textAlign: 'center', position: 'relative', zIndex: 10, marginTop: 'auto' }}>
        <p style={{ color: 'var(--dark-300)', fontSize: '0.9rem', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em', marginBottom: '0.5rem' }}>
          Built with <span style={{ color: '#ef4444', margin: '0 4px' }}>❤️</span> by Aditya Ojha in Bangalore
        </p>
        <p style={{ color: 'var(--dark-400)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
          &copy; 2026 PSACHNO. All rights reserved.
        </p>
      </footer>
    </div >
  )
}

export default App
