const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// This object will hold tokens and IDs created during the tests
const state = {
    adminToken: null,
    userToken: null,
    adminId: 1, // from dbInit.js
    userId: 2,  // from dbInit.js
    newUser: {
        username: `testuser_${Date.now()}`,
        password: 'password123',
        id: null
    },
    job1Id: null,
    job2Id: null,
};

// --- Helper Functions ---
const log = (message) => console.log(`\n--- ${message} ---`);
const pass = (message) => console.log(`PASS: ${message}`);
const fail = (message, error) => {
    console.error(`FAIL: ${message}`);
    if (error) {
        console.error(error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
    }
    process.exit(1); // Exit on first failure
};

// Custom assertion function
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message);
    }
};

// Creates an axios instance with the correct auth token
const getApiClient = (token) => {
    return axios.create({
        baseURL: BASE_URL,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
};

// --- Test Runner ---
async function runTests() {
    try {
        await testAuthEndpoints();
        await testUserEndpoints();
        await testJobEndpoints();
        // Wait for jobs to process before testing genome and result endpoints
        log("Waiting 1 minute for BLAST jobs to complete...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        await testJobResultEndpoint();
        await testGenomeEndpoints();
        await testCleanup(); // Added a cleanup step

        console.log("\nAll tests passed successfully!");

    } catch (error) {
        fail("An unexpected error occurred during testing", error);
    }
}

// --- Test Suites ---

async function testAuthEndpoints() {
    log("Testing Auth Endpoints (/auth)");
    try {
        // Test admin login
        let response = await axios.post(`${BASE_URL}/auth/login`, { username: 'admin', password: 'admin' });
        assert(response.status === 200 && response.data.authToken, 'Admin login should succeed and return a token.');
        state.adminToken = response.data.authToken;
        pass('Admin can log in.');

        // Test user login
        response = await axios.post(`${BASE_URL}/auth/login`, { username: 'user1', password: 'user1' });
        assert(response.status === 200 && response.data.authToken, 'User login should succeed and return a token.');
        state.userToken = response.data.authToken;
        pass('Regular user can log in.');

        // Test failed login
        await axios.post(`${BASE_URL}/auth/login`, { username: 'admin', password: 'wrongpassword' }).catch(err => {
            assert(err.response.status === 401, 'Invalid credentials should return 401 Unauthorized.');
        });
        pass('Login with invalid credentials fails as expected.');

    } catch (error) {
        fail('Auth endpoint tests failed', error);
    }
}

async function testUserEndpoints() {
    log("Testing User Endpoints (/users)");
    const adminApi = getApiClient(state.adminToken);
    const userApi = getApiClient(state.userToken);

    try {
        // Create a new user (public)
        let response = await axios.post(`${BASE_URL}/users`, { ...state.newUser, is_admin: false });
        assert(response.status === 201 && response.data.id, 'Should create a new user.');
        state.newUser.id = response.data.id;
        pass('Can create a new user.');

        // Test GET all users (admin only route)
        response = await adminApi.get('/users?sortBy=username&sortOrder=asc&limit=1&isAdmin=false');
        assert(response.status === 200, 'Admin should get users.');
        assert(response.data.records.length === 1, 'Pagination (limit=1) should work.');
        assert(response.data.records[0].is_admin === 0, 'Filtering (isAdmin=false) should work.');
        pass('Admin can get all users with pagination, sorting, and filtering.');

        // Test user cannot get all users
        await userApi.get('/users').catch(err => {
             assert(err.response.status === 403, 'Regular user should get 403 Forbidden on admin-only route.');
        });
        pass('Regular user cannot get all users.');

        // Test user can get their own details
        response = await userApi.get(`/users/${state.userId}`);
        assert(response.status === 200 && response.data.id === state.userId, 'User should get their own details.');
        pass('User can get their own details.');

        // Test user cannot get another user's details
         await userApi.get(`/users/${state.adminId}`).catch(err => {
             assert(err.response.status === 403, 'User should get 403 for other user details.');
         });
        pass("User cannot get another user's details.");
        
        // Test admin can delete a user (admin only route)
        response = await adminApi.delete(`/users/${state.newUser.id}`);
        assert(response.status === 204, 'Admin should be able to delete a user.');
        pass('Admin can delete a user.');

    } catch (error) {
        fail('User endpoint tests failed', error);
    }
}

async function testJobEndpoints() {
    log("Testing Job Endpoints (/jobs)");
    const userApi = getApiClient(state.userToken);
    try {
        // Create two jobs
        await userApi.post('/jobs', { queryTaxon: 'yeast', targetTaxon: 'e coli' });
        pass('Can create job 1.');
        await userApi.post('/jobs', { queryTaxon: 'e coli', targetTaxon: 'yeast' });
        pass('Can create job 2.');
        
        // A small delay to give the server a moment to insert the records into the DB
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch the two most recent jobs to reliably get their IDs
        const jobsResponse = await userApi.get('/jobs?sortBy=createdAt&sortOrder=desc&limit=2');
        assert(jobsResponse.data.records.length >= 2, 'Should have fetched the two newly created jobs.');

        // The most recent job is job 2, the one before is job 1
        state.job2Id = jobsResponse.data.records[0].id;
        state.job1Id = jobsResponse.data.records[1].id;
        assert(state.job1Id !== state.job2Id, `Job IDs should be unique. Got ${state.job1Id} and ${state.job2Id}.`);
        
        // Test basic pagination
        const response = await userApi.get('/jobs?limit=1&page=1');
        assert(response.status === 200 && response.data.records.length === 1, 'Should get jobs with pagination.');
        pass('Can get jobs with pagination.');

    } catch (error) {
        fail('Job endpoint tests failed', error);
    }
}

async function testJobResultEndpoint() {
    log("Testing Job Result Endpoint (/jobs/:id/result)");
    const userApi = getApiClient(state.userToken);
    try {
        const response = await userApi.get(`/jobs/${state.job1Id}/result`);
        assert(response.status === 200, 'Should get job result for completed job.');
        assert(response.data.queryId && response.data.eValue !== undefined, 'Job result has expected data structure.');
        pass('Can get a result for a completed job.');
    } catch (error) {
        fail('Job result endpoint tests failed', error);
    }
}


async function testGenomeEndpoints() {
    log("Testing Genome Endpoints (/genomes and /users/:id/genomes)");
    const adminApi = getApiClient(state.adminToken);
    const userApi = getApiClient(state.userToken);
    try {
        // Admin gets all genomes with sorting and filtering
        let response = await adminApi.get('/genomes?sortBy=totalGeneCount&sortOrder=desc&limit=1');
        assert(response.status === 200 && response.data.records.length === 1, 'Admin should get genomes with sorting and filtering.');
        pass('Admin can get all genomes with query params.');
        
        // User cannot get all genomes (admin only route)
        await userApi.get('/genomes').catch(err => {
            assert(err.response.status === 403, 'User should get 403 Forbidden on admin-only route.');
        });
        pass('Regular user cannot get all genomes.');

        // User gets their own unique genomes with sorting
        response = await userApi.get(`/users/${state.userId}/genomes?sortBy=commonName&sortOrder=asc&limit=2`);
        assert(response.status === 200, "User should get their own unique genomes.");
        // We created two jobs with 4 unique taxons, so we expect at least 1 record.
        assert(response.data.records.length >= 1, "Should have genome records from the created jobs.");
        pass("User can get their unique genomes with sorting and pagination.");

    } catch (error) {
        fail('Genome endpoint tests failed', error);
    }
}

async function testCleanup() {
    log("Cleaning up created test data");
    const adminApi = getApiClient(state.adminToken);
    try {
        log(`Attempting to delete job IDs: ${state.job1Id} and ${state.job2Id}`);
        // Admin deletes the jobs created by user1
        await adminApi.delete(`/jobs/${state.job1Id}`);
        await adminApi.delete(`/jobs/${state.job2Id}`);
        pass("Admin cleaned up test jobs.");
    } catch (error) {
        fail("Cleanup failed", error);
    }
}


runTests();