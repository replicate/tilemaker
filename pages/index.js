import { useState, useEffect } from "react";
import Head from "next/head";
import FileSaver from "file-saver";

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
  const example = examples[Math.floor(Math.random() * examples.length)];
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [cols, setCols] = useState("");
  const [rows, setRows] = useState("");
  const [total, setTotal] = useState(0);
  const [wallpaper, setWallpaper] = useState(example.image);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    var cols = Math.min(Math.round(window.innerWidth / 256), 12);
    var rows = Math.min(Math.round(window.innerHeight / 256), 12) + 1;
    setTotal(cols * rows);
    setCols(`grid-cols-${cols}`);
    setRows(`grid-rows-${rows}`);
    console.log(cols, rows);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: e.target.prompt.value,
        width: "512",
        height: "512",
      }),
    });
    let prediction = await response.json();
    if (response.status !== 201) {
      setError(prediction.detail);
      return;
    }
    setPrediction(prediction);
    setLoading(true);

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

      if (prediction.status === "succeeded") {
        resetWallpaper(prediction.output);
        setLoading(false);
      }
    }
  };

  const resetWallpaper = (image) => {
    const tiles = document.getElementsByClassName("tile");
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].classList.remove("animate-drop");
    }

    setTimeout(() => {
      for (let i = 0; i < tiles.length; i++) {
        tiles[i].classList.add("animate-drop");
      }
      setWallpaper(image);
    }, 10);
  };

  const download = async (imageSrc) => {
    /**
     * It's surprisingly diffucult to download an image using JS (default behavior for a <a> download tag is to open a new
     * tab with the image. Took the below from this guide: https://dev.to/sbodi10/download-images-using-javascript-51a9
     */
    var image = await fetch(imageSrc);
    const imageBlob = await image.blob();
    const imageURL = URL.createObjectURL(imageBlob);
    const imageUrls = [imageURL, imageURL];

    var images = [];

    for (var i = 0; i < imageUrls.length; i++) {
      var myImage = new Image();
      myImage.src = imageUrls[i];
      images.push(myImage);
    }

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var x = 0;

    // set the width and height of the canvas to the combined width and height of all images
    canvas.width = 1024;
    canvas.height = 1024;

    // draw each image on the canvas
    for (var i = 0; i < images.length; i++) {
      ctx.drawImage(images[i], x, 0);
      x += images[i].width;
    }

    // convert the canvas to an image
    var image = new Image();
    image.src = canvas.toDataURL();

    FileSaver.saveAs(image.src, "my-wallpaper.png");

    // mergeImages([imageURL, imageURL]).then((b64) => {
    //   FileSaver.saveAs(context, "my-wallpaper.png");
    // });

    // const image = await fetch(imageSrc);
    // const imageBlog = await image.blob();
    // const imageURL = URL.createObjectURL(imageBlog);

    // const link = document.createElement("a");
    // link.href = imageURL;
    // link.download = "my-wallpaper.png";
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
  };

  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundImage: `url(${example.image})`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px",
      }}
    >
      <Head>
        <title>Wallpaper Creator</title>
      </Head>

      <canvas class="result"></canvas>

      <div className={`hidden grid ${rows} ${cols}`}>
        {Array(total)
          .fill(1)
          .map((_value, index) => (
            <>
              <img
                id={index}
                className="tile animate-drop"
                style={{ animationDelay: `${index * 0.1}s` }}
                src={wallpaper}
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
              name="prompt"
              id="name"
              className="block w-full rounded-lg bg-gray-50 focus:border-indigo-600 focus:ring-0 sm:text-sm"
              placeholder="Enter your wallpaper prompt"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            resetWallpaper(
              examples[Math.floor(Math.random() * examples.length)].image
            );
          }}
        >
          Set Wallpaper
        </button>

        <button
          type="button"
          onClick={() => {
            download(wallpaper);
          }}
        >
          Download
        </button>

        <div className="mt-4 text-center">
          {loading ? (
            <button
              type="submit"
              disabled
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-800 px-6 py-3 text-base font-medium text-indigo-300 shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div role="status">
                <svg
                  aria-hidden="true"
                  class="w-6 h-6 mr-3 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
                  viewBox="0 0 100 101"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                    fill="currentColor"
                  />
                  <path
                    d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                    fill="currentFill"
                  />
                </svg>
                <span class="sr-only">Loading...</span>
              </div>
              Creating your wallpaper...
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Create your wallpaper
            </button>
          )}
        </div>
      </form>

      {error && <div>{error}</div>}

      {prediction && <p>status: {prediction.status}</p>}
    </div>
  );
}
