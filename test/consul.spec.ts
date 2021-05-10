/*********************************************************************
* Copyright (c) Intel Corporation 2019
* SPDX-License-Identifier: Apache-2.0
**********************************************************************/
import { Consul } from '../src/utils/consul';
import { IDistributedKV, getDistributedKV } from '../src/utils/IDistributedKV';
import { MPSMicroservice } from '../src/mpsMicroservice'
import { configType } from '../src/models/Config'

describe('Test Consul class Construction', () => {
    it('Test if Consul class Object Constructed only once', () => {
        const config: configType = {
            use_allowlist: false,
            common_name: 'localhost',
            port: 4433,
            username: 'standalone',
            pass: 'P@ssw0rd',
            use_global_mps_credentials: true,
            country: 'US',
            company: 'NoCorp',
            debug: true,
            listen_any: true,
            https: true,
            tls_offload: false,
            web_port: 3000,
            generate_certificates: true,
            debug_level: 2,
            logger_off: false,
            data_path: "",
            cert_format: 'file',
            cert_path: "",
            web_admin_user: 'standalone',
            web_admin_password: 'G@ppm0ym',
            distributed_kv_name: "HashiCorpConsul",
            distributed_kv_ip: "127.0.0.1",
            distributed_kv_port: 8500,
            startup_mode: "web",
            web_proxy_port: 8100,
            network_adaptor: "eth0",
            jwt_secret: "secret",
            jwt_issuer: "issuer",
            jwt_expiration: 24,
            tls_cert: "",
            tls_cert_key: "",
            tls_cert_ca: "",
            web_tls_cert: "",
            web_tls_cert_key: "",
            web_tls_cert_ca: "",
            cors_origin: '*',
            cors_headers: '*',
            cors_methods: '*',
            connection_string: '',
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
              secureOptions: ['SSL_OP_NO_SSLv2', 'SSL_OP_NO_SSLv3', 'SSL_OP_NO_COMPRESSION', 'SSL_OP_CIPHER_SERVER_PREFERENCE', 'SSL_OP_NO_TLSv1', 'SSL_OP_NO_TLSv11']
            }
          }
        let mps = new MPSMicroservice(config, null, null);
        let consulObject1 = getDistributedKV(mps);
        let consulObject2 = getDistributedKV(mps);

        expect(consulObject1 === consulObject2).toBe(true);
    });
});
