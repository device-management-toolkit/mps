/*********************************************************************
 * Copyright (c) Intel Corporation 2022
 * SPDX-License-Identifier: Apache-2.0
 **********************************************************************/

export const enumerateResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '0',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/EnumerateResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000001',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ServiceAvailableToElement'
    },
    Body: {
      EnumerateResponse: {
        EnumerationContext: '01000000-0000-0000-0000-000000000000'
      }
    }
  }
}
export const enumerateResponseCIMSoftwareIdentity = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: 0,
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/EnumerateResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000030',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_SoftwareIdentity'
    },
    Body: {
      EnumerateResponse: {
        EnumerationContext: '17000000-0000-0000-0000-000000000000'
      }
    }
  },
  statusCode: 200
}
export const serviceAvailableToElement = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '1',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000002',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ServiceAvailableToElement'
    },
    Body: {
      PullResponse: {
        Items: {
          CIM_AssociatedPowerManagementService: {
            AvailableRequestedPowerStates: [
              '8',
              '2',
              '5'
            ],
            PowerState: '4',
            ServiceProvided: {
              Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
              ReferenceParameters: {
                ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_PowerManagementService',
                SelectorSet: {
                  Selector: [
                    'CIM_PowerManagementService',
                    'Intel(r) AMT Power Management Service',
                    'CIM_ComputerSystem',
                    'Intel(r) AMT'
                  ]
                }
              }
            },
            UserOfService: {
              Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
              ReferenceParameters: {
                ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem',
                SelectorSet: {
                  Selector: [
                    'CIM_ComputerSystem',
                    'ManagedSystem'
                  ]
                }
              }
            }
          }
        },
        EndOfSequence: ''
      }
    }
  }
}

export const generalSettings = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: 0,
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000001',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_GeneralSettings'
    },
    Body: {
      AMT_GeneralSettings: {
        AMTNetworkEnabled: 1,
        DDNSPeriodicUpdateInterval: 1440,
        DDNSTTL: 900,
        DDNSUpdateByDHCPServerEnabled: true,
        DDNSUpdateEnabled: false,
        DHCPv6ConfigurationTimeout: 0,
        DigestRealm: 'Digest:A3829B3827DE4D33D4449B366831FD01',
        DomainName: '',
        ElementName: 'Intel(r) AMT: General Settings',
        HostName: '',
        HostOSFQDN: 'DESKTOP-9CC12U7',
        IdleWakeTimeout: 1,
        InstanceID: 'Intel(r) AMT: General Settings',
        NetworkInterfaceEnabled: true,
        PingResponseEnabled: true,
        PowerSource: 0,
        PreferredAddressFamily: 0,
        PresenceNotificationInterval: 0,
        PrivacyLevel: 0,
        RmcpPingResponseEnabled: true,
        SharedFQDN: true,
        ThunderboltDockEnabled: 0,
        WsmanOnlyMode: false
      }
    }
  },
  statusCode: 200
}

export const startOptInResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '0',
      Action: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService/StartOptInResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000008D',
      ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService'
    },
    Body: {
      StartOptIn_OUTPUT: {
        ReturnValue: '0'
      }
    }
  }
}

export const cancelOptInResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '1',
      Action: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService/CancelOptInResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000008F',
      ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService'
    },
    Body: {
      CancelOptIn_OUTPUT: {
        ReturnValue: '0'
      }
    }
  }
}

export const sendOptInCodeResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '3',
      Action: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService/SendOptInCodeResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000093',
      ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_OptInService'
    },
    Body: {
      SendOptInCode_OUTPUT: {
        ReturnValue: '0'
      }
    }
  }
}

export const computerSystemPackage = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: 1,
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000001',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystemPackage'
    },
    Body: {
      CIM_ComputerSystemPackage: {
        Antecedent: {
          Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
          ReferenceParameters: {
            ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Chassis',
            SelectorSet: {
              Selector: [
                'CIM_Chassis',
                'CIM_Chassis'
              ]
            }
          }
        },
        Dependent: {
          Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
          ReferenceParameters: {
            ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem',
            SelectorSet: {
              Selector: [
                'CIM_ComputerSystem',
                'ManagedSystem'
              ]
            }
          }
        },
        PlatformGUID: '44454C4C4B0010428033B6C04F504633'
      }
    }
  },
  statusCode: 200
}

