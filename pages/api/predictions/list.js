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
      "a42692c54c0f407f803a0a8a9066160976baedb77c91171a01730f9b0d7beeff" // parse out to only include tile diffusion models
  );
  res.end(JSON.stringify(filtered));
}
