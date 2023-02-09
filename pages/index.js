import { useState, useEffect, Fragment } from "react";
import Head from "next/head";
import FileSaver from "file-saver";
import {
  LightBulbIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowDownCircleIcon,
  Bars3Icon,
  LinkIcon,
  QuestionMarkCircleIcon,
  CodeBracketIcon,
} from "@heroicons/react/20/solid";
import useSound from "use-sound";
import { Dialog, Transition } from "@headlessui/react";
import { useRouter } from "next/router";
import toast, { Toaster } from "react-hot-toast";
import "react-tooltip/dist/react-tooltip.css";
import { Tooltip } from "react-tooltip";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const examples = [
  //   {
  //     prompt:
  //       "Lunar surface seamless texture, trending on artstation, base color, albedo, 4k",
  //     image:
  //       "https://replicate.delivery/mgxm/8f75db20-72d9-4917-bc86-db4ca5d73c35/out-0.png",
  //   },
  //   {
  //     prompt: "Flamingo painting",
  //     image:
  //       "https://replicate.delivery/pbxt/K2M3OVwEpSLxNdZDmEe8K5fIGN25TOUTQA7JnGb5n4fcsY2gA/out-0.jpg",
  //   },
  //   {
  //     prompt: "A painting with oranges and lemons",
  //     image:
  //       "https://replicate.delivery/pbxt/N08AVoJ7ji7kBp2CeNLtl96C7kmYMwA4EbAd1BpPodzEPAOIA/out-0.jpg",
  //   },
  {
    prompt: "Monet, lilies, bright, oil painting",
    image:
      "https://replicate.delivery/pbxt/1b4tM1hOSi7lGl9ks94Tdr9vFj8ON7uDe1eXRzQ51LUIiAcQA/out-0.jpg",
  },
  //   {
  //     prompt: "Clouds, Hokusai, etching",
  //     image:
  //       "https://replicate.delivery/pbxt/gQtBQDykYhrbGVr9FSEm03v9Ppmsf73EutwTPmYd1ePqbEcQA/out-0.png",
  //   },
  //   {
  //     prompt: "Flowers, Otsu-e style, traditional",
  //     image:
  //       "https://replicate.delivery/pbxt/eHE4fVdlnokqAEHYemffxq6edjFFTTxmBepzL2XQCLAsOQCOIA/out-0.png",
  //   },
];

const appName = "TileMaker";
const IMAGE_SIZE = 180;