export const chassis = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: 1,
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000002',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Chassis'
    },
    Body: {
      CIM_Chassis: {
        ChassisPackageType: '3',
        CreationClassName: 'CIM_Chassis',
        ElementName: 'Managed System Chassis',
        Manufacturer: 'Dell Inc.',
        Model: 'OptiPlex 7090',
        OperationalStatus: '0',
        PackageType: '3',
        SerialNumber: '6KB3PF3',
        Tag: 'CIM_Chassis',
        Version: ''
      }
    }
  },
  statusCode: 200
}
export const card = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: 2,
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000003',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Card'
    },
    Body: {
      CIM_Card: {
        CanBeFRUed: true,
        CreationClassName: 'CIM_Card',
        ElementName: 'Managed System Base Board',
        Manufacturer: 'Dell Inc.',
        Model: '0MVDNX',
        OperationalStatus: 0,
        PackageType: 9,
        SerialNumber: '/6KB3PF3/CNPEC0017500BC/',
        Tag: 'CIM_Card',
        Version: 'A00'
      }
    }
  },
  statusCode: 200
}
export const biosElement = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '3',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000004',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_BIOSElement'
    },
    Body: {
      CIM_BIOSElement: {
        ElementName: 'Primary BIOS',
        Manufacturer: 'Dell Inc.',
        Name: 'Primary BIOS',
        OperationalStatus: '0',
        PrimaryBIOS: 'true',
        ReleaseDate: {
          Datetime: '2021-07-23T00:00:00Z'
        },
        SoftwareElementID: '1.1.38',
        SoftwareElementState: '2',
        TargetOperatingSystem: '66',
        Version: '1.1.38'
      }
    }
  }
}
export const processor = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '10',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000000B',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Processor'
    },
    Body: {
      PullResponse: {
        Items: {
          CIM_Processor: {
            CPUStatus: '1',
            CreationClassName: 'CIM_Processor',
            CurrentClockSpeed: '2700',
            DeviceID: 'CPU 0',
            ElementName: 'Managed System CPU',
            EnabledState: '2',
            ExternalBusClockSpeed: '100',
            Family: '205',
            HealthState: '0',
            MaxClockSpeed: '4500',
            OperationalStatus: '0',
            OtherFamilyDescription: '',
            RequestedState: '12',
            Role: 'Central',
            Stepping: '3',
            SystemCreationClassName: 'CIM_ComputerSystem',
            SystemName: 'ManagedSystem',
            UpgradeMethod: '2'
          }
        },
        EndOfSequence: ''
      }
    }
  }
}
export const physicalMemory = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '11',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000000C',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_PhysicalMemory'
    },
    Body: {
      PullResponse: {
        Items: {
          CIM_PhysicalMemory: {
            BankLabel: 'CIM_PhysicalMemory Bank Label',
            Capacity: '17179869184',
            ConfiguredMemoryClockSpeed: '3200',
            CreationClassName: 'CIM_PhysicalMemory',
            ElementName: 'Managed System Memory Chip',
            FormFactor: '13',
            IsSpeedInMhz: 'true',
            Manufacturer: '01980000802C',
            MaxMemorySpeed: '3200',
            MemoryType: '26',
            PartNumber: 'K1CXP8-MIE          ',
            SerialNumber: '12605691',
            Speed: '0',
            Tag: '04212600'
          }
        },
        EndOfSequence: ''
      }
    }
  }
}
export const mediaAccessDevice = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '12',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000000D',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_MediaAccessDevice'
    },
    Body: {
      PullResponse: {
        Items: {
          CIM_MediaAccessDevice: {
            Capabilities: [
              '4',
              '10',
              '7'
            ],
            CreationClassName: 'CIM_MediaAccessDevice',
            DeviceID: 'MEDIA DEV 0',
            ElementName: 'Managed System Media Access Device',
            EnabledDefault: '2',
            EnabledState: '0',
            MaxMediaSize: '256060514',
            OperationalStatus: '0',
            RequestedState: '12',
            Security: '2',
            SystemCreationClassName: 'CIM_ComputerSystem',
            SystemName: 'ManagedSystem'
          }
        },
        EndOfSequence: ''
      }
    }
  }
}

