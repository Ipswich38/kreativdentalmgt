import { NextRequest, NextResponse } from 'next/server';
import { AuthUtils, MockAuthService } from '@/lib/auth';
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

    // Authenticate user
    const user = await MockAuthService.authenticateUser(email, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate tokens
    const token = AuthUtils.generateToken(user);
    const refreshToken = AuthUtils.generateRefreshToken(user.id);

    // Update last login
    await MockAuthService.updateLastLogin(user.id);

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}