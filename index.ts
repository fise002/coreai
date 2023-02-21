import { fetch, CookieJar } from 'node-fetch-cookies';
import * as constants from './constants';

interface PredictionInput {
  guidance_scale: string;
  width: number;
  height: number;
  num_inference_steps: number;
  num_outputs: number;
  seed: null;
  prompt: string;
}

interface PredictionOutput {
  output: string[];
}

interface PredictionResponse {
  uuid: string;
}

export default async function coreai(
  prompt: string,
  inputs: Partial<PredictionInput> = {}
): Promise<string[]> {
  const cookieJar = new CookieJar();

  // Grab a CSRF token...
  await fetch(cookieJar, `https://replicate.com/${constants.MODEL_NAME}`);

  // Call the model API...
  const response = await fetch(
    cookieJar,
    `https://replicate.com/api/models/${constants.MODEL_NAME}/versions/${constants.MODEL_VERSION}/predictions`,
    {
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        'x-csrftoken': cookieJar.cookies.get('csrftoken'),
      },
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify({
        inputs: {
          guidance_scale: '7',
          width: 512,
          height: 512,
          num_inference_steps: 50,
          num_outputs: 1,
          seed: null,
          prompt,
          ...inputs,
        },
      }),
    }
  );

  // Wait for the image to be generated...
  const { uuid } = (await response.json()) as PredictionResponse;

  for (let i = 0; i < constants.TIMEOUT; i++) {
    const response1 = await fetch(
      cookieJar,
      `https://replicate.com/api/models/${constants.MODEL_NAME}/versions/${constants.MODEL_VERSION}/predictions/${uuid}`,
      {
        headers: {
          accept: '*/*',
        },
        method: 'GET',
        mode: 'cors',
        credentials: 'include',
        body: null,
      }
    );

    const { output } = (await response1.json()) as PredictionOutput;
    if (output && output.length) {
      return output;
    }

    await sleep(1000);
  }

  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}