export const physicalPackage = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '13',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000000E',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_PhysicalPackage'
    },
    Body: {
      PullResponse: {
        EnumerationContext: '04000000-0000-0000-0000-000000000000',
        Items: {
          CIM_Card: {
            CanBeFRUed: true,
            CreationClassName: 'CIM_Card',
            ElementName: 'Managed System Base Board',
            Manufacturer: 'Dell Inc.',
            Model: '0MVDNX',
            OperationalStatus: 0,
            PackageType: 9,
            SerialNumber: '/6KB3PF3/CNPEC0017500BC/',
            Tag: 'CIM_Card',
            Version: 'A00'
          }
        }
      }
    }
  }
}

export const systemPackaging = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '14',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000000F',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_SystemPackaging'
    },
    Body: {
      PullResponse: {
        Items: {
          CIM_ComputerSystemPackage: {
            Antecedent: {
              Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
              ReferenceParameters: {
                ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Chassis',
                SelectorSet: {
                  Selector: [
                    'CIM_Chassis',
                    'CIM_Chassis'
                  ]
                }
              }
            },
            Dependent: {
              Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
              ReferenceParameters: {
                ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem',
                SelectorSet: {
                  Selector: [
                    'CIM_ComputerSystem',
                    'ManagedSystem'
                  ]
                }
              }
            },
            PlatformGUID: '44454C4C4B0010428033B6C04F504633'
          }
        },
        EndOfSequence: ''
      }
    }
  }
}

export const chip = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '15',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000010',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_Chip'
    },
    Body: {
      PullResponse: {
        EnumerationContext: '06000000-0000-0000-0000-000000000000',
        Items: {
          CIM_Chip: {
            CanBeFRUed: 'true',
            CreationClassName: 'CIM_Chip',
            ElementName: 'Managed System Processor Chip',
            Manufacturer: 'Intel(R) Corporation',
            OperationalStatus: '0',
            Tag: 'CPU 0',
            Version: 'Intel(R) Core(TM) i5-10500 CPU @ 3.10GHz'
          }
        }
      }
    }
  }
}

export const auditLog = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '0',
      Action: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_AuditLog/ReadRecordsResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-0000000001E8',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_AuditLog'
    },
    Body: {
      ReadRecords_OUTPUT: {
        TotalRecordCount: '1106',
        RecordsReturned: '10',
        EventRecords: [
          'ABAAEwJe+jS5AgABAg==',
          'ABAAAAJe+jTQAgAA',
          'ABAAAAJe+jj6AgAA',
          'ABAAEgAFYWRtaW5e+daPAAkxMjcuMC4wLjEA',
          'ABAAEwJe+dbrAgABAg==',
          'ABAAAAJe+dccAgAA',
          'ABAAAAJe+dgmAgAA',
          'ABUAAAAJJCRPc0FkbWluXvnewgAJMTI3LjAuMC4xBF76QRI=',
          'ABAAEwJe+kTdAgABAg==',
          'ABAAAAJe+kT/AgAA'
        ],
        ReturnValue: '0'
      }
    }
  }
}

