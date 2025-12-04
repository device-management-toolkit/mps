/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

export const AMTPort = 16992

export const DefaultNetworkingAdaptor = 'eth0'

export const UUIDRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

// HTTP error codes
export const HTTPErrorTable = {
  200: 'httpErrorTableOK',
  400: 'Incorrect URI or Bad Request',
  401: 'Unauthorized',
  404: {
    alarm: 'Alarm instance not found',
    device: 'Device not found/connected. Please connect again using CIRA.',
    method: 'Request does not contain method',
    noMethod: 'Requested method does not exists',
    payload: 'Request does not contain payload',
    guid: 'GUID does not exist in the payload',
    action: 'Power action type does not exist',
    invalidGuid: 'GUID empty/invalid'
  },
  408: 'Timeout Error',
  500: 'Internal Server Error',
  601: 'WSMAN Parsing Error',
  602: 'Unable to parse HTTP response header',
  603: 'Unexpected HTTP enum response',
  604: 'Unexpected HTTP pull response'
}

// OSPowerSavingState. The current operating system power saving state of the associated Management System Element.
// ValueMap={0, 1, 2, 3}
// Values={Unknown, Unsupported, Full Power, OS Power Saving}
export const DMTFOSPowerSavingState = [
  0,
  1,
  2,
  3
]

// Power Actions supported as per Distributed Management Task Force standard.
// ValueMap={2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16}
// Values={Power On, Sleep - Light, Sleep - Deep, Power Cycle (Off Soft), Power Off - Hard, Hibernate, Power Off - Soft, Power Cycle (Off Hard), Master Bus Reset, Diagnostic Interrupt (NMI), Power Off - Soft Graceful, Power Off - Hard Graceful, Master Bus Reset Graceful, Power Cycle (Off - Soft Graceful), Power Cycle (Off - Hard Graceful)}
export const DMTFPowerStates = [
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17
]
export const DMTFPowerExtendedStates = [
  100,
  101,
  104,
  105,
  106,
  107,
  108,
  109,
  110,
  200,
  201,
  202,
  203,
  300,
  301,
  400,
  401,
  500, //From OS Power Saving Mode to OS Full Power Mode
  501 //From OS Full Power to OS Power Saving Mode
]

export const DMTFCombinedPowerStates = [
  ...DMTFPowerStates,
  ...DMTFPowerExtendedStates
] // Power States + Extended Power States for Validation

export const UserConsentOptions = {
  none: 0,
  kvm: 1,
  all: 4294967295
}

export const OSPowerSavingStateStatusCodes = {
  0: 'COMPLETED_WITH_NO_ERROR',
  1: 'NOT_SUPPORTED',
  2: 'UNKNOWN_OR_UNSPECIFIED_ERROR',
  3: 'CANNOT_COMPLETE_WITHIN_TIMEOUT_PERIOD',
  4: 'FAILED',
  5: 'INVALID_PARAMETER',
  6: 'IN_USE',
  4096: 'METHOD_PARAMETERS_CHECKED_JOB_STARTED',
  4097: 'INVALID_STATE_TRANSITION',
  4098: 'USE_OF_TIMEOUT_PARAMETER_NOT_SUPPORTED',
  4099: 'BUSY'
}

