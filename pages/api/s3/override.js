import { exec } from "child_process";
import { promisify } from "util";

const run = promisify(exec);

const ENDPOINT = "https://ji42dh0n04.execute-api.us-east-1.amazonaws.com/gamma";
const REGION = "us-east-1";
const INTEGRATION = "s3-integ-test";
const INTEGRATION_TYPE = "aws:s3:bucket";
const BUCKET_ARN = "arn:aws:s3:::0chzxy-unw031r";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { overrides } = req.body;
    // overrides: [{ Key: "BUCKET_NAME", KeyOverride: "MY_STORAGE_BUCKET" }, ...]
    const envVars = (overrides || []).map((o) =>
      o.KeyOverride ? `Key=${o.Key},KeyOverride=${o.KeyOverride}` : `Key=${o.Key}`
    ).join(" ");

    const cmd = [
      `aws omega update-integration-configuration`,
      `--integration-name ${INTEGRATION}`,
      `--integration-type ${INTEGRATION_TYPE}`,
      `--resource-configuration 's3={BucketArn=${BUCKET_ARN}}'`,
      envVars ? `--environment-variables ${envVars}` : `--environment-variables '[]'`,
      `--region ${REGION}`,
      `--endpoint-url ${ENDPOINT}`,
      `--output json`,
    ].join(" ");

    const { stdout } = await run(cmd);
    const result = JSON.parse(stdout);

    // Re-read the config to confirm
    const { stdout: readOut } = await run(
      `aws omega get-integration-configuration --integration-name ${INTEGRATION} --region ${REGION} --endpoint-url ${ENDPOINT} --output json`
    );
    const config = JSON.parse(readOut);

    res.json({ ok: true, environmentVariables: config.EnvironmentVariables });
  } catch (e) {
    res.status(500).json({ error: e.stderr || e.message });
  }
}
