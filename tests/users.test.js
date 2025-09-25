const { 
    getApiClient, 
    getAdminToken, 
    registerAndLoginUser, 
    cleanupUser,
    generateTestUser,
    sleep
} = require('./helpers');

describe('Users API (/api/v1/users)', () => {
    let adminApi;
    let testUser;

    beforeAll(async () => {
        const adminToken = await getAdminToken();
        adminApi = getApiClient(adminToken);
        
        testUser = await registerAndLoginUser(generateTestUser());
    });
    
    afterAll(async () => {
        await cleanupUser(testUser.username);
    });

    it('admin should be able to list all users', async () => {
        const response = await adminApi.get('/users');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data.records)).toBe(true);
        // Check if the newly created user is in the list
        expect(response.data.records.some(u => u.username === testUser.username)).toBe(true);
    });

    it('admin should be able to get a user by their ID (sub)', async () => {
        const response = await adminApi.get(`/users/${testUser.sub}`);
        expect(response.status).toBe(200);
        expect(response.data.username).toBe(testUser.username);
    });
    
    it('admin should be able to delete a user by their ID (sub)', async () => {
        const response = await adminApi.delete(`/users/${testUser.sub}`);
        expect(response.status).toBe(204);
        
        await sleep(2000);

        // Verify user is gone
        await expect(adminApi.get(`/users/${testUser.sub}`)).rejects.toThrow();
    });
});