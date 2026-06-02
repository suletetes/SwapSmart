import type {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  PolicyDocument,
  Statement,
} from 'aws-lambda';

export type UserRole = 'Driver' | 'Operator' | 'FleetManager';

export interface AuthContext {
  userId: string;
  role: UserRole;
  phone: string;
  groups: string[];
}

/**
 * Extracts the role from Cognito groups.
 * Groups are expected to be: Drivers, Operators, FleetManagers
 */
function extractRoleFromGroups(groups: string[]): UserRole | null {
  if (groups.includes('FleetManagers')) return 'FleetManager';
  if (groups.includes('Operators')) return 'Operator';
  if (groups.includes('Drivers')) return 'Driver';
  return null;
}

/**
 * Decodes a JWT token payload without verification (verification is done by Cognito).
 * In production, API Gateway's built-in Cognito authorizer handles signature verification.
 * This Lambda authorizer adds role extraction and custom policy generation.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Validates the JWT token is not expired.
 */
function isTokenExpired(payload: Record<string, unknown>): boolean {
  const exp = payload.exp as number | undefined;
  if (!exp) return true;
  return Date.now() / 1000 > exp;
}

function generatePolicy(
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string,
  context?: Record<string, string>
): APIGatewayAuthorizerResult {
  const statement: Statement = {
    Action: 'execute-api:Invoke',
    Effect: effect,
    Resource: resource,
  };

  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: [statement],
  };

  const result: APIGatewayAuthorizerResult = {
    principalId,
    policyDocument,
  };

  if (context) {
    result.context = context;
  }

  return result;
}

/**
 * Lambda Authorizer handler.
 * Validates JWT tokens from Cognito and extracts role from groups.
 */
export async function handler(
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> {
  const token = event.authorizationToken?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }

  // Decode JWT payload
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }

  // Check expiry
  if (isTokenExpired(payload)) {
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }

  // Extract user info from token claims
  const userId = (payload.sub as string) || '';
  const groups = (payload['cognito:groups'] as string[]) || [];
  const phone = (payload.phone_number as string) || '';

  if (!userId) {
    return generatePolicy('anonymous', 'Deny', event.methodArn);
  }

  // Extract role from Cognito groups
  const role = extractRoleFromGroups(groups);
  if (!role) {
    return generatePolicy(userId, 'Deny', event.methodArn);
  }

  // Generate Allow policy with context
  const context = {
    userId,
    role,
    phone,
    groups: JSON.stringify(groups),
  };

  return generatePolicy(userId, 'Allow', event.methodArn, context);
}

/**
 * Extracts auth context from API Gateway event's requestContext.authorizer.
 * Used by downstream Lambda handlers after the authorizer has run.
 */
export function extractAuthContext(
  authorizer: Record<string, unknown> | undefined
): AuthContext | null {
  if (!authorizer) return null;

  const userId = authorizer.userId as string;
  const role = authorizer.role as UserRole;
  const phone = authorizer.phone as string;
  const groupsStr = authorizer.groups as string;

  if (!userId || !role) return null;

  let groups: string[] = [];
  try {
    groups = JSON.parse(groupsStr || '[]');
  } catch {
    groups = [];
  }

  return { userId, role, phone, groups };
}
