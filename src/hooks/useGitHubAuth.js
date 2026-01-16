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
const AUTH_SERVER_URL = 'http://localhost:3002'

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
                throw new Error(data.error)
            }

            // Store token and user info
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user))

            setAccessToken(data.access_token)
            setUser(data.user)

            return true
        } catch (err) {
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
            const response = await fetch(`${AUTH_SERVER_URL}/auth/github`)
            const data = await response.json()

            if (data.url) {
                // Redirect to GitHub OAuth page
                window.location.href = data.url
            } else {
                throw new Error('Failed to get GitHub OAuth URL')
            }
        } catch (err) {
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
