/**
 * useGitHubAuth Hook
 * 
 * A custom React hook that manages GitHub OAuth authentication.
 * 
 * Features:
 * - Stores access token in localStorage (persists across page reloads)
 * - Handles OAuth callback (when GitHub redirects back)
 * - Provides login/logout functions
 * - Tracks authentication state and user info
 * 
 * Usage:
 *   const { user, isAuthenticated, login, logout, accessToken } = useGitHubAuth()
 */

import { useState, useEffect, useCallback } from 'react'

// Server URL for OAuth endpoints
// Dynamically determine the server URL based on the current hostname
// This allows auth to work on mobile devices accessing via network IP
const AUTH_SERVER_URL = import.meta.env.PROD
    ? 'https://psankho.onrender.com' // TODO: Replace with your actual production server URL after deployment
    : `http://${window.location.hostname}:3002`

// LocalStorage keys
const STORAGE_KEYS = {
    ACCESS_TOKEN: 'github_access_token',
    USER: 'github_user'
}

export function useGitHubAuth() {
    // State for user info and loading status
    const [user, setUser] = useState(null)
    const [accessToken, setAccessToken] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)

    /**
     * Check for existing auth on mount
     * This runs once when the component using this hook mounts
     */
    useEffect(() => {
        const initAuth = async () => {
            // Check if there's a stored token
            const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
            const storedUser = localStorage.getItem(STORAGE_KEYS.USER)

            if (storedToken && storedUser) {
                // Verify the token is still valid
                try {
                    const response = await fetch(`${AUTH_SERVER_URL}/auth/verify`, {
                        headers: {
                            'Authorization': `Bearer ${storedToken}`
                        }
                    })

                    const data = await response.json()

                    if (data.valid) {
                        setAccessToken(storedToken)
                        setUser(JSON.parse(storedUser))
                    } else {
                        // Token expired, clear storage
                        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
                        localStorage.removeItem(STORAGE_KEYS.USER)
                    }
                } catch (err) {
                    console.error('Auth verification failed:', err)
                }
            }

            setIsLoading(false)
        }

        initAuth()
    }, [])

    /**
     * Handle OAuth callback
     * Call this when the user returns from GitHub with an auth code
     */
    const handleCallback = useCallback(async (code) => {
        setIsLoading(true)
        setError(null)
        console.log('[Auth] Handling callback with code:', code)

        try {
            const response = await fetch(`${AUTH_SERVER_URL}/auth/github/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            })

            const data = await response.json()

            if (data.error) {
                console.error('[Auth] Server returned error:', data.error)
                throw new Error(data.error)
            }

            // Store token and user info
            console.log('[Auth] Authentication successful, storing token')
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user))

            setAccessToken(data.access_token)
            setUser(data.user)

            return true
        } catch (err) {
            console.error('[Auth] Callback processing failed:', err)
            setError(err.message)
            return false
        } finally {
            setIsLoading(false)
        }
    }, [])

    /**
     * Initiate GitHub login
     * OPTIMIZED: Constructs OAuth URL directly on frontend (instant redirect!)
     * 
     * WHY THIS WORKS:
     * - GitHub Client ID is public (not secret)
     * - We can safely build the OAuth URL here
     * - No network call = NO DELAY! ⚡
     * 
     * ANIMATION TRICK:
     * - We set loading state first
     * - Wait 300ms for React to render the animation
     * - Then redirect to GitHub
     */
    const login = useCallback(() => {
        try {
            console.log('[Auth] Initiating login...')

            // STEP 1: Show loading animation
            // This triggers React to re-render the button with the animation
            setIsLoading(true)

            // STEP 2: Get the GitHub Client ID from environment variables
            // Vite exposes env vars prefixed with VITE_ to the frontend
            const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID

            // STEP 3: Determine where GitHub should redirect after auth
            // We use window.location.origin to get the current base URL
            // Examples: 
            //   - Local: http://localhost:5173
            //   - Production: https://yourapp.vercel.app
            const redirectUri = window.location.origin
            console.log('[Auth] Using redirect URI:', redirectUri)

            // STEP 4: Validate that Client ID exists
            if (!clientId) {
                setIsLoading(false)  // Reset loading on error
                throw new Error('GitHub Client ID not configured. Check your .env file.')
            }

            // STEP 5: Build the GitHub OAuth authorization URL
            // This is the standard GitHub OAuth URL format
            // Learn more: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
            const githubAuthUrl =
                `https://github.com/login/oauth/authorize` +  // GitHub's OAuth endpoint
                `?client_id=${clientId}` +                     // Your app's public ID
                `&redirect_uri=${encodeURIComponent(redirectUri)}` + // Where to return after auth
                `&scope=read:user`                            // What permissions we need

            console.log('[Auth] Redirecting to GitHub:', githubAuthUrl)

            // STEP 6: Wait a tiny moment for the animation to be visible
            // Why 300ms?
            // - React needs time to re-render with the loading state
            // - Animation needs time to be seen by the user
            // - Still feels instant (< 1 second)
            setTimeout(() => {
                // STEP 7: Redirect the user to GitHub
                window.location.href = githubAuthUrl
            }, 300)  // 300ms = 0.3 seconds (just enough to see the animation!)

        } catch (err) {
            console.error('[Auth] Login initialization failed:', err)
            setError(err.message)
            setIsLoading(false)  // Reset loading on error
        }
    }, [])

    /**
     * Logout the user
     * Clears stored token and user info
     */
    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        setAccessToken(null)
        setUser(null)
    }, [])

    return {
        // Auth state
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        error,

        // Auth actions
        login,
        logout,
        handleCallback
    }
}

export default useGitHubAuth