export const AMTStatusCodes = {
  0x0000: 'SUCCESS',
  0x0001: 'INTERNAL_ERROR',
  0x0002: 'NOT_READY',
  0x0003: 'INVALID_PT_MODE',
  0x0004: 'INVALID_MESSAGE_LENGTH',
  0x0005: 'TABLE_FINGERPRINT_NOT_AVAILABLE',
  0x0006: 'INTEGRITY_CHECK_FAILED',
  0x0007: 'UNSUPPORTED_ISVS_VERSION',
  0x0008: 'APPLICATION_NOT_REGISTERED',
  0x0009: 'INVALID_REGISTRATION_DATA',
  0x000a: 'APPLICATION_DOES_NOT_EXIST',
  0x000b: 'NOT_ENOUGH_STORAGE',
  0x000c: 'INVALID_NAME',
  0x000d: 'BLOCK_DOES_NOT_EXIST',
  0x000e: 'INVALID_BYTE_OFFSET',
  0x000f: 'INVALID_BYTE_COUNT',
  0x0010: 'NOT_PERMITTED',
  0x0011: 'NOT_OWNER',
  0x0012: 'BLOCK_LOCKED_BY_OTHER',
  0x0013: 'BLOCK_NOT_LOCKED',
  0x0014: 'INVALID_GROUP_PERMISSIONS',
  0x0015: 'GROUP_DOES_NOT_EXIST',
  0x0016: 'INVALID_MEMBER_COUNT',
  0x0017: 'MAX_LIMIT_REACHED',
  0x0018: 'INVALID_AUTH_TYPE',
  0x0019: 'AUTHENTICATION_FAILED',
  0x001a: 'INVALID_DHCP_MODE',
  0x001b: 'INVALID_IP_ADDRESS',
  0x001c: 'INVALID_DOMAIN_NAME',
  0x001d: 'UNSUPPORTED_VERSION',
  0x001e: 'REQUEST_UNEXPECTED',
  0x001f: 'INVALID_TABLE_TYPE',
  0x0020: 'INVALID_PROVISIONING_STATE',
  0x0021: 'UNSUPPORTED_OBJECT',
  0x0022: 'INVALID_TIME',
  0x0023: 'INVALID_INDEX',
  0x0024: 'INVALID_PARAMETER',
  0x0025: 'INVALID_NETMASK',
  0x0026: 'FLASH_WRITE_LIMIT_EXCEEDED',
  0x0027: 'INVALID_IMAGE_LENGTH',
  0x0028: 'INVALID_IMAGE_SIGNATURE',
  0x0029: 'PROPOSE_ANOTHER_VERSION',
  0x002a: 'INVALID_PID_FORMAT',
  0x002b: 'INVALID_PPS_FORMAT',
  0x002c: 'BIST_COMMAND_BLOCKED',
  0x002d: 'CONNECTION_FAILED',
  0x002e: 'CONNECTION_TOO_MANY',
  0x002f: 'RNG_GENERATION_IN_PROGRESS',
  0x0030: 'RNG_NOT_READY',
  0x0031: 'CERTIFICATE_NOT_READY',
  0x0400: 'DISABLED_BY_POLICY',
  0x0800: 'NETWORK_IF_ERROR_BASE',
  0x0801: 'UNSUPPORTED_OEM_NUMBER',
  0x0802: 'UNSUPPORTED_BOOT_OPTION',
  0x0803: 'INVALID_COMMAND',
  0x0804: 'INVALID_SPECIAL_COMMAND',
  0x0805: 'INVALID_HANDLE',
  0x0806: 'INVALID_PASSWORD',
  0x0807: 'INVALID_REALM',
  0x0808: 'STORAGE_ACL_ENTRY_IN_USE',
  0x0809: 'DATA_MISSING',
  0x080a: 'DUPLICATE',
  0x080b: 'EVENTLOG_FROZEN',
  0x080c: 'PKI_MISSING_KEYS',
  0x080d: 'PKI_GENERATING_KEYS',
  0x080e: 'INVALID_KEY',
  0x080f: 'INVALID_CERT',
  0x0810: 'CERT_KEY_NOT_MATCH',
  0x0811: 'MAX_KERB_DOMAIN_REACHED',
  0x0812: 'UNSUPPORTED',
  0x0813: 'INVALID_PRIORITY',
  0x0814: 'NOT_FOUND',
  0x0815: 'INVALID_CREDENTIALS',
  0x0816: 'INVALID_PASSPHRASE',
  0x0818: 'NO_ASSOCIATION',
  0x081b: 'AUDIT_FAIL',
  0x081c: 'BLOCKING_COMPONENT',
  0x0821: 'USER_CONSENT_REQUIRED',
  0x1000: 'APP_INTERNAL_ERROR',
  0x1001: 'NOT_INITIALIZED',
  0x1002: 'LIB_VERSION_UNSUPPORTED',
  0x1003: 'INVALID_PARAM',
  0x1004: 'RESOURCES',
  0x1005: 'HARDWARE_ACCESS_ERROR',
  0x1006: 'REQUESTOR_NOT_REGISTERED',
  0x1007: 'NETWORK_ERROR',
  0x1008: 'PARAM_BUFFER_TOO_SHORT',
  0x1009: 'COM_NOT_INITIALIZED_IN_THREAD',
  0x100a: 'URL_REQUIRED'
}

