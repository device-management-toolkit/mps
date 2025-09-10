/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { Buffer } from 'node:buffer'
import { logger, messages } from '../logging/index.js'
import Common from '../utils/common.js'
import { type CIRASocket } from '../models/models.js'
import { type CIRAChannel } from './CIRAChannel.js'
import { EventEmitter } from 'node:events'
import { Environment } from '../utils/Environment.js'
import { CIRA_KEEPALIVE_INTERVAL, MAX_CIRA_WINDOW } from '../utils/constants.js'

export enum APFProtocol {
  UNKNOWN = 0,
  DISCONNECT = 1,
  SERVICE_REQUEST = 5,
  SERVICE_ACCEPT = 6,
  USERAUTH_REQUEST = 50,
  USERAUTH_FAILURE = 51,
  USERAUTH_SUCCESS = 52,
  GLOBAL_REQUEST = 80,
  REQUEST_SUCCESS = 81,
  REQUEST_FAILURE = 82,
  CHANNEL_OPEN = 90,
  CHANNEL_OPEN_CONFIRMATION = 91,
  CHANNEL_OPEN_FAILURE = 92,
  CHANNEL_WINDOW_ADJUST = 93,
  CHANNEL_DATA = 94,
  CHANNEL_CLOSE = 97,
  PROTOCOLVERSION = 192,
  KEEPALIVE_REQUEST = 208,
  KEEPALIVE_REPLY = 209,
  KEEPALIVE_OPTIONS_REQUEST = 210,
  KEEPALIVE_OPTIONS_REPLY = 211
}

export enum APFDisconnectCode {
  HOST_NOT_ALLOWED_TO_CONNECT = 1,
  PROTOCOL_ERROR = 2,
  KEY_EXCHANGE_FAILED = 3,
  RESERVED = 4,
  MAC_ERROR = 5,
  COMPRESSION_ERROR = 6,
  SERVICE_NOT_AVAILABLE = 7,
  PROTOCOL_VERSION_NOT_SUPPORTED = 8,
  HOST_KEY_NOT_VERIFIABLE = 9,
  CONNECTION_LOST = 10,
  BY_APPLICATION = 11,
  TOO_MANY_CONNECTIONS = 12,
  AUTH_CANCELLED_BY_USER = 13,
  NO_MORE_AUTH_METHODS_AVAILABLE = 14,
  INVALID_CREDENTIALS = 15,
  CONNECTION_TIMED_OUT = 16,
  BY_POLICY = 17,
  TEMPORARILY_UNAVAILABLE = 18
}

export enum APFChannelOpenFailCodes {
  ADMINISTRATIVELY_PROHIBITED = 1,
  CONNECT_FAILED = 2,
  UNKNOWN_CHANNEL_TYPE = 3,
  RESOURCE_SHORTAGE = 4
}

export enum APFChannelOpenFailureReasonCode {
  AdministrativelyProhibited = 1,
  ConnectFailed = 2,
  UnknownChannelType = 3,
  ResourceShortage = 4
}

