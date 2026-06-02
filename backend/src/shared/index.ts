export { docClient, TABLE_NAME, LEDGER_TABLE_NAME } from './dynamo.js';
export { getRedisClient } from './redis.js';
export {
  success,
  created,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
} from './response.js';
export type { ApiError } from './response.js';
export {
  phoneSchema,
  nameSchema,
  roleSchema,
  otpSchema,
  kekeTypeSchema,
  vehicleRegSchema,
  registerSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
} from './validation.js';
export type { RegisterInput, OtpRequestInput, OtpVerifyInput, RefreshInput } from './validation.js';

// Authorization
export { handler as authorizerHandler, extractAuthContext } from './authorizer.js';
export type { AuthContext, UserRole } from './authorizer.js';
export { authorize, isPathPermittedForRole, isPublicPath, checkResourceOwnership } from './authorize.js';

// Input validation middleware
export { validateBody, validateQueryParams, validatePathParams, commonSchemas } from './input-validator.js';
export type { ValidationResult } from './input-validator.js';

// Audit logging
export {
  recordAuditEvent,
  extractIpAddress,
  extractRequestId,
  logAuthSuccess,
  logAuthFailure,
  logAuthLockout,
  logReservationCreate,
  logSwapComplete,
  logWalletCredit,
  logWalletDebit,
  logPaymentCallbackRejected,
  logAuthorizationDenied,
  logRoleViolation,
} from './audit.js';
export type { AuditEventType, AuditOutcome, AuditEntry } from './audit.js';

// Data masking
export { maskPhone, maskPaymentAccount, maskEmail, maskString } from './mask.js';
