import { AuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';
import { cookies } from 'next/headers';

// Extend the built-in User type to include our custom fields
declare module 'next-auth' {
  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string;
    accessToken?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          });

          const user = await res.json();

          if (!res.ok) {
            return null;
          }

          return user;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        // Type assertion for the user object with custom properties
        const customUser = user as any;
        return {
          ...token,
          accessToken: typeof customUser.accessToken === 'string' ? customUser.accessToken : '',
          role: typeof customUser.role === 'string' ? customUser.role : 'user',
          id: user.id || '',
          name: typeof user.name === 'string' ? user.name : '',
          email: typeof user.email === 'string' ? user.email : '',
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Ensure all required fields are strings
      const safeToken = {
        ...token,
        role: (token.role as string) || 'user',
        accessToken: (token.accessToken as string) || '',
      };
      
      session.user = {
        ...session.user,
        id: token.sub || '',
        name: token.name || '',
        email: token.email || '',
        role: safeToken.role,
        accessToken: safeToken.accessToken,
      };
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      accessToken: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      accessToken: string;
    };
  }
}
