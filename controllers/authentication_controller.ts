import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateRandomPassword, generateRandomPin } from '../utils/helpers';

// Types
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface PinValidation {
  userId: string;
  emailPin: string;
  smsPin: string;
}

interface LocationValidation {
  userId: string;
  latitude: number;
  longitude: number;
}

interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

/**
 * User registration
 */
export const register = async (req: Request<{}, {}, RegisterBody>, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
      return;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // TODO: Save user to database
    // const newUser = await User.create({
    //   email,
    //   password: hashedPassword,
    //   firstName,
    //   lastName
    // });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        email,
        firstName,
        lastName
      }
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 1: Validate email and password credentials
 */
export const validateCredentials = async (req: Request<{}, {}, LoginCredentials>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // TODO: Find user in database
    // const user = await User.findOne({ email });
    // if (!user) {
    //   res.status(401).json({
    //     success: false,
    //     message: 'Invalid credentials'
    //   });
    //   return;
    // }

    // TODO: Verify password
    // const isValidPassword = await bcrypt.compare(password, user.password);
    // if (!isValidPassword) {
    //   res.status(401).json({
    //     success: false,
    //     message: 'Invalid credentials'
    //   });
    //   return;
    // }

    // Generate PINs for next step
    const emailPin = generateRandomPin();
    const smsPin = generateRandomPin();

    // TODO: Send email and SMS with PINs
    // await sendEmailPin(email, emailPin);
    // await sendSMSPin(user.phone, smsPin);

    // TODO: Store PINs temporarily (Redis or database)
    // await storeTempPins(user.id, { emailPin, smsPin });

    res.status(200).json({
      success: true,
      message: 'Credentials validated. PINs sent.',
      data: {
        userId: 'temp-user-id', // Replace with actual user ID
        step: 'pin-validation'
      }
    });

  } catch (error: any) {
    console.error('Credential validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 2: Validate PIN codes
 */
export const validatePins = async (req: Request<{}, {}, PinValidation>, res: Response): Promise<void> => {
  try {
    const { userId, emailPin, smsPin } = req.body;

    if (!userId || !emailPin || !smsPin) {
      res.status(400).json({
        success: false,
        message: 'User ID and both PINs are required'
      });
      return;
    }

    // TODO: Validate PINs against stored values
    // const storedPins = await getTempPins(userId);
    // if (!storedPins || storedPins.emailPin !== emailPin || storedPins.smsPin !== smsPin) {
    //   res.status(401).json({
    //     success: false,
    //     message: 'Invalid PINs'
    //   });
    //   return;
    // }

    res.status(200).json({
      success: true,
      message: 'PINs validated successfully.',
      data: {
        userId,
        step: 'location-validation'
      }
    });

  } catch (error: any) {
    console.error('PIN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Step 3: Validate geolocation and complete login
 */
export const validateGeoLocation = async (req: Request<{}, {}, LocationValidation>, res: Response): Promise<void> => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      res.status(400).json({
        success: false,
        message: 'User ID and location coordinates are required'
      });
      return;
    }

    // TODO: Validate location (check if within allowed radius, etc.)
    // const isValidLocation = await validateUserLocation(userId, latitude, longitude);
    // if (!isValidLocation) {
    //   res.status(401).json({
    //     success: false,
    //     message: 'Invalid location'
    //   });
    //   return;
    // }

    // Generate tokens
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as string;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;

    const accessToken = jwt.sign(
      { userId, email: 'user@example.com' }, // Replace with actual user data
      accessTokenSecret,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId },
      refreshTokenSecret,
      { expiresIn: '7d' }
    );

    // TODO: Store refresh token in database
    // await storeRefreshToken(userId, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: userId,
          email: 'user@example.com' // Replace with actual user data
        }
      }
    });

  } catch (error: any) {
    console.error('Location validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    // TODO: Remove refresh token from database
    // await removeRefreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check if refresh token is valid
 */
export const checkRefreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;

    try {
      const decoded = jwt.verify(refreshToken, refreshTokenSecret) as { userId: string };
      
      // TODO: Check if token exists in database
      // const tokenExists = await checkRefreshTokenInDB(refreshToken);
      // if (!tokenExists) {
      //   res.status(401).json({
      //     success: false,
      //     message: 'Invalid refresh token'
      //   });
      //   return;
      // }

      res.status(200).json({
        success: true,
        message: 'Refresh token is valid',
        data: { userId: decoded.userId }
      });

    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

  } catch (error: any) {
    console.error('Check refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Refresh access and refresh tokens
 */
export const refreshTokensFixed = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
      return;
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET as string;
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET as string;

    try {
      const decoded = jwt.verify(refreshToken, refreshTokenSecret) as { userId: string };

      // TODO: Verify token exists in database and get user info
      // const user = await getUserByRefreshToken(refreshToken);
      // if (!user) {
      //   res.status(401).json({
      //     success: false,
      //     message: 'Invalid refresh token'
      //   });
      //   return;
      // }

      // Generate new tokens
      const newAccessToken = jwt.sign(
        { userId: decoded.userId, email: 'user@example.com' }, // Replace with actual user data
        accessTokenSecret,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        { userId: decoded.userId },
        refreshTokenSecret,
        { expiresIn: '7d' }
      );

      // TODO: Update refresh token in database
      // await updateRefreshToken(refreshToken, newRefreshToken);

      res.status(200).json({
        success: true,
        message: 'Tokens refreshed successfully',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (jwtError) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

  } catch (error: any) {
    console.error('Refresh tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Change user password (protected route)
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
      return;
    }

    // TODO: Get user from database
    // const user = await User.findById(userId);
    // if (!user) {
    //   res.status(404).json({
    //     success: false,
    //     message: 'User not found'
    //   });
    //   return;
    // }

    // TODO: Verify current password
    // const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    // if (!isCurrentPasswordValid) {
    //   res.status(400).json({
    //     success: false,
    //     message: 'Current password is incorrect'
    //   });
    //   return;
    // }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // TODO: Update password in database
    // await User.findByIdAndUpdate(userId, { password: hashedNewPassword });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
