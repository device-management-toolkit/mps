/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
CREATE TABLE IF NOT EXISTS devices(
      guid uuid,
      tags text[],
      hostname varchar(256),
      CONSTRAINT device_guid UNIQUE(guid)
    );