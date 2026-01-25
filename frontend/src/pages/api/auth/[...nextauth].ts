import NextAuth, { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function refreshAccessToken(token: any) {
  try {
    // Call backend to refresh the token
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }

    const refreshedTokens = await response.json()

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    }
  } catch (error) {
    console.error('Error refreshing access token:', error)
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

export const authOptions: AuthOptions = {
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' }, // For registration
        mode: { label: 'Mode', type: 'text' }, // signin | signup
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password')
        }

        try {
          // Try to authenticate with the backend
          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            return {
              id: data.user.id.toString(),
              email: data.user.email,
              name: data.user.name,
              accessToken: data.access_token, // Store the JWT token
            }
          } else if (response.status === 404) {
            // Treat presence of name as signup intent as a fallback in case mode is missing
            const isSignup = credentials.mode === 'signup' || !!credentials.name

            if (!isSignup) {
              // Explicit signin: do not auto-register
              throw new Error('Account not found. Please sign up first.')
            }

            // Signup flow: create account then return credentials
            try {
              const registerResponse = await fetch(`${API_BASE_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: credentials.email,
                  password: credentials.password,
                  name: credentials.name,
                }),
              })

              if (registerResponse.ok) {
                const data = await registerResponse.json()
                return {
                  id: data.user.id.toString(),
                  email: data.user.email,
                  name: data.user.name,
                  accessToken: data.access_token, // Store the JWT token
                }
              } else {
                const errorData = await registerResponse.json().catch(() => ({}))
                throw new Error(errorData.detail || 'Registration failed')
              }
            } catch (registerError) {
              console.error('Registration error:', registerError)
              if (registerError instanceof Error) {
                throw registerError
              }
              throw new Error('Failed to register. Please try again.')
            }
          } else if (response.status === 401) {
            // Wrong password
            throw new Error('Invalid email or password')
          } else {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.detail || 'Authentication failed')
          }
        } catch (error) {
          console.error('Auth error:', error)
          if (error instanceof Error) {
            throw error // Re-throw the error to preserve the message
          }
          throw new Error('Something went wrong. Please try again.')
        }
      },
    }),

    // Google OAuth
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }: any) {
      // Initial sign in - fetch access token from backend
      if (account && user) {
        if (account.provider === 'google') {
          try {
            // Register/login Google user with backend
            const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: user.email,
                name: user.name,
                google_id: user.id,
                picture: user.image,
              }),
            })

            if (response.ok) {
              const authData = await response.json()
              token.sub = authData.user.id.toString()
              token.accessToken = authData.access_token
              token.accessTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days from now
              token.picture = user.image
            } else {
              const errorData = await response.json().catch(() => ({}))
              console.error('Backend Google auth failed:', response.status, errorData)
            }
          } catch (error) {
            console.error('Google auth error:', error)
          }
        } else if (account.provider === 'credentials') {
          // For credentials provider, user object already has the access token
          token.sub = user.id
          token.picture = user.image
          token.accessToken = user.accessToken
          token.accessTokenExpires = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days from now
        }
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token
      }

      // Access token has expired, try to refresh it
      return refreshAccessToken(token)
    },

    async session({ session, token }: any) {
      if (token.sub) {
        session.user.id = token.sub
      }
      if (token.picture) {
        session.user.image = token.picture
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken
      }
      return session
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin', // Redirect errors back to sign in page
  },

  session: {
    strategy: 'jwt' as const,
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)