export const amtMessageLog = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '0',
      Action: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_MessageLog/GetRecordsResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000001',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_MessageLog'
    },
    Body: {
      GetRecords_OUTPUT: {
        IterationIdentifier: '28',
        NoMoreRecords: 'true',
        RecordArray: [
          'YiexYf8PbwJoAf8AAEASAAAAAAAA',
          'eRyxYf8PbwJoAf8AAEASAAAAAAAA',
          '+sGwYf8PbwJoCP8iAEATAAAAAAAA',
          '98GwYf8PbwJoAf8EAEACAAAAAAAA',
          '98GwYf8PbwJoAf8HAEAXAAAAAAAA',
          '98GwYf8PbwJoAf8HAEAMAAAAAAAA',
          '98GwYf8PbwJoAf8HAEAXAAAAAAAA',
          '98GwYf8PbwJoAf8HAEAMAAAAAAAA',
          '9cGwYf8PbwJoAf8iAEAGAAAAAAAA',
          '9MGwYf8PbwJoAf8HAEAJAAAAAAAA',
          '9MGwYf8PbwJoAf8iAEAHAAAAAAAA',
          '9MGwYf8PbwJoAf8iAEAHAAAAAAAA',
          'F4CvYf8PbwJoAf8AAEASAAAAAAAA',
          'iXOvYf8PbwJoAf8AAEASAAAAAAAA',
          'M2GpYf8PbwJoAf8mAEANAAAAAAAA',
          'M2GpYf8PbwJoCP8iAEATAAAAAAAA',
          'MmGpYf8PbwJoAf8HAEAXAAAAAAAA',
          'MmGpYf8PbwJoAf8HAEAMAAAAAAAA',
          'MmGpYf8PbwJoAf8HAEAXAAAAAAAA',
          'MmGpYf8PbwJoAf8HAEAMAAAAAAAA',
          'MmGpYf8PbwJoAf8EAEACAAAAAAAA',
          'MWGpYf8PbwJoAf8iAEAGAAAAAAAA',
          'MGGpYf8PbwJoAf8HAEAJAAAAAAAA',
          'MGGpYf8PbwJoAf8iAEAHAAAAAAAA',
          'MGGpYf8PbwJoAf8iAEAHAAAAAAAA',
          'G2GpYf8PbwJoAf8AAEASAAAAAAAA',
          '11epYf8PbwJoAf8AAEASAAAAAAAA',
          'u/moYf8PbwJoAf8AAEASAAAAAAAA'
        ],
        ReturnValue: '0'
      }
    }
  }
}

export const positionToFirstRecord = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '0',
      Action: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_MessageLog/PositionToFirstRecordResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000001',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_MessageLog'
    },
    Body: {
      PositionToFirstRecord_OUTPUT: {
        IterationIdentifier: '1',
        ReturnValue: '0'
      }
    }
  }
}

export const softwareIdentityResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '1',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000002',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_SoftwareIdentity'
    },
    Body: {
      PullResponse: {
        Items: {
          CIM_SoftwareIdentity: [
            {
              InstanceID: 'Flash',
              IsEntity: 'true',
              VersionString: '15.0.23'
            },
            {
              InstanceID: 'Netstack',
              IsEntity: 'true',
              VersionString: '15.0.23'
            },
            {
              InstanceID: 'AMTApps',
              IsEntity: 'true',
              VersionString: '15.0.23'
            },
            {
              InstanceID: 'AMT',
              IsEntity: 'true',
              VersionString: '15.0.23'
            },
            {
              InstanceID: 'Sku',
              IsEntity: 'true',
              VersionString: '16392'
            },
            {
              InstanceID: 'VendorID',
              IsEntity: 'true',
              VersionString: '8086'
            },
            {
              InstanceID: 'Build Number',
              IsEntity: 'true',
              VersionString: '1706'
            },
            {
              InstanceID: 'Recovery Version',
              IsEntity: 'true',
              VersionString: '15.0.23'
            },
            {
              InstanceID: 'Recovery Build Num',
              IsEntity: 'true',
              VersionString: '1706'
            },
            {
              InstanceID: 'Legacy Mode',
              IsEntity: 'true',
              VersionString: 'False'
            },
            {
              InstanceID: 'AMT FW Core Version',
              IsEntity: 'true',
              VersionString: '15.0.23'
            }
          ]
        },
        EndOfSequence: ''
      }
    }
  }
}

export const setupAndConfigurationServiceResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '2',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000003',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_SetupAndConfigurationService'
    },
    Body: {
      AMT_SetupAndConfigurationService: {
        CreationClassName: 'AMT_SetupAndConfigurationService',
        ElementName: 'Intel(r) AMT Setup and Configuration Service',
        EnabledState: '5',
        Name: 'Intel(r) AMT Setup and Configuration Service',
        PasswordModel: '1',
        ProvisioningMode: '1',
        ProvisioningServerOTP: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        ProvisioningState: '2',
        RequestedState: '12',
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT',
        ZeroTouchConfigurationEnabled: 'true'
      }
    }
  }
}