const APFProcessor = {
  APFEvents: new EventEmitter(),
  // Process one APF command
  processCommand: async (socket: CIRASocket): Promise<number> => {
    const cmd = socket.tag.accumulator.charCodeAt(0)
    const len = socket.tag.accumulator.length
    const data = socket.tag.accumulator
    if (len === 0) {
      return 0
    }

    switch (cmd) {
      case APFProtocol.KEEPALIVE_REQUEST:
        return APFProcessor.keepAliveRequest(socket, len, data)
      case APFProtocol.KEEPALIVE_REPLY:
        return APFProcessor.keepAliveReply(len)
      case APFProtocol.KEEPALIVE_OPTIONS_REPLY:
        return APFProcessor.keepAliveOptionsReply(len, data)
      case APFProtocol.PROTOCOLVERSION:
        return APFProcessor.protocolVersion(socket, len, data)
      case APFProtocol.USERAUTH_REQUEST:
        return APFProcessor.userAuthRequest(socket, len, data)
      case APFProtocol.SERVICE_REQUEST:
        return APFProcessor.serviceRequest(socket, len, data)
      case APFProtocol.GLOBAL_REQUEST:
        return APFProcessor.globalRequest(socket, len, data)
      case APFProtocol.CHANNEL_OPEN:
        return APFProcessor.channelOpen(socket, len, data)
      case APFProtocol.CHANNEL_OPEN_CONFIRMATION:
        return APFProcessor.channelOpenConfirmation(socket, len, data)
      case APFProtocol.CHANNEL_OPEN_FAILURE:
        return APFProcessor.channelOpenFailure(socket, len, data)
      case APFProtocol.CHANNEL_CLOSE:
        return APFProcessor.channelClose(socket, len, data)
      case APFProtocol.CHANNEL_WINDOW_ADJUST:
        return APFProcessor.channelWindowAdjust(socket, len, data)
      case APFProtocol.CHANNEL_DATA:
        return APFProcessor.channelData(socket, len, data)
      case APFProtocol.DISCONNECT:
        return APFProcessor.disconnect(socket, len, data)
      default: {
        logger.warn(`${messages.MPS_UNKNOWN_CIRA_COMMAND}: ${cmd}`)
        return -1
      }
    }
  },

  disconnect: (socket: CIRASocket, len: number, data: string): number => {
    if (len < 7) return 0
    const ReasonCode: number = Common.ReadInt(data, 1)
    logger.silly(`${messages.MPS_DISCONNECT}, ${ReasonCode.toString()}`)
    APFProcessor.APFEvents.emit('disconnected', socket.tag.nodeid)
    return 7
  },

  channelData: (socket: CIRASocket, len: number, data: string): number => {
    if (len < 9) return 0
    const RecipientChannel: number = Common.ReadInt(data, 1)
    const LengthOfData: number = Common.ReadInt(data, 5)
    if (LengthOfData > MAX_CIRA_WINDOW) return -1
    if (len < 9 + LengthOfData) return 0
    logger.silly(`${messages.MPS_CHANNEL_DATA}, ${RecipientChannel.toString()}, ${LengthOfData.toString()}`)
    const cirachannel = socket.tag.channels[RecipientChannel]
    if (cirachannel == null) {
      logger.error(`${messages.DATA_NO_CHANNEL_ID} ${RecipientChannel}`)
      return 9 + LengthOfData
    }
    cirachannel.amtpendingcredits += LengthOfData
    if (cirachannel.onData) {
      cirachannel.onData(data.substring(9, 9 + LengthOfData))
    }
    if (cirachannel.amtpendingcredits > cirachannel.ciraWindow / 2) {
      APFProcessor.SendChannelWindowAdjust(cirachannel.socket, cirachannel.amtchannelid, cirachannel.amtpendingcredits) // Adjust the buffer window
      cirachannel.amtpendingcredits = 0
    }
    return 9 + LengthOfData
  },

  channelWindowAdjust: (socket: CIRASocket, len: number, data: string): number => {
    if (len < 9) return 0
    const RecipientChannel = Common.ReadInt(data, 1)
    const ByteToAdd = Common.ReadInt(data, 5)
    const cirachannel = socket.tag.channels[RecipientChannel]
    if (cirachannel == null) {
      logger.error(`${messages.WINDOW_ADJUST_NO_CHANNEL_ID} ${RecipientChannel}`)
      return 9
    }
    cirachannel.sendcredits += ByteToAdd
    logger.silly(
      `${messages.MPS_WINDOW_ADJUST}, ${RecipientChannel.toString()}, ${ByteToAdd.toString()}, ${cirachannel.sendcredits}`
    )
    if (cirachannel.state === 2) {
      APFProcessor.SendPendingData(cirachannel)
    }
    return 9
  },

  channelClose: (socket: CIRASocket, len: number, data: string): number => {
    if (len < 5) return 0
    const RecipientChannel: number = Common.ReadInt(data, 1)
    logger.silly(`${messages.MPS_CHANNEL_CLOSE} ${RecipientChannel.toString()}`)
    const cirachannel = socket.tag.channels[RecipientChannel]
    if (cirachannel == null) {
      logger.error(`${messages.CHANNEL_CLOSE_NO_CHANNEL_ID} ${RecipientChannel}`)
      return 5
    }
    APFProcessor.SendChannelClose(cirachannel)
    socket.tag.activetunnels--
    if (cirachannel.state > 0) {
      cirachannel.state = 0
      if (cirachannel.onStateChange) {
        cirachannel.onStateChange.emit('stateChange', cirachannel.state)
      }
      delete socket.tag.channels[RecipientChannel]
    }
    return 5
  },

  channelOpenFailure: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 17) return 0
    const recipientChannel = Common.ReadInt(data, 1)
    const reasonCode = Common.ReadInt(data, 5)
    logger.error(`${messages.MPS_CHANNEL_OPEN_FAILURE}, ${recipientChannel.toString()}, ${reasonCode.toString()}`)
    const cirachannel = socket.tag.channels[recipientChannel]
    if (cirachannel == null) {
      logger.error(`${messages.CHANNEL_OPEN_FAILURE_NO_CHANNEL_ID} ${recipientChannel}`)
      return 17
    }
    if (cirachannel.state > 0) {
      cirachannel.state = 0
      if (cirachannel.onStateChange) {
        cirachannel.onStateChange.emit('stateChange', cirachannel.state)
      }
      delete socket.tag.channels[recipientChannel]
    }
    return 17
  },

  channelOpenConfirmation: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 17) return 0
    const recipientChannel = Common.ReadInt(data, 1)
    const senderChannel = Common.ReadInt(data, 5)
    const windowSize = Common.ReadInt(data, 9)
    socket.tag.activetunnels++
    const cirachannel = socket.tag.channels[recipientChannel]
    if (cirachannel == null) {
      return 17
    }
    cirachannel.amtchannelid = senderChannel
    cirachannel.sendcredits = cirachannel.amtCiraWindow = windowSize
    logger.silly(
      `${messages.MPS_CHANNEL_OPEN_CONFIRMATION}, ${recipientChannel.toString()}, ${senderChannel.toString()}, ${windowSize.toString()}`
    )
    if (cirachannel.closing === 1) {
      // Close this channel
      APFProcessor.SendChannelClose(cirachannel)
    } else {
      cirachannel.state = 2
      // Send any pending data
      APFProcessor.SendPendingData(cirachannel)
      // Indicate the channel is open
      if (cirachannel.onStateChange) {
        cirachannel.onStateChange.emit('stateChange', cirachannel.state)
      }
    }
    return 17
  },

  channelOpen: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 33) return 0
    const ChannelTypeLength: number = Common.ReadInt(data, 1)
    if (ChannelTypeLength > 2048) return -1
    if (length < 33 + ChannelTypeLength) return 0

    // Decode channel identifiers and window size
    const ChannelType: string = data.substring(5, 5 + ChannelTypeLength)
    const SenderChannel: number = Common.ReadInt(data, 5 + ChannelTypeLength)
    const WindowSize: number = Common.ReadInt(data, 9 + ChannelTypeLength)

    // Decode the target
    const TargetLen: number = Common.ReadInt(data, 17 + ChannelTypeLength)
    if (TargetLen > 2048) return -1
    if (length < 33 + ChannelTypeLength + TargetLen) return 0
    const Target: string = data.substring(21 + ChannelTypeLength, 21 + ChannelTypeLength + TargetLen)
    const TargetPort: number = Common.ReadInt(data, 21 + ChannelTypeLength + TargetLen)

    // Decode the source
    const SourceLen: number = Common.ReadInt(data, 25 + ChannelTypeLength + TargetLen)
    if (SourceLen > 2048) return -1
    if (length < 33 + ChannelTypeLength + TargetLen + SourceLen) return 0
    const Source: string = data.substring(
      29 + ChannelTypeLength + TargetLen,
      29 + ChannelTypeLength + TargetLen + SourceLen
    )
    const SourcePort: number = Common.ReadInt(data, 29 + ChannelTypeLength + TargetLen + SourceLen)

    logger.silly(
      `${messages.MPS_CHANNEL_OPEN}, ${ChannelType}, ${SenderChannel.toString()}, ${WindowSize.toString()}, ${Target}:${TargetPort}, ${Source}:${SourcePort}`
    )

    // Check if we understand this channel type
    // if (ChannelType.toLowerCase() == "direct-tcpip")

    // We don't understand this channel type, send an error back
    APFProcessor.SendChannelOpenFailure(socket, SenderChannel, APFChannelOpenFailureReasonCode.UnknownChannelType)
    return 33 + ChannelTypeLength + TargetLen + SourceLen

    /*
    // This is a correct connection. Lets get it setup
    var MeshAmtEventEndpoint = { ServerChannel: GetNextBindId(), AmtChannel: SenderChannel, MaxWindowSize: 2048, CurrentWindowSize:2048, SendWindow: WindowSize, InfoHeader: "Target: " + Target + ":" + TargetPort + ", Source: " + Source + ":" + SourcePort};
    // TODO: Connect this socket for a WSMAN event
    SendChannelOpenConfirmation(socket, SenderChannel, MeshAmtEventEndpoint.ServerChannel, MeshAmtEventEndpoint.MaxWindowSize);
    */
  },

  globalRequest: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 14) return 0
    const requestLen: number = Common.ReadInt(data, 1)
    if (requestLen > 2048) return -1
    if (length < 14 + requestLen) return 0
    const request: string = data.substring(5, 5 + requestLen)
    // const wantResponse: string = data.charCodeAt(5 + requestLen)

    if (request === 'tcpip-forward') {
      const addrLen: number = Common.ReadInt(data, 6 + requestLen)
      if (length < 14 + requestLen + addrLen) return 0
      let addr = data.substring(10 + requestLen, 10 + requestLen + addrLen)
      const port = Common.ReadInt(data, 10 + requestLen + addrLen)
      if (addr === '') addr = undefined
      logger.silly(`${messages.MPS_GLOBAL_REQUEST} ${socket.tag.nodeid} ${request} ${addr}: ${port}`)
      // this.ChangeHostname(socket, addr)
      if (!socket.tag.boundPorts.includes(port)) {
        socket.tag.boundPorts.push(port)
      }
      APFProcessor.SendTcpForwardSuccessReply(socket, port)
      // 5900 port is the last TCP port on which connections for forwarding are to be cancelled. Ports order: 16993, 16992, 664, 623, 16995, 16994, 5900
      // Request keepalive interval time
      if (port === 5900) {
        APFProcessor.SendKeepaliveOptionsRequest(socket, CIRA_KEEPALIVE_INTERVAL, 0)
      }
      return 14 + requestLen + addrLen
    }

    if (request === 'cancel-tcpip-forward') {
      const addrLen = Common.ReadInt(data, 6 + requestLen)
      if (length < 14 + requestLen + addrLen) return 0
      const addr = data.substring(10 + requestLen, 10 + requestLen + addrLen)
      const port = Common.ReadInt(data, 10 + requestLen + addrLen)
      logger.silly(`${messages.MPS_GLOBAL_REQUEST}, ${request}, ${addr}:${port}`)
      const portindex = socket.tag.boundPorts.indexOf(port)
      if (portindex >= 0) {
        socket.tag.boundPorts.splice(portindex, 1)
      }
      APFProcessor.SendTcpForwardCancelReply(socket)
      return 14 + requestLen + addrLen
    }

    if (request === 'udp-send-to@amt.intel.com') {
      const addrLen = Common.ReadInt(data, 6 + requestLen)
      if (length < 26 + requestLen + addrLen) return 0
      const addr = data.substring(10 + requestLen, 10 + requestLen + addrLen)
      const port = Common.ReadInt(data, 10 + requestLen + addrLen)
      const oaddrLen = Common.ReadInt(data, 14 + requestLen + addrLen)
      if (length < 26 + requestLen + addrLen + oaddrLen) return 0
      const oaddr = data.substring(18 + requestLen, 18 + requestLen + addrLen)
      const oport = Common.ReadInt(data, 18 + requestLen + addrLen + oaddrLen)
      const datalen = Common.ReadInt(data, 22 + requestLen + addrLen + oaddrLen)
      if (length < 26 + requestLen + addrLen + oaddrLen + datalen) return 0
      logger.silly(
        `${messages.MPS_GLOBAL_REQUEST}, ${request}, ${addr}:${port}, ${oaddr}:${oport}, ${datalen.toString()}`
      )
      // TODO
      return 26 + requestLen + addrLen + oaddrLen + datalen
    }

    return 6 + requestLen
  },

  serviceRequest: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 5) return 0
    const serviceNameLen: number = Common.ReadInt(data, 1)
    if (serviceNameLen > 2048) return -1
    if (length < 5 + serviceNameLen) return 0
    const serviceName = data.substring(5, 5 + serviceNameLen)
    logger.silly(`${messages.MPS_SERVICE_REQUEST}: ${serviceName}`)
    if (serviceName === 'pfwd@amt.intel.com') {
      APFProcessor.SendServiceAccept(socket, 'pfwd@amt.intel.com')
    }
    if (serviceName === 'auth@amt.intel.com') {
      APFProcessor.SendServiceAccept(socket, 'auth@amt.intel.com')
    }
    return 5 + serviceNameLen
  },

  userAuthRequest: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 13) return 0
    const usernameLen: number = Common.ReadInt(data, 1)
    if (usernameLen > 2048 || length < 5 + usernameLen) return -1
    const username: string = data.substring(5, 5 + usernameLen)
    const serviceNameLen: number = Common.ReadInt(data, 5 + usernameLen)
    if (serviceNameLen > 2048 || length < 9 + usernameLen + serviceNameLen) return -1
    const serviceName: string = data.substring(9 + usernameLen, 9 + usernameLen + serviceNameLen)
    const methodNameLen: number = Common.ReadInt(data, 9 + usernameLen + serviceNameLen)
    if (methodNameLen > 2048 || length < 13 + usernameLen + serviceNameLen + methodNameLen) return -1
    const methodName: string = data.substring(
      13 + usernameLen + serviceNameLen,
      13 + usernameLen + serviceNameLen + methodNameLen
    )
    let passwordLen = 0
    let password: string = null
    if (methodName === 'password') {
      passwordLen = Common.ReadInt(data, 14 + usernameLen + serviceNameLen + methodNameLen)
      if (passwordLen > 2048 || length < 18 + usernameLen + serviceNameLen + methodNameLen + passwordLen) return -1
      password = data.substring(
        18 + usernameLen + serviceNameLen + methodNameLen,
        18 + usernameLen + serviceNameLen + methodNameLen + passwordLen
      )
    }
    logger.silly(
      `${messages.MPS_USER_AUTH_REQUEST} usernameLen=${usernameLen} serviceNameLen=${serviceNameLen} methodNameLen=${methodNameLen}`
    )
    logger.silly(`${messages.MPS_USER_AUTH_REQUEST} user=${username} service=${serviceName} method=${methodName}`)

    // Emit event to determine if user is authorized
    // TODO: verify this works correctly
    APFProcessor.APFEvents.emit('userAuthRequest', socket, username, password)

    return 18 + usernameLen + serviceNameLen + methodNameLen + passwordLen
  },

  protocolVersion: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 93) return 0
    socket.tag.MajorVersion = Common.ReadInt(data, 1)
    socket.tag.MinorVersion = Common.ReadInt(data, 5)
    socket.tag.SystemId = APFProcessor.guidToStr(Common.Rstr2hex(data.substring(13, 29))).toLowerCase()
    logger.silly(
      `${messages.MPS_PROTOCOL_VERSION}, ${socket.tag.MajorVersion}, ${socket.tag.MinorVersion}, ${socket.tag.SystemId}`
    )
    // TODO: verify this works correctly

    APFProcessor.APFEvents.emit('protocolVersion', socket)

    logger.silly(`device uuid: ${socket.tag.SystemId} and socketid : ${socket.tag.id}`)
    return 93
  },

  keepAliveReply: (length: number): number => {
    if (length < 5) return 0
    logger.silly(messages.MPS_KEEPALIVE_REPLY)
    return 5
  },

  keepAliveOptionsReply: (length: number, data: string): number => {
    if (length < 9) return 0
    const keepaliveInterval = Common.ReadInt(data, 1)
    const timeout = Common.ReadInt(data, 5)
    logger.silly(`KEEPALIVE_OPTIONS_REPLY, Keepalive Interval=${keepaliveInterval} Timeout=${timeout}`)
    return 9
  },

  keepAliveRequest: (socket: CIRASocket, length: number, data: string): number => {
    if (length < 5) {
      return 0
    }
    if (Environment.Config.cira_last_seen) {
      APFProcessor.APFEvents.emit('keepAliveRequest', socket.tag.nodeid)
    }
    logger.verbose(`${messages.MPS_KEEPALIVE_REQUEST}: ${socket.tag.nodeid}`)
    APFProcessor.SendKeepAliveReply(socket, Common.ReadInt(data, 1))
    return 5
  },

  SendKeepaliveOptionsRequest: (socket: CIRASocket, keepaliveTime: number, timeout: number): void => {
    logger.silly(messages.MPS_SEND_KEEPALIVE_OPTIONS_REQUEST)
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.KEEPALIVE_OPTIONS_REQUEST) +
        Common.IntToStr(keepaliveTime) +
        Common.IntToStr(timeout)
    )
  },

  SendKeepAliveReply: (socket: CIRASocket, cookie: number): void => {
    logger.silly(messages.MPS_SEND_KEEPALIVE_REPLY)
    APFProcessor.Write(socket, String.fromCharCode(APFProtocol.KEEPALIVE_REPLY) + Common.IntToStr(cookie))
  },

  SendServiceAccept: (socket: CIRASocket, service: string): void => {
    logger.silly(messages.MPS_SEND_SERVICE_ACCEPT)
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.SERVICE_ACCEPT) + Common.IntToStr(service.length) + service
    )
  },

  SendTcpForwardSuccessReply: (socket: CIRASocket, port: number): void => {
    logger.silly(messages.MPS_SEND_TCP_FORWARD_SUCCESS_REPLY)
    APFProcessor.Write(socket, String.fromCharCode(APFProtocol.REQUEST_SUCCESS) + Common.IntToStr(port))
  },

  SendTcpForwardCancelReply: (socket: CIRASocket): void => {
    logger.silly(messages.MPS_SEND_TCP_FORWARD_CANCEL_REPLY)
    APFProcessor.Write(socket, String.fromCharCode(APFProtocol.REQUEST_SUCCESS))
  },

  SendKeepAliveRequest: (socket: CIRASocket, cookie: number): void => {
    logger.silly(messages.MPS_SEND_KEEP_ALIVE_REQUEST)
    APFProcessor.Write(socket, String.fromCharCode(APFProtocol.KEEPALIVE_REQUEST) + Common.IntToStr(cookie))
  },

  SendChannelOpenFailure: (socket: CIRASocket, senderChannel: number, reasonCode: number): void => {
    logger.silly(messages.MPS_SEND_CHANNEL_OPEN_FAILURE)
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.CHANNEL_OPEN_FAILURE) +
        Common.IntToStr(senderChannel) +
        Common.IntToStr(reasonCode) +
        Common.IntToStr(0) +
        Common.IntToStr(0)
    )
  },

  SendChannelOpenConfirmation: (
    socket: CIRASocket,
    recipientChannelId: number,
    senderChannelId: number,
    initialWindowSize: number
  ): void => {
    logger.silly(messages.MPS_SEND_CHANNEL_OPEN_CONFIRMATION)
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.CHANNEL_OPEN_CONFIRMATION) +
        Common.IntToStr(recipientChannelId) +
        Common.IntToStr(senderChannelId) +
        Common.IntToStr(initialWindowSize) +
        Common.IntToStr(-1)
    )
  },

  SendChannelOpen: (
    socket: CIRASocket,
    direct: boolean,
    channelid: number,
    windowSize: number,
    target: string,
    targetPort: number,
    source: string,
    sourcePort: number
  ): void => {
    logger.silly(messages.MPS_SEND_CHANNEL_OPEN)
    const connectionType = direct ? 'direct-tcpip' : 'forwarded-tcpip'
    // TODO: Reports of target being undefined that causes target.length to fail. This is a hack.
    if (target == null || typeof target === 'undefined') target = ''
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.CHANNEL_OPEN) +
        Common.IntToStr(connectionType.length) +
        connectionType +
        Common.IntToStr(channelid) +
        Common.IntToStr(windowSize) +
        Common.IntToStr(-1) +
        Common.IntToStr(target.length) +
        target +
        Common.IntToStr(targetPort) +
        Common.IntToStr(source.length) +
        source +
        Common.IntToStr(sourcePort)
    )
  },

  SendChannelClose: (cirachannel: CIRAChannel): void => {
    if (!cirachannel.closeSent) {
      cirachannel.closeSent = true
      logger.silly(`${messages.MPS_SEND_CHANNEL_CLOSE}, ${cirachannel.amtchannelid}`)
      APFProcessor.Write(
        cirachannel.socket,
        String.fromCharCode(APFProtocol.CHANNEL_CLOSE) + Common.IntToStr(cirachannel.amtchannelid)
      )
    }
  },

  SendPendingData: (cirachannel: CIRAChannel): void => {
    if (cirachannel.sendBuffer != null) {
      if (cirachannel.sendBuffer.length <= cirachannel.sendcredits) {
        // Send the entire pending buffer
        APFProcessor.SendChannelData(cirachannel.socket, cirachannel.amtchannelid, cirachannel.sendBuffer)
        cirachannel.sendcredits -= cirachannel.sendBuffer.length
        delete cirachannel.sendBuffer
      } else {
        // Send a part of the pending buffer
        APFProcessor.SendChannelData(
          cirachannel.socket,
          cirachannel.amtchannelid,
          cirachannel.sendBuffer.subarray(0, cirachannel.sendcredits)
        )
        cirachannel.sendBuffer = cirachannel.sendBuffer.subarray(cirachannel.sendcredits)
        cirachannel.sendcredits = 0
      }
    }
  },

  SendChannelData: (socket: CIRASocket, channelid: number, data: Buffer): void => {
    logger.silly(`${messages.MPS_SEND_CHANNEL_DATA}, ${channelid}`)
    const b = Buffer.allocUnsafe(9 + data.length)
    b[0] = APFProtocol.CHANNEL_DATA
    b.writeUInt32BE(channelid, 1)
    b.writeUInt32BE(data.length, 5)
    data.copy(b, 9)
    socket.write(b)
    /*
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.CHANNEL_DATA) +
        Common.IntToStr(channelid) +
        Common.IntToStr(data.length) +
        data
    )
    */
  },

  SendChannelWindowAdjust: (socket: CIRASocket, channelid: number, bytestoadd: number): void => {
    logger.silly(`${messages.MPS_SEND_CHANNEL_WINDOW_ADJUST}, ${channelid}, ${bytestoadd}`)
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.CHANNEL_WINDOW_ADJUST) + Common.IntToStr(channelid) + Common.IntToStr(bytestoadd)
    )
  },

  SendDisconnect: (socket: CIRASocket, reasonCode: number): void => {
    logger.silly(`${messages.MPS_SEND_CHANNEL_DISCONNECT}, ${reasonCode}`)
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.DISCONNECT) + Common.IntToStr(reasonCode) + Common.ShortToStr(0)
    )
  },

  SendUserAuthFail: (socket: CIRASocket): void => {
    logger.silly(messages.MPS_SEND_USER_AUTH_FAIL)
    APFProcessor.Write(
      socket,
      String.fromCharCode(APFProtocol.USERAUTH_FAILURE) + Common.IntToStr(8) + 'password' + Common.ShortToStr(0)
    )
  },

  SendUserAuthSuccess: (socket: CIRASocket): void => {
    logger.silly(messages.MPS_SEND_USER_AUTH_SUCCESS)
    APFProcessor.Write(socket, String.fromCharCode(APFProtocol.USERAUTH_SUCCESS))
  },

  Write: (socket: CIRASocket, data: string): void => {
    socket.write(Buffer.from(data, 'binary'))
  },

  guidToStr: (g): string =>
    g.substring(6, 8) +
    g.substring(4, 6) +
    g.substring(2, 4) +
    g.substring(0, 2) +
    '-' +
    g.substring(10, 12) +
    g.substring(8, 10) +
    '-' +
    g.substring(14, 16) +
    g.substring(12, 14) +
    '-' +
    g.substring(16, 20) +
    '-' +
    g.substring(20)
}

export default APFProcessor
