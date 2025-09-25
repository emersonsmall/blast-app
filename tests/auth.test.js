const axios = require('axios');
const { BASE_URL, TEST_PASSWORD, getApiClient, generateTestUser, cleanupUser, registerAndLoginUser } = require('./helpers');

describe('Auth API (/api/v1/auth)', () => {
    let testUser; 
    
    // One user for all tests
    beforeAll(async () => {
        testUser = await registerAndLoginUser(generateTestUser());
        console.log(`[AuthTest] Created and logged in test user: ${testUser}`);
    });
    
    afterAll(async () => {
        await cleanupUser(testUser.username);
    });

    it('should have created and logged in a user during setup', () => {
        // This test just verifies that the setup was successful.
        expect(testUser).toBeDefined();
        expect(testUser.token).toBeDefined();
        expect(testUser.sub).toBeDefined();
    });

    it('should allow a confirmed user to log in again', async () => {
        // Uses global axios instance because endpoint is unauthenticated
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            username: testUser.username,
            password: TEST_PASSWORD
        });
        expect(response.status).toBe(200);
        expect(response.data.authToken).toBeDefined();
    });

    it('should fail to log in with an incorrect password', async () => {
        await expect(
            axios.post(`${BASE_URL}/auth/login`, {
                username: testUser.username,
                password: 'WrongPassword!'
            })
        ).rejects.toThrow('Request failed with status code 500');
    });
});