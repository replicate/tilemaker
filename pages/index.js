import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const examples = [
  {
    prompt:
      "Muddy ground with autumn leaves seamless texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/9b8f4ec9-eef0-437f-a27a-cbd233d22407/out-0.png",
  },
  {
    prompt:
      "Lunar surface seamless texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/8f75db20-72d9-4917-bc86-db4ca5d73c35/out-0.png",
  },
  {
    prompt:
      "Tree bark seamless photoscan texture, trending on artstation, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/7d3bc46c-612f-42cb-9347-317b2db1d3d6/out-0.png",
  },
];

export default function Home() {
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const example = examples[Math.floor(Math.random() * examples.length)];
  const [prompt, setPrompt] = useState(example.prompt);
  const [imageArray, setImageArray] = useState(Array(9).fill(false));

  //   const handleRender = (index) => {
  //     setTimeout(() => {
  //       imageArray[index] = true;
  //       setImageArray(imageArray);
  //     }, 3000);
  //   };

  //   useEffect(() => {
  //     imageArray.map((value, index) => {
  //       setTimeout(() => {
  //         handleRender(index);
  //       }, 1000);
  //     });

  //     console.log(imageArray);
  //   }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: e.target.prompt.value,
      }),
    });
    let prediction = await response.json();
    if (response.status !== 201) {
      setError(prediction.detail);
      return;
    }
    setPrediction(prediction);

    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await sleep(1000);
      const response = await fetch("/api/predictions/" + prediction.id);
      prediction = await response.json();
      if (response.status !== 200) {
        setError(prediction.detail);
        return;
      }
      console.log({ prediction });
      setPrediction(prediction);
    }
  };

  return (
    <div
      className="min-h-screen relative"
      //   style={{
      //     backgroundImage: `url(${example.image})`,
      //     backgroundRepeat: "repeat",
      //   }}
    >
      <Head>
        <title>Replicate + Next.js</title>
      </Head>

      <div className="grid grid-cols-3 grid-rows-3">
        {imageArray.map((value, index) => (
          <>
            <img
              id={index}
              className="animate-drop"
              style={{ animationDelay: `${index * 0.1}s` }}
              src={example.image}
              alt=""
            />
          </>
        ))}
      </div>

      <form className="max-w-sm mx-auto absolute top-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          ></label>
          <div className="mt-1 border-gray-300 focus-within:border-indigo-600">
            <input
              type="text"
              name="name"
              id="name"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="block w-full rounded-lg bg-gray-50 focus:border-indigo-600 focus:ring-0 sm:text-sm"
              placeholder="Enter your wallpaper prompt"
            />
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create your wallpaper
          </button>
        </div>
      </form>

      {error && <div>{error}</div>}

      {prediction && (
        <div>
          {prediction.output && (
            <div className={styles.imageWrapper}>
              <Image
                fill
                src={prediction.output[prediction.output.length - 1]}
                alt="output"
                sizes="100%"
              />
            </div>
          )}
          <p>status: {prediction.status}</p>
        </div>
      )}
    </div>
  );
}
