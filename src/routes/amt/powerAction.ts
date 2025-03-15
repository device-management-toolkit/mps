/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { type AMT, type CIM } from '@open-amt-cloud-toolkit/wsman-messages'
import { type Request, type Response } from 'express'
import { logger, messages } from '../../logging/index.js'
import { ErrorResponse } from '../../utils/amtHelper.js'
import { AMTStatusCodes, DMTFPowerStates, OSPowerSavingStateStatusCodes } from '../../utils/constants.js'
import { MqttProvider } from '../../utils/MqttProvider.js'

export async function powerAction(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body
    const results = await req.deviceAction.getBootOptions()
    const bootData = setBootData(payload.action as number, false, results.AMT_BootSettingData)
    await req.deviceAction.setBootConfiguration(bootData)

    const paction = (payload?.action as number)

    const OSPWRSAV_FULLPOWER = 2;
    const OSPWRSAV_SAVING = 3;

    if(paction == 2)
      {  
        const current_ospowerstatus = await req.deviceAction.getOSPowerSavingState()
        if(current_ospowerstatus?.Body?.OSPowerSavingState == OSPWRSAV_SAVING)
        {
          logger.info(`OS Power Saving State is 3 (Saving Mode). Changing it to 2 (Full Power) before continuing...`);

          const osResponse = await req.deviceAction.requestOSPowerSavingStateChange(OSPWRSAV_FULLPOWER)
  
          if(osResponse?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue == 0)
          {
            logger.info(`OS Power Saving State changed to 2 (Full Power) successfully.`);
          }
          else
          {
            logger.error(`Failed to change OS Power Saving State. Proceeding with power action...`);          
          }
        }
      }
    
    const powerActionOSResponse_ok = { Body: { ReturnValue: 0, ReturnValueStr: OSPowerSavingStateStatusCodesToString(0) } } as any      
    if(paction == 500)
    {//From OS Power Saving Mode to OS Full Power Mode - It modifies only the OSPowerSavingState.
      logger.info(`Changing to OS Power Saving State 2 (Full Power)...`)      ;
      const current_ospowerstatus = await req.deviceAction.getOSPowerSavingState()
      if (current_ospowerstatus?.Body?.OSPowerSavingState == OSPWRSAV_FULLPOWER)
      {
        logger.info(`OS Power Saving State is already 2 (Full Power). No change needed.`);
        MqttProvider.publishEvent('success', ['IPS_PowerAction'], messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED)
        res.status(200).json(powerActionOSResponse_ok).end()
        return  // Stop here. No additional actions are required.
      }

      const osResponse = await req.deviceAction.requestOSPowerSavingStateChange(OSPWRSAV_FULLPOWER)
      if(osResponse?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue == 0)
      {
        logger.info(`OS Power Saving State changed to 2 (Full Power) successfully.`);
        MqttProvider.publishEvent('success', ['IPS_PowerAction'], messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED)
        res.status(200).json(powerActionOSResponse_ok).end()
        return  // Stop when paction is 500 (Success)
      }

      logger.error(`Failed to change OS Power Saving State (Target: Full Power).`);
      const powerActionOSResponse = { Body: { ReturnValue: osResponse?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue, 
        ReturnValueStr: OSPowerSavingStateStatusCodesToString(osResponse?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue) } } as any
      res.status(200).json(powerActionOSResponse).end()
      return  // Stop when paction is 501 (Failure)    
    }

    if(paction == 501)
    {//From OS Full Power to OS Power Saving Mode - It modifies only the OSPowerSavingState.
      logger.info(`Changing to OS Power Saving State 3 (Saving Mode)...`)      ;
      const current_ospowerstatus = await req.deviceAction.getOSPowerSavingState()
      if (current_ospowerstatus?.Body?.OSPowerSavingState == OSPWRSAV_SAVING)
      {
        logger.info(`OS Power Saving State is already 3 (Saving Mode). No change needed.`);
        MqttProvider.publishEvent('success', ['IPS_PowerAction'], messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED)
        res.status(200).json(powerActionOSResponse_ok).end()
        return  // Stop here. No additional actions are required.
      }

      const osResponse = await req.deviceAction.requestOSPowerSavingStateChange(OSPWRSAV_SAVING)
      if(osResponse?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue == 0)
      {
        logger.info(`OS Power Saving State changed to 3 (Saving Mode) successfully.`);
        MqttProvider.publishEvent('success', ['IPS_PowerAction'], messages.OS_POWER_SAVING_STATE_CHANGE_REQUESTED)
        res.status(200).json(powerActionOSResponse_ok).end()
        return  // Stop when paction is 501 (Success)
      }     
     
      logger.error(`Failed to change OS Power Saving State (Target: Saving Mode).`);
      const powerActionOSResponse = { Body: { ReturnValue: osResponse?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue, 
        ReturnValueStr: OSPowerSavingStateStatusCodesToString(osResponse?.Body?.RequestOSPowerSavingStateChange_OUTPUT?.ReturnValue) } } as any
      res.status(200).json(powerActionOSResponse).end()
      return  // Stop when paction is 501 (Failure)    
    }

    if(! (paction in DMTFPowerStates))
    {// Stop when paction is not a valid DMTF Power State
      const powerActionOSResponse = { Body: { RequestPowerStateChange_OUTPUT: { ReturnValue: 0x0024, ReturnValueStr: AMTStatusToString(0x0024) } } } as any
      res.status(200).json(powerActionOSResponse).end() //Invalid Parameter
      return
    }
    
    //It will continue with the power action only when paction is included in DM
    const powerAction = await req.deviceAction.sendPowerAction(
      payload.action as CIM.Types.PowerManagementService.PowerState
    )
    powerAction.Body.RequestPowerStateChange_OUTPUT.ReturnValueStr = AMTStatusToString(
      powerAction.Body.RequestPowerStateChange_OUTPUT.ReturnValue as number
    )
    powerAction.Body = powerAction.Body.RequestPowerStateChange_OUTPUT
    MqttProvider.publishEvent('success', ['AMT_PowerAction'], messages.POWER_ACTION_REQUESTED)
    res.status(200).json(powerAction).end()
  } catch (error) {
    logger.error(`${messages.POWER_ACTION_EXCEPTION} : ${error}`)
    MqttProvider.publishEvent('fail', ['AMT_PowerAction'], messages.INTERNAL_SERVICE_ERROR)
    res.status(500).json(ErrorResponse(500, messages.POWER_ACTION_EXCEPTION)).end()
  }
}

