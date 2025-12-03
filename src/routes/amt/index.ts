/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Router } from 'express'
import { auditLog } from './auditLog.js'
import { eventLog } from './eventLog.js'
import { generalSettings } from './getGeneralSettings.js'
import { hardwareInfo } from './getHardwareInfo.js'
import { powerAction } from './powerAction.js'
import { bootOptions } from './bootOptions.js'
import { powerCapabilities } from './powerCapabilities.js'
import { powerState } from './getPowerState.js'
import { version } from './getVersion.js'
import { deleteAlarmOccurrence } from './deleteAlarmOccurrence.js'
import { getAlarmOccurrences } from './getAlarmOccurrences.js'
import { getAMTFeatures } from './getAMTFeatures.js'
import { setAMTFeatures } from './setAMTFeatures.js'
import { setAlarmOccurrence } from './setAlarmOccurrence.js'
import { amtFeaturesValidator } from './amtFeatureValidator.js'
import { powerActionValidator } from './powerActionValidator.js'
import { auditLogValidator } from './auditLogValidator.js'
import { bootOptionsValidator } from './bootOptionsValidator.js'
import ciraMiddleware from '../../middleware/cira.js'
import validateMiddleware from '../../middleware/validate.js'

import { cancel } from './userConsent/cancel.js'
import { request } from './userConsent/request.js'
import { send } from './userConsent/send.js'
import { validator as userConsentValidator } from './userConsent/validator.js'
import { deactivate } from './deactivate.js'
import { getAMTCertificates } from './certificates/get.js'
import { addAMTCertificate } from './certificates/add.js'
import { certValidator } from './certificates/validator.js'
import { bootSources } from './bootSources.js'
import { validator } from './kvm/validator.js'
import { getScreenSettingData } from './kvm/get.js'
import { setKVMRedirectionSettingData } from './kvm/set.js'
import { setLinkPreference } from './setLinkPreference.js'
import { linkPreferenceValidator } from './linkPreferenceValidator.js'

const amtRouter: Router = Router()

amtRouter.get('/log/audit/:guid', auditLogValidator(), validateMiddleware, ciraMiddleware, auditLog as any)
amtRouter.get('/log/event/:guid', ciraMiddleware, eventLog)
amtRouter.get('/generalSettings/:guid', ciraMiddleware, generalSettings)
amtRouter.get('/hardwareInfo/:guid', ciraMiddleware, hardwareInfo)
amtRouter.post('/power/action/:guid', powerActionValidator(), validateMiddleware, ciraMiddleware, powerAction)
amtRouter.post('/power/bootOptions/:guid', bootOptionsValidator(), validateMiddleware, ciraMiddleware, bootOptions)
amtRouter.get('/power/capabilities/:guid', ciraMiddleware, powerCapabilities)
amtRouter.get('/power/state/:guid', ciraMiddleware, powerState)
amtRouter.get('/features/:guid', ciraMiddleware, getAMTFeatures)
amtRouter.post('/features/:guid', amtFeaturesValidator(), validateMiddleware, ciraMiddleware, setAMTFeatures)
amtRouter.get('/version/:guid', ciraMiddleware, version)
amtRouter.delete('/deactivate/:guid', ciraMiddleware, deactivate)
amtRouter.get('/power/bootSources/:guid', ciraMiddleware, bootSources)

amtRouter.get('/userConsentCode/cancel/:guid', ciraMiddleware, cancel)
amtRouter.get('/userConsentCode/:guid', ciraMiddleware, request)
amtRouter.post('/userConsentCode/:guid', userConsentValidator(), validateMiddleware, ciraMiddleware, send)
amtRouter.get('/alarmOccurrences/:guid', ciraMiddleware, getAlarmOccurrences)
amtRouter.post('/alarmOccurrences/:guid', validateMiddleware, ciraMiddleware, setAlarmOccurrence)
amtRouter.delete('/alarmOccurrences/:guid', validateMiddleware, ciraMiddleware, deleteAlarmOccurrence)

amtRouter.get('/certificates/:guid', validateMiddleware, ciraMiddleware, getAMTCertificates)
amtRouter.post('/certificates/:guid', certValidator(), validateMiddleware, ciraMiddleware, addAMTCertificate)

amtRouter.get('/kvm/displays/:guid', ciraMiddleware, getScreenSettingData)
amtRouter.put('/kvm/displays/:guid', validator(), ciraMiddleware, setKVMRedirectionSettingData)

// Link Preference (ME/HOST)
amtRouter.post(
  '/network/linkPreference/:guid',
  linkPreferenceValidator(),
  validateMiddleware,
  ciraMiddleware,
  setLinkPreference
)

export default amtRouter
