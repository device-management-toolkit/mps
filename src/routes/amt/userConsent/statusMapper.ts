/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

/**
 * Error details structure for user consent operations
 */
export interface UserConsentErrorDetails {
  returnValue: number
  returnValueStr: string
  suggestion?: string
  retryAfter?: string
  checkOptInState?: string
}

/**
 * Detailed error response structure
 */
export interface DetailedErrorResponse {
  error: string
  message: string
  details: UserConsentErrorDetails
}

/**
 * Maps Intel AMT return values to appropriate HTTP status codes
 * for better client-side error handling
 */
export function mapAMTReturnValueToHttpStatus(returnValueStr: string): number {
  switch (returnValueStr) {
    case 'SUCCESS':
      return 200

    case 'NOT_READY': // NOT_READY / Conflicts with operation already in progress
      return 409 // Conflict

    case 'UNSUPPORTED': // 0x0812 - Wrong consentCode sent
      return 422 // Unprocessable Entity

    default:
      return 400 // Bad Request for other errors
  }
}

/**
 * Provides user-friendly error messages based on AMT return values
 */
export function getDetailedErrorMessage(
  returnValue: number,
  returnValueStr: string,
  operation: 'request' | 'send' | 'cancel'
): DetailedErrorResponse {
  switch (returnValueStr) {
    case 'NOT_READY': // NOT_READY / Conflicts with operation already in progress
      if (operation === 'request') {
        return {
          error: 'Conflict',
          message: 'A consent request is already pending or the system is not ready',
          details: {
            returnValue,
            returnValueStr,
            suggestion: 'Cancel the existing request first using: GET /api/v1/amt/userConsentCode/cancel/{guid}',
            retryAfter: 'Or wait for 300 seconds for the current pending request to expire',
            checkOptInState: 'Check current state using: GET /api/v1/amt/features/{guid} \n' +
              'Check the optInState field: \n' +
              '  0 = Not Started; \n' +
              '  1 = Requested; \n' +
              '  2 = Displayed; \n' +
              '  3 = Received; \n' +
              '  4 = In-Session. \n' +
              'If optInState is 2/3/4, you need to cancel before requesting a new code.'
          }
        }
      } else if (operation === 'send') {
        return {
          error: 'Conflict',
          message: 'The consent code has expired or request is already Received / In-Session / Not Started',
          details: {
            returnValue,
            returnValueStr,
            suggestion: 'Cancel and Request a new consent code',
            checkOptInState: 'Check current state using: GET /api/v1/amt/features/{guid} \n' +
              'Check the optInState field: \n' +
              '  0 = Not Started; \n' +
              '  1 = Requested; \n' +
              '  2 = Displayed; \n' +
              '  3 = Received; \n' +
              '  4 = In-Session. \n' +
              'If optInState is 0: Request consent code first; \n' +
              'else if optInState is 3/4: Consent already granted or session active'
          }
        }
      } else if (operation === 'cancel') {
        return {
          error: 'Conflict',
          message: 'The request is currently In-Session or No active request to cancel.',
          details: {
            returnValue,
            returnValueStr,
            suggestion: 'Cancel any ongoing session before attempting to cancel the consent request',
            checkOptInState: 'Check current state using: GET /api/v1/amt/features/{guid} \n' +
              'Check the optInState field: \n' +
              '  0 = Not Started; \n' +
              '  1 = Requested; \n' +
              '  2 = Displayed; \n' +
              '  3 = Received; \n' +
              '  4 = In-Session. \n' +
              'If optInState is 4: Disconnect ongoing session first; \n' +
              'else if optInState is 0: No active request to cancel'
          }
        }
      } else {
        return {
          error: 'System is NOT_READY',
          message: 'System not ready to cancel consent request',
          details: {
            returnValue,
            returnValueStr,
            checkOptInState: 'Check current state using: GET /api/v1/amt/features/{guid} \n' +
              'Check the optInState field: \n' +
              '  0 = Not Started; \n' +
              '  1 = Requested; \n' +
              '  2 = Displayed; \n' +
              '  3 = Received; \n' +
              '  4 = In-Session.'
          }
        }
      }

    case 'UNSUPPORTED': // 0x0812
      if (operation === 'send') { // 0x0812 - Wrong consentCode sent
        return {
          error: 'Unprocessable Entity',
          message: 'Invalid consent code provided',
          details: {
            returnValue,
            returnValueStr,
            suggestion: 'Verify the 6-digit code displayed on the device screen and try again'
          }
        }
      } else {
        return {
          error: 'Unprocessable Entity',
          message: 'Operation not supported',
          details: {
            returnValue,
            returnValueStr
          }
        }
      }

    default:
      return {
        error: 'Bad Request',
        message: `Operation failed: ${returnValueStr}`,
        details: {
          returnValue,
          returnValueStr
        }
      }
  }
}
