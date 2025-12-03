import { NextRequest, NextResponse } from 'next/server';
import { AuthUtils, ProductionAuthService } from '@/lib/auth';
import { LoginCredentials, LoginResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginCredentials = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!AuthUtils.validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // TODO: Extract clinic ID from subdomain or request context for multi-tenancy
    const clinicId = request.headers.get('x-clinic-id') || undefined;

    const authService = new ProductionAuthService();

    // Authenticate user
    const user = await authService.authenticateUser(email, password, clinicId);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials or clinic access denied' },
        { status: 401 }
      );
    }

    // Generate tokens
    const token = AuthUtils.generateToken(user);
    const refreshToken = AuthUtils.generateRefreshToken(user.id);

    // Update last login
    await authService.updateLastLogin(user.id);

    const response: LoginResponse = {
      user,
      token,
      refreshToken,
      expiresIn: 24 * 60 * 60 // 24 hours in seconds
    };

    // Set HTTP-only cookie for refresh token (secure in production)
    const res = NextResponse.json(response);
    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return res;

  } catch (error) {
    console.error('Login error:', error);

    // Handle production readiness error
    if (error instanceof Error && error.message.includes('not implemented - requires Supabase setup')) {
      return NextResponse.json(
        { error: 'Authentication service not configured. Please contact system administrator.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}