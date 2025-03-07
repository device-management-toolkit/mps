# Management Presence Server

![CodeQL](https://img.shields.io/github/actions/workflow/status/open-amt-cloud-toolkit/mps/codeql-analysis.yml?style=for-the-badge&label=CodeQL&logo=github)
![API Tests](https://img.shields.io/github/actions/workflow/status/open-amt-cloud-toolkit/mps/api-test.yml?style=for-the-badge&label=API%20Test&logo=postman)
![Build](https://img.shields.io/github/actions/workflow/status/open-amt-cloud-toolkit/mps/node.js.yml?style=for-the-badge&logo=github)
![Codecov](https://img.shields.io/codecov/c/github/open-amt-cloud-toolkit/mps?style=for-the-badge&logo=codecov)
[![OSSF-Scorecard Score](https://img.shields.io/ossf-scorecard/github.com/open-amt-cloud-toolkit/mps?style=for-the-badge&label=OSSF%20Score)](https://api.securityscorecards.dev/projects/github.com/open-amt-cloud-toolkit/mps)
[![Discord](https://img.shields.io/discord/1063200098680582154?style=for-the-badge&label=Discord&logo=discord&logoColor=white&labelColor=%235865F2&link=https%3A%2F%2Fdiscord.gg%2DKHeUNEWVH)](https://discord.gg/DKHeUNEWVH)
[![Docker Pulls](https://img.shields.io/docker/pulls/intel/oact-mps?style=for-the-badge&logo=docker)](https://hub.docker.com/r/intel/oact-mps)

> Disclaimer: Production viable releases are tagged and listed under 'Releases'. All other check-ins should be considered 'in-development' and should not be used in production

The Management Presence Server (MPS) enables remote edge management of Intel vPro® Platforms featuring Intel® AMT. MPS uses an Intel vPro® feature, Client Initiated Remote Access (CIRA), to maintain a persistent connection with managed devices. As a cloud-agnostic microservice, MPS provides out-of-band manageability features, such as power control or keyboard, video, and mouse (KVM) control.

<br><br>

**For detailed documentation** about Getting Started or other features of the Device Management Toolkit, see the [docs](https://device-management-toolkit.github.io/docs).

<br>

## Prerequisites

To succesfully deploy MPS, the following software must be installed on your development system:

- [Node.js\* LTS 18.x.x or newer](https://nodejs.org/en/)
- [git](https://git-scm.com/downloads)

## Deploy the Management Presence Server (MPS) Microservice

To deploy the MPS on a local development system:

1. Clone the repo and switch to the `mps` directory.

   ```
   git clone https://github.com/device-management-toolkit/mps.git && cd mps
   ```

2. Open the `.mpsrc` file to edit.

3. Update the following 4 fields. Save and keep track of the values you choose.

   | Field Name         | Required                           | Usage                                                    |
   | ------------------ | ---------------------------------- | -------------------------------------------------------- |
   | common_name        | Development IP Address             | MPS Server IP Address for Device Connection and API Use  |
   | web_admin_user     | Username of your choice            | For logging into the Sample Web UI                       |
   | web_admin_password | **Strong** password of your choice | For logging into the Sample Web UI                       |
   | jwt_secret         | A strong secret of your choice     | Used when generating a JSON Web Token for authentication |

   > This password must meet standard, **strong** password requirements:
   >
   > - 8 to 32 characters
   > - One uppercase, one lowercase, one numerical digit, and one special character.

<br>

4. Save and close the file.

5. Install the dependencies from the working `mps` directory.

   ```
   npm install
   ```

6. Start the service.

   ```
   npm start
   ```

7. The MPS listens on port 4433 by default. Successful installation produces the command line message:

   ```
   MPS Microservice running on localhost:3000.
   Intel(R) AMT server running on localhost:4433.
   ```

<br>
    
## Using Kong

If using the [Kong\*](https://konghq.com/kong/) API gateway with MPS, your `kong.yaml` file must be updated to support JWT Authentication.

The secret provided in kong.yaml **must match** the `jwt_secret` from the `.mpsrc` file.

Example:

```
jwt_secrets:
  - consumer: admin
    key: 9EmRJTbIiIb4bIeSsmgcWIjrR6HyETqc #sample key
    secret: myStrongSecret
```

<br>

## Using devcontainer

If you want debug in vscode devcontainer, try to open the project with devcontainer (Make sure you install the extension of **Dev Containers**)

- Step1: Press **Ctrl + Shift+ P** in vscode;
- Step2: Type **Dev Containers: Reopen in Container**;
- Step3: Click the item which appear in column;
- Step4: Open a terminal, build and run app with command;

<br>

## Additional Resources

- For detailed documentation and Getting Started, [visit the docs site](https://device-management-toolkit.github.io/docs).

- Looking to contribute? [Find more information here about contribution guidelines and practices](.\CONTRIBUTING.md).

- Find a bug? Or have ideas for new features? [Open a new Issue](https://github.com/device-management-toolkit/mps/issues).

- Need additional support or want to get the latest news and events about Open AMT? Connect with the team directly through Discord.

  [![Discord Banner 1](https://discordapp.com/api/guilds/1063200098680582154/widget.png?style=banner2)](https://discord.gg/DKHeUNEWVH)
