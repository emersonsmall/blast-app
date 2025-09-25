// A one-off script to set a permanent password for a user with a temporary one.

const { 
    CognitoIdentityProviderClient,
    AdminInitiateAuthCommand,
    AdminRespondToAuthChallengeCommand
} = require("@aws-sdk/client-cognito-identity-provider");

const { generateSecretHash } = require("../src/controllers/authController");
const config = require("../src/config");

const username = 'test-admin';
const temporaryPassword = 'Password123!';
const newPermanentPassword = 'Password1234!';


const cognitoClient = new CognitoIdentityProviderClient({ region: config.aws.region });

const setPassword = async () => {
    let session;

    try {
        console.log(`[1/3] Attempting initial login for '${username}' to get the session...`);

        const initAuthParams = {
            AuthFlow: "ADMIN_NO_SRP_AUTH",
            ClientId: config.aws.cognito.clientId,
            UserPoolId: config.aws.cognito.userPoolId,
            AuthParameters: {
                USERNAME: username,
                PASSWORD: temporaryPassword,
                SECRET_HASH: generateSecretHash(username)
            },
        };

        await cognitoClient.send(new AdminInitiateAuthCommand(initAuthParams));

    } catch (err) {
        if (err.name === 'NotAuthorizedException') {
            console.error("\n❌ ERROR: Incorrect temporary password or username.");
            return;
        } else if (err.name === 'PasswordResetRequiredException') {
            console.error("\n❌ ERROR: Password has already been reset. The user may already have a permanent password.");
            return;
        } else if (err.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            console.log("[2/3] ✅ Success! Received NEW_PASSWORD_REQUIRED challenge.");
            session = err.Session; // This is the session we need for the next step
        } else {
            console.error("\n❌ An unexpected error occurred:", err);
            return;
        }
    }
    
    if (!session) {
        console.error("Could not retrieve a session to set a new password. The user might already be confirmed with a permanent password.");
        return;
    }

    try {
        const respondToChallengeParams = {
            ChallengeName: 'NEW_PASSWORD_REQUIRED',
            ClientId: config.aws.cognito.clientId,
            UserPoolId: config.aws.cognito.userPoolId,
            ChallengeResponses: {
                USERNAME: username,
                NEW_PASSWORD: newPermanentPassword,
                SECRET_HASH: generateSecretHash(username)
            },
            Session: session,
        };
        
        const response = await cognitoClient.send(new AdminRespondToAuthChallengeCommand(respondToChallengeParams));

        if (response.AuthenticationResult) {
            console.log(`[3/3] ✅ Success! Permanent password has been set for user '${username}'.`);
            console.log("\nYou can now run 'npm test'.");
        } else {
            console.log("Something went wrong, no authentication result returned.", response);
        }

    } catch (err) {
        console.error("\n❌ ERROR setting new password:", err);
    }
};

setPassword();