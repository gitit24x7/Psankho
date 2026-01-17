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
     * Redirects the user to GitHub's authorization page
     */
    const login = useCallback(async () => {
        try {
            console.log('[Auth] Initiating login...')
            // Pass the current location as the redirect URI to ensure we come back to the right place
            const redirectUri = window.location.origin
            console.log('[Auth] Using redirect URI:', redirectUri)

            const response = await fetch(`${AUTH_SERVER_URL}/auth/github?redirect_uri=${encodeURIComponent(redirectUri)}`)
            const data = await response.json()

            if (data.url) {
                // Redirect to GitHub OAuth page
                console.log('[Auth] Redirecting to GitHub:', data.url)
                window.location.href = data.url
            } else {
                throw new Error('Failed to get GitHub OAuth URL')
            }
        } catch (err) {
            console.error('[Auth] Login initialization failed:', err)
            setError(err.message)
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
