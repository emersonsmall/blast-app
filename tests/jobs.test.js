const { getApiClient, registerAndLoginUser, cleanupUser, EMAIL } = require('./helpers');

describe('Jobs API (/api/v1/jobs)', () => {
    let userApi;
    let user;
    let createdJobId;

    beforeAll(async () => {
        user = await registerAndLoginUser({
            username: `job_test_user_${Date.now()}`,
            password: 'Password123!',
            email: EMAIL,
        });
        userApi = getApiClient(user.token);
    });

    afterAll(async () => {
        await cleanupUser(user.username);
    });

    it('should create a new job and return status 202 (Accepted)', async () => {
        const response = await userApi.post('/jobs', {
            queryTaxon: 'yeast',
            targetTaxon: 'escherichia coli'
        });
        expect(response.status).toBe(202);
        expect(response.data.message).toContain('Job accepted');
    });

    it('should list the jobs for the authenticated user', async () => {
        // Allow a moment for the job to be inserted into the DB
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const response = await userApi.get('/jobs');
        expect(response.status).toBe(200);
        expect(response.data.records.length).toBeGreaterThan(0);
        
        const job = response.data.records[0];
        expect(job.userId).toBe(user.sub);
        createdJobId = job.id; // Save for the next test
    });

    it('should get a specific job by ID', async () => {
        const response = await userApi.get(`/jobs/${createdJobId}`);
        expect(response.status).toBe(200);
        expect(response.data.id).toBe(createdJobId);
    });
    
    it('should retrieve a completed job result', async () => {
        // This test has a long timeout set in package.json
        console.log(`Waiting for job ${createdJobId} to complete...`);
        
        let jobStatus = '';
        while(jobStatus !== 'completed') {
            const res = await userApi.get(`/jobs/${createdJobId}`);
            jobStatus = res.data.status;
            if (jobStatus === 'failed') {
                throw new Error('Job failed to complete.');
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
        }

        const resultResponse = await userApi.get(`/jobs/${createdJobId}/result`);
        expect(resultResponse.status).toBe(200);
        expect(resultResponse.data.eValue).toBeDefined();
    }, 120000); // Override default timeout for this specific test
});