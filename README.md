# Apigee OIDC Integration with Okta

This repository contains the configuration and resources to integrate **Apigee** with **Okta** as an external Identity Provider (IdP) using the OpenID Connect (OIDC) protocol. 

In this architecture, Apigee acts as an OAuth 2.0 Authorization Server and API Gateway. It mediates the authentication flow (Authorization Code Grant) with Okta, stores the issued tokens, and validates incoming API requests locally without forwarding every request to Okta.

---

## Architecture

The following diagram illustrates the interaction between the Client, Apigee, and Okta during the OAuth 2.0 Authorization Code Flow and subsequent API calls.
![oidc architecture](./images/okta-oidc-01.png)


### Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Client as Client (oauth.tools)
    participant Apigee as Apigee API Gateway
    participant Okta as Okta IdP

    Note over User, Okta: Phase 1: Authorization Code Flow
    Client->>Apigee: Redirects to /authorize<br/>(Client ID, Scope, Redirect URI, State)
    Apigee->>Client: Redirects to Okta /authorize<br/>(Okta Client ID, Scope, Redirect URI)
    User->>Okta: Authenticate & Consent
    Okta->>Client: Redirect to Client with Okta Auth Code

    Note over User, Okta: Phase 2: Token Exchange Flow
    Client->>Apigee: Request to Apigee for Tokens with Auth Code
    Apigee->>Okta: Exchange Auth Code for ID/Access Tokens 
    Okta-->>Apigee: Return Okta ID/Access Tokens
    Apigee->>Apigee: Save Okta Access Token as Apigee Token
    Apigee-->>Client: Return Apigee Access Token (Opaque)

    Note over User, Okta: Phase 3: API Verification Flow
    Client->>Apigee: GET /protected (Authorization: Bearer <token>)
    Apigee->>Apigee: Verify Access Token (VerifyAccessToken Policy)
    Apigee->>Backend: Forward request to Backend
    Backend-->>Apigee: Return Backend Response
    Apigee-->>Client: Return Response
```

### Key Highlights
1. **Opaque Tokens**: The client application only receives an opaque access token minted by Apigee. The backend Okta tokens (Access/ID Token) are stored securely as custom attributes within Apigee.
2. **Local Token Verification**: Subsequent API calls are validated inside Apigee via the `VerifyAccessToken` policy, ensuring minimal latency and high performance.
3. **Decoupled Client Management**: The API client registers and authenticates against Apigee, while user identity remains centralized in Okta.

---

## Okta Setup

Follow these steps to configure your Okta Developer Account to work with Apigee.

### 1. Register a Web Application in Okta
1. Sign in to your [Okta Developer Console](https://developer.okta.com/).
2. In the left-hand navigation menu, go to **Applications** > **Applications**.
3. Click **Create App Integration**.
4. Select **OIDC - OpenID Connect** as the Sign-in method, and **Web Application** as the Application type. Click **Next**.
![okta create app integration](./images/okta-oidc-02.png)
5. Configure the application:
   - **App integration name**: `Apigee App`
   - **Grant type**: Authorization Code
   - **Sign-in redirect URIs**: 
     ```text
     https://oauth.tools/callback/code
     ```
![okta redirect uri](./images/okta-oidc-03.png)   
   - **Controlled access**: Select **Allow everyone in your organization to access** (or configure groups accordingly).
![okta controlled access](./images/okta-oidc-04.png)
6. Click **Save**.

> [!IMPORTANT]
> **Configure Okta Access Policy (Sign-on Policy)**
> If the users testing the integration encounter the error:
> `idx error code: no matching policy - You are not allowed to access this app. To request access, contact an admin.`
> It means they do not match any rules in the application's Access Policy. 
> To resolve or prevent this, configure the Access Policy under the **Sign On** tab of the application in the Okta Admin Console:
> 1. Go to **Applications** > **Applications** and select your application.
> 2. Click the **Sign On** tab.
> 3. Under **User Access**, verify the assigned **Access Policy** and its rules.
> 4. Ensure there is a rule that matches your test user or group and permits access. For detailed steps, see the [Okta Support Article](https://support.okta.com/help/s/article/error-idx-error-code-no-matching-policy-you-are-not-allowed-to-access-this-app-to-request-access-contact-an-admin?language=en_US).


### 2. Capture Client Credentials & Okta Domain
On the Okta App configuration page, copy and save the following credentials:
- **Client ID**
- **Client Secret**
- **Okta Domain** (e.g., `integrator-XXXXXX.okta.com`)
![okta credentials](./images/okta-oidc-05.png)

### 3. Create a Test User in Okta
1. Navigate to **Directory** > **People**.
2. Click **Add Person**.
3. Fill out the user details (a real email address is not required if the password is set by the admin).
4. Set the password option to **Set by Admin** and configure a password.
5. Click **Save**.

### 4. Assign the Application to the Test User
If you did not select "Allow everyone in your organization to access" during the application setup (or if your Okta organization requires manual assignment):
1. Navigate to **Applications** > **Applications**.
2. Click on the application you created (`Apigee App`).
3. Select the **Assignments** tab.
4. Click the **Assign** dropdown and choose **Assign to People**.
5. Find your test user, click **Assign**, and click **Save and Go Back**.
6. Click **Done**.

---

## oidc proxy Setup

### 1. Configure Okta Domain
Before deploying the proxy, you must check the Discovery document:
1. Open `https://YOUR_OKTA_DOMAIN/oauth2/default/.well-known/openid-configuration` in your browser to check the configuration details.
![okta discovery document](./images/okta-oidc-061.png)
2. Open the okta.properties file located at `./apiproxy/resources/properties/okta.properties`.
3. Replace `okta_domain`, `okta_authorize_uri`, and `okta_token_uri` with the values verified from the Discovery document:
   ```properties
   okta_domain=integrator-XXXXXX.okta.com
   okta_authorize_uri=/oauth2/default/v1/authorize
   okta_token_uri=/oauth2/default/v1/token
   ```
