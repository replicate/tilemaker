import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  const output = await replicate.deployments.run(
    "replicate/material-diffusion",
    {
      input: {
        prompt: req.body.prompt,
      },
    }
  );

  console.log(output);

  if (output?.error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ detail: output.error }));
    return;
  }

  res.statusCode = 201;
  res.end(JSON.stringify(output));
}