// Default top and skip for api pagination

export const DefaultTop = 25
export const DefaultSkip = 0

export const SystemEntityTypes: Record<number, string> = {
  0: 'Unspecified',
  1: 'Other',
  2: 'Unknown',
  3: 'Processor',
  4: 'Disk',
  5: 'Peripheral',
  6: 'System management module',
  7: 'System board',
  8: 'Memory module',
  9: 'Processor module',
  10: 'Power supply',
  11: 'Add in card',
  12: 'Front panel board',
  13: 'Back panel board',
  14: 'Power system board',
  15: 'Drive backplane',
  16: 'System internal expansion board',
  17: 'Other system board',
  18: 'Processor board',
  19: 'Power unit',
  20: 'Power module',
  21: 'Power management board',
  22: 'Chassis back panel board',
  23: 'System chassis',
  24: 'Sub chassis',
  25: 'Other chassis board',
  26: 'Disk drive bay',
  27: 'Peripheral bay',
  28: 'Device bay',
  29: 'Fan cooling',
  30: 'Cooling unit',
  31: 'Cable interconnect',
  32: 'Memory device',
  33: 'System management software',
  34: 'BIOS',
  35: 'Intel(r) ME',
  36: 'System bus',
  37: 'Group',
  38: 'Intel(r) ME',
  39: 'External environment',
  40: 'Battery',
  41: 'Processing blade',
  42: 'Connectivity switch',
  43: 'Processor/memory module',
  44: 'I/O module',
  45: 'Processor I/O module',
  46: 'Management controller firmware',
  47: 'IPMI channel',
  48: 'PCI bus',
  49: 'PCI express bus',
  50: 'SCSI bus',
  51: 'SATA/SAS bus',
  52: 'Processor front side bus'
}

export const SystemFirmwareError: Record<number, string> = {
  0: 'Unspecified.',
  1: 'No system memory is physically installed in the system.',
  2: 'No usable system memory, all installed memory has experienced an unrecoverable failure.',
  3: 'Unrecoverable hard-disk/ATAPI/IDE device failure.',
  4: 'Unrecoverable system-board failure.',
  5: 'Unrecoverable diskette subsystem failure.',
  6: 'Unrecoverable hard-disk controller failure.',
  7: 'Unrecoverable PS/2 or USB keyboard failure.',
  8: 'Removable boot media not found.',
  9: 'Unrecoverable video controller failure.',
  10: 'No video device detected.',
  11: 'Firmware (BIOS) ROM corruption detected.',
  12: 'CPU voltage mismatch (processors that share same supply have mismatched voltage requirements)',
  13: 'CPU speed matching failure'
}