export default function Home() {
  const router = useRouter();
  const { id } = router.query;
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
  const [blur, setBlur] = useState(false);
  const [sidebar, setSidebar] = useState(false);

  //   sounds
  const [play] = useSound("/complete.wav", { volume: 0.25 });

  useEffect(() => {
    // On page load, set the grid cols/rows based on the window size
    var cols = Math.min(Math.ceil(window.innerWidth / IMAGE_SIZE), 12);
    var rows = Math.min(Math.ceil(window.innerHeight / IMAGE_SIZE), 12) + 1;
    const example = examples[Math.floor(Math.random() * examples.length)];

    resize(cols, rows);

    if (id) {
      getPrediction(id);
    } else {
      if (router.isReady) {
        setWallpaper(example.image);
        setPlaceholder(example.prompt);
        setPrompt(example.prompt);
      }
    }
  }, [id]);

  const resize = (cols, rows) => {
    setTotal(cols * rows);
    setCols(cols);
    setRows(rows);
  };

  const parseLogs = (logs) => {
    if (!logs) {
      return 0;
    } else if (logs.includes("NSFW")) {
      toast("🤭 Uh oh, potential NSFW material detected! Try again?");
    } else {
      const lastLine = logs.split("\n").slice(-1)[0];
      const pct = lastLine.split("%")[0];
      return pct;
    }
  };

  const getPrediction = async (id) => {
    const response = await fetch(`/api/predictions/${id}`, { method: "GET" });
    let result = await response.json();
    setWallpaper(result.output[0]);
    setPrompt(result.input.prompt);
  };

  const copyToClipboard = (e) => {
    navigator.clipboard.writeText(window.location.toString());
    toast("Link to wallpaper copied");
  };

  const onKeyDown = (e) => {
    if (e.metaKey && e.which === 13) {
      handleSubmit(e, prompt);
    }
  };

  const handleSubmit = async (e, prompt) => {
    e.preventDefault();
    setLoading(true);
    setBlur(false);

    const response = await fetch("/api/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        width: "512",
        height: "512",
      }),
    });
    let prediction = await response.json();
    if (response.status !== 201) {
      setError(prediction.detail);
      return;
    }
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

      if (prediction.status === "succeeded") {
        resetWallpaper(prediction.output);
        setLoading(false);

        router.query.id = prediction.id;
        router.push(router);

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
      tiles[i].classList.remove("animate-fadein");
    }

    setTimeout(() => {
      for (let i = 0; i < tiles.length; i++) {
        tiles[i].classList.add("animate-fadein");
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

    return myCanvas.toDataURL("image/png");
  };

  const download = async (image, width, height) => {
    stitchImages(image, width, height);

    const idStr = id ? `(${id})` : "";
    // I couldn't figure out the async/await version of this
    // so I just used a setTimeout to wait for the canvas to be drawn
    setTimeout(() => {
      var myCanvas = document.getElementById("canvas");
      const dataUrl = myCanvas.toDataURL("image/png");
      FileSaver.saveAs(
        dataUrl,
        `tilemaker - ${prompt
          .replace(/[^a-zA-Z0-9]/g, "-")
          .slice(0, 100)} ${idStr}.png`
      );
    }, 100);
  };

  const handleInspire = () => {
    const newWallpaper = examples[Math.floor(Math.random() * examples.length)];
    typeWriter("", newWallpaper.prompt);

    resetWallpaper(newWallpaper.image);
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
    <>
      <div className="relative min-h-screen bg-black">
        <Head>
          <title>{appName}</title>

          <link
            rel="icon"
            href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖼️</text></svg>"
          />

          <meta
            property="og:description"
            content="Make your next wallpaper with tiled stable diffusion"
          />
          <meta property="og:image" content="/tile.png" />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
          ></meta>
        </Head>

        <Toaster />

        {/* Hamburger */}
        <div
          className={`${
            sidebar ? "hidden" : "absolute"
          } transition ease-in-and-out delay-150 z-10 top-4 left-4`}
        >
          <button
            type="button"
            onClick={() => setSidebar(true)}
            className="mr-2 animate-drop inline-flex items-center hover:border-white border-transparent rounded-md border-2 text-white px-2 sm:px-3 py-2 text-sm font-medium leading-4 shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-2 focus:border-white bg-dark"
          >
            <Bars3Icon className="h-4 w-4 mr-2" />
            {appName}
          </button>
        </div>

        {/* Download */}
        <div className="absolute top-4 right-4">
          <div
            className={`${
              sidebar ? "hidden" : "inline-block"
            }  animate-drop z-10 top-4 right-4`}
          >
            <button
              id="download-button"
              type="button"
              onClick={() => setSaveOpen(true)}
              className="mr-2 inline-flex items-center hover:border-white border-transparent rounded-md border-2 text-white px-2 sm:px-3 py-2 text-sm font-medium leading-4 shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-2 focus:border-white bg-dark"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
            <Tooltip
              anchorId="download-button"
              content="Download tile"
              place="top"
            />
          </div>

          {id && (
            <div
              className={`${
                sidebar ? "hidden" : "inline-block"
              } animate-drop z-10 top-4 right-16 sm:right-36`}
            >
              <button
                id="copy-button"
                type="button"
                onClick={() => copyToClipboard()}
                className="mr-2 inline-flex items-center hover:border-white border-transparent rounded-md border-2 text-white px-2 sm:px-3 py-2 text-sm font-medium leading-4 shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-2 focus:border-white bg-dark"
              >
                <LinkIcon className="h-4 w-4" />
              </button>
              <Tooltip
                anchorId="copy-button"
                content="Copy link to tile"
                place="top"
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <Sidebar
          open={sidebar}
          setOpen={setSidebar}
          aboutOpen={aboutOpen}
          setAboutOpen={setAboutOpen}
          setSaveOpen={setSaveOpen}
          copyToClipboard={copyToClipboard}
        />

        {/* Footer */}
        <div className="animate-rise fixed bottom-3 right-0 text-gray-300 bg-dark text-xs p-3 rounded-t-lg">
          <p>
            Powered by{" "}
            <a
              className="hover:underline text-white"
              href="https://replicate.com/tstramer/material-diffusion?utm_source=project&utm_campaign=tilemaker"
            >
              Material Diffusion
            </a>
            ,{" "}
            <a
              className="hover:underline text-white"
              href="https://replicate.com?utm_source=project&utm_campaign=tilemaker"
            >
              Replicate
            </a>
            ,{" "}
            <a
              className="hover:underline text-white"
              href="https://vercel.com?utm_source=project&utm_campaign=tilemaker"
            >
              Vercel
            </a>
            , and{" "}
            <a
              className="hover:underline text-white"
              href="https://github.com/replicate/tilemaker"
            >
              GitHub
            </a>{" "}
          </p>
        </div>

        {/* Repeating tiles */}
        <div
          className={`${
            blur && "blur-sm"
          } transition duration-500 ease-linear delay-50`}
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
                className={`tile animate-fadein ${
                  !blur &&
                  index != 0 &&
                  "hover:rounded-sm hover:shadow-xl transition ease-linear delay-100"
                }`}
                style={{ animationDelay: `${index * 0.03}s` }}
                src={wallpaper}
                alt=""
              />
            ))}
        </div>

        {/* Canvas */}
        <div className="fixed hidden top-0 left-0">
          <canvas id="canvas" className="fixed top-0 left-0"></canvas>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => handleSubmit(e, prompt)}
          onKeyDown={onKeyDown}
          class="absolute mx-5 top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <fieldset>
            <div className="mt-4 relative">
              {blur ? (
                <textarea
                  required={true}
                  onFocus={() => setBlur(true)}
                  onBlur={() => setBlur(false)}
                  name="prompt"
                  id="prompt"
                  rows="3"
                  cols="40"
                  autoFocus={true}
                  autoCorrect="false"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={placeholder}
                  style={{ resize: "none" }}
                  className="bg-dark focus:border-white focus:ring-white rounded-md text-white font-extrabold text-4xl max-w-md mx-auto"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setBlur(true);
                    setTimeout(() => {
                      document.getElementById("prompt").focus();
                    }, 50);
                  }}
                  className="text-left text-white text-4xl font-bold max-w-md mx-auto"
                >
                  <span className="inline-bg py-1 leading-loose font-extrabold">
                    {prompt}
                  </span>
                </button>
              )}
            </div>

            <div className="mt-2">
              {loading ? (
                <div className="py-2 bg-dark px-2 rounded-lg">
                  {status ? (
                    <div>
                      <div className="w-full rounded-full h-2">
                        <div
                          className="bg-gray-100 h-2 rounded-full"
                          style={{ width: `${status}%` }}
                        ></div>
                      </div>
                      <div className="text-gray-100">{status}%</div>
                    </div>
                  ) : (
                    <span className="animate-pulse text-white">
                      <div role="status" className="inline-flex">
                        <svg
                          aria-hidden="true"
                          class="inline w-4 h-4 mr-2 text-gray-200 animate-spin fill-blue-600"
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
                      Starting up...
                    </span>
                  )}
                </div>
              ) : (
                <div class="flex justify-end mt-5">
                  <div>
                    <button
                      id="inspire-button"
                      type="button"
                      onClick={() => handleInspire()}
                      className="mr-2 inline-flex bg-dark items-center hover:border-white border-transparent rounded-md border-2 text-white px-3 py-2 text-sm font-medium leading-4 shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-2 focus:border-white"
                    >
                      <LightBulbIcon className="h-4 w-4" />
                    </button>
                    <Tooltip
                      anchorId="inspire-button"
                      content="Example prompt"
                      place="bottom"
                    />
                    <button
                      type="submit"
                      className="bg-dark inline-flex items-center rounded-md border-transparent border-2 hover:border-white px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-offset-2"
                    >
                      <PlusIcon
                        className="-ml-0.5 mr-2 h-4 w-4"
                        aria-hidden="true"
                      />
                      Make tile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </fieldset>
        </form>

        <About open={aboutOpen} setOpen={setAboutOpen} />

        <Save
          open={saveOpen}
          setOpen={setSaveOpen}
          wallpaper={wallpaper}
          download={download}
        />
      </div>
    </>
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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-60 transition-opacity" />
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
            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm mx-auto sm:p-6">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => setOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div>
                <div className="text-center">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    About
                  </Dialog.Title>
                </div>
              </div>
              <div className="window-body mt-4">
                <fieldset class="space-y-3">
                  <p>
                    This is an{" "}
                    <a
                      className="font-semibold hover:text-blue-800"
                      href="https://github.com/replicate/wallpaper"
                    >
                      open-source project
                    </a>{" "}
                    that provides an interface for creating tileable images.
                  </p>

                  <p>
                    It works by using{" "}
                    <a
                      className="font-semibold hover:text-blue-800"
                      href="https://replicate.com/tstramer/material-diffusion"
                    >
                      material stable diffusion,
                    </a>{" "}
                    which was created by Tal Stramer. The model is hosted on{" "}
                    <a
                      className="font-semibold hover:text-blue-800"
                      href="https://replicate.com"
                    >
                      Replicate
                    </a>
                    , which exposes a cloud API for running predictions.
                  </p>

                  <p>
                    This website is built with Next.js and hosted on Vercel, and
                    uses Replicate&apos;s API to run the material stable
                    diffusion model. The source code is publicly available on
                    GitHub. Pull requests welcome!
                  </p>

                  <div className="pt-8 space-x-3 flex justify-between">
                    <a
                      className="text-blue-600"
                      href="https://github.com/replicate/wallpaper"
                    >
                      <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        See code
                      </button>
                    </a>
                    <a href="https://replicate.com">
                      <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        Build on Replicate
                      </button>
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
          <div className="fixed inset-0 bg-gray-500 bg-opacity-60 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20 mt-8 sm:mt-32">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm mx-auto sm:p-6">
              <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={() => setOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>
              <div>
                <div className="text-center">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Download Tiles
                  </Dialog.Title>
                  <p class="mt-2 text-gray-500">
                    Download your tiles as a wallpaper.
                  </p>
                </div>
              </div>

              <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-y-12 sm:gap-0 text-center">
                <div>
                  <span className="text-6xl">🖥️</span>
                  <p className="mt-4 text-gray-500">Desktop</p>
                  <div className="mt-2">
                    <button
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={() => download(wallpaper, 3800, 2100)}
                    >
                      Download
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-6xl">📱</span>
                  <p className="mt-4 text-gray-500">Phone</p>
                  <div className="mt-2">
                    <button
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={() => download(wallpaper, 1170, 2532)}
                    >
                      Download
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-6xl">🖼️</span>
                  <p className="mt-4 text-gray-500">Single Tile</p>
                  <div className="mt-2">
                    <button
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      onClick={() => download(wallpaper, 256, 256)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

export function Sidebar({
  open,
  setOpen,
  setAboutOpen,
  setSaveOpen,
  copyToClipboard,
}) {
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={setOpen}>
        <div className="fixed inset-0" />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 left-0 flex max-w-full pr-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col overflow-y-scroll bg-gray-900 bg-opacity-60 py-6 shadow-xl">
                    <div className="px-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-lg font-medium text-white">
                          {appName}
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="rounded-md text-white hover:text-gray-300 focus:outline-none "
                            onClick={() => setOpen(false)}
                          >
                            <span className="sr-only">Close panel</span>
                            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <nav
                      className="flex-1 space-y-8 min-h-screen pt-6 pr-12 px-2"
                      aria-label="Sidebar"
                    >
                      <div className="space-y-1">
                        <button
                          onClick={() => setAboutOpen(true)}
                          className="text-white w-full hover:bg-gray-50 hover:text-gray-900 group flex items-center px-4 py-2 text-sm font-medium rounded-md"
                        >
                          <QuestionMarkCircleIcon className="text-gray-200 group-hover:text-gray-500 mr-3 flex-shrink-0 h-6 w-6" />
                          About this project
                        </button>
                        <button
                          onClick={() => setSaveOpen(true)}
                          className="text-white w-full hover:bg-gray-50 hover:text-gray-900 group flex items-center px-4 py-2 text-sm font-medium rounded-md"
                        >
                          <ArrowDownTrayIcon className="text-gray-200 group-hover:text-gray-500 mr-3 flex-shrink-0 h-6 w-6" />
                          Download current tile
                        </button>

                        <button
                          onClick={() => copyToClipboard()}
                          className="text-white w-full hover:bg-gray-50 hover:text-gray-900 group flex items-center px-4 py-2 text-sm font-medium rounded-md"
                        >
                          <LinkIcon className="text-gray-200 group-hover:text-gray-500 mr-3 flex-shrink-0 h-6 w-6" />
                          Copy link to current tile
                        </button>

                        <a
                          href="https://github.com/replicate/tilemaker"
                          className="text-white hover:bg-gray-50 hover:text-gray-900 group flex items-center px-4 py-2 text-sm font-medium rounded-md"
                        >
                          <CodeBracketIcon className="text-gray-200 group-hover:text-gray-500 mr-3 flex-shrink-0 h-6 w-6" />
                          See code
                        </a>
                        <a
                          href="https://replicate.com"
                          className="text-white hover:bg-gray-50 hover:text-gray-900 group flex items-center px-4 py-2 text-sm font-medium rounded-md"
                        >
                          <span className="mr-4">🚀</span>
                          Build on Replicate
                        </a>
                      </div>
                    </nav>

                    {/* /End replace */}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}
