/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

export const PLATFORM_ERASE_ALL_SSDS = 0x4
export const PLATFORM_ERASE_TPM_CLEAR = 0x40
export const PLATFORM_ERASE_CSME_UNCONFIGURE = 0x10000
export const PLATFORM_ERASE_BIOS_TO_EOM = 0x4000000

export const MAX_RPE_CREDENTIAL_BYTES = 64
export const RPE_TLV_PSID = 10
export const RPE_TLV_SSD_PASSWORD = 20

// CIM_BootService RequestedState / EnabledState values for OCR + RPE combinations
export const BOOT_SERVICE_STATE_BOTH_OFF = 32768
export const BOOT_SERVICE_STATE_OCR_ONLY = 32769
export const BOOT_SERVICE_STATE_RPE_ONLY = 32770
export const BOOT_SERVICE_STATE_BOTH_ON = 32771
