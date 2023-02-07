export default async function handler(req, res) {
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  console.log(response);
  if (response.status !== 200) {
    let error = await response.json();
    res.statusCode = 500;
    res.end(JSON.stringify({ detail: error.detail }));
    return;
  }

  let resp = await response.json();
  const filtered = resp.results.filter(
    (result) =>
      result.version ==
      "3b5c0242f8925a4ab6c79b4c51e9b4ce6374e9b07b5e8461d89e692fd0faa449" // parse out to only include tile diffusion models
  );
  res.end(JSON.stringify(filtered));
}