![okta domain](./images/okta-oidc-062.png)

### 2. Deploy the Proxy & Configure Entities
Configure your Apigee environment variables and run the deployment script to deploy the API proxy, and automatically set up the API product and developer app.

1. Open [env.sh](./env.sh) and configure your Apigee Organization and Environment:
   ```bash
   export APIGEE_ORG="your-apigee-org"
   export APIGEE_ENV="your-apigee-env"
   ```
   Then, run the following command to apply the changes:
   ```bash
   source ./env.sh
   ```

2. Run the deployment script:
   ```bash
   ./deploy-oidc-okta.sh
   ```

3. Note down the **Client ID** (Consumer Key) and **Client Secret** (Consumer Secret) returned at the end of the script:
   ```text
   ============================================================
   Deployment and Setup Completed!
   API Proxy: oidc-okta
   Developer App: oidc-okta-app
   Client ID (Consumer Key): XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   Client Secret (Consumer Secret): XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ============================================================
   ```

4. Configure the Okta Client ID and Client Secret in the Apigee Key Value Map (KVM) using the `/kvm` endpoint. The `apikey` header value must be the **Apigee Client ID** (Consumer Key) obtained in Step 3.

   **Update Okta Client ID in KVM:**
   ```bash
   curl --location 'https://{YOUR_APIGEE_HOSTNAME}/v1/oidc/kvm' \
   --header 'apikey: {YOUR_APIGEE_CLIENT_ID}' \
   --header 'Content-Type: application/json' \
   --data '{
     "kvm-key":"okta.app.id",
     "kvm-val":"YOUR_OKTA_CLIENT_ID"
   }'
   ```

   **Update Okta Client Secret in KVM:**
   ```bash
   curl --location 'https://{YOUR_APIGEE_HOSTNAME}/v1/oidc/kvm' \
   --header 'apikey: {YOUR_APIGEE_CLIENT_ID}' \
   --header 'Content-Type: application/json' \
   --data '{
     "kvm-key":"okta.app.secret",
     "kvm-val":"YOUR_OKTA_CLIENT_SECRET"
   }'
   ```

---

## Test

To verify the integration, use **oauth.tools**.

### 1. Configure the oauth.tools Workspace
1. Open [oauth.tools](https://oauth.tools/).
2. In the Workspace settings, configure the following:
   - **Endpoints** tab:
     - **Authorization Endpoint**: `https://{your-apigee-hostname}/v1/oidc/oauth20/auth`
     - **Token Endpoint**: `https://{your-apigee-hostname}/v1/oidc/oauth20/token`
   - **Clients** tab:
     - Add a client using the **Client ID** and **Client Secret** of your Apigee App (Consumer Key and Consumer Secret).
   - **Scopes/Claims** tab:
     - Add the scopes: `openid profile email`.
![oauth tools workspace](./images/okta-oidc-07.png)

### 2. Confirm Okta Application Redirect URI
1. Go back to your **Okta Admin Console** and select your application (`Apigee App`).
2. In the **General Settings**, click **Edit**.
3. Under **Sign-in redirect URIs**, confirm:
   ```text
   https://oauth.tools/callback/code
   ```
4. Click **Save**.
![oauth tools redirect uri](./images/okta-oidc-08.png)

### 3. Run the Flow
1. On oauth.tools, click **Start Flow** and select **Code Flow**.
![oauth tools code flow](./images/okta-oidc-09.png)

2. Select the client, scopes, and endpoints you registered in Step 1.
![oauth tools client, scopes, and endpoints](./images/okta-oidc-10.png)

3. Review the request details and click **Run**.
![oauth tools run](./images/okta-oidc-11.png)

4. The Okta login screen will pop up in a new window. Log in using the test user credentials created in Okta.

5. Upon successful login, the **authorization code** will be returned.
![oauth tools authorization code](./images/okta-oidc-12.png)

6. Select `client_secret_post` as the authentication method.
7. Click **Redeem Code** and verify that the access token (opaque token generated by Apigee) is successfully returned.
![oauth tools access token](./images/okta-oidc-13.png)

### 4. Access Protected API
To verify the token, send a request to the protected endpoint using the retrieved access token:
```bash
curl -H "Authorization: Bearer {YOUR_ACCESS_TOKEN}" https://{your-apigee-hostname}/v1/oidc/oauth20/protected
```
Verify that the request returns `200 OK` along with the expected payload.

---

## Clean Up / Undeploy

Once testing is complete, you can remove all created Apigee resources (Developer App, Developer, API Product, and API Proxy) by running the cleanup script:

```bash
./undeploy-all.sh
```

