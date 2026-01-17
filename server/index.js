/**
 * PSAKHNO Auth Server
 * 
 * This Express server handles GitHub OAuth authentication.
 * It exchanges the authorization code for an access token securely,
 * keeping your Client Secret safe on the server side.
 * 
 * OAuth Flow:
 * 1. Frontend redirects user to GitHub login
 * 2. GitHub redirects back with an authorization code
 * 3. Frontend sends code to this server
 * 4. Server exchanges code for access token (using secret)
 * 5. Server returns access token to frontend
 */

// Load environment variables from .env file
require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const PORT = 3002  // Changed from 3001 to avoid conflicts

// ==============================================
// MIDDLEWARE SETUP
// ==============================================

// Enable CORS - allows frontend to make requests to this server
// For development: allow all origins
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}))

// Parse JSON request bodies
app.use(express.json())

// ==============================================
// GITHUB OAUTH ENDPOINTS
// ==============================================

/**
 * GET /auth/github
 * Returns the GitHub OAuth URL for the frontend to redirect to
 */
app.get('/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID
    const redirectUri = req.query.redirect_uri

    console.log('[Auth] Login requested')
    if (redirectUri) console.log(`[Auth] Using redirect_uri: ${redirectUri}`)

    if (!clientId) {
        console.error('[Auth] Error: GITHUB_CLIENT_ID not set')
        return res.status(500).json({
            error: 'Server configuration error: GITHUB_CLIENT_ID not set'
        })
    }

    // GitHub OAuth authorization URL with required scopes
    let githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user`

    // Add redirect_uri if provided
    if (redirectUri) {
        githubAuthUrl += `&redirect_uri=${encodeURIComponent(redirectUri)}`
    }

    res.json({ url: githubAuthUrl })
})

/**
 * POST /auth/github/callback
 * Exchanges the authorization code for an access token
 * 
 * This is the key security step: the Client Secret stays on the server
 */
app.post('/auth/github/callback', async (req, res) => {
    const { code } = req.body

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' })
    }

    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        return res.status(500).json({
            error: 'Server configuration error: GitHub credentials not set'
        })
    }

    try {
        // Exchange the code for an access token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code
            })
        })

        const tokenData = await tokenResponse.json()

        if (tokenData.error) {
            console.error('GitHub OAuth error:', tokenData.error_description)
            return res.status(400).json({
                error: tokenData.error_description || 'Failed to exchange code for token'
            })
        }

        // Fetch user info to return with the token
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })

        const userData = await userResponse.json()

        // Return both token and user info
        res.json({
            access_token: tokenData.access_token,
            token_type: tokenData.token_type,
            scope: tokenData.scope,
            user: {
                id: userData.id,
                login: userData.login,
                name: userData.name,
                avatar_url: userData.avatar_url
            }
        })

    } catch (error) {
        console.error('OAuth callback error:', error)
        res.status(500).json({ error: 'Failed to authenticate with GitHub' })
    }
})

/**
 * GET /auth/verify
 * Verifies if an access token is still valid
 */
app.get('/auth/verify', async (req, res) => {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false, error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]

    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        })

        if (response.ok) {
            const user = await response.json()
            res.json({
                valid: true,
                user: {
                    id: user.id,
                    login: user.login,
                    name: user.name,
                    avatar_url: user.avatar_url
                }
            })
        } else {
            res.json({ valid: false, error: 'Token expired or invalid' })
        }
    } catch (error) {
        res.status(500).json({ valid: false, error: 'Failed to verify token' })
    }
})

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        github_configured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET)
    })
})

// ==============================================
// START SERVER
// ==============================================

app.listen(PORT, () => {
    console.log(`
🚀 PSAKHNO Auth Server running on port ${PORT}

Endpoints:
  GET  /health              - Health check
  GET  /auth/github         - Get GitHub OAuth URL
  POST /auth/github/callback - Exchange code for token
  GET  /auth/verify         - Verify access token

Make sure you have set:
  - GITHUB_CLIENT_ID
  - GITHUB_CLIENT_SECRET
  - FRONTEND_URL (default: http://localhost:5174)
  `)
})
