require('dotenv').config();
const axios = require('axios');
const { CognitoIdentityProviderClient, AdminConfirmSignUpCommand } = require("@aws-sdk/client-cognito-identity-provider");
const config = require("../src/config"); // Adjust path to your config file

const BASE_URL = 'http://localhost:3000/api/v1';

// --- IMPORTANT: SETUP FOR TESTING ---
// 1. Create a user in your Cognito User Pool (e.g., 'test-admin').
// 2. Add this user to a group named "Admins".
// 3. Make sure this user is CONFIRMED.
// 4. Set their credentials in a .env file at the root of your project.
//    TEST_ADMIN_USER=test-admin
//    TEST_ADMIN_PASSWORD=YourSecurePassword123!
// ------------------------------------
const ADMIN_CREDENTIALS = {
    username: "test-admin",
    password: "Password1234!",
};

// Create a Cognito client for admin actions within the test suite
const cognitoClient = new CognitoIdentityProviderClient({ region: config.aws.region });

const getApiClient = (token) => {
    return axios.create({
        baseURL: BASE_URL,
        headers: { 'Authorization': `Bearer ${token}` }
    });
};

const getAdminToken = async () => {
    if (!ADMIN_CREDENTIALS.username || !ADMIN_CREDENTIALS.password) {
        throw new Error('CRITICAL: TEST_ADMIN_USER and TEST_ADMIN_PASSWORD must be set in your .env file.');
    }
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
        return response.data.authToken;
    } catch (error) {
        console.error('CRITICAL: Could not log in as admin. Ensure the admin user exists, is confirmed, and credentials in .env are correct.');
        throw error;
    }
};

const registerAndLoginUser = async (userData) => {
    // 1. Register the new user via the API
    await axios.post(`${BASE_URL}/auth/register`, userData);

    // 2. Use the AWS SDK directly to confirm the user as an admin
    const confirmParams = {
        UserPoolId: config.cognito.userPoolId,
        Username: userData.username,
    };
    await cognitoClient.send(new AdminConfirmSignUpCommand(confirmParams));
    
    // 3. Now that the user is confirmed, log them in via the API
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        username: userData.username,
        password: userData.password
    });
    const token = loginResponse.data.authToken;

    // 4. Get 'sub' (the user's unique ID) from the token payload
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const sub = payload.sub;

    return { token, sub, username: userData.username };
};

const cleanupUser = async (username) => {
    if (!username) return;
    try {
        const adminToken = await getAdminToken();
        const adminApi = getApiClient(adminToken);
        
        const listResponse = await adminApi.get('/users');
        const userToDelete = listResponse.data.records.find(u => u.username === username);

        if (userToDelete && userToDelete.sub) {
            await adminApi.delete(`/users/${userToDelete.sub}`);
        }
    } catch (error) {
        // Suppress errors during cleanup, as the user might already be gone
        if (error.response?.status !== 404) {
            console.warn(`Warning: Failed to clean up user ${username}.`);
        }
    }
};

module.exports = {
    BASE_URL,
    getApiClient,
    getAdminToken,
    registerAndLoginUser,
    cleanupUser,
};