export const versionResponse = {
  CIM_SoftwareIdentity: {
    responses: [
      {
        InstanceID: 'Flash',
        IsEntity: 'true',
        VersionString: '15.0.23'
      },
      {
        InstanceID: 'Netstack',
        IsEntity: 'true',
        VersionString: '15.0.23'
      },
      {
        InstanceID: 'AMTApps',
        IsEntity: 'true',
        VersionString: '15.0.23'
      },
      {
        InstanceID: 'AMT',
        IsEntity: 'true',
        VersionString: '15.0.23'
      },
      {
        InstanceID: 'Sku',
        IsEntity: 'true',
        VersionString: '16392'
      },
      {
        InstanceID: 'VendorID',
        IsEntity: 'true',
        VersionString: '8086'
      },
      {
        InstanceID: 'Build Number',
        IsEntity: 'true',
        VersionString: '1706'
      },
      {
        InstanceID: 'Recovery Version',
        IsEntity: 'true',
        VersionString: '15.0.23'
      },
      {
        InstanceID: 'Recovery Build Num',
        IsEntity: 'true',
        VersionString: '1706'
      },
      {
        InstanceID: 'Legacy Mode',
        IsEntity: 'true',
        VersionString: 'False'
      },
      {
        InstanceID: 'AMT FW Core Version',
        IsEntity: 'true',
        VersionString: '15.0.23'
      }
    ],
    status: 200
  },
  AMT_SetupAndConfigurationService: {
    response: {
      CreationClassName: 'AMT_SetupAndConfigurationService',
      ElementName: 'Intel(r) AMT Setup and Configuration Service',
      EnabledState: '5',
      Name: 'Intel(r) AMT Setup and Configuration Service',
      PasswordModel: '1',
      ProvisioningMode: '1',
      ProvisioningServerOTP: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      ProvisioningState: '2',
      RequestedState: '12',
      SystemCreationClassName: 'CIM_ComputerSystem',
      SystemName: 'Intel(r) AMT',
      ZeroTouchConfigurationEnabled: 'true'
    },
    responses: {
      Header: {
        To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
        RelatesTo: '2',
        Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
        MessageID: 'uuid:00000000-8086-8086-8086-000000000003',
        ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_SetupAndConfigurationService'
      },
      Body: {
        CreationClassName: 'AMT_SetupAndConfigurationService',
        ElementName: 'Intel(r) AMT Setup and Configuration Service',
        EnabledState: '5',
        Name: 'Intel(r) AMT Setup and Configuration Service',
        PasswordModel: '1',
        ProvisioningMode: '1',
        ProvisioningServerOTP: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        ProvisioningState: '2',
        RequestedState: '12',
        SystemCreationClassName: 'CIM_ComputerSystem',
        SystemName: 'Intel(r) AMT',
        ZeroTouchConfigurationEnabled: 'true'
      }
    },
    status: 200
  }
}

export const bootCapabilities = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '3',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000000C',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_BootCapabilities'
    },
    Body: {
      AMT_BootCapabilities: {
        AMTSecureBootControl: 'false',
        BIOSPause: 'false',
        BIOSReflash: 'true',
        BIOSSecureBoot: 'true',
        BIOSSetup: 'true',
        ConfigurationDataReset: 'false',
        ElementName: 'Intel(r) AMT: Boot Capabilities',
        ForceCDorDVDBoot: 'true',
        ForceDiagnosticBoot: 'true',
        ForceHardDriveBoot: 'true',
        ForceHardDriveSafeModeBoot: 'false',
        ForcePXEBoot: 'true',
        ForceUEFIHTTPSBoot: 'false',
        ForceUEFIPBABoot: 'false',
        ForceWinREBoot: 'false',
        ForcedProgressEvents: 'true',
        IDER: 'true',
        InstanceID: 'Intel(r) AMT:BootCapabilities 0',
        KeyboardLock: 'true',
        PowerButtonLock: 'true',
        ResetButtonLock: 'false',
        SOL: 'true',
        SecureErase: 'true',
        SleepButtonLock: 'false',
        UEFIWiFiCoExistenceAndProfileShare: 'false',
        UserPasswordBypass: 'true',
        VerbosityQuiet: 'false',
        VerbosityScreenBlank: 'false',
        VerbosityVerbose: 'false'
      }
    }
  }
}

