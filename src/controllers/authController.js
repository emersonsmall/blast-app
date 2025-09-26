// External modules
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const crypto = require("crypto");

// Internal modules
const config = require("../config");


const cognitoClient = new Cognito.CognitoIdentityProviderClient({ region: config.aws.region });


const generateSecretHash = (username) => {
  return crypto.createHmac('sha256', config.aws.cognito.clientSecret)
        .update(username + config.aws.cognito.clientId)
        .digest('base64');
}

exports.register = async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ message: "Username, password, and email are required" });
  }

  try {
    const params = {
      ClientId: config.aws.cognito.clientId,
      SecretHash: generateSecretHash(username),
      Username: username,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email }
      ]
    };

    await cognitoClient.send(new Cognito.SignUpCommand(params));

    res.status(201).json(
      { message: "User registered successfully. Please check your email to confirm your account." }
    );
  } catch (err) {
    console.error("Error during user registration:", err);
    res.status(500).json({ 
      error: "Failed to register user", 
      details: err.message
    });
  }
};


exports.confirm = async (req, res) => {
  const { username, confirmationCode } = req.body;

  if (!username || !confirmationCode) {
    return res.status(400).json({ 
      message: "Username and confirmation code are required"
    });
  }

  try {
    const params = {
      ClientId: config.aws.cognito.clientId,
      SecretHash: generateSecretHash(username),
      Username: username,
      ConfirmationCode: confirmationCode
    };

    await cognitoClient.send(new Cognito.ConfirmSignUpCommand(params));

    res.status(200).json({ message: "User confirmed successfully." });
  } catch (err) {
    console.error("Error confirming user:", err);
    res.status(500).json({
      error: "Failed to confirm user",
      details: err.message
    });
  }
};


exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  try {
    const params = {
      AuthFlow: Cognito.AuthFlowType.USER_PASSWORD_AUTH,
      ClientId: config.aws.cognito.clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
        SECRET_HASH: generateSecretHash(username)
      }
    };

    let cognitoRes = await cognitoClient.send(new Cognito.InitiateAuthCommand(params));

    res.status(200).json({
      authToken: cognitoRes.AuthenticationResult.IdToken
    });

  } catch (err) {
    console.error("Error logging in user:", err);
    res.status(500).json({
      error: "Failed to login",
      details: err.message
    });
  }
};

exports.generateSecretHash = generateSecretHash;