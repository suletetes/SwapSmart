import {
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminInitiateAuthCommand,
  AdminGetUserCommand,
  AdminUserGlobalSignOutCommand,
  CognitoIdentityProviderClient,
  AuthFlowType,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME } from '../shared/dynamo.js';
import type { RegisterInput } from '../shared/validation.js';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'af-south-1',
});

const USER_POOL_ID = process.env.USER_POOL_ID || '';
const CLIENT_ID = process.env.CLIENT_ID || '';

export interface CreateAccountResult {
  success: boolean;
  userId?: string;
  error?: string;
  code?: string;
}

export interface TokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  user?: UserProfile;
  error?: string;
  code?: string;
}

export interface UserProfile {
  userId: string;
  name: string;
  phone: string;
  role: string;
  vehicleReg?: string;
  kekeType?: string;
  memberSince: string;
}

/**
 * Check if a phone number is already registered
 */
export async function phoneExists(phone: string): Promise<boolean> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3-PhoneLookup',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `PHONE#${phone}`,
      },
      Limit: 1,
    })
  );

  return (result.Items?.length ?? 0) > 0;
}

/**
 * Look up a user by phone number
 */
export async function getUserByPhone(phone: string): Promise<UserProfile | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI3-PhoneLookup',
      KeyConditionExpression: 'GSI3PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `PHONE#${phone}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const item = result.Items[0];
  return {
    userId: item.userId as string,
    name: item.name as string,
    phone: item.phone as string,
    role: item.role as string,
    vehicleReg: item.vehicleReg as string | undefined,
    kekeType: item.kekeType as string | undefined,
    memberSince: item.memberSince as string,
  };
}

/**
 * Create a new user account in Cognito and DynamoDB
 */
export async function createAccount(input: RegisterInput): Promise<CreateAccountResult> {
  const userId = uuidv4();
  const now = new Date().toISOString();

  // Check if phone already exists
  const exists = await phoneExists(input.phone);
  if (exists) {
    return {
      success: false,
      error: 'Phone number is already registered',
      code: 'PHONE_EXISTS',
    };
  }

  // Create Cognito user
  try {
    await cognitoClient.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: input.phone,
        UserAttributes: [
          { Name: 'phone_number', Value: input.phone },
          { Name: 'phone_number_verified', Value: 'true' },
          { Name: 'name', Value: input.name },
          { Name: 'custom:userId', Value: userId },
        ],
        MessageAction: 'SUPPRESS', // Don't send welcome email/SMS
      })
    );

    // Add user to role group
    await cognitoClient.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: input.phone,
        GroupName: input.role === 'FleetManager' ? 'FleetManagers' : `${input.role}s`,
      })
    );
  } catch (err) {
    if (err instanceof UsernameExistsException) {
      return {
        success: false,
        error: 'Phone number is already registered',
        code: 'PHONE_EXISTS',
      };
    }
    throw err;
  }

  // Create DynamoDB profile record
  const profileItem: Record<string, unknown> = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    userId,
    name: input.name,
    phone: input.phone,
    role: input.role,
    memberSince: now,
    swapCount: 0,
    savings: 0,
    // GSI3 for phone lookup
    GSI3PK: `PHONE#${input.phone}`,
    GSI3SK: `USER#${userId}`,
  };

  if (input.role === 'Driver') {
    profileItem.vehicleReg = input.vehicleReg;
    profileItem.kekeType = input.kekeType;
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: profileItem,
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  return { success: true, userId };
}

/**
 * Issue Cognito tokens via CUSTOM_AUTH flow after OTP verification
 */
export async function issueTokens(phone: string): Promise<TokenResult> {
  try {
    const authResult = await cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: CLIENT_ID,
        AuthFlow: AuthFlowType.CUSTOM_AUTH,
        AuthParameters: {
          USERNAME: phone,
        },
      })
    );

    const tokens = authResult.AuthenticationResult;
    if (!tokens) {
      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_FAILED',
      };
    }

    // Get user profile
    const user = await getUserByPhone(phone);

    return {
      success: true,
      accessToken: tokens.AccessToken,
      refreshToken: tokens.RefreshToken,
      idToken: tokens.IdToken,
      expiresIn: tokens.ExpiresIn,
      user: user ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return {
      success: false,
      error: message,
      code: 'AUTH_FAILED',
    };
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResult> {
  try {
    const authResult = await cognitoClient.send(
      new AdminInitiateAuthCommand({
        UserPoolId: USER_POOL_ID,
        ClientId: CLIENT_ID,
        AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      })
    );

    const tokens = authResult.AuthenticationResult;
    if (!tokens) {
      return {
        success: false,
        error: 'Token refresh failed',
        code: 'REFRESH_FAILED',
      };
    }

    return {
      success: true,
      accessToken: tokens.AccessToken,
      idToken: tokens.IdToken,
      expiresIn: tokens.ExpiresIn,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    return {
      success: false,
      error: message,
      code: 'REFRESH_FAILED',
    };
  }
}

/**
 * Revoke all sessions for a user (logout)
 */
export async function revokeSession(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Look up the user to get their Cognito username
    await cognitoClient.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: phone,
      })
    );

    // Global sign out — revokes all tokens
    await cognitoClient.send(
      new AdminUserGlobalSignOutCommand({
        UserPoolId: USER_POOL_ID,
        Username: phone,
      })
    );

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Logout failed';
    return { success: false, error: message };
  }
}