export const enumerateResponseIPSAlarmClockOccurrence = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: 16,
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/EnumerateResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000030',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence'
    },
    Body: {
      EnumerateResponse: {
        EnumerationContext: '18000000-0000-0000-0000-000000000000'
      }
    }
  },
  statusCode: 200
}

export const alarmClockOccurrences = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '17',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000010',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence'
    },
    Body: {
      PullResponse: {
        EnumerationContext: '18000000-0000-0000-0000-000000000000',
        Items: {
          IPS_AlarmClockOccurrence: {
            DeleteOnCompletion: true,
            ElementName: 'Instance Name',
            InstanceID: 'Instance',
            StartTime: {
              Datetime: '2022-12-31T23:59:00Z'
            },
            Interval: {
              Interval: 'PT5M'
            }
          }
        },
        EndOfSequence: 'true'
      }
    }
  }
}

export const alarmClockManyOccurrences = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '17',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000010',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence'
    },
    Body: {
      PullResponse: {
        EnumerationContext: '18000000-0000-0000-0000-000000000000',
        Items: {
          IPS_AlarmClockOccurrence: [
            {
              DeleteOnCompletion: true,
              ElementName: 'Instance Name',
              InstanceID: 'Instance',
              StartTime: {
                Datetime: '2022-12-31T23:59:00Z'
              }
            },
            {
              DeleteOnCompletion: true,
              ElementName: 'Instance Name 2',
              InstanceID: 'Instance2',
              StartTime: {
                Datetime: '2023-12-31T23:59:00Z'
              }
            }
          ]
        },
        EndOfSequence: 'true'
      }
    }
  }
}

export const alarmClockNoOccurrences = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '18',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/enumeration/PullResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000010',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence'
    },
    Body: {
      PullResponse: {
        EnumerationContext: '18000000-0000-0000-0000-000000000000',
        Items: {},
        EndOfSequence: 'true'
      }
    }
  }
}

export const deleteAlarmClockOccurrence = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '19',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/DeleteResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000000260',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence'
    }
  }
}

export const deleteAlarmClockOccurrenceNotFound = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '19',
      Action: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/fault',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000004F',
      ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/ips-schema/1/IPS_AlarmClockOccurrence'
    },
    Body: {
      Fault: {
        Code: {
          Value: 'a:Sender',
          Subcode: {
            Value: 'b:DestinationUnreachable'
          }
        },
        Reason: 'No route can be determined to reach the destination role defined by the WSAddressing To.'
      }
    }
  }
}

export const addAlarmClockOccurrenceResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '20',
      Action: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_AlarmClockService/AddAlarmResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-0000000001C3',
      ResourceURI: 'http://intel.com/wbem/wscim/1/amt-schema/1/AMT_AlarmClockService'
    },
    Body: {
      AddAlarm_OUTPUT: {
        AlarmClock: {
          Address: 'default'
        },
        ReturnValue: '0'
      }
    }
  }
}

export const addAlarmClockOccurrenceDuplicateResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '21',
      Action: 'http://schemas.dmtf.org/wbem/wsman/1/wsman/fault',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000004E'
    },
    Body: {
      Fault: {
        Code: {
          Value: 'a:Sender',
          Subcode: {
            Value: 'd:InvalidRepresentation'
          }
        },
        Reason: 'The XML content is not valid.',
        Detail: {
          FaultDetail: 'http://schemas.dmtf.org/wbem/wsman/1/wsman/faultDetail/MissingValues'
        }
      }
    }
  }
}

export const addAlarmClockOccurrenceQuotaLimitResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '22',
      Action: 'http://schemas.dmtf.org/wbem/wsman/1/wsman/fault',
      MessageID: 'uuid:00000000-8086-8086-8086-00000000004E'
    },
    Body: {
      Fault: {
        Code: {
          Value: 'a:Sender',
          Subcode: {
            Value: 'e:QuotaLimit'
          }
        },
        Reason: 'The service is busy servicing other requests.',
        Detail: {}
      }
    }
  }
}

