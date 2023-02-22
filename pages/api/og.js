import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

// This endpoint take a query parameter `id` which is the ID of a prediction
// and returns an Open Graph image for that prediction
export default async function handler(req) {
  const { searchParams } = req.nextUrl;
  const predictionId = searchParams.get("id");
  let inputImageURL, outputImageURL;

  // extract protocol and host from the request url, so we can call the local API
  const url = new URL(req.url);
  const protocol = url.protocol;
  const host = url.host;

  if (predictionId) {
    const response = await fetch(
      `${protocol}//${host}/api/predictions/${predictionId}`
    );
    const prediction = await response.json();

    if (response.status === 200) {
      outputImageURL = prediction.output?.[prediction.output.length - 1];
    }
  }

  // Fallback to a default image
  if (!outputImageURL) {
    outputImageURL =
      "https://user-images.githubusercontent.com/14149230/220761866-8f11bb7c-030d-4e14-bfb6-2e114cad2663.png";
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          background: "#f6f6f6",
          width: "100%",
          height: "100%",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          backgroundImage: `url(${outputImageURL})`,
          backgroundRepeat: "repeat",
        }}
      ></div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
