const Cognito = require("@aws-sdk/client-cognito-identity-provider");

const config = require("../config");

const cognitoClient = new Cognito.CognitoIdentityProviderClient({ region: config.aws.region });

// Helper to format user data from Cognito
const formatCognitoUser = (cognitoUser) => {
    return {
        username: cognitoUser.Username,
        sub: cognitoUser.sub,
        email: cognitoUser.email,
        status: cognitoUser.UserStatus,
        createdAt: cognitoUser.UserCreateDate,
        lastModifiedAt: cognitoUser.UserLastModifiedDate,
        isAdmin: cognitoUser["cognito:groups"]?.includes("Admins") || false
    }
};

/**
 * @route GET /api/v1/users
 * @desc Retrieves all users
 * @access Private (admin only)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const params = {
            UserPoolId: config.aws.cognito.userPoolId,
            Limit: 60 // Adjust as needed, max is 60
        };

        const command = new Cognito.ListUsersCommand(params);
        const { Users } = await cognitoClient.send(command);

        const formattedUsers = Users.map(formatCognitoUser);

        res.status(200).json({ records: formattedUsers });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users." });
    }
};

/**
 * @route GET /api/v1/users/:id
 * @desc Retrieves a user by ID
 * @access Private (admin only or the user themselves)
 */
exports.getUserByUsername = async (req, res) => {
    try {
        const params = {
            UserPoolId: config.aws.cognito.userPoolId,
            Username: req.params.username
        };

        const command = new Cognito.AdminGetUserCommand(params);
        const cognitoUser = await cognitoClient.send(command);

        const formattedUser = {
            username: cognitoUser.Username,
            sub: cognitoUser.UserAttributes.find(attr => attr.Name === "sub")?.Value,
            email: cognitoUser.UserAttributes.find(attr => attr.Name === "email")?.Value,
            status: cognitoUser.UserStatus,
            createdAt: cognitoUser.UserCreateDate,
            lastModifiedAt: cognitoUser.UserLastModifiedDate,
            isAdmin: cognitoUser.UserAttributes.find(attr => attr.Name === "cognito:groups")?.Value?.includes("Admins") || false
        };

        res.status(200).json(formattedUser);
    } catch (err) {
        console.error("Error fetching user:", err);
        if (err.name === "UserNotFoundException") {
            return res.status(404).json({ error: "User not found." });
        }
        res.status(500).json({ error: "Failed to fetch user." });
    }
};

/**
 * @route DELETE /api/v1/users/:id
 * @desc Deletes a user
 * @access Private (admin only)
 */
exports.deleteUserByUsername = async (req, res) => {
    try {
        const params = {
            UserPoolId: config.aws.cognito.userPoolId,
            Username: req.params.username
        }
        const command = new Cognito.AdminDeleteUserCommand(params);
        await cognitoClient.send(command);
        res.status(204).send()
    } catch (err) {
        console.error("Error deleting user:", err);
        if (err.name === "UserNotFoundException") {
            return res.status(404).json({ error: "User not found." });
        }
        res.status(500).json({ error: "Failed to delete user." });
    }
};

/**
 * @route GET /api/v1/users/:id/genomes
 * @desc Get all unique genomes associated with a specific user
 * @access Private (Admin or the user themselves)
 */
exports.getAllGenomesForUser = async (req, res) => {
    try {
        const requestedUserId = parseInt(req.params.id);
        const authenticatedUser = req.user;

        // Allow access if the authenticated user is an admin or is requesting their own genomes
        if (!authenticatedUser.isAdmin && authenticatedUser.id !== requestedUserId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const { sortBy, sortOrder, page, limit } = req.query;
        const queryOptions = {
            pagination: { page, limit },
            sorting: { sortBy, sortOrder }
        };

        const result = await genomeModel.getUniqueGenomesByUserId(requestedUserId, queryOptions);
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching genomes:", err);
        res.status(500).json({ error: "Error fetching genomes" });
    }
};