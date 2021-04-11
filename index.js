const { createAppAuth } = require("@octokit/auth");
const { Octokit } = require("@octokit/core");
const { Webhooks } = require("@octokit/webhooks");
const fs = require('fs');
const crc32c = require('fast-crc32c');

const { KeyManagementServiceClient } = require('@google-cloud/kms');

const projectId = process.env.GCP_PROJECT;
const locationId = 'global';
const keyRingId = 'production';
const keyId = 'common';

const getGitHubAppCredentials = () => {
    const client = new KeyManagementServiceClient();
    const keyName = client.cryptoKeyPath(projectId, locationId, keyRingId, keyId);
    const ciphertext = fs.readFileSync('./github-app-credentials.json.encrypted');
    const ciphertextCrc32c = crc32c.calculate(ciphertext);

    async function decryptSymmetric() {
        const [decryptResponse] = await client.decrypt({
            name: keyName,
            ciphertext: ciphertext,
            ciphertextCrc32c: {
                value: ciphertextCrc32c,
            },
        });
        if (crc32c.calculate(decryptResponse.plaintext) !== Number(decryptResponse.plaintextCrc32c.value)) {
            throw new Error('Decrypt: response corrupted in-transit');
        }
        return decryptResponse.plaintext.toString('utf8');
    }
    return decryptSymmetric();
};

const handleGetRequest = (req, res) => {
    res.status(200).send('It is working!');
};

const handlePutRequest = (req, res) => {
    res.status(403).send('Forbidden!');
};

const handleOpenedIssue = async ({ id, name, payload }) => {
    console.log(name, "event received");

    const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: GITHUB_APP_CREDENTIALS
    });

    await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
        mediaType: {
            previews: ["symmetra"],
        },
        owner: 'senthilmurukang',
        repo: 'github-event-handler',
        issue_number: payload.issue.number,
        labels: ["bug"]
    });

    console.log(`Bug label added to issue: ${payload.issue.number}!`);
}

const handlePostRequest = async (req, res) => {
    const webhooks = new Webhooks({
        secret: WEBHOOK_SECRET
    });
    webhooks.on('issues.opened', handleOpenedIssue);
    webhooks
        .verifyAndReceive({
            id: req.headers["x-github-delivery"],
            name: req.headers["x-github-event"],
            payload: req.body,
            signature: req.headers["x-hub-signature"],
        });

    res.status(200).send('It is working!');
};

exports.issue = async (req, res) => {
    const {webhooksSecret: WEBHOOK_SECRET, ...GITHUB_APP_CREDENTIALS} = JSON.parse(getGitHubAppCredentials());
    switch (req.method) {
        case 'GET':
            handleGetRequest(req, res);
            break;
        case 'PUT':
            handlePutRequest(req, res);
            break;
        case 'POST':
            handlePostRequest(req, res);
            break;
        default:
            res.status(405).send({ error: 'Something blew up!' });
            break;
    }
};
