import { useState, useEffect, Fragment } from "react";
import Head from "next/head";
import FileSaver from "file-saver";
import {
  ArrowPathIcon,
  ArrowUpRightIcon,
  PlusIcon,
} from "@heroicons/react/20/solid";
import useSound from "use-sound";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import "xp.css/dist/XP.css";

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
  {
    prompt: "flamingo painting",
    image:
      "https://replicate.delivery/pbxt/K2M3OVwEpSLxNdZDmEe8K5fIGN25TOUTQA7JnGb5n4fcsY2gA/out-0.jpg",
  },
  {
    prompt:
      "Ancient carvings trim sheet texture, trending on artstation, sandstone, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/147f2329-db56-4a6a-a950-7a358f731fb7/out-0.png",
  },
  {
    prompt:
      "Wall made from chocolate bars seamless texture, trending on artstation, tasty, base color, albedo, 4k",
    image:
      "https://replicate.delivery/mgxm/9c645c58-82e8-4d88-bb7d-972472978698/out-0.png",
  },
];

const IMAGE_SIZE = 256;

export default function Home() {
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [prompt, setPrompt] = useState(null);
  const [cols, setCols] = useState(null);
  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(null);
  const [wallpaper, setWallpaper] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false); // creator modal
  const [aboutOpen, setAboutOpen] = useState(false); // about modal
  const [saveOpen, setSaveOpen] = useState(false); // save modal
  const [status, setStatus] = useState(null);
  const [placeholder, setPlaceholder] = useState(
    examples[Math.floor(Math.random() * examples.length)].prompt
  );

  //   sounds
  const [play] = useSound("/complete.wav", { volume: 0.25 });

  useEffect(() => {
    // On page load, set the grid cols/rows based on the window size
    var cols = Math.min(Math.ceil(window.innerWidth / IMAGE_SIZE), 12);
    var rows = Math.min(Math.ceil(window.innerHeight / IMAGE_SIZE), 12) + 1;
    const example = examples[Math.floor(Math.random() * examples.length)];
    setWallpaper(example.image);
    setPlaceholder(example.prompt);
    setPrompt(example.prompt);
    resize(cols, rows);

    // Wait for the grid to render, then open the creator modal
    setTimeout(() => {
      setOpen(true);
    }, rows * cols * 100);
  }, []);

  const resize = (cols, rows) => {
    setTotal(cols * rows);
    setCols(cols);
    setRows(rows);
  };

  const parseLogs = (logs) => {
    if (!logs) {
      return 0;
    } else {
      const lastLine = logs.split("\n").slice(-1)[0];
      const pct = lastLine.split("it")[0];
      return pct * 2;
    }
  };

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
      console.log(prediction.logs);
      setStatus(parseLogs(prediction.logs));
      setPrediction(prediction);

      if (prediction.status === "succeeded") {
        resetWallpaper(prediction.output);
        setLoading(false);
        play();
      }
    }
  };

  const resetWallpaper = (image) => {
    setOpen(false);
    setStatus(null);

    // in order to redo the dropdown effect, we need to remove the animation class
    // and then add it back
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

  const stitchImages = async (imageUrl, screenWidth, screenHeight) => {
    /**
     * Given a url for an image (which comes from replicate),
     * stitch it into a canvas and return the canvas so we can download it.
     *
     * Surprisingly complicated I know, but seems like it's necessary to download a grid of images.
     */
    const image = await fetch(imageUrl);
    const imageBlob = await image.blob();
    const imageURL = URL.createObjectURL(imageBlob);

    var myCanvas = document.getElementById("canvas");
    var ctx = myCanvas.getContext("2d");

    ctx.canvas.width = screenWidth;
    ctx.canvas.height = screenHeight;

    var img = new Image();
    img.src = imageURL;

    var x = 0;
    var y = 0;

    img.addEventListener("load", (e) => {
      while (y < screenHeight) {
        while (x < screenWidth) {
          ctx.drawImage(img, x, y);
          x += 512;
        }
        x = 0;
        y += 512;
      }
    });

    ctx.fillStyle = "green";
    ctx.fillRect(100, 100, 100, 100);

    return myCanvas.toDataURL("image/png");
  };

  const download = async (image, width, height) => {
    stitchImages(image, width, height);

    // I couldn't figure out the async/await version of this
    // so I just used a setTimeout to wait for the canvas to be drawn
    setTimeout(() => {
      var myCanvas = document.getElementById("canvas");
      const dataUrl = myCanvas.toDataURL("image/png");
      FileSaver.saveAs(dataUrl, "wallpaper.png");
    }, 100);
  };

  return (
    <>
      <div className="relative min-h-screen bg-blue-900">
        <Head>
          <title>Wallpaper Creator</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
          ></meta>
        </Head>
        <div class="title-bar">
          <div class="title-bar-text">
            Wallpaper Creator •{" "}
            <a
              href="https://replicate.com"
              className="text-yellow-300 italic hover:text-white"
            >
              Built on Replicate™
            </a>
          </div>

          <div className="title-bar-controls">
            <a
              href="https://github.com/replicate/wallpaper"
              className="hidden sm:inline-flex text-blue-100 hover:text-white mr-3"
            >
              Code <ArrowUpRightIcon className="inline-flex h-3 w-3" />
            </a>
            <button
              onClick={() => (window.location.href = "https://replicate.com")}
              aria-label="Close"
              className=""
            ></button>
          </div>
        </div>

        {/* App Icons */}
        <div className="absolute z-10 top-16 sm:left-16 left-6">
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-8">
            <button
              className="bg-transparent bg-none border-none p-2  group"
              onClick={() => setOpen(true)}
            >
              <span className="text-6xl sm:text-8xl">🖼️</span>

              <p className="font-bold text-lg text-white bg-opacity-75 bg-gray-900 mt-2 group-hover:text-gray-900 group-hover:bg-white px-2">
                New Wallpaper
              </p>
            </button>
            <button
              className="bg-transparent bg-none border-none p-2 group"
              onClick={() => setSaveOpen(true)}
            >
              <span className="text-6xl sm:text-8xl">💾</span>

              <p className="font-bold text-lg text-white bg-opacity-75 bg-gray-900 mt-2 group-hover:text-gray-900 group-hover:bg-white px-2">
                Save
              </p>
            </button>
            <button
              className="bg-transparent bg-none border-none p-2 group"
              onClick={() => setAboutOpen(true)}
            >
              <span className="text-6xl sm:text-8xl">❔</span>

              <p className="font-bold text-lg text-white bg-opacity-75 bg-gray-900 mt-2 group-hover:text-gray-900 group-hover:bg-white px-2">
                About
              </p>
            </button>
          </div>
        </div>

        {/* Prompt in bottom right */}
        {!open && (
          <div className="fixed bottom-4 right-4 z-30">
            <button
              onClick={() => setOpen(true)}
              className="bg-none text-left text-white opacity-75 bg-black max-w-xs p-2 font-extrabold italic"
            >
              {prompt}
            </button>
          </div>
        )}

        {/* repeating tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {Array(total)
            .fill(1)
            .map((_value, index) => (
              <img
                key={`tile-${index}`}
                id={index}
                className="tile animate-drop"
                style={{ animationDelay: `${index * 0.1}s` }}
                src={wallpaper}
                alt=""
              />
            ))}
        </div>
        <div className="fixed hidden top-0 left-0">
          <canvas id="canvas" className="fixed top-0 left-0"></canvas>
        </div>
        <Form
          open={open}
          setOpen={setOpen}
          prompt={prompt}
          setPrompt={setPrompt}
          handleSubmit={handleSubmit}
          loading={loading}
          download={download}
          wallpaper={wallpaper}
          status={status}
          placeholder={placeholder}
        />

        <About open={aboutOpen} setOpen={setAboutOpen} />
        <Save
          open={saveOpen}
          setOpen={setSaveOpen}
          wallpaper={wallpaper}
          download={download}
        />

        {error && <div>{error}</div>}
        {prediction && <p>status: {prediction.status}</p>}
      </div>
    </>
  );
}

export function Form({
  open,
  setOpen,
  handleSubmit,
  loading,
  status,
  prompt,
  setPrompt,
  placeholder,
}) {
  const handleInspire = () => {
    const newWallpaper = examples[Math.floor(Math.random() * examples.length)];
    typeWriter("", newWallpaper.prompt);
  };

  const typeWriter = (currentPrompt, newPrompt) => {
    var i = 0;

    var interval = setInterval(() => {
      if (i < newPrompt.length) {
        setPrompt((currentPrompt += newPrompt.charAt(i)));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 10);
  };

  return (
    <Transition.Root show={open} as={Fragment} appear>
      <Dialog
        autoFocus={false}
        as="div"
        className="relative z-50"
        onClose={setOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20 mt-32">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="window mx-auto max-w-xl transform overflow-hidden shadow-2xl transition-all">
              <div className="title-bar">
                <div className="title-bar-text">Wallpaper Creator</div>
                <div className="title-bar-controls">
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className=""
                  ></button>
                </div>
              </div>
              <div className="window-body">
                <form onSubmit={handleSubmit} class="">
                  <fieldset>
                    <Combobox>
                      <div className="mt-4">
                        <p>
                          Welcome! This app uses{" "}
                          <a href="https://replicate.com/tommoore515/material_stable_diffusion">
                            material stable diffusion
                          </a>{" "}
                          to create tileable images from a description. Try it
                          out by describing your next wallpaper:
                        </p>

                        <hr className="mt-2" />

                        <textarea
                          required={true}
                          name="prompt"
                          autoFocus
                          id="prompt"
                          rows="3"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder={placeholder}
                          style={{ resize: "none" }}
                          className="bg-gray-100 rounded-b-md px-2 text-black font-sans py-2 w-full border border-gray-300 border-t-2"
                        />
                      </div>
                    </Combobox>

                    <div className="mt-4 pt-4">
                      {loading ? (
                        <div>
                          {status ? (
                            <progress
                              className="w-full"
                              max="100"
                              value={status}
                            ></progress>
                          ) : (
                            // Does a nice booting up animation if no value is given
                            <progress className="w-full" max="100"></progress>
                          )}

                          {status ? (
                            <div>
                              {status}%
                              <span className="animate-pulse">
                                {" "}
                                Creating your wallpaper...
                              </span>
                            </div>
                          ) : (
                            <span className="animate-pulse">Booting up...</span>
                          )}
                        </div>
                      ) : (
                        <div class="flex justify-between">
                          <button
                            type="button"
                            onClick={() => setPrompt("")}
                            className="inline-flex mr-3 py-1 items-center"
                          >
                            Clear text
                          </button>

                          <div>
                            <button
                              type="button"
                              onClick={() => handleInspire()}
                              className="inline-flex mr-3 py-1 items-center"
                            >
                              <ArrowPathIcon className="h-5 w-5 mr-3" />
                              Example
                            </button>
                            <button
                              type="submit"
                              className="inline-flex items-center py-1 bg-green-500 text-white"
                            >
                              <PlusIcon className="h-5 w-5 mr-3" />
                              Create{" "}
                              <span className="hidden pl-0.5 sm:inline-block">
                                {" "}
                                new wallpaper
                              </span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </fieldset>
                </form>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export function About({ open, setOpen }) {
  return (
    <Transition.Root show={open} as={Fragment} appear>
      <Dialog
        autoFocus={false}
        as="div"
        className="relative z-10"
        onClose={setOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20 mt-32">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="window mx-auto max-w-xl transform overflow-hidden shadow-2xl transition-all">
              <div className="title-bar">
                <div className="title-bar-text">About this project</div>
                <div className="title-bar-controls">
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className=""
                  ></button>
                </div>
              </div>
              <div className="window-body">
                <fieldset class="space-y-3">
                  <p>
                    Wallpaper Creator is an{" "}
                    <a href="https://github.com/replicate/wallpaper">
                      open-source project
                    </a>{" "}
                    that provides an interface for creating tileable images.
                  </p>

                  <p>
                    It works by using{" "}
                    <a href="https://replicate.com/tommoore515/material_stable_diffusion">
                      material stable diffusion,
                    </a>{" "}
                    which was created by{" "}
                    <a href="https://twitter.com/tommoore515">Tom Moore.</a> The
                    model is hosted on{" "}
                    <a href="https://replicate.com">Replicate</a>, which exposes
                    a cloud API for running predictions.
                  </p>

                  <p>
                    This website is built with Next.js and hosted on Vercel, and
                    uses Replicate&apos;s API to run the material stable
                    diffusion model. The source code is publicly available on
                    GitHub. Pull requests welcome!
                  </p>

                  <p>
                    Also, thanks to Jordan Scales for creating the very fun{" "}
                    <a>98.css</a> UI framework.
                  </p>
                  <div className="mt-4 space-x-3 flex justify-between">
                    <a href="https://github.com/replicate/wallpaper">
                      <button className="text-black">See Code</button>
                    </a>

                    <a href="https://replicate.com">
                      <button className="text-black">Build on Replicate</button>
                    </a>
                  </div>
                </fieldset>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export function Save({ open, setOpen, wallpaper, download }) {
  return (
    <Transition.Root show={open} as={Fragment} appear>
      <Dialog
        autoFocus={false}
        as="div"
        className="relative z-10"
        onClose={setOpen}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20 mt-32">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="window mx-auto max-w-xl transform overflow-hidden shadow-2xl transition-all">
              <div className="title-bar">
                <div className="title-bar-text">Save your wallpaper</div>
                <div className="title-bar-controls">
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className=""
                  ></button>
                </div>
              </div>
              <div className="window-body">
                <fieldset class="space-y-3">
                  <p>Save your wallpaper for free! Just pick a resolution.</p>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-y-12 sm:gap-0 text-center">
                    <div>
                      <span className="text-6xl">⬇️</span>
                      <p className="mt-2">Current Device</p>
                      <div className="mt-2">
                        <button
                          onClick={() =>
                            download(
                              wallpaper,
                              window.screen.width * devicePixelRatio,
                              window.screen.height * devicePixelRatio
                            )
                          }
                        >
                          Download
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-6xl">🖥️</span>
                      <p className="mt-2">Desktop</p>
                      <div className="mt-2">
                        <button onClick={() => download(wallpaper, 3840, 2160)}>
                          Download
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-6xl">📱</span>
                      <p className="mt-2">Phone</p>
                      <div className="mt-2">
                        <button onClick={() => download(wallpaper, 1170, 2532)}>
                          Download
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-6xl">⌚</span>
                      <p className="mt-2">Watch</p>
                      <div className="mt-2">
                        <button onClick={() => download(wallpaper, 410, 502)}>
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
