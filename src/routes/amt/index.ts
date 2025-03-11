/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Router } from 'express'
import ciraMiddleware from '../../middleware/cira.js'
import validateMiddleware from '../../middleware/validate.js'
import { amtFeaturesValidator } from './amtFeatureValidator.js'
import { auditLog } from './auditLog.js'
import { auditLogValidator } from './auditLogValidator.js'
import { bootOptions } from './bootOptions.js'
import { bootOptionsValidator } from './bootOptionsValidator.js'
import { deleteAlarmOccurrence } from './deleteAlarmOccurrence.js'
import { eventLog } from './eventLog.js'
import { getAlarmOccurrences } from './getAlarmOccurrences.js'
import { getAMTFeatures } from './getAMTFeatures.js'
import { generalSettings } from './getGeneralSettings.js'
import { hardwareInfo } from './getHardwareInfo.js'
import { osPowerSavingState } from './getOSPowerSavingState.js'
import { powerState } from './getPowerState.js'
import { version } from './getVersion.js'
import { osPowerSavingStateChange } from './osPowerSavingStateChange.js'
import { osPowerSavingStateValidator } from './osPowerSavingStateValidator.js'
import { powerAction } from './powerAction.js'
import { powerActionValidator } from './powerActionValidator.js'
import { powerCapabilities } from './powerCapabilities.js'
import { setAlarmOccurrence } from './setAlarmOccurrence.js'
import { setAMTFeatures } from './setAMTFeatures.js'

import { deactivate } from './deactivate.js'
import { cancel } from './userConsent/cancel.js'
import { request } from './userConsent/request.js'
import { send } from './userConsent/send.js'
import { validator as userConsentValidator } from './userConsent/validator.js'

const amtRouter: Router = Router()

amtRouter.get('/log/audit/:guid', auditLogValidator(), validateMiddleware, ciraMiddleware, auditLog as any)
amtRouter.get('/log/event/:guid', ciraMiddleware, eventLog)
amtRouter.get('/generalSettings/:guid', ciraMiddleware, generalSettings)
amtRouter.get('/hardwareInfo/:guid', ciraMiddleware, hardwareInfo)
amtRouter.post('/power/action/:guid', powerActionValidator(), validateMiddleware, ciraMiddleware, powerAction)
amtRouter.post('/power_ips/action/:guid', osPowerSavingStateValidator(), validateMiddleware, ciraMiddleware, osPowerSavingStateChange)
amtRouter.post('/power/bootOptions/:guid', bootOptionsValidator(), validateMiddleware, ciraMiddleware, bootOptions)
amtRouter.get('/power/capabilities/:guid', ciraMiddleware, powerCapabilities)
amtRouter.get('/power/state/:guid', ciraMiddleware, powerState)
amtRouter.get('/power_ips/state/:guid', ciraMiddleware, osPowerSavingState) //
amtRouter.get('/features/:guid', ciraMiddleware, getAMTFeatures)
amtRouter.post('/features/:guid', amtFeaturesValidator(), validateMiddleware, ciraMiddleware, setAMTFeatures)
amtRouter.get('/version/:guid', ciraMiddleware, version)
amtRouter.delete('/deactivate/:guid', ciraMiddleware, deactivate)

amtRouter.get('/userConsentCode/cancel/:guid', ciraMiddleware, cancel)
amtRouter.get('/userConsentCode/:guid', ciraMiddleware, request)
amtRouter.post('/userConsentCode/:guid', userConsentValidator(), validateMiddleware, ciraMiddleware, send)
amtRouter.get('/alarmOccurrences/:guid', ciraMiddleware, getAlarmOccurrences)
amtRouter.post('/alarmOccurrences/:guid', validateMiddleware, ciraMiddleware, setAlarmOccurrence)
amtRouter.delete('/alarmOccurrences/:guid', validateMiddleware, ciraMiddleware, deleteAlarmOccurrence)

export default amtRouter
