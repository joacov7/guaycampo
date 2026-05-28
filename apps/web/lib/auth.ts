import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { AuthUser } from '@/types';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
        tenantSlug: { label: 'Empresa', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const authUrl =
            process.env.NEXT_PUBLIC_AUTH_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

          const res = await fetch(`${authUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              tenantSlug: credentials.tenantSlug ?? undefined,
            }),
          });

          if (!res.ok) {
            return null;
          }

          const data = (await res.json()) as {
            user: {
              id: string;
              email: string;
              fullName: string;
              tenantId: string;
              tenant: { slug: string; name: string };
              role?: { name: string };
            };
            accessToken: string;
            refreshToken: string;
          };

          const user: AuthUser = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.fullName,
            tenantId: data.user.tenantId,
            tenantSlug: data.user.tenant.slug,
            tenantName: data.user.tenant.name,
            role: data.user.role?.name ?? 'operator',
            isSuperAdmin: (data.user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
          };

          return user;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.accessToken = authUser.accessToken;
        token.refreshToken = authUser.refreshToken;
        token.tenantId = authUser.tenantId;
        token.tenantSlug = authUser.tenantSlug;
        token.tenantName = authUser.tenantName;
        token.role = authUser.role;
        token.isSuperAdmin = authUser.isSuperAdmin ?? false;
        token.name = authUser.name;
        token.email = authUser.email;
        token.sub = authUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.sub ?? '',
        email: token.email ?? '',
        name: token.name ?? '',
        tenantId: token.tenantId,
        tenantSlug: token.tenantSlug,
        tenantName: token.tenantName,
        role: token.role,
        isSuperAdmin: token.isSuperAdmin ?? false,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
      };
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
