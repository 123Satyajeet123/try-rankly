'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import apiService from '@/services/api'

interface User {
  id: string
  email: string
  profile: {
    firstName: string
    lastName: string
    company?: string
    website?: string
  }
  onboarding: {
    isCompleted: boolean
    currentStep: number
    [key: string]: any
  }
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setAuthToken: (token: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = !!user

  // Check for existing token on mount and handle Google OAuth callback
  useEffect(() => {
    const initAuth = async () => {
      // Check for Google OAuth tokens in URL parameters
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get('token')
      const error = urlParams.get('error')

      if (error === 'oauth_failed') {
        setError('Google login failed. Please try again.')
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
        setIsLoading(false)
        return
      }

      if (token) {
        // Handle Google OAuth success
        apiService.setToken(token)
        localStorage.setItem('authToken', token)
        try {
          await refreshUser()
          console.log('✅ Google OAuth login successful')
        } catch (err) {
          console.error('Failed to refresh user after Google OAuth:', err)
          logout()
        }
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
        setIsLoading(false)
        return
      }

      // Check for existing token in localStorage
      const existingToken = localStorage.getItem('authToken')
      if (existingToken) {
        apiService.setToken(existingToken)
        try {
          await refreshUser()
        } catch (err) {
          console.error('Failed to refresh user:', err)
          logout()
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.login(email, password)
      const { user: userData, token, refreshToken } = response.data

      apiService.setToken(token)
      localStorage.setItem('authToken', token)
      localStorage.setItem('refreshToken', refreshToken)
      setUser(userData)

      console.log('✅ Login successful')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiService.register(userData)
      const { user: newUser, token, refreshToken } = response.data

      apiService.setToken(token)
      localStorage.setItem('authToken', token)
      localStorage.setItem('refreshToken', refreshToken)
      setUser(newUser)

      console.log('✅ Registration successful')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    apiService.clearToken()
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
    setError(null)
    console.log('✅ Logged out')
  }

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser()
      setUser(response.data.user)
    } catch (err) {
      console.error('Failed to refresh user:', err)
      throw err
    }
  }

  const setAuthToken = (token: string) => {
    apiService.setToken(token)
    localStorage.setItem('authToken', token)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      error,
      login,
      register,
      logout,
      refreshUser,
      setAuthToken
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
