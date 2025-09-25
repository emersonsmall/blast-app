const { getApiClient, getAdminToken, registerAndLoginUser, cleanupUser, EMAIL } = require('./helpers');

describe('Genomes API (/api/v1/genomes)', () => {
    let adminApi;
    let userApi;
    let regularUser;

    beforeAll(async () => {
        // Set up an admin user to test admin-only functionality
        const adminToken = await getAdminToken();
        adminApi = getApiClient(adminToken);

        // Set up a regular user for testing standard access
        regularUser = await registerAndLoginUser({
            username: `genome_test_user_${Date.now()}`,
            password: 'Password123!',
            email: EMAIL,
        });
        userApi = getApiClient(regularUser.token);

        // Have the user create a job to ensure they have associated genomes
        await userApi.post('/jobs', {
            queryTaxon: 'saccharomyces cerevisiae',
            targetTaxon: 'escherichia coli'
        });

        // Wait for the job to be processed so genomes are in the DB
        console.log('Waiting for job to be processed to populate genomes...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15s
    });

    afterAll(async () => {
        // Clean up the user created for these tests
        await cleanupUser(regularUser.username);
    });

    it('should allow a user to get their own genomes using a userId filter', async () => {
        const response = await userApi.get(`/genomes?userId=${regularUser.sub}`);
        expect(response.status).toBe(200);
        expect(response.data.records.length).toBeGreaterThan(0);
        expect(response.data.records[0].organismName).toBeDefined();
    });

    it('should forbid a user from getting another user\'s genomes', async () => {
        // We'll use a placeholder ID; the endpoint should forbid it regardless
        const anotherUserId = 'some-other-user-id';
        await expect(
            userApi.get(`/genomes?userId=${anotherUserId}`)
        ).rejects.toThrow('Request failed with status code 403');
    });

    it('should allow an admin to get all genomes without a filter', async () => {
        const response = await adminApi.get('/genomes');
        expect(response.status).toBe(200);
        expect(response.data.records.length).toBeGreaterThan(0);
    });

    it('should allow an admin to get a specific user\'s genomes using a userId filter', async () => {
        const response = await adminApi.get(`/genomes?userId=${regularUser.sub}`);
        expect(response.status).toBe(200);
        expect(response.data.records.length).toBeGreaterThan(0);
    });
});