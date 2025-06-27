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
import { deactivate } from './deactivate.js'
import { deleteAlarmOccurrence } from './deleteAlarmOccurrence.js'
import { eventLog } from './eventLog.js'
import { getAlarmOccurrences } from './getAlarmOccurrences.js'
import { getAMTFeatures } from './getAMTFeatures.js'
import { generalSettings } from './getGeneralSettings.js'
import { hardwareInfo } from './getHardwareInfo.js'
import { powerState } from './getPowerState.js'
import { version } from './getVersion.js'
import { powerAction } from './powerAction.js'
import { powerActionValidator } from './powerActionValidator.js'
import { powerCapabilities } from './powerCapabilities.js'
import { setAlarmOccurrence } from './setAlarmOccurrence.js'
import { setAMTFeatures } from './setAMTFeatures.js'
import { cancel } from './userConsent/cancel.js'
import { request } from './userConsent/request.js'
import { send } from './userConsent/send.js'
import { validator as userConsentValidator } from './userConsent/validator.js'

const amtRouter: Router = Router()

amtRouter.get('/version/:guid', ciraMiddleware, version)

amtRouter.post('/features/:guid', amtFeaturesValidator(), validateMiddleware, ciraMiddleware, setAMTFeatures)
amtRouter.get('/features/:guid', ciraMiddleware, getAMTFeatures)

amtRouter.get('/alarmOccurrences/:guid', ciraMiddleware, getAlarmOccurrences)
amtRouter.post('/alarmOccurrences/:guid', validateMiddleware, ciraMiddleware, setAlarmOccurrence)
amtRouter.delete('/alarmOccurrences/:guid', validateMiddleware, ciraMiddleware, deleteAlarmOccurrence)

amtRouter.get('/hardwareInfo/:guid', ciraMiddleware, hardwareInfo)
//h.GET("diskInfo/:guid", r.getDiskInfo)
amtRouter.get('/power/state/:guid', ciraMiddleware, powerState)
amtRouter.post('/power/action/:guid', powerActionValidator(), validateMiddleware, ciraMiddleware, powerAction)
amtRouter.post('/power/bootOptions/:guid', bootOptionsValidator(), validateMiddleware, ciraMiddleware, bootOptions)
amtRouter.get('/power/capabilities/:guid', ciraMiddleware, powerCapabilities)

amtRouter.get('/log/audit/:guid', auditLogValidator(), validateMiddleware, ciraMiddleware, auditLog as any)
//h.GET("log/audit/:guid/download", r.downloadAuditLog)
amtRouter.get('/log/event/:guid', ciraMiddleware, eventLog)
//h.GET("log/event/:guid/download", r.downloadEventLog)
amtRouter.get('/generalSettings/:guid', ciraMiddleware, generalSettings)

amtRouter.get('/userConsentCode/cancel/:guid', ciraMiddleware, cancel)
amtRouter.get('/userConsentCode/:guid', ciraMiddleware, request)
amtRouter.post('/userConsentCode/:guid', userConsentValidator(), validateMiddleware, ciraMiddleware, send)

//h.GET("networkSettings/:guid", r.getNetworkSettings)

//h.GET("explorer", r.getCallList)
//h.GET("explorer/:guid/:call", r.executeCall)
//h.GET("tls/:guid", r.getTLSSettingData) //OCR

//h.GET("certificates/:guid", r.getCertificates) //OCR TBI
//h.POST("certificates/:guid", r.addCertificate) //OCR TBI

amtRouter.delete('/deactivate/:guid', ciraMiddleware, deactivate)

export default amtRouter
