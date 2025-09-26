const { 
    getApiClient, 
    getAdminToken, 
    registerAndLoginUser, 
    cleanupUser, 
    generateTestUser,
    sleep
} = require('./helpers');

describe('Genomes API (/api/v1/genomes)', () => {
    let adminApi;
    let userApi;
    let testUser;

    beforeAll(async () => {
        // Set up an admin user to test admin-only functionality
        const adminToken = await getAdminToken();
        adminApi = getApiClient(adminToken);

        // Set up a regular user for testing standard access
        testUser = await registerAndLoginUser(generateTestUser());
        userApi = getApiClient(testUser.token);

        // Have the user create a job to ensure they have associated genomes
        await userApi.post('/jobs', {
            queryTaxon: 'saccharomyces cerevisiae',
            targetTaxon: 'escherichia coli'
        });

        // Wait for the job to be processed so genomes are in the DB
        console.log('Waiting for job to be processed to populate genomes...');
        await sleep(15000);
    });

    afterAll(async () => {
        // Clean up the user created for these tests
        await cleanupUser(testUser.username);
    });

    it('should allow a user to get their own genomes', async () => {
        const response = await userApi.get(`/genomes`);
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
        const response = await adminApi.get(`/genomes?userId=${testUser.sub}`);
        expect(response.status).toBe(200);
        expect(response.data.records.length).toBeGreaterThan(0);
    });
});