const axios = require('axios');
const { BASE_URL, EMAIL, cleanupUser } = require('./helpers');

describe('Auth API (/api/v1/auth)', () => {
    const testUser = {
        username: `auth_test_user_${Date.now()}`,
        password: 'Password123!',
        email: EMAIL,
    };

    // Clean up the created user after all tests in this file run
    afterAll(async () => {
        await cleanupUser(testUser.username);
    });

    it('should register a new user', async () => {
        const response = await axios.post(`${BASE_URL}/auth/register`, testUser);
        expect(response.status).toBe(201);
        expect(response.data.message).toContain('User registered successfully');
    });

    it('should log in a confirmed user', async () => {
        // Note: This test assumes the user is auto-confirmed or manually confirmed.
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            username: testUser.username,
            password: testUser.password
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
        ).rejects.toThrow();
    });
});