export const SystemFirmwareProgress: Record<number, string> = {
  0: 'Unspecified.',
  1: 'Memory initialization.',
  2: 'Starting hard-disk initialization and test',
  3: 'Secondary processor(s) initialization',
  4: 'User authentication',
  5: 'User-initiated system setup',
  6: 'USB resource configuration',
  7: 'PCI resource configuration',
  8: 'Option ROM initialization',
  9: 'Video initialization',
  10: 'Cache initialization',
  11: 'SM Bus initialization',
  12: 'Keyboard controller initialization',
  13: 'Embedded controller/management controller initialization',
  14: 'Docking station attachment',
  15: 'Enabling docking station',
  16: 'Docking station ejection',
  17: 'Disabling docking station',
  18: 'Calling operating system wake-up vector',
  19: 'Starting operating system boot process',
  20: 'Baseboard or motherboard initialization',
  21: 'reserved',
  22: 'Floppy initialization',
  23: 'Keyboard test',
  24: 'Pointing device test',
  25: 'Primary processor initialization'
}

export const WatchdogCurrentStates: Record<number, string> = {
  1: 'Not Started',
  2: 'Stopped',
  4: 'Running',
  8: 'Expired',
  16: 'Suspended'
}
export const AMTAuditStringTable = {
  16: 'Security Admin',
  17: 'RCO',
  18: 'Redirection Manager',
  19: 'Firmware Update Manager',
  20: 'Security Audit Log',
  21: 'Network Time',
  22: 'Network Administration',
  23: 'Storage Administration',
  24: 'Event Manager',
  25: 'Circuit Breaker Manager',
  26: 'Agent Presence Manager',
  27: 'Wireless Configuration',
  28: 'EAC',
  29: 'KVM',
  30: 'User Opt-In Events',
  32: 'Screen Blanking',
  33: 'Watchdog Events',
  1600: 'Provisioning Started',
  1601: 'Provisioning Completed',
  1602: 'ACL Entry Added',
  1603: 'ACL Entry Modified',
  1604: 'ACL Entry Removed',
  1605: 'ACL Access with Invalid Credentials',
  1606: 'ACL Entry State',
  1607: 'TLS State Changed',
  1608: 'TLS Server Certificate Set',
  1609: 'TLS Server Certificate Remove',
  1610: 'TLS Trusted Root Certificate Added',
  1611: 'TLS Trusted Root Certificate Removed',
  1612: 'TLS Preshared Key Set',
  1613: 'Kerberos Settings Modified',
  1614: 'Kerberos Master Key Modified',
  1615: 'Flash Wear out Counters Reset',
  1616: 'Power Package Modified',
  1617: 'Set Realm Authentication Mode',
  1618: 'Upgrade Client to Admin Control Mode',
  1619: 'Unprovisioning Started',
  1700: 'Performed Power Up',
  1701: 'Performed Power Down',
  1702: 'Performed Power Cycle',
  1703: 'Performed Reset',
  1704: 'Set Boot Options',
  1705: 'Remote graceful power down initiated',
  1706: 'Remote graceful reset initiated',
  1707: 'Remote Standby initiated',
  1708: 'Remote Hiberate initiated',
  1709: 'Remote NMI initiated',
  1800: 'IDER Session Opened',
  1801: 'IDER Session Closed',
  1802: 'IDER Enabled',
  1803: 'IDER Disabled',
  1804: 'SoL Session Opened',
  1805: 'SoL Session Closed',
  1806: 'SoL Enabled',
  1807: 'SoL Disabled',
  1808: 'KVM Session Started',
  1809: 'KVM Session Ended',
  1810: 'KVM Enabled',
  1811: 'KVM Disabled',
  1812: 'VNC Password Failed 3 Times',
  1900: 'Firmware Updated',
  1901: 'Firmware Update Failed',
  2000: 'Security Audit Log Cleared',
  2001: 'Security Audit Policy Modified',
  2002: 'Security Audit Log Disabled',
  2003: 'Security Audit Log Enabled',
  2004: 'Security Audit Log Exported',
  2005: 'Security Audit Log Recovered',
  2100: 'Intel(R) ME Time Set',
  2200: 'TCPIP Parameters Set',
  2201: 'Host Name Set',
  2202: 'Domain Name Set',
  2203: 'VLAN Parameters Set',
  2204: 'Link Policy Set',
  2205: 'IPv6 Parameters Set',
  2300: 'Global Storage Attributes Set',
  2301: 'Storage EACL Modified',
  2302: 'Storage FPACL Modified',
  2303: 'Storage Write Operation',
  2400: 'Alert Subscribed',
  2401: 'Alert Unsubscribed',
  2402: 'Event Log Cleared',
  2403: 'Event Log Frozen',
  2500: 'CB Filter Added',
  2501: 'CB Filter Removed',
  2502: 'CB Policy Added',
  2503: 'CB Policy Removed',
  2504: 'CB Default Policy Set',
  2505: 'CB Heuristics Option Set',
  2506: 'CB Heuristics State Cleared',
  2600: 'Agent Watchdog Added',
  2601: 'Agent Watchdog Removed',
  2602: 'Agent Watchdog Action Set',
  2700: 'Wireless Profile Added',
  2701: 'Wireless Profile Removed',
  2702: 'Wireless Profile Updated',
  2703: 'An existing profile sync was modified',
  2704: 'An existing profile link preference was changed',
  2705: 'Wireless profile share with UEFI enabled setting was changed',
  2800: 'EAC Posture Signer SET',
  2801: 'EAC Enabled',
  2802: 'EAC Disabled',
  2803: 'EAC Posture State',
  2804: 'EAC Set Options',
  2900: 'KVM Opt-in Enabled',
  2901: 'KVM Opt-in Disabled',
  2902: 'KVM Password Changed',
  2903: 'KVM Consent Succeeded',
  2904: 'KVM Consent Failed',
  3000: 'Opt-In Policy Change',
  3001: 'Send Consent Code Event',
  3002: 'Start Opt-In Blocked Event',
  3301: 'A user has modified the Watchdog Action settings',
  3302: 'A user has modified a Watchdog to add, remove, or alter the Watchdog Action connected to it'
}

