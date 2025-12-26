import NextAuth, { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const authOptions: AuthOptions = {
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        name: { label: 'Name', type: 'text' } // For registration
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
            const user = await response.json()
            return {
              id: user.id.toString(),
              email: user.email,
              name: user.name,
            }
          } else if (response.status === 404) {
            // User doesn't exist
            if (credentials.name) {
              // This is a signup attempt, try to register
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
                  const newUser = await registerResponse.json()
                  return {
                    id: newUser.id.toString(),
                    email: newUser.email,
                    name: newUser.name,
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
            } else {
              // This is a signin attempt but user doesn't exist
              throw new Error('Account not found. Please sign up first.')
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
    async signIn({ user, account, profile }: any) {
      if (account?.provider === 'google') {
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
            }),
          })

          if (response.ok) {
            const authData = await response.json()
            user.id = authData.user.id.toString()
            user.accessToken = authData.access_token
            return true
          }
        } catch (error) {
          console.error('Google auth error:', error)
        }
      }
      return true
    },

    async jwt({ token, user }: any) {
      if (user) {
        token.sub = user.id
        token.picture = user.image
        token.accessToken = user.accessToken
      }
      return token
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
  },

  session: {
    strategy: 'jwt' as const,
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)