function AMTStatusToString(code: number): string {
  if (AMTStatusCodes[code]) {
    return AMTStatusCodes[code]
  } else return 'UNKNOWN_ERROR'
}

function OSPowerSavingStateStatusCodesToString(code: number): string {
  if (OSPowerSavingStateStatusCodes[code]) {
    return OSPowerSavingStateStatusCodes[code]
  } else return 'UNKNOWN_ERROR'
}

export function setBootData(
  action: number,
  useSOL: boolean,
  r: AMT.Models.BootSettingData
): AMT.Models.BootSettingData {
  r.BIOSPause = false
  r.BIOSSetup = false
  r.BootMediaIndex = 0
  r.ConfigurationDataReset = false
  r.FirmwareVerbosity = 0
  r.ForcedProgressEvents = false
  r.IDERBootDevice = 0
  r.LockKeyboard = false
  r.LockPowerButton = false
  r.LockResetButton = false
  r.LockSleepButton = false
  r.ReflashBIOS = false
  r.UseIDER = false
  r.UseSOL = useSOL
  r.UseSafeMode = false
  r.UserPasswordBypass = false
  r.SecureErase = false
  // if (r.SecureErase) {
  //   r.SecureErase = action === 104 && amtPowerBootCapabilities.SecureErase === true
  // }
  return r
}