export const RealmNames =
  '||Redirection|PT Administration|Hardware Asset|Remote Control|Storage|Event Manager|Storage Admin|Agent Presence Local|Agent Presence Remote|Circuit Breaker|Network Time|General Information|Firmware Update|EIT|LocalUN|Endpoint Access Control|Endpoint Access Control Admin|Event Log Reader|Audit Log|ACL Realm|||Local System'.split(
    '|'
  )

export const VaultResponseCodes = (statusCode: any = null): string => {
  let vaultError: string
  if (statusCode != null) {
    switch (statusCode) {
      case 429:
        vaultError = 'unsealed and standby'
        break
      case 472:
        vaultError = 'disaster recovery mode replication secondary and active'
        break
      case 473:
        vaultError = 'performance standby'
        break
      case 501:
        vaultError = 'not initialized'
        break
      case 503:
        vaultError = 'sealed'
        break
      default:
        vaultError = 'unknown error'
        break
    }
  } else {
    vaultError = 'statusCode null'
  }

  return vaultError
}

// CIRA constants
export const DEFAULT_CIRA_WINDOW = 80 * 1024 // 81920 (80 KB)
export const MIN_CIRA_WINDOW = 32 * 1024 // 32768 (32 KB)
export const MAX_CIRA_WINDOW = 1 * 1024 * 1024 // 1048576 (1 MB)
export const CIRA_KEEPALIVE_INTERVAL = 30 // 30 seconds is typical keepalive interval for AMT CIRA connection
export const CIRA_MAX_IDLE_TIME = 90 // 90 seconds max idle time, higher than the typical CIRA_KEEPALIVE_INTERVAL of 30 seconds

// Certificate key size constants
export const DEFAULT_MPS_CERT_KEY_SIZE = 2048 // Default 2048-bit for backward compatibility
export const ALLOWED_MPS_CERT_KEY_SIZES = [2048, 3072] // Supported key sizes
