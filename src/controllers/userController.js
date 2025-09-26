const Cognito = require("@aws-sdk/client-cognito-identity-provider");

const { config } = require("../config");

const cognitoClient = new Cognito.CognitoIdentityProviderClient({ region: config.aws.region });

// --- Helpers ---
const formatCognitoUser = (cognitoUser) => {
    const user = {
        username: cognitoUser.Username,
        status: cognitoUser.UserStatus,
        createdAt: cognitoUser.UserCreateDate,
        lastModifiedAt: cognitoUser.UserLastModifiedDate,
        id: null,
        email: null,
    };

    cognitoUser.Attributes.forEach(attr => {
        if (attr.Name === "sub") user.id = attr.Value;
        if (attr.Name === "email") user.email = attr.Value;
    });
    return user;
};

async function getUserBySub(sub) {
    const params = {
        UserPoolId: config.aws.cognito.userPoolId,
        Filter: `sub = "${sub}"`,
        Limit: 1
    };
    const command = new Cognito.ListUsersCommand(params);
    const { Users } = await cognitoClient.send(command);
    return (Users && Users.length) ? formatCognitoUser(Users[0]) : null;
};

/**
 * @route GET /api/v1/users
 * @desc Retrieves all users
 * @access Private (admin only)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const params = { UserPoolId: config.aws.cognito.userPoolId };
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
 * @desc Retrieves a user by their Cognito 'sub' ID
 * @access Private (admin only or the user themselves)
 */
exports.getUserById = async (req, res) => {
    try {
        const requestedUserId = req.params.id;
        const authenticatedUser = req.user;

        if (!authenticatedUser.isAdmin && authenticatedUser.id !== requestedUserId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        const user = await getUserBySub(requestedUserId);

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: "Failed to fetch user." });
    }
};

/**
 * @route DELETE /api/v1/users/:id
 * @desc Deletes a user
 * @access Private (admin only)
 */
exports.deleteUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await getUserBySub(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found." });
        }

        const params = {
            UserPoolId: config.aws.cognito.userPoolId,
            Username: user.username
        };
        const command = new Cognito.AdminDeleteUserCommand(params);
        await cognitoClient.send(command);

        res.status(204).send()
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ error: "Failed to delete user." });
    }
};
