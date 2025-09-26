const axios = require('axios');
const {
    CognitoIdentityProviderClient,
    AdminConfirmSignUpCommand,
    AdminInitiateAuthCommand,
    AdminDeleteUserCommand
} = require("@aws-sdk/client-cognito-identity-provider");
const { generateSecretHash } = require("../src/controllers/authController");
const config = require("../src/config");

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_PASSWORD = 'Password123!';
const ADMIN_CREDENTIALS = {
    username: "test-admin",
    password: "Password1234!",
};

const cognitoClient = new CognitoIdentityProviderClient({ region: config.aws.region });

const getApiClient = (token) => {
    return axios.create({
        baseURL: BASE_URL,
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

const getAdminToken = async () => {
    console.log(`[HELPER] getAdminToken(): Attempting to log in as admin '${ADMIN_CREDENTIALS.username}'...`);
    if (!ADMIN_CREDENTIALS.username || !ADMIN_CREDENTIALS.password) {
        throw new Error('CRITICAL: TEST_ADMIN_USER and TEST_ADMIN_PASSWORD must be set in your .env file.');
    }
    try {
        const params = {
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            ClientId: config.aws.cognito.clientId,
            UserPoolId: config.aws.cognito.userPoolId,
            AuthParameters: {
                USERNAME: ADMIN_CREDENTIALS.username,
                PASSWORD: ADMIN_CREDENTIALS.password,
                SECRET_HASH: generateSecretHash(ADMIN_CREDENTIALS.username)
            },
        };
        const command = new AdminInitiateAuthCommand(params);
        const response = await cognitoClient.send(command);
        const token = response.AuthenticationResult.IdToken;
        console.log("[HELPER] getAdminToken(): Successfully retrieved admin token.");
        return token;
    } catch (error) {
        console.error('CRITICAL: Could not log in as admin. Ensure the admin user exists, is confirmed, and credentials are correct.');
        console.error(error);
        throw error;
    }
};

const registerAndLoginUser = async (userData) => {
    console.log(`[HELPER] registerAndLoginUser(): Starting process for user '${userData.username}'...`);
    
    // 1. Register
    console.log(`[HELPER]  - Step 1: Registering user '${userData.username}'...`);
    await axios.post(`${BASE_URL}/auth/register`, userData);
    console.log(`[HELPER]  - Step 1: Registration successful.`);

    // 2. Confirm
    console.log(`[HELPER]  - Step 2: Confirming user '${userData.username}'...`);
    const confirmParams = {
        UserPoolId: config.aws.cognito.userPoolId,
        Username: userData.username,
    };
    await cognitoClient.send(new AdminConfirmSignUpCommand(confirmParams));
    console.log(`[HELPER]  - Step 2: User confirmed.`);
    
    // 3. Login
    console.log(`[HELPER]  - Step 3: Logging in as user '${userData.username}'...`);
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: userData.username,
        password: userData.password
    });
    const token = loginResponse.data.authToken;
    console.log(`[HELPER]  - Step 3: Login successful, token obtained.`);

    // 4. Get 'sub'
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const sub = payload.sub;
    console.log(`[HELPER]  - Step 4: User sub is '${sub}'.`);

    console.log(`[HELPER] registerAndLoginUser(): Process complete for '${userData.username}'.`);
    await sleep(2000); // Wait for eventual consistency
    return { token, sub, username: userData.username };
};

const cleanupUser = async (username) => {
    if (!username) return;
    try {
        const deleteParams = {
            UserPoolId: config.aws.cognito.userPoolId,
            Username: username,
        };
        await cognitoClient.send(new AdminDeleteUserCommand(deleteParams));
        console.log(`[HELPER] cleanupUser(): Successfully deleted user '${username}'.`);
    } catch (error) {
        if (error.name !== 'UserNotFoundException') {
            console.warn(`[HELPER] cleanupUser(): Failed to clean up user '${username}'.`);
        }
    }
};

const generateTestUser = () => {
    const timestamp = Date.now();
    return {
        username: `testuser_${timestamp}`,
        password: TEST_PASSWORD,
        email: `test_${timestamp}@example.com`
    };
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    BASE_URL,
    TEST_PASSWORD,
    getApiClient,
    getAdminToken,
    registerAndLoginUser,
    cleanupUser,
    generateTestUser,
    sleep
};