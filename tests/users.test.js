const { getApiClient, getAdminToken, registerAndLoginUser, cleanupUser, EMAIL } = require('./helpers');

describe('Users API (/api/v1/users)', () => {
    let adminApi;
    let regularUser;

    beforeAll(async () => {
        const adminToken = await getAdminToken();
        adminApi = getApiClient(adminToken);
        
        regularUser = await registerAndLoginUser({
            username: `user_mgmnt_test_${Date.now()}`,
            password: 'Password123!',
            email: EMAIL,
        });
    });
    
    afterAll(async () => {
        await cleanupUser(regularUser.username);
    });

    it('admin should be able to list all users', async () => {
        const response = await adminApi.get('/users');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.data.records)).toBe(true);
        // Check if the newly created user is in the list
        expect(response.data.records.some(u => u.username === regularUser.username)).toBe(true);
    });

    it('admin should be able to get a user by their ID (sub)', async () => {
        const response = await adminApi.get(`/users/${regularUser.sub}`);
        expect(response.status).toBe(200);
        expect(response.data.username).toBe(regularUser.username);
    });
    
    it('admin should be able to delete a user by their ID (sub)', async () => {
        // Create a user specifically for deleting
        const userToDelete = await registerAndLoginUser({
            username: `user_to_delete_${Date.now()}`,
            password: 'Password123!',
            email: 'delete-me@example.com',
        });
        
        const response = await adminApi.delete(`/users/${userToDelete.sub}`);
        expect(response.status).toBe(204);

        // Verify the user is gone
        await expect(adminApi.get(`/users/${userToDelete.sub}`)).rejects.toThrow();
    });
});