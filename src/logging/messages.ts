/*********************************************************************
* Copyright (c) Intel Corporation 2022
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/

export enum messages {
  AMT_FEATURES_EXCEPTION = 'Exception during AMT Features request',
  AMT_FEATURES_SET_EXCEPTION = 'Exception during AMT Features Set request',
  AMT_FEATURES_GET_REQUESTED = 'AMT Features requested',
  AMT_FEATURES_GET_SUCCESS = 'AMT Features retrieved',
  AMT_FEATURES_SET_REQUESTED = 'Set AMT Features requested',
  AMT_FEATURES_SET_SUCCESS = 'AMT Features updated',
  APP_USE_JSON_PARSER_ERROR = 'appUseJsonParser received err other than SyntaxError',
  AUDIT_LOG_EXCEPTION = 'Exception during AMT AuditLog request',
  BOOT_SETTING_EXCEPTION = 'Exception during Boot Setting request',
  CHANNEL_CLOSE_NO_CHANNEL_ID = 'MPS Error in CHANNEL_CLOSE: Unable to find channelId',
  CHANNEL_OPEN_FAILURE_NO_CHANNEL_ID = 'MPS Error in CHANNEL_OPEN_FAILURE: Unable to find channelId',
  COMPLETE = 'Complete',
  CREATE_HASH_STRING_FAILED = 'httpHandler unable to create hashed string',
  DATA_NO_CHANNEL_ID = 'MPS Error in CHANNEL_DATA: Unable to find channelId',
  DATABASE_UPDATE_FAILED = 'Failed to update',
  DATABASE_INSERT_FAILED = 'Failed to insert',
  DEVICE_CONNECTION_STATUS_UPDATED = 'Device connection status updated in db',
  DEVICE_CREATE_FAILED = 'Device update/insert failed',
  DEVICE_DELETE_FAILED = 'Device delete failed',
  DEVICE_DISCONNECT_EXCEPTION = 'Exception during Device Disconnect',
  DEVICE_DISCONNECTED_SUCCESS = 'Device CIRA connection disconnected',
  DEVICE_GET_EXCEPTION = 'Exception during Device Get request',
  DEVICE_GET_ALL_EXCEPTION = 'Exception during Device Get All request',
  DEVICE_TAGS_EXCEPTION = 'Exception during Device Get Tags request',
  DEVICE_UPDATE_FAILED = 'Device update failed',
  ENUMERATION_RESPONSE_NULL = 'Failed to get Enumeration Response',
  EOR_CLOSING_CHANNEL = 'end of request, closing channel',
  EVENT_LOG_EXCEPTION = 'Exception during AMT Event Log request',
  EVENT_LOG_REQUEST_FAILED = 'Event Log request failed',
  EVENT_LOG_REQUESTED = 'Event Log requested',
  EVENT_LOG_SENT = 'Event Log received',
  EXCEPTION_CAUGHT = 'Exception Caught',
  EXECUTED_QUERY = 'Executed Query',
  GENERAL_SETTINGS_EXCEPTION = 'Exception during AMT General Settings request',
  GENERAL_SETTINGS_REQUEST_FAILED = 'AMT General Settings request failed',
  GENERAL_SETTINGS_GET_REQUESTED = 'General Settings requested',
  GENERAL_SETTINGS_GET_SUCCESS = 'General Settings received',
  GENERATING_ROOT_CERTIFICATE = 'Generating Root certificate...',
  GENERATING_MPS_CERTIFICATE = 'Generating Intel AMT MPS certificate...',
  HARDWARE_INFORMATION_EXCEPTION = 'Exception during AMT Hardware Information request',
  HARDWARE_INFORMATION_REQUEST_FAILED = 'AMT Hardware Information request failed',
  HARDWARE_INFORMATION_GET_REQUESTED = 'Hardware Information requested',
  HARDWARE_INFORMATION_GET_SUCCESS = 'Hardware Information received',
  HEALTH_CHECK_FAILED = 'Health Check Failed',
  INTERNAL_SERVICE_ERROR = 'Internal Service Error',
  LOGIN_FAILED = 'Incorrect Username and/or Password!',
  MPS_CHANNEL_CLOSE = 'MPS: CHANNEL_CLOSE',
  MPS_CHANNEL_OPEN_FAILURE = 'MPS: CHANNEL_OPEN_FAILURE',
  MPS_CHANNEL_OPEN_CONFIRMATION = 'MPS: CHANNEL_OPEN_CONFIRMATION',
  MPS_CHANNEL_OPEN = 'MPS: CHANNEL_OPEN',
  MPS_CIRA_AUTHENTICATION_SUCCESS = 'MPS: CIRA Authentication successful',
  MPS_NEW_TLS_CONNECTION = 'MPS: New TLS connection',
  MPS_HTTP_GET_CONNECTION = 'MPS: HTTP GET detected',
  MPS_CIRA_NEW_TLS_CONNECTION = 'MPS: New CIRA connection detected',
  MPS_CIRA_TIMEOUT_DISCONNECTING = 'MPS: CIRA timeout, disconnecting',
  MPS_CIRA_TIMEOUT_DISCONNECTED = 'MPS: CIRA timeout, disconnected',
  MPS_CIRA_CLOSE_OLD_CONNECTION = 'MPS: Close and delete the old CIRA connection',
  MPS_CIRA_CONNECTION_CLOSED = 'MPS: CIRA connection closed',
  MPS_CIRA_CHANNEL_NULL = 'ciraHandler channel null',
  MPS_CIRA_CONNECTION_FAILED = 'CIRA Connection Failed',
  MPS_CIRA_DISCONNECT = 'MPS: Disconnect CIRA connection',
  MPS_CIRA_AUTHENTICATION_FAILED = 'MPS: CIRA Authentication failed',
  MPS_CIRA_CONNECTION_ESTABLISHED = 'CIRA Connection Established',
  MPS_DISCONNECT = 'MPS:DISCONNECT',
  MPS_CHANNEL_DATA = 'MPS: CHANNEL_DATA',
  MPS_WINDOW_ADJUST = 'MPS: CHANNEL_WINDOW_ADJUST',
  MPS_GLOBAL_REQUEST = 'MPS: GLOBAL_REQUEST',
  MPS_GLOBAL_REQUEST_TCPIPFWD_PORTS = 'MPS: GLOBAL_REQUEST tcpip forward ports',
  MPS_SERVICE_REQUEST = 'MPS: SERVICE_REQUEST',
  MPS_USER_AUTH_REQUEST = 'MPS: USER_AUTH_REQUEST',
  MPS_PROTOCOL_VERSION = 'MPS: PROTOCOL_VERSION',
  MPS_KEEPALIVE_REPLY = 'MPS: KEEPALIVE_REPLY',
  MPS_KEEPALIVE_REQUEST = 'MPS: KEEPALIVE_REQUEST',
  MPS_UNKNOWN_CIRA_COMMAND = 'MPS: Unknown CIRA command',
  MPS_DEVICE_NOT_ALLOWED = 'MPS: Device is not allowed to connect',
  MPS_SEND_KEEPALIVE_OPTIONS_REQUEST = 'MPS: SendKeepaliveOptionsRequest',
  MPS_SEND_KEEPALIVE_REPLY = 'MPS: SendKeepAliveReply',
  MPS_SEND_SERVICE_ACCEPT = 'MPS: SendServiceAccept',
  MPS_SEND_TCP_FORWARD_SUCCESS_REPLY = 'MPS: SendTcpForwardSuccessReply',
  MPS_SEND_TCP_FORWARD_CANCEL_REPLY = 'MPS: SendTcpForwardCancelReply',
  MPS_SEND_KEEP_ALIVE_REQUEST = 'MPS: SendKeepAliveRequest',
  MPS_SEND_CHANNEL_OPEN_FAILURE = 'MPS: SendChannelOpenFailure',
  MPS_SEND_CHANNEL_OPEN_CONFIRMATION = 'MPS: SendChannelOpenConfirmation',
  MPS_SEND_CHANNEL_OPEN = 'MPS: SendChannelOpen',
  MPS_SEND_CHANNEL_CLOSE = 'MPS: SendChannelClose',
  MPS_SEND_CHANNEL_DATA = 'MPS: SendChannelData',
  MPS_SEND_CHANNEL_WINDOW_ADJUST = 'MPS: SendChannelWindowAdjust',
  MPS_SEND_CHANNEL_DISCONNECT = 'MPS: SendDisconnect',
  MPS_SEND_USER_AUTH_FAIL = 'MPS: SendUserAuthFail',
  MPS_SEND_USER_AUTH_SUCCESS = 'MPS: SendUserAuthSuccess',
  MPS_CONNECTION_CLOSED = 'MPS: Connection closed',
  MPS_ROOT_CERTIFICATE_DOES_NOT_EXIST = 'MPS root certificate does not exist',
  MPS_ROOT_CERTIFICATE_EXCEPTION = 'Exception during MPS Root Certificate download',
  MPS_RUNNING_ON = 'MPS Microservice running on',
  MPS_WARN_RESERVED_VALUE = 'MPS: Unexpected value in reserved field',
  MPS_ERR_MAXLEN = 'MPS: Data length beyond maximum',
  MQTT_MESSAGE_FAILED = 'Event message failed',
  MQTT_OFF = 'MQTT is turned off',
  MQTT_CLIENT_CLOSED = 'MQTT client closed',
  MQTT_MESSAGE_PUBLISHED = 'Event message published',
  PORT_NOT_AVAILABLE = 'ERROR: Intel(R) AMT server port is not available',
  POWER_STATE_EXCEPTION = 'Exception during Power State request',
  POWER_STATE_REQUEST_FAILED = 'Power State request failed',
  POWER_STATE_GET_REQUESTED = 'Power State requested',
  POWER_ACTION_REQUESTED = 'Power Action requested',
  POWER_ACTION_EXCEPTION = 'Exception during Power Action request',
  POWER_CAPABILITIES_REQUESTED = 'Power Capabilities requested',
  POWER_CAPABILITIES_SUCCESS = 'Power Capabilities received',
  POWER_CAPABILITIES_EXCEPTION = 'Exception during Power Capabilities request',
  REDIRECT_FORWARD_DATA_EXCEPTION = 'Exception while forwarding data to client',
  REDIRECT_CLOSING_WEBSOCKET_EXCEPTION = 'Exception while closing client websocket connection',
  REDIRECT_OPENING_WEB_SOCKET = 'Opening web socket connection',
  REDIRECT_CLOSING_WEB_SOCKET = 'Closing web socket connection',
  REDIRECT_CREATING_CREDENTIAL = 'Creating credential',
  REDIRECT_CIRA_STATE_CHANGE = 'Relay CIRA state change',
  REDIRECTION_SESSION_STARTED = 'Redirection session started',
  REDIRECTION_SESSION_ENDED = 'Redirection session ended',
  REQUEST = 'Request',
  RESPONSE_NULL = 'Failed to get Response',
  ROUTE_DOES_NOT_EXIST = 'Route does not exist. Closing connection...',
  SECRET_MANAGER_GET_SECRET_FROM_KEY_ERROR = 'getSecretFromKey',
  SECRET_MANAGER_GET_SECRET_AT_PATH_ERROR = 'getSecretAtPath',
  SECRET_MANAGER_WRITING_SECRETS_ERROR = 'Error while writing secrets',
  SECRET_MANAGER_GETTING_SECRET = 'getting secret from',
  SECRET_MANAGER_RECEIVED_SECRET = 'received secret from',
  SECRET_MANAGER_SECRET_PATH = 'getting secrets from path',
  SECRET_MANAGER_DATA_FROM_SECRET_STORE = 'got data back from secret store at path',
  SECRET_MANAGER_WRITING_DATA_TO_SECRET_STORE = 'writing data to secret store...',
  SECRET_MANAGER_DATA_WRITTEN_TO_SECRET_STORE_SUCCESS = 'Successfully wrote data to secret store at path',
  SERVER_RUNNING_ON = 'Intel(R) AMT server running on',
  SOCKET_TIMEOUT = 'Error from socket timeout',
  SOCKET_CLOSE_ERROR = 'Error from socket close',
  SOCKET_ERROR = 'MPS socket error',
  TLS_CONFIGURATION_WEB_TLS_CONFIG_DOES_NOT_EXIST = 'web_tls config file does not exist',
  TLS_CONFIGURATION_JSON_PARSE_EXCEPTION = 'Exception while trying to parse JSON file',
  TLS_CONFIGURATION_TLS_CERTIFICATE_OR_KEY_DOES_NOT_EXIST = 'Error: TLS certificate or private key does not exist',
  TLS_CONFIGURATION_CERTIFICATE_OR_KEY_DOES_NOT_EXIST = 'Error: Configuration missing either TLS Cert or Private Key',
  TLS_CONFIGURATION_WEBSERVER_CA_CERTIFICATE_DOES_NOT_EXIST = 'Error: WebServer Configuration missing CA Certificate',
  TLS_CONFIGURATION_WEB_TLS_EXCEPTION = 'Web TLS webConfiguration exception',
  TLS_CONFIGURATION_MPS_TLS_CONFIG_DOES_NOT_EXIST = 'mps_tls config file does not exist',
  TLS_CONFIGURATION_MPS_TLS_CONFIGURATION_EXCEPTION = 'Exception in mpsTLSConfiguration',
  TLS_CONFIGURATION_DIRECT_TLS_CONFIG_DOES_NOT_EXIST = 'direct_tls config file does not exist',
  TLS_CONFIGURATION_DIRECT_TLS_CONFIGURATION_EXCEPTION = 'Exception in directTLSConfiguration',
  USER_CONSENT_CANCEL_FAILED = 'User Consent Cancel failed',
  USER_CONSENT_CANCEL_EXCEPTION = 'Exception during User Consent Cancel',
  USER_CONSENT_REQUEST_FAILED = 'User Consent Request failed',
  USER_CONSENT_REQUEST_EXCEPTION = 'Exception during User Consent Request',
  USER_CONSENT_SENT_FAILED = 'User Consent Sent failed',
  USER_CONSENT_SENT_EXCEPTION = 'Exception during User Consent Sent',
  USER_CONSENT_CANCEL_SUCCESS = 'User Consent code cancelled',
  USER_CONSENT_REQUEST_SUCCESS = 'User Consent code requested',
  USER_CONSENT_SENT_SUCCESS = 'User Consent code sent',
  VERSION_REQUEST_FAILED = 'AMT Version request failed',
  VERSION_EXCEPTION = 'Exception during AMT Version request',
  WEB_PORT_INVALID = 'Chosen web port is invalid or not available',
  WEB_PORT_NULL = 'web_port config variable is null',
  WEBSERVER_EXCEPTION = 'Exception in Web Server',
  WINDOW_ADJUST_NO_CHANNEL_ID = 'MPS Error in CHANNEL_WINDOW_ADJUST: Unable to find channelId',
  XML_PARSE_FAILED = 'Failed to parse XML'
}
