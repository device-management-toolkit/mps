/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

import { jest } from '@jest/globals'
import { spyOn } from 'jest-mock'
import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { logger } from '../logging/index.js'
import { type CIRASocket } from '../models/models.js'
import Common from '../utils/common.js'
import { Environment } from '../utils/Environment.js'
import APFProcessor, { APFProtocol } from './APFProcessor.js'
import { type CIRAChannel } from './CIRAChannel.js'

describe('APFProcessor Tests', () => {
  afterEach(() => {
    jest.clearAllMocks()
    jest.resetAllMocks()
    jest.restoreAllMocks()
    jest.resetModules()
  })

  describe('processCommand', () => {
    const fakeCiraSocket: CIRASocket = {
      tag: {}
    } as any

    it('should return 0 if accumulator length is 0', async () => {
      fakeCiraSocket.tag.accumulator = ''
      const result = await APFProcessor.processCommand(fakeCiraSocket)
      expect(result).toEqual(0)
    })

    it('should call keepAliveRequest', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.KEEPALIVE_REQUEST)
      const cmdSpy = spyOn(APFProcessor, 'keepAliveRequest')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call keepAliveReply', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.KEEPALIVE_REPLY)
      const cmdSpy = spyOn(APFProcessor, 'keepAliveReply')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call keepAliveOptionsReply', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.KEEPALIVE_OPTIONS_REPLY)
      const cmdSpy = spyOn(APFProcessor, 'keepAliveOptionsReply')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call protocolVersion', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.PROTOCOLVERSION)
      const cmdSpy = spyOn(APFProcessor, 'protocolVersion')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call userAuthRequest', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.USERAUTH_REQUEST)
      const cmdSpy = spyOn(APFProcessor, 'userAuthRequest')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call serviceRequest', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.SERVICE_REQUEST)
      const cmdSpy = spyOn(APFProcessor, 'serviceRequest')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call globalRequest', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.GLOBAL_REQUEST)
      const cmdSpy = spyOn(APFProcessor, 'globalRequest')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call channelOpen', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.CHANNEL_OPEN)
      const cmdSpy = spyOn(APFProcessor, 'channelOpen')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call channelOpenConfirmation', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.CHANNEL_OPEN_CONFIRMATION)
      const cmdSpy = spyOn(APFProcessor, 'channelOpenConfirmation')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call channelOpenFailure', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.CHANNEL_OPEN_FAILURE)
      const cmdSpy = spyOn(APFProcessor, 'channelOpenFailure')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call channelClose', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.CHANNEL_CLOSE)
      const cmdSpy = spyOn(APFProcessor, 'channelClose')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call channelWindowAdjust', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.CHANNEL_WINDOW_ADJUST)
      const cmdSpy = spyOn(APFProcessor, 'channelWindowAdjust')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call channelData', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.CHANNEL_DATA)
      const cmdSpy = spyOn(APFProcessor, 'channelData')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call disconnect', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(APFProtocol.DISCONNECT)
      const cmdSpy = spyOn(APFProcessor, 'disconnect')
      await APFProcessor.processCommand(fakeCiraSocket)
      expect(cmdSpy).toHaveBeenCalled()
    })

    it('should call default', async () => {
      fakeCiraSocket.tag.accumulator = String.fromCharCode(-1)
      const result = await APFProcessor.processCommand(fakeCiraSocket)
      expect(result).toEqual(-1)
    })
  })

  describe('disconnect() tests', () => {
    it('should disconnect and return 0 when len is < 7', () => {
      const fakeCiraSocket: CIRASocket = null
      const len = 6
      const data: string = null
      const result = APFProcessor.disconnect(fakeCiraSocket, len, data)
      const expectedResult = 0
      expect(result).toEqual(expectedResult)
    })

    it('should disconnect and return 7 when len is >= 7', () => {
      const fakeCiraSocket = {
        tag: {
          nodeid: jest.fn().mockReturnValue('fakeNodeid')
        }
      }
      const len = 66666
      const data = 'data'
      const emitSpy = spyOn(APFProcessor.APFEvents, 'emit')
      const result = APFProcessor.disconnect(fakeCiraSocket as any, len, data)
      const expectedResult = 7
      expect(emitSpy).toHaveBeenCalledTimes(1)
      expect(result).toEqual(expectedResult)
    })
  })

  describe('channelData() tests', () => {
    it('should return 0 if len < 9', () => {
      const fakeCiraSocket: any = null
      const len = 8
      const data: string = null
      const result = APFProcessor.channelData(fakeCiraSocket, len, data)
      const expectedResult = 0
      expect(result).toEqual(expectedResult)
    })

    it('should return -1 if LengthOfData > 1048576', () => {
      const fakeCiraSocket: any = null
      const len: number = 9 + 1048577
      const data: string = null
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(1).mockReturnValueOnce(1048577)
      const result = APFProcessor.channelData(fakeCiraSocket, len, data)
      const expectedResult = -1
      expect(result).toEqual(expectedResult)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if len < 9 + LengthOfData', () => {
      const fakeCiraSocket: CIRASocket = null
      const len = 9
      const data: string = null
      spyOn(Common, 'ReadInt').mockReturnValue(1)
      const result = APFProcessor.channelData(fakeCiraSocket, len, data)
      const expectedResult = 0
      expect(result).toEqual(expectedResult)
    })

    it('should return 9 + LengthOfData if cirachannel is null', () => {
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 0,
          channels: []
        }
      } as any
      const len = 100
      const data: string = null
      const lengthOfData = 1
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(lengthOfData)
      const errorSpy = spyOn(logger, 'error')
      const result = APFProcessor.channelData(fakeCiraSocket, len, data)
      const expectedResult = 9 + lengthOfData
      expect(result).toEqual(expectedResult)
      expect(readIntSpy).toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should return 9 + LengthOfData on happy path', () => {
      const fakeCiraChannel: CIRAChannel = {
        amtpendingcredits: 1000,
        ciraWindow: 1000,
        socket: {
          write: jest.fn()
        },
        onData: jest.fn()
      } as any
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 1,
          channels: [null, fakeCiraChannel]
        }
      } as any
      const len = 100
      const data: string = Common.IntToStr(100)
      const lengthOfData = 1
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(lengthOfData)
      const sendChannelWindowAdjustSpy = spyOn(APFProcessor, 'SendChannelWindowAdjust')
      const result = APFProcessor.channelData(fakeCiraSocket, len, data)
      const expectedResult = 9 + lengthOfData
      expect(result).toEqual(expectedResult)
      expect(readIntSpy).toHaveBeenCalled()
      expect(sendChannelWindowAdjustSpy).toHaveBeenCalled()
    })
  })
  describe('channelWindowAdjust() tests', () => {
    it('should return 0 if len < 9', () => {
      const length = 8
      const result = APFProcessor.channelWindowAdjust(null, length, '')
      expect(result).toEqual(0)
    })

    it('should return 9 if cirachannel is null', () => {
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 0,
          channels: [null, null]
        }
      } as any
      const data: string = Common.IntToStr(0)
      const errorSpy = spyOn(logger, 'error')
      const result = APFProcessor.channelWindowAdjust(fakeCiraSocket, 9, data)
      expect(result).toEqual(9)
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should return 9 if sending entire pending buffer', () => {
      const fakeCiraChannel: CIRAChannel = {
        sendBuffer: Buffer.alloc(1000),
        sendcredits: 1000,
        socket: {
          write: jest.fn()
        },
        state: 2
      } as any
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 1,
          channels: [fakeCiraChannel]
        }
      } as any
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(0).mockReturnValueOnce(0)
      const data = ''
      const len = 9
      const sendChannelDataSpy = spyOn(APFProcessor, 'SendChannelData')
      const result = APFProcessor.channelWindowAdjust(fakeCiraSocket, len, data)
      expect(result).toEqual(9)
      expect(sendChannelDataSpy).toHaveBeenCalled()
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 9 if sending partial pending buffer', () => {
      const fakeCiraChannel: CIRAChannel = {
        sendBuffer: Buffer.from('my fake buffer'),
        sendcredits: 5,
        socket: {
          write: jest.fn()
        },
        amtchannelid: 0,
        state: 2
      } as any
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 1,
          channels: [fakeCiraChannel]
        }
      } as any
      const data = ''
      const len = 9
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(0).mockReturnValueOnce(0)
      const sendChannelDataSpy = spyOn(APFProcessor, 'SendChannelData')
      const result = APFProcessor.channelWindowAdjust(fakeCiraSocket, len, data)
      expect(result).toEqual(9)
      expect(sendChannelDataSpy).toHaveBeenCalled()
      expect(fakeCiraChannel.sendcredits).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })
  })

  describe('channelClose() tests', () => {
    it('should return 0 if length < 5', () => {
      const length = 4
      const result = APFProcessor.channelClose(null, length, '')
      expect(result).toEqual(0)
    })

    it('should return 5 if cirachannel is null', () => {
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 0,
          channels: [null, null]
        }
      } as any
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(0)
      const errorSpy = spyOn(logger, 'error')
      const result = APFProcessor.channelClose(fakeCiraSocket, 5, '')
      expect(result).toEqual(5)
      expect(readIntSpy).toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
    })

    it('should return 5 on happy path', () => {
      const fakeCiraChannel: CIRAChannel = {
        socket: {
          write: jest.fn()
        },
        state: 1,
        onStateChange: new EventEmitter()
      } as any
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 1,
          channels: [null, fakeCiraChannel]
        }
      } as any
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(1)
      const sendChannelCloseSpy = spyOn(APFProcessor, 'SendChannelClose')
      const result = APFProcessor.channelClose(fakeCiraSocket, 5, '')
      expect(result).toEqual(5)
      expect(readIntSpy).toHaveBeenCalled()
      expect(sendChannelCloseSpy).toHaveBeenCalledWith(fakeCiraChannel)
    })
  })

  describe('channelOpenFailure() tests', () => {
    const fakeCiraSocket: CIRASocket = {
      tag: {
        activetunnels: 0,
        channels: []
      }
    } as any

    it('should return 0 if length < 17', () => {
      const length = 16
      const data = ''
      const result = APFProcessor.channelOpenFailure(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should return 17 if cirachannel is null', () => {
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(0)
      const errorSpy = spyOn(logger, 'error')
      const result = APFProcessor.channelOpenFailure(fakeCiraSocket, 17, data)
      expect(result).toEqual(17)
      expect(errorSpy).toHaveBeenCalled()
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 17 on happy path', () => {
      const fakeCiraChannel: CIRAChannel = {
        state: 1,
        onStateChange: new EventEmitter()
      } as any
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 0,
          channels: [null, fakeCiraChannel]
        }
      } as any
      const length = 17
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(1)

      const result = APFProcessor.channelOpenFailure(fakeCiraSocket, length, '')
      expect(result).toEqual(17)
      expect(readIntSpy).toHaveBeenCalled()
    })
  })

  describe('channelOpenConfirmation', () => {
    let fakeCiraChannel: CIRAChannel
    let fakeCiraSocket: CIRASocket
    let sendChannelCloseSpy
    let sendChannelDataSpy
    beforeEach(() => {
      fakeCiraChannel = {
        onStateChange: jest.fn(),
        socket: {
          write: jest.fn()
        }
      } as any
      fakeCiraSocket = {
        tag: {
          activetunnels: 1,
          channels: [null, fakeCiraChannel]
        }
      } as any
      sendChannelCloseSpy = spyOn(APFProcessor, 'SendChannelClose')
      sendChannelDataSpy = spyOn(APFProcessor, 'SendChannelData')
    })

    it('should return 0 if length < 17', () => {
      const length = 16
      const data = ''
      const result = APFProcessor.channelOpenConfirmation(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should return 17 if cirachannel is null', () => {
      const fakeCiraSocket: CIRASocket = {
        tag: {
          activetunnels: 0,
          channels: []
        }
      } as any
      const length = 17
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(0)
      const result = APFProcessor.channelOpenConfirmation(fakeCiraSocket, length, data)
      expect(result).toEqual(17)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should call SendChannelClose if channel is closing', () => {
      const length = 17
      const data = ''
      fakeCiraChannel.closing = 1
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(1)
      const result = APFProcessor.channelOpenConfirmation(fakeCiraSocket, length, data)
      expect(result).toEqual(17)
      expect(readIntSpy).toHaveBeenCalled()
      expect(sendChannelCloseSpy).toHaveBeenCalled()
    })

    it('should call SendChannelData to send entire pending buffer', () => {
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(5)
        .mockReturnValueOnce(1000)
      const length = 17
      const data = ''
      fakeCiraChannel.closing = 0
      fakeCiraChannel.sendBuffer = Buffer.from('fake buffer')
      fakeCiraChannel.onStateChange = new EventEmitter()
      const result = APFProcessor.channelOpenConfirmation(fakeCiraSocket, length, data)
      expect(result).toEqual(17)
      expect(sendChannelDataSpy).toHaveBeenCalled()
      expect(fakeCiraChannel.sendcredits !== 0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should call SendChannelData to send part of pending buffer', () => {
      const length = 17
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(1)
      fakeCiraChannel.closing = 0
      fakeCiraChannel.sendBuffer = Buffer.from('fake buffer')
      fakeCiraChannel.onStateChange = new EventEmitter()
      const result = APFProcessor.channelOpenConfirmation(fakeCiraSocket, length, data)
      expect(result).toEqual(17)
      expect(sendChannelDataSpy).toHaveBeenCalled()
      expect(readIntSpy).toHaveBeenCalled()
      expect(fakeCiraChannel.sendcredits === 0)
    })
  })

  describe('channelOpen', () => {
    let fakeCiraSocket: CIRASocket
    beforeEach(() => {
      fakeCiraSocket = {
        write: jest.fn()
      } as any
    })

    it('should return 0 if length < 33', () => {
      const length = 32
      const data = ''
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should return -1 if ChannelTypeLength > 2048', () => {
      const length = 33
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(2049)
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if length < 33 + ChannelTypeLength', () => {
      const length = 33
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(1)
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return -1 if TargetLen > 2048', () => {
      const length = 33 + 1
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(1) // ChannelTypeLength
        .mockReturnValueOnce(1) // SenderChannel
        .mockReturnValueOnce(20) // WindowSize
        .mockReturnValueOnce(2049) // TargetLen
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if length < 33 + ChannelTypeLength + TargetLen', () => {
      const length = 33 + 1 + 10 - 1
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(1) // ChannelTypeLength
        .mockReturnValueOnce(1) // SenderChannel
        .mockReturnValueOnce(20) // WindowSize
        .mockReturnValueOnce(10) // TargetLen
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return -1 if SourceLen > 2048', () => {
      const length = 33 + 1 + 10
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(1) // ChannelTypeLength
        .mockReturnValueOnce(1) // SenderChannel
        .mockReturnValueOnce(20) // WindowSize
        .mockReturnValueOnce(10) // TargetLen
        .mockReturnValueOnce(22) // TargetPort
        .mockReturnValueOnce(2049) // SourcerLen
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if length < 33 + ChannelTypeLength + TargetLen', () => {
      const length = 33 + 1 + 10 + 10 - 1
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(1) // ChannelTypeLength
        .mockReturnValueOnce(1) // SenderChannel
        .mockReturnValueOnce(20) // WindowSize
        .mockReturnValueOnce(10) // TargetLen
        .mockReturnValueOnce(22) // TargetPort
        .mockReturnValueOnce(10) // SourcerLen
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return on happy path', () => {
      const length = 1000
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(1) // ChannelTypeLength
        .mockReturnValueOnce(1) // SenderChannel
        .mockReturnValueOnce(20) // WindowSize
        .mockReturnValueOnce(10) // TargetLen
        .mockReturnValueOnce(22) // TargetPort
        .mockReturnValueOnce(10) // SourcerLen
        .mockReturnValueOnce(22) // SourcePort
      const sendChannelOpenFailureSpy = spyOn(APFProcessor, 'SendChannelOpenFailure')
      const result = APFProcessor.channelOpen(fakeCiraSocket, length, data)
      expect(result).toBeGreaterThan(33)
      expect(readIntSpy).toHaveBeenCalled()
      expect(sendChannelOpenFailureSpy).toHaveBeenCalled()
    })
  })

  describe('globalRequest', () => {
    const fakeCiraChannel: CIRAChannel = {
      onStateChange: jest.fn()
    } as any
    const fakeCiraSocket: CIRASocket = {
      tag: {
        activetunnels: 1,
        channels: [null, fakeCiraChannel]
      }
    } as any

    it('should return -1 if requestLen > 2048', () => {
      const length = 14
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(2049)
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if length < 14', () => {
      const length = 13
      const data = ''
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should return 0 if length + request length < 14', () => {
      const length = 14
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(1)
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if inadequate length on tcpip-forward', () => {
      fakeCiraSocket.tag.boundPorts = []
      fakeCiraSocket.write = jest.fn() as any
      const length = 27
      const data = '01234tcpip-forward'
      const readIntSpy = spyOn(Common, 'ReadInt').mockImplementation((x, y) => {
        if (y === 1) {
          return 13
        } else if (y === 6 + 13) {
          return 1
        }
      })
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should call SendTcpForwardSuccessReply on tcpip-forward happy path', () => {
      fakeCiraSocket.tag.boundPorts = []
      fakeCiraSocket.write = jest.fn() as any
      const length = 1000
      const data = '01234tcpip-forward'
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(13)
      const sendTcpForwardSuccessReplySpy = spyOn(APFProcessor, 'SendTcpForwardSuccessReply')
      const sendTcpForwardCancelReplySpy = spyOn(APFProcessor, 'SendTcpForwardCancelReply')
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toBeGreaterThan(14)
      expect(sendTcpForwardSuccessReplySpy).toHaveBeenCalled()
      expect(sendTcpForwardCancelReplySpy).not.toHaveBeenCalled()
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if inadequate length on cancel-tcpip-forward', () => {
      fakeCiraSocket.tag.boundPorts = []
      fakeCiraSocket.write = jest.fn() as any
      const length = 50
      const data = '01234cancel-tcpip-forward'
      const readIntSpy = spyOn(Common, 'ReadInt').mockImplementation((x, y) => {
        if (y === 1) {
          return 20
        } else if (y === 6 + 20) {
          return 100
        }
      })
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should call SendTcpForwardCancelReply on cancel-tcpip-forward happy path', () => {
      fakeCiraSocket.tag.boundPorts = []
      const length = 1000
      const data = '01234cancel-tcpip-forward'
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(25)
      const sendTcpForwardSuccessReplySpy = spyOn(APFProcessor, 'SendTcpForwardSuccessReply')
      sendTcpForwardSuccessReplySpy.mockReset()
      const sendTcpForwardCancelReplySpy = spyOn(APFProcessor, 'SendTcpForwardCancelReply')
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toBeGreaterThan(14)
      expect(sendTcpForwardSuccessReplySpy).not.toHaveBeenCalled()
      expect(sendTcpForwardCancelReplySpy).toHaveBeenCalled()
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return on udp-send-to@amt.intel.com happy path', () => {
      fakeCiraSocket.tag.boundPorts = []
      const length = 1000
      const data = '01234udp-send-to@amt.intel.com'
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(25)
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toBeGreaterThan(26)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 6 + requestLen on unsupported requested', () => {
      const length = 1000
      const data = '01234unsupported--request'
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(20)
      const result = APFProcessor.globalRequest(fakeCiraSocket, length, data)
      expect(result).toBeGreaterThan(6)
      expect(readIntSpy).toHaveBeenCalled()
    })
  })

  describe('serviceRequest', () => {
    let sendServiceAcceptSpy
    beforeEach(() => {
      sendServiceAcceptSpy = spyOn(APFProcessor, 'SendServiceAccept')
    })

    it('should return 0 if length < 5', () => {
      const fakeCiraSocket = null
      const length = 4
      const data = ''
      const result = APFProcessor.serviceRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should return -1 if serviceNameLen > 2048', () => {
      const fakeCiraSocket = null
      const length = 13
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(2049)
      const result = APFProcessor.serviceRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return 0 if length < 5 + serviceNameLen', () => {
      const fakeCiraSocket = null
      const length = 5
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(1)
      const result = APFProcessor.serviceRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should call SendServiceAccept for pfwd@amt.intel.com', () => {
      const fakeCiraSocket = {
        write: jest.fn()
      } as any
      const length = 100
      const data = '01234pfwd@amt.intel.com'
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(18)
      const result = APFProcessor.serviceRequest(fakeCiraSocket, length, data)
      expect(sendServiceAcceptSpy).toHaveBeenCalled()
      expect(result).toBeGreaterThan(5)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should call SendServiceAccept for auth@amt.intel.com', () => {
      const fakeCiraSocket = {
        write: jest.fn()
      } as any
      const length = 100
      const data = '01234auth@amt.intel.com'
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValue(18)
      const result = APFProcessor.serviceRequest(fakeCiraSocket, length, data)
      expect(sendServiceAcceptSpy).toHaveBeenCalled()
      expect(result).toBeGreaterThan(5)
      expect(readIntSpy).toHaveBeenCalled()
    })
  })

  describe('userAuthRequest', () => {
    it('should return 0 if length < 13', () => {
      const fakeCiraSocket = null
      const length = 12
      const data = ''
      const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should return -1 if usernameLen > 2048', () => {
      const fakeCiraSocket = null
      const length = 13
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(2049)
      const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return -1 if (length < (5 + usernameLen))', () => {
      const fakeCiraSocket = null
      const length = 5 + 10 - 1
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(10)
      const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return -1 if serviceNameLen > 2048', () => {
      const fakeCiraSocket = null
      const length = 13
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(10).mockReturnValueOnce(2049)
      const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return -1 if (length < (9 + usernameLen + serviceNameLen))', () => {
      const fakeCiraSocket = null
      const length = 9 + 10 + 10 - 1
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt').mockReturnValueOnce(10).mockReturnValueOnce(10)
      const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return -1 if methodNameLen > 2048', () => {
      const fakeCiraSocket = null
      const length = 13
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(2049)
      const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    it('should return -1 if (length < (13 + usernameLen + serviceNameLen + methodNameLen))', () => {
      const fakeCiraSocket = null
      const length = 13 + 10 + 10 + 10 - 1
      const data = ''
      const readIntSpy = spyOn(Common, 'ReadInt')
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(10)
      const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(-1)
      expect(readIntSpy).toHaveBeenCalled()
    })

    // it('should return -1 if passwordLen > 2048', () => {
    //   const fakeCiraSocket = null
    //   const length = 13 + 10 + 10 + 8
    //   const data = ''
    //   const substringSpy = spyOn(String.prototype, 'substring').mockImplementation(() => 'password')
    //   const readIntSpy = spyOn(Common, 'ReadInt')
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(8)
    //     .mockReturnValueOnce(2049)
    //   const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
    //   expect(result).toEqual(-1)
    //   expect(substringSpy).toHaveBeenCalled()
    //   expect(readIntSpy).toHaveBeenCalled()
    // })

    // it('should return -1 if methodNameLen > 2048', () => {
    //   const fakeCiraSocket = null
    //   const length = 13 + 10 + 10 + 8
    //   const data = ''
    //   const substringSpy = spyOn(String.prototype, 'substring').mockImplementation(() => 'password')
    //   const readIntSpy = spyOn(Common, 'ReadInt')
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(2049)
    //   const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
    //   expect(result).toEqual(-1)
    //   expect(substringSpy).toHaveBeenCalled()
    //   expect(readIntSpy).toHaveBeenCalled()
    // })

    // it('should return -1 if (length < (18 + usernameLen + serviceNameLen + methodNameLen + passwordLen))', () => {
    //   const fakeCiraSocket = null
    //   const length = 18 + 10 + 10 + 10 + 10 - 1
    //   const data = ''
    //   const substringSpy = spyOn(String.prototype, 'substring').mockImplementation(() => 'password')
    //   const readIntSpy = spyOn(Common, 'ReadInt')
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //   const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
    //   expect(result).toEqual(-1)
    //   expect(substringSpy).toHaveBeenCalled()
    //   expect(readIntSpy).toHaveBeenCalled()
    // })

    // it('should be happy path', () => {
    //   const fakeCiraSocket = null
    //   const length = 18 + 10 + 10 + 10 + 10 + 1
    //   const data = ''
    //   const substringSpy = spyOn(String.prototype, 'substring').mockImplementation(() => 'password')
    //   const readIntSpy = spyOn(Common, 'ReadInt')
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //     .mockReturnValueOnce(10)
    //   const emitSpy = spyOn(APFProcessor.APFEvents, 'emit')
    //   const result = APFProcessor.userAuthRequest(fakeCiraSocket, length, data)
    //   expect(result).toBeGreaterThan(18)
    //   expect(substringSpy).toHaveBeenCalled()
    //   expect(readIntSpy).toHaveBeenCalled()
    //   expect(emitSpy).toHaveBeenCalled()
    // })
  })

  describe('protocolVersion', () => {
    it('should return 0 if length < 93', () => {
      const fakeCiraSocket = null
      const length = 92
      const data = ''
      const result = APFProcessor.protocolVersion(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should call APFProcessor.APFEvents.emit on happy path', () => {
      const fakeCiraSocket: CIRASocket = {
        tag: {}
      } as any
      const length = 93
      const data = ''
      const emitSpy = spyOn(APFProcessor.APFEvents, 'emit')
      const result = APFProcessor.protocolVersion(fakeCiraSocket, length, data)
      expect(result).toEqual(93)
      expect(emitSpy).toHaveBeenCalled()
    })
  })

  describe('keepAliveReply', () => {
    it('should return 0 if length < 5', () => {
      const length = 4
      const result = APFProcessor.keepAliveReply(length)
      expect(result).toEqual(0)
    })

    it('should return 5 if length >= 5', () => {
      const length = 5
      const result = APFProcessor.keepAliveReply(length)
      expect(result).toEqual(5)
    })
  })

  describe('keepAliveOptionsReply', () => {
    it('should return 0 if length < 9', () => {
      const length = 8
      const data = ''
      const result = APFProcessor.keepAliveOptionsReply(length, data)
      expect(result).toEqual(0)
    })

    it('should return 9 if length >= 9', () => {
      const length = 9
      const data = ''
      const result = APFProcessor.keepAliveOptionsReply(length, data)
      expect(result).toEqual(9)
    })

    it('should return 9 if length >= 9', () => {
      const length = 15
      const data = ''
      const result = APFProcessor.keepAliveOptionsReply(length, data)
      expect(result).toEqual(9)
    })
  })

  describe('keepAliveRequest', () => {
    it('should return 0 if length < 5', () => {
      const fakeCiraSocket = null
      const length = 4
      const data = ''
      const result = APFProcessor.keepAliveRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(0)
    })

    it('should return 5 on happy path', () => {
      const fakeCiraSocket: CIRASocket = {
        tag: {},
        write: jest.fn()
      } as any
      const config = {
        common_name: 'localhost',
        port: 4433,
        country: 'US',
        company: 'NoCorp',
        listen_any: true,
        tls_offload: false,
        web_port: 3000,
        generate_certificates: true,
        secrets_provider: 'string',
        tls_cert: 'string',
        tls_cert_key: 'string',
        tls_cert_ca: 'string',
        web_admin_user: 'admin',
        web_admin_password: 'password',
        web_auth_enabled: true,
        vault_address: 'http://localhost:8200',
        vault_token: 'myroot',
        mqtt_address: '',
        secrets_path: 'secret/data/',
        cert_format: 'file',
        data_path: '../private/data.json',
        cert_path: '../private',
        jwt_secret: 'secret',
        jwt_issuer: '9EmRJTbIiIb4bIeSsmgcWIjrR6HyETqc',
        jwt_expiration: 1440,
        web_tls_cert: null,
        web_tls_cert_key: null,
        web_tls_cert_ca: null,
        redirection_expiration_time: null,
        cors_origin: '*',
        cors_headers: '*',
        cors_methods: '*',
        jwt_token_header: null,
        jwt_tenant_property: null,
        db_provider: 'postgres',
        connection_string: 'postgresql://<USERNAME>:<PASSWORD>@localhost:5432/mpsdb?sslmode=no-verify',
        instance_name: 'localhost',
        mps_tls_config: {
          key: '../private/mpsserver-cert-private.key',
          cert: '../private/mpsserver-cert-public.crt',
          requestCert: true,
          rejectUnauthorized: false,
          minVersion: 'TLSv1',
          ciphers: null,
          secureOptions: ['SSL_OP_NO_SSLv2', 'SSL_OP_NO_SSLv3']
        },
        web_tls_config: {
          key: '../private/mpsserver-cert-private.key',
          cert: '../private/mpsserver-cert-public.crt',
          ca: ['../private/root-cert-public.crt'],
          secureOptions: [
            'SSL_OP_NO_SSLv2',
            'SSL_OP_NO_SSLv3',
            'SSL_OP_NO_COMPRESSION',
            'SSL_OP_CIPHER_SERVER_PREFERENCE',
            'SSL_OP_NO_TLSv1',
            'SSL_OP_NO_TLSv11'
          ]
        },
        consul_enabled: true,
        consul_host: 'localhost',
        consul_port: '8500',
        consul_key_prefix: 'MPS',
        cira_last_seen: true,
        timeout_ms_default: '10000'
      }
      Environment.Config = config

      const length = 5
      const data = ''
      const sendKeepAliveReplySpy = spyOn(APFProcessor, 'SendKeepAliveReply')
      const result = APFProcessor.keepAliveRequest(fakeCiraSocket, length, data)
      expect(result).toEqual(5)
      expect(sendKeepAliveReplySpy).toHaveBeenCalled()
    })
  })

  describe('Functions based on calling APFProcessor.Write', () => {
    let writeSpy
    let fakeCiraSocket: CIRASocket
    beforeEach(() => {
      writeSpy = spyOn(APFProcessor, 'Write')
      writeSpy.mockReset()
      fakeCiraSocket = {
        write: jest.fn()
      } as any
    })
    const cookie = 0
    // const port = 0
    const channelid = 0
    const windowSize = 0
    const target = ''
    const targetPort = 0
    const source = ''
    const sourcePort = 0
    const senderChannel = 0
    const reasonCode = 0
    const recipientChannelId = 0
    const senderChannelId = 0
    const initialWindowSize = 0
    const data = ''
    const bytestoadd = 0
    const keepaliveTime = 30
    const timeout = 0

    it('should SendKeepAliveReply', () => {
      APFProcessor.SendKeepAliveReply(fakeCiraSocket, cookie)
      const dataExpected = String.fromCharCode(APFProtocol.KEEPALIVE_REPLY) + Common.IntToStr(cookie)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendKeepaliveOptionsRequest', () => {
      APFProcessor.SendKeepaliveOptionsRequest(fakeCiraSocket, keepaliveTime, timeout)
      const dataExpected =
        String.fromCharCode(APFProtocol.KEEPALIVE_OPTIONS_REQUEST) +
        Common.IntToStr(keepaliveTime) +
        Common.IntToStr(timeout)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendServiceAccept', () => {
      const service = 'my service'
      APFProcessor.SendServiceAccept(fakeCiraSocket, service)
      const dataExpected = String.fromCharCode(APFProtocol.SERVICE_ACCEPT) + Common.IntToStr(service.length) + service
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    // it('should SendTcpForwardSuccessReply', () => {
    //   APFProcessor.SendTcpForwardSuccessReply(fakeCiraSocket, port)
    //   const dataExpected = String.fromCharCode(APFProtocol.REQUEST_SUCCESS) + Common.IntToStr(port)
    //   expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    // })

    it('should SendTcpForwardCancelReply', () => {
      APFProcessor.SendTcpForwardCancelReply(fakeCiraSocket)
      const dataExpected = String.fromCharCode(APFProtocol.REQUEST_SUCCESS)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendKeepAliveRequest', () => {
      APFProcessor.SendKeepAliveRequest(fakeCiraSocket, cookie)
      const dataExpected = String.fromCharCode(APFProtocol.KEEPALIVE_REQUEST) + Common.IntToStr(cookie)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendChannelOpenFailure', () => {
      APFProcessor.SendChannelOpenFailure(fakeCiraSocket, senderChannel, reasonCode)
      const dataExpected =
        String.fromCharCode(APFProtocol.CHANNEL_OPEN_FAILURE) +
        Common.IntToStr(senderChannel) +
        Common.IntToStr(reasonCode) +
        Common.IntToStr(0) +
        Common.IntToStr(0)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendChannelOpenConfirmation', () => {
      APFProcessor.SendChannelOpenConfirmation(fakeCiraSocket, recipientChannelId, senderChannelId, initialWindowSize)
      const dataExpected =
        String.fromCharCode(APFProtocol.CHANNEL_OPEN_CONFIRMATION) +
        Common.IntToStr(recipientChannelId) +
        Common.IntToStr(senderChannelId) +
        Common.IntToStr(initialWindowSize) +
        Common.IntToStr(-1)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendChannelOpen with direct-tcpip', () => {
      const direct = true
      APFProcessor.SendChannelOpen(
        fakeCiraSocket,
        direct,
        channelid,
        windowSize,
        target,
        targetPort,
        source,
        sourcePort
      )
      const connectionType = direct ? 'direct-tcpip' : 'forwarded-tcpip'
      const dataExpected =
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
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendChannelOpen with forwarded-tcpip', () => {
      const direct = false
      APFProcessor.SendChannelOpen(
        fakeCiraSocket,
        direct,
        channelid,
        windowSize,
        target,
        targetPort,
        source,
        sourcePort
      )
      const connectionType = direct ? 'direct-tcpip' : 'forwarded-tcpip'
      const dataExpected =
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
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendChannelClose', () => {
      const fakeCiraChannel: CIRAChannel = {
        socket: fakeCiraSocket,
        amtchannelid: channelid
      } as any
      APFProcessor.SendChannelClose(fakeCiraChannel)
      const dataExpected = String.fromCharCode(APFProtocol.CHANNEL_CLOSE) + Common.IntToStr(channelid)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendChannelData', () => {
      const socketwriteSpy = spyOn(fakeCiraSocket, 'write')
      APFProcessor.SendChannelData(fakeCiraSocket, channelid, Buffer.from(data))
      const dataExpected = Buffer.from(
        String.fromCharCode(APFProtocol.CHANNEL_DATA) +
          Common.IntToStr(channelid) +
          Common.IntToStr(data.length) +
          data,
        'binary'
      )
      expect(socketwriteSpy).toHaveBeenCalledWith(dataExpected)
    })

    it('should SendChannelWindowAdjust', () => {
      APFProcessor.SendChannelWindowAdjust(fakeCiraSocket, channelid, bytestoadd)
      const dataExpected =
        String.fromCharCode(APFProtocol.CHANNEL_WINDOW_ADJUST) +
        Common.IntToStr(channelid) +
        Common.IntToStr(bytestoadd)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendDisconnect', () => {
      APFProcessor.SendDisconnect(fakeCiraSocket, reasonCode)
      const dataExpected =
        String.fromCharCode(APFProtocol.DISCONNECT) + Common.IntToStr(reasonCode) + Common.ShortToStr(0)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendUserAuthFail', () => {
      APFProcessor.SendUserAuthFail(fakeCiraSocket)
      const dataExpected =
        String.fromCharCode(APFProtocol.USERAUTH_FAILURE) + Common.IntToStr(8) + 'password' + Common.ShortToStr(0)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })

    it('should SendUserAuthSuccess', () => {
      APFProcessor.SendUserAuthSuccess(fakeCiraSocket)
      const dataExpected = String.fromCharCode(APFProtocol.USERAUTH_SUCCESS)
      expect(writeSpy).toHaveBeenCalledWith(fakeCiraSocket, dataExpected)
    })
  })

  // i can't explain it, this test should work but it don't
  // describe('Write', () => {
  //   it('should call write on CIRASocket', () => {
  //     const fakeCiraSocket1 = {
  //       write: jest.fn()
  //     } as any
  //     const data = ''
  //     const dataExpected = Buffer.from(data, 'binary')
  //     APFProcessor.Write(fakeCiraSocket1, data)
  //     expect(fakeCiraSocket1.write).toHaveBeenCalledWith(dataExpected)
  //   })
  // })

  describe('guidToStr ', () => {
    it('should convert a byte to guid', () => {
      const result = APFProcessor.guidToStr('44454C4C4B0010428033B6C04F504633')
      expect(result).toBe('4C4C4544-004B-4210-8033-B6C04F504633')
    })
  })
})
