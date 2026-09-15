/*********************************************************************
* Copyright (c) Intel Corporation 2021
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
CREATE DATABASE mpsdb;

\connect mpsdb

CREATE TABLE IF NOT EXISTS devices(
      guid uuid NOT NULL,
      tags text[],
      hostname varchar(256),
      mpsinstance text, 
      connectionstatus boolean,
      mpsusername text,
      tenantid varchar(36) NOT NULL,
      friendlyname varchar(256),
      dnssuffix varchar(256),
      lastconnected timestamp with time zone,
      lastseen timestamp with time zone,
      lastdisconnected timestamp with time zone,
      deviceinfo JSON,
      powerstate integer,
      ospowersavingstate integer,
      powerstateupdatedat timestamp with time zone,
      CONSTRAINT device_guid UNIQUE(guid),
      PRIMARY KEY (guid,tenantid)
    ); 

-- Idempotent column adds so this file can be re-run against an existing
-- database. No-ops on a fresh install, where CREATE TABLE above already
-- created them.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS powerstate integer;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS ospowersavingstate integer;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS powerstateupdatedat timestamp with time zone;