export const deactivateResponse = {
  success: {
    status: 'SUCCESS'
  },
  notFound: {
    error: 'Device not found/connected. Please connect again using CIRA.',
    errorDescription: 'guid : 1'
  }
}

export const osPowerSavingStateChangeGetResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '2',
      Action: 'http://schemas.xmlsoap.org/ws/2004/09/transfer/GetResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-000000011EC1',
      ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_PowerManagementService'
    },
    Body: {
      CreationClassName: 'IPS_PowerManagementService',
      ElementName: 'Intel(r) AMT Power Management Service',
      EnabledState: '5',
      Name: 'Intel(r) AMT Power Management Service',
      OSPowerSavingState: '3',
      RequestedState: '12',
      SystemCreationClassName: 'CIM_ComputerSystem',
      SystemName: 'Intel(r) AMT'
    }
  }
}

export const osPowerSavingStateChangeResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '3',
      Action:
        'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_PowerManagementService/RequestOSPowerSavingStateChangeResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-0000000133A3',
      ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_PowerManagementService'
    },
    Body: {
      RequestOSPowerSavingStateChange_OUTPUT: {
        ReturnValue: 0
      }
    }
  }
}

export const osPowerSavingStateChangeBadResponse = {
  Envelope: {
    Header: {
      To: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous',
      RelatesTo: '3',
      Action:
        'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_PowerManagementService/RequestOSPowerSavingStateChangeResponse',
      MessageID: 'uuid:00000000-8086-8086-8086-0000000133A3',
      ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_PowerManagementService'
    },
    Body: {
      RequestOSPowerSavingStateChange_OUTPUT: {
        ReturnValue: 5
      }
    }
  }
}

export const osPowerSavingStateChangeRequest = {
  Envelope: {
    Header: {
      To: '/wsman',
      Action: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_PowerManagementService/RequestOSPowerSavingStateChange',
      MessageID: '3',
      ResourceURI: 'http://intel.com/wbem/wscim/1/ips-schema/1/IPS_PowerManagementService',
      ReplyTo: {
        Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing/role/anonymous'
      },
      OperationTimeout: 'PT60S'
    },
    Body: {
      RequestOSPowerSavingStateChange_INPUT: {
        OSPowerSavingState: '3',
        ManagedElement: {
          Address: 'http://schemas.xmlsoap.org/ws/2004/08/addressing'
        },
        ReferenceParameters: {
          ResourceURI: 'http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ComputerSystem',
          SelectorSet: {
            Selector: [
              {
                Name: 'CreationClassName',
                Value: 'CIM_ComputerSystem'
              },
              {
                Name: 'Name',
                Value: 'ManagedSystem'
              }
            ]
          }
        }
      }
    }
  }
}

export const screenSettingDataResponse = {
  Envelope: {
    Body: {
      PullResponse: {
        IPS_ScreenSettingDataItems: [
          {
            PrimaryIndex: 0,
            SecondaryIndex: 1,
            TertiaryIndex: 2,
            QuadraryIndex: 3,
            IsActive: [
              true,
              false,
              true,
              false
            ],
            UpperLeftX: [
              0,
              100,
              200,
              300
            ],
            UpperLeftY: [
              0,
              10,
              20,
              30
            ],
            ResolutionX: [
              1920,
              1280,
              800,
              640
            ],
            ResolutionY: [
              1080,
              720,
              600,
              480
            ]
          }
        ]
      }
    }
  }
}

export const kvmRedirectionSettingDataResponse = {
  Envelope: {
    Body: {
      IPS_KVMRedirectionSettingDataItems: [
        {
          InstanceID: 'KVMRedirection1',
          ElementName: 'KVM Redirection',
          OptInPolicy: true
        }
      ]
    }
  }
}

export const putKVMRedirectionSettingDataResponse = {
  Envelope: {
    Body: {
      IPS_KVMRedirectionSettingDataItems: [
        {
          InstanceID: 'KVMRedirection1',
          ElementName: 'KVM Redirection',
          OptInPolicy: false
        }
      ]
    }
